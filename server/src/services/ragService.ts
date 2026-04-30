import { ChromaClient } from "chromadb";
import { DefaultEmbeddingFunction } from "@chroma-core/default-embed";
import type { DocumentSection } from "./documentParser.js";

// ── Types ───────────────────────────────────────────────────
interface StoredDocument {
    fileName: string;
    fileType: string;
    chunkCount: number;
    collectionName: string;
    createdAt: Date;
}

interface RetrievedChunk {
    text: string;
    score: number;
    metadata: Record<string, unknown>;
}

// ── In-Memory Document Tracker ──────────────────────────────
// Key: `userId::chatId` → documents uploaded for that session
const documentStore = new Map<string, StoredDocument[]>();

// ── ChromaDB Client (singleton, in-memory) ──────────────────
let chromaClient: ChromaClient | null = null;
let embedder: DefaultEmbeddingFunction | null = null;
let chromaReady = false;

async function getChromaClient(): Promise<ChromaClient> {
    if (!chromaClient) {
        chromaClient = new ChromaClient({
            path: process.env.CHROMA_URL || "http://localhost:8000",
        });
        chromaReady = false;
    }

    if (!chromaReady) {
        try {
            await chromaClient.heartbeat();
            chromaReady = true;
            console.log("✅ ChromaDB connected");
        } catch {
            chromaReady = false;
            throw new Error(
                "ChromaDB server is not running. Start it with: chroma run --host localhost --port 8000"
            );
        }
    }

    return chromaClient;
}

function getEmbedder(): DefaultEmbeddingFunction {
    if (!embedder) {
        embedder = new DefaultEmbeddingFunction();
    }
    return embedder;
}

