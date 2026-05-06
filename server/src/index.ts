import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { prisma } from './lib/prisma.js';

import authRouter from './routes/auth.js';
import contentRouter from './routes/content.js';
import chatRouter from './routes/chat.js';
import profileRouter from './routes/profile.js';
import aiModelRouter from './routes/aiModels.js';
import ttsRouter from './routes/tts.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(process.cwd(), '.env') });

const app = express();
app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Routes
app.use("/api/auth", authRouter);
app.use("/api", contentRouter);
app.use("/api", chatRouter);
app.use("/api", profileRouter);
app.use("/api", aiModelRouter);
app.use("/api", ttsRouter);
app.get("/", (req, res) => {
    res.send("Offline AI Learning Server is running");
});

const PORT = process.env.PORT || 5005;

app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
});
