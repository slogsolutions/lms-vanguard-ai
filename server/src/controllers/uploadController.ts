import type { Response } from "express";
import fs from "fs";
import { parseDocument, getFileType } from "../services/documentParser.js";
import { ingestDocument, getDocumentList, hasDocuments, checkChromaHealth } from "../services/ragService.js";

const MAX_FILE_SIZE = (Number(process.env.MAX_UPLOAD_SIZE_MB) || 10) * 1024 * 1024; // 10 MB default

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".xlsx", ".csv", ".xls"];
const ALLOWED_MIMES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "application/vnd.ms-excel",
];

export const uploadDocument = async (req: any, res: Response): Promise<void> => {
    const cleanupFile = (filePath?: string) => {
        if (filePath) {
            try { fs.unlinkSync(filePath); } catch { /* ignore */ }
        }
    };

    try {
        const file = req.file;
        if (!file) {
            res.status(400).json({ success: false, error: "No file uploaded" });
            return;
        }

        const userId = req.user?.id;
        const { chatId } = req.body;

        if (!userId) {
            cleanupFile(file.path);
            res.status(401).json({ success: false, error: "Not authorized" });
            return;
        }

        // Validate file type
        const fileType = getFileType(file.mimetype, file.originalname);
        if (!fileType) {
            cleanupFile(file.path);
            res.status(400).json({
                success: false,
                error: `Unsupported file type. Allowed: PDF, DOCX, XLSX, CSV`,
            });
            return;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            cleanupFile(file.path);
            res.status(400).json({
                success: false,
                error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)} MB`,
            });
            return;
        }

        // Check ChromaDB health
        const chromaHealthy = await checkChromaHealth();
        if (!chromaHealthy) {
            cleanupFile(file.path);
            res.status(503).json({
                success: false,
                error: "Document processing service (ChromaDB) is not available. Please start ChromaDB: chroma run --host localhost --port 8000",
            });
            return;
        }

        // Parse document
        console.log(`📤 Parsing uploaded file: ${file.originalname} (${fileType})`);
        const parsed = await parseDocument(file.path, file.mimetype, file.originalname);

        if (!parsed.text || parsed.text.trim().length === 0) {
            cleanupFile(file.path);
            res.status(400).json({
                success: false,
                error: "Could not extract any text from the file. It may contain only images or be empty.",
            });
            return;
        }

        // Use a temporary chatId if none provided (will be updated when chat starts)
        const effectiveChatId = chatId || `pending_${userId}_${Date.now()}`;

        // Ingest into ChromaDB
        const result = await ingestDocument(
            userId,
            effectiveChatId,
            parsed.sections,
            file.originalname,
            fileType,
        );

        // Clean up uploaded file from disk
        cleanupFile(file.path);

        res.status(200).json({
            success: true,
            message: `Document processed successfully`,
            data: {
                fileName: file.originalname,
                fileType,
                chunkCount: result.chunkCount,
                wordCount: parsed.metadata.wordCount,
                hasTable: parsed.metadata.hasTable,
                pages: parsed.metadata.pages,
                sheets: parsed.metadata.sheets,
                chatId: effectiveChatId,
            },
        });
    } catch (error: any) {
        cleanupFile(req.file?.path);
        console.error("❌ Upload error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Document processing failed",
        });
    }
};

export const getUploadedDocuments = async (req: any, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const chatId = req.query.chatId as string;

        if (!userId || !chatId) {
            res.status(400).json({ success: false, error: "userId and chatId required" });
            return;
        }

        const docs = getDocumentList(userId, chatId);
        res.status(200).json({ success: true, data: docs });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch documents" });
    }
};
