import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ChromaClient } from 'chromadb';

dotenv.config();

// Folder to store raw context for "Instant Mode"
const CONTEXT_DIR = path.join(process.cwd(), 'storage', 'contexts');

if (!fs.existsSync(CONTEXT_DIR)) {
    fs.mkdirSync(CONTEXT_DIR, { recursive: true });
}

// Keep Chroma for when we want smart retrieval, but focus on file storage for now
const chroma = new ChromaClient({
    host: process.env.CHROMA_URL || "http://localhost:8000"
});

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "nomic-embed-text";

export const ingestionProgress: Record<string, { total: number; current: number; status: string }> = {};

export const checkChromaHealth = async () => {
    try {
        await chroma.heartbeat();
        return true;
    } catch (err) {
        return false;
    }
};

/**
 * Saves document text to local storage for instant context attachment.
 * This is the "Fast Mode" the user requested.
 */
export const storeContextInstantly = async (chatId: string, text: string) => {
    const filePath = path.join(CONTEXT_DIR, `${chatId}.txt`);
    
    // If file already exists, append or overwrite? User said "previously it just upload", 
    // usually means one file per chat context or appending. Let's overwrite for simplicity 
    // per chat session, or append if you want multi-file.
    fs.writeFileSync(filePath, text, 'utf8');
    
    return { success: true };
};

/**
 * Retrieves the full context for a chat.
 */
export const getStoredContext = (chatId: string): string => {
    const filePath = path.join(CONTEXT_DIR, `${chatId}.txt`);
    if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8');
    }
    return "";
};

// Legacy support for chunking if needed
export const chunkText = (text: string, chunkSize: number = 800, overlap: number = 150): string[] => {
    const chunks: string[] = [];
    const cleanText = text.replace(/\s+/g, ' ').trim();
    let start = 0;
    while (start < cleanText.length) {
        let end = Math.min(start + chunkSize, cleanText.length);
        chunks.push(cleanText.slice(start, end).trim());
        start = end - overlap;
        if (start < 0) start = 0;
        if (start >= cleanText.length) break;
        if (end <= start) start = end;
    }
    return chunks.filter(c => c.length > 10);
};

export const getEmbeddings = async (text: string): Promise<number[]> => {
    const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: EMBEDDING_MODEL, prompt: text }),
    });
    const data: any = await response.json();
    return data.embedding;
};

// SMART RETRIEVAL: Try ChromaDB first, fallback to truncated raw text
export const queryContext = async (chatId: string, query: string): Promise<string> => {
    try {
        const isHealthy = await checkChromaHealth();
        if (isHealthy) {
            const collection = await chroma.getOrCreateCollection({ name: `chat_${chatId}` });
            const queryEmbedding = await getEmbeddings(query);
            
            const results = await collection.query({
                queryEmbeddings: [queryEmbedding],
                nResults: 5,
            });

            if (results.documents[0] && results.documents[0].length > 0) {
                console.log(`[RAG] Found ${results.documents[0].length} relevant chunks in ChromaDB for chat: ${chatId}`);
                return results.documents[0].join("\n\n---\n\n");
            }
        }
    } catch (err) {
        console.warn(`[RAG] Chroma retrieval failed, falling back to instant storage:`, err);
    }

    // FALLBACK: Use the instant raw storage with truncation
    const fullContext = getStoredContext(chatId);
    if (!fullContext) return "";

    const MAX_CONTEXT = 15000;
    if (fullContext.length > MAX_CONTEXT) {
        return fullContext.substring(0, MAX_CONTEXT) + "\n\n[... document truncated for performance ...]";
    }
    
    return fullContext;
};

/**
 * Background indexing to ChromaDB.
 * We use small batches and timeouts to prevent V8 memory crashes.
 */
export const ingestToChroma = async (chatId: string, text: string) => {
    // 1. Save instantly for immediate availability
    await storeContextInstantly(chatId, text);
    
    // 2. Start background indexing (non-blocking)
    processBackgroundIndexing(chatId, text).catch(err => {
        console.error(`[RAG] Background indexing failed for ${chatId}:`, err);
    });

    return { success: true, count: 1, status: "Indexing in background" };
};

const processBackgroundIndexing = async (chatId: string, text: string) => {
    const isHealthy = await checkChromaHealth();
    if (!isHealthy) return;

    const chunks = chunkText(text);
    const collection = await chroma.getOrCreateCollection({ name: `chat_${chatId}` });
    
    ingestionProgress[chatId] = { total: chunks.length, current: 0, status: "indexing" };
    
    // Process in small batches (e.g. 5 at a time) to stay memory-safe
    const BATCH_SIZE = 5;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const ids = batch.map((_, idx) => `chunk_${i + idx}`);
        const embeddings = await Promise.all(batch.map(c => getEmbeddings(c)));
        
        await collection.add({
            ids,
            embeddings,
            documents: batch,
        });

        ingestionProgress[chatId].current = Math.min(i + BATCH_SIZE, chunks.length);
        
        // Brief pause to allow GC and keep event loop free
        await new Promise(r => setTimeout(r, 100));
    }
    
    ingestionProgress[chatId].status = "completed";
    console.log(`[RAG] Finished indexing ${chunks.length} chunks for chat: ${chatId}`);
};
