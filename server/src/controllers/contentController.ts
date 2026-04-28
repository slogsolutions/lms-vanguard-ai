import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export const getAllContent = async (req: any, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id || "";

        const contents = await prisma.content.findMany({
            orderBy: { createdAt: 'asc' },
            include: {
                progress: {
                    where: { userId }
                }
            }
        });

        const data = contents.map((c: any) => {
            const { progress, ...rest } = c;
            const userProg = progress && progress.length > 0 ? progress[0] : null;
            return {
                ...rest,
                completed: userProg ? userProg.completed : false,
                score: userProg ? userProg.score : 0,
                status: userProg ? userProg.status : "pending",
                modelUsed: userProg ? userProg.modelUsed : null
            };
        });

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Error in getAllContent:", error);
        res.status(500).json({ success: false, error: "Failed to fetch content" });
    }
};

export const getContentById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const content = await prisma.content.findUnique({
            where: { id }
        });
        if (!content) {
            res.status(404).json({ success: false, error: "Content not found" });
            return;
        }
        res.status(200).json({ success: true, data: content });
    } catch (error) {
        console.error("Error in getContentById:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};

export const createContent = async (req: any, res: Response): Promise<void> => {
    try {
        const { title, body, objective, contentItems, activity, activityAnswer, type, duration, difficulty, category, maxScore } = req.body;
        const createdBy = req.user?.id;

        const content = await prisma.content.create({
            data: {
                title: title || "Untitled Module",
                body: body || "",
                objective: objective || "",
                contentItems: contentItems || "",
                activity: activity || "",
                activityAnswer: activityAnswer || "",
                type: type || "Offline",
                duration: duration || "30 min",
                difficulty: difficulty || "Beginner",
                category: category || "General",
                maxScore: maxScore || 100,
                createdBy
            }
        });

        res.status(201).json({ success: true, data: content });
    } catch (error: any) {
        console.error("❌ Error in createContent:", error);
        res.status(500).json({ success: false, error: error.message || "Failed to create content" });
    }
};

export const updateContent = async (req: any, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const { title, body, objective, contentItems, activity, activityAnswer, type, duration, difficulty, category, maxScore } = req.body;
        const content = await prisma.content.update({
            where: { id },
            data: { title, body, objective, contentItems, activity, activityAnswer, type, duration, difficulty, category, maxScore }
        });
        res.status(200).json({ success: true, data: content });
    } catch (error) {
        console.error("Error in updateContent:", error);
        res.status(500).json({ success: false, error: "Update failed" });
    }
};

export const deleteContent = async (req: any, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        await prisma.content.delete({ where: { id } });
        res.status(200).json({ success: true, message: "Content deleted" });
    } catch (error) {
        console.error("Error in deleteContent:", error);
        res.status(500).json({ success: false, error: "Delete failed" });
    }
};

export const updateProgress = async (req: any, res: Response): Promise<void> => {
    try {
        const contentId = req.params.id as string;
        const userId = req.user.id;
        const { completed, score, status, modelUsed } = req.body;

        const existing = await prisma.userProgress.findUnique({
            where: { userId_contentId: { userId, contentId } }
        });

        if (existing) {
            await prisma.userProgress.update({
                where: { id: existing.id },
                data: { 
                    completed: completed !== undefined ? completed : existing.completed,
                    score: score !== undefined ? score : existing.score,
                    status: status || existing.status,
                    modelUsed: modelUsed || existing.modelUsed
                }
            });
        } else {
            await prisma.userProgress.create({
                data: { 
                    userId, 
                    contentId, 
                    completed: completed || false,
                    score: score || 0,
                    status: status || "pending",
                    modelUsed: modelUsed || null
                }
            });
        }

        res.status(200).json({ success: true, message: "Progress updated" });
    } catch (error) {
        console.error("Error in updateProgress:", error);
        res.status(500).json({ success: false, error: "Failed to update progress" });
    }
};
