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

dotenv.config();

const app = express();
app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRouter);
app.use("/api", contentRouter);
app.use("/api", chatRouter);
app.use("/api", profileRouter);
app.use("/api", aiModelRouter);

app.get("/", (req, res) => {
    res.send("Offline AI Learning Server is running");
});

const PORT = process.env.PORT || 5000;

async function checkConnection() {
    try {
        await prisma.$connect();
        console.log('✅ Database connected successfully');
    } catch (err) {
        console.error('❌ Database connection error:', err);
    }
}

checkConnection().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server listening on port ${PORT}`);
    });
});
