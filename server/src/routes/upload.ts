import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { uploadDocument, getUploadedDocuments } from "../controllers/uploadController.js";
import { protectRoute } from "../middleware/authMiddleware.js";

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.resolve("uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer config: disk storage, 10MB limit
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
        const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${file.originalname}`;
        cb(null, uniqueName);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: (Number(process.env.MAX_UPLOAD_SIZE_MB) || 10) * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowedExts = [".pdf", ".docx", ".xlsx", ".csv", ".xls"];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedExts.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`File type not allowed: ${ext}. Allowed: ${allowedExts.join(", ")}`));
        }
    },
});

router.post("/upload", protectRoute, upload.single("file"), uploadDocument);
router.get("/upload/documents", protectRoute, getUploadedDocuments);

export default router;