function makeCollectionName(userId: string, chatId: string): string {
    // ChromaDB collection names: 3-63 chars, alphanumeric + underscores/hyphens
    const safe = `rag_${userId}_${chatId}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 63);
    return safe.length < 3 ? safe.padEnd(3, "_") : safe;
}

function makeStoreKey(userId: string, chatId: string): string {
    return `${userId}::${chatId}`;
}

// ── Text Chunking ───────────────────────────────────────────
export interface ChunkOptions {
    chunkSize?: number;
    chunkOverlap?: number;
}

export function chunkText(text: string, options: ChunkOptions = {}): string[] {
    const chunkSize = options.chunkSize || Number(process.env.RAG_CHUNK_SIZE) || 500;
    const overlap = options.chunkOverlap || Number(process.env.RAG_CHUNK_OVERLAP) || 100;

    if (!text || text.trim().length === 0) return [];
    if (text.length <= chunkSize) return [text.trim()];

    const chunks: string[] = [];
    const separators = ["\n\n", "\n", ". ", " "];

    function recursiveSplit(content: string, sepIndex: number): string[] {
        if (content.length <= chunkSize) return [content.trim()].filter(Boolean);
        if (sepIndex >= separators.length) {
            // Force split at chunkSize
            const result: string[] = [];
            for (let i = 0; i < content.length; i += chunkSize - overlap) {
                const chunk = content.slice(i, i + chunkSize).trim();
                if (chunk) result.push(chunk);
            }
            return result;
        }

        const sep = separators[sepIndex];
        const parts = content.split(sep);

        if (parts.length <= 1) {
            return recursiveSplit(content, sepIndex + 1);
        }

        const result: string[] = [];
        let current = "";

        for (const part of parts) {
            const candidate = current ? current + sep + part : part;

            if (candidate.length <= chunkSize) {
                current = candidate;
            } else {
                if (current.trim()) result.push(current.trim());

                if (part.length > chunkSize) {
                    result.push(...recursiveSplit(part, sepIndex + 1));
                    current = "";
                } else {
                    current = part;
                }
            }
        }

        if (current.trim()) result.push(current.trim());
        return result;
    }

    const rawChunks = recursiveSplit(text, 0);

    // Add overlap between consecutive chunks
    for (let i = 0; i < rawChunks.length; i++) {
        if (i > 0 && overlap > 0) {
            const prevChunk = rawChunks[i - 1];
            const overlapText = prevChunk.slice(-overlap);
            const merged = overlapText + " " + rawChunks[i];
            chunks.push(merged.trim());
        } else {
            chunks.push(rawChunks[i]);
        }
    }

    return chunks.filter(c => c.length > 0);
}

/**
 * Chunk document sections with structural awareness.
 * Tables are chunked as whole units (or split by rows if too large).
 * Text sections use recursive character splitting.
 */
export function chunkSections(sections: DocumentSection[], options: ChunkOptions = {}): string[] {
    const chunkSize = options.chunkSize || Number(process.env.RAG_CHUNK_SIZE) || 500;
    const allChunks: string[] = [];

    for (const section of sections) {
        if (section.type === "table") {
            // Keep tables together if they fit; otherwise split by rows
            if (section.content.length <= chunkSize * 2) {
                allChunks.push(`[TABLE]\n${section.content}`);
            } else {
                // Split table by rows, keeping header context
                const lines = section.content.split("\n");
                const headerLines = lines.filter(l => l.startsWith("Sheet:") || l.startsWith("Columns:"));
                const dataLines = lines.filter(l => l.startsWith("Row:"));
                const headerContext = headerLines.join("\n");

                let currentChunk = headerContext;
                for (const row of dataLines) {
                    if ((currentChunk + "\n" + row).length > chunkSize) {
                        allChunks.push(`[TABLE]\n${currentChunk}`);
                        currentChunk = headerContext + "\n" + row;
                    } else {
                        currentChunk += "\n" + row;
                    }
                }
                if (currentChunk.trim() !== headerContext.trim()) {
                    allChunks.push(`[TABLE]\n${currentChunk}`);
                }
            }
        } else {
            allChunks.push(...chunkText(section.content, options));
        }
    }

    return allChunks.filter(c => c.trim().length > 0);
}

// ── Ingest Document ─────────────────────────────────────────
export async function ingestDocument(
    userId: string,
    chatId: string,
    sections: DocumentSection[],
    fileName: string,
    fileType: string,
): Promise<{ chunkCount: number; collectionName: string }> {
    const client = await getChromaClient();
    const embeddingFn = getEmbedder();
    const collectionName = makeCollectionName(userId, chatId);

    // Chunk the sections
    const chunks = chunkSections(sections);
    if (chunks.length === 0) {
        throw new Error("Document produced no text chunks. The file may be empty or contain only images.");
    }

    // Get or create collection
    const collection = await client.getOrCreateCollection({
        name: collectionName,
        embeddingFunction: embeddingFn,
    });

    // Prepare data for upsert
    const ids = chunks.map((_, i) => `${fileName}_chunk_${i}`);
    const metadatas = chunks.map((_, i) => ({
        fileName,
        fileType,
        chunkIndex: i,
        totalChunks: chunks.length,
        userId,
        chatId,
    }));

    // Upsert in batches (ChromaDB has limits)
    const BATCH_SIZE = 50;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batchIds = ids.slice(i, i + BATCH_SIZE);
        const batchDocs = chunks.slice(i, i + BATCH_SIZE);
        const batchMeta = metadatas.slice(i, i + BATCH_SIZE);

        await collection.add({
            ids: batchIds,
            documents: batchDocs,
            metadatas: batchMeta,
        });
    }

    // Track in memory
    const storeKey = makeStoreKey(userId, chatId);
    const existing = documentStore.get(storeKey) || [];
    existing.push({
        fileName,
        fileType,
        chunkCount: chunks.length,
        collectionName,
        createdAt: new Date(),
    });
    documentStore.set(storeKey, existing);

    console.log(`📄 Ingested "${fileName}" → ${chunks.length} chunks into collection "${collectionName}"`);
    return { chunkCount: chunks.length, collectionName };
}

// ── Query Documents ─────────────────────────────────────────
export async function queryDocuments(
    userId: string,
    chatId: string,
    query: string,
    topK?: number,
): Promise<RetrievedChunk[]> {
    const k = topK || Number(process.env.RAG_TOP_K) || 5;

    try {
        const client = await getChromaClient();
        const embeddingFn = getEmbedder();
        const collectionName = makeCollectionName(userId, chatId);

        const collection = await client.getCollection({
            name: collectionName,
            embeddingFunction: embeddingFn,
        });

        const results = await collection.query({
            queryTexts: [query],
            nResults: k,
        });

        if (!results.documents?.[0]) return [];

        return results.documents[0].map((doc, i) => ({
            text: doc || "",
            score: results.distances?.[0]?.[i] ?? 0,
            metadata: (results.metadatas?.[0]?.[i] as Record<string, unknown>) || {},
        })).filter(chunk => chunk.text.trim().length > 0);
    } catch (err) {
        console.error("RAG query error:", err);
        return [];
    }
}

// ── Check if Documents Exist ────────────────────────────────
export function hasDocuments(userId: string, chatId: string): boolean {
    const storeKey = makeStoreKey(userId, chatId);
    const docs = documentStore.get(storeKey);
    return !!docs && docs.length > 0;
}

// ── Get Document List ───────────────────────────────────────
export function getDocumentList(userId: string, chatId: string): StoredDocument[] {
    const storeKey = makeStoreKey(userId, chatId);
    return documentStore.get(storeKey) || [];
}

// ── Remove Documents ────────────────────────────────────────
export async function removeDocuments(userId: string, chatId: string): Promise<void> {
    const storeKey = makeStoreKey(userId, chatId);
    const docs = documentStore.get(storeKey);

    if (docs && docs.length > 0) {
        try {
            const client = await getChromaClient();
            const collectionName = makeCollectionName(userId, chatId);
            await client.deleteCollection({ name: collectionName });
        } catch {
            // Collection may not exist, ignore
        }
        documentStore.delete(storeKey);
    }
}

// ── Build RAG Prompt ────────────────────────────────────────
export function buildRAGPrompt(
    query: string,
    retrievedChunks: RetrievedChunk[],
    activityTitle?: string,
): string {
    if (retrievedChunks.length === 0) {
        return query;
    }

    const sourceFiles = [...new Set(retrievedChunks.map(c => c.metadata.fileName as string))];
    const contextBlocks = retrievedChunks.map((chunk, i) => {
        const source = chunk.metadata.fileName || "Unknown";
        return `[Source ${i + 1}: ${source}]\n${chunk.text}`;
    }).join("\n\n---\n\n");

    return `You are answering questions about uploaded documents in a ${activityTitle || "Document Summarization"} workspace.

RETRIEVED DOCUMENT CONTEXT:
${contextBlocks}

SOURCE FILES: ${sourceFiles.join(", ")}

INSTRUCTIONS:
- Answer the user's question using ONLY the retrieved document context above.
- If the context does not contain enough information to answer, say so clearly.
- When referencing specific data, mention the source file name.
- If the context includes table data, present numbers and comparisons accurately.
- Be concise, structured, and factual.

USER QUESTION: ${query}`;
}

// ── Health Check ────────────────────────────────────────────
export async function checkChromaHealth(): Promise<boolean> {
    try {
        const client = await getChromaClient();
        await client.heartbeat();
        return true;
    } catch {
        return false;
    }
}
