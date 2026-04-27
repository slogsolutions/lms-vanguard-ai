import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export const getAllModels = async (req: Request, res: Response): Promise<void> => {
    try {
        const models = await prisma.aIModel.findMany({
            orderBy: { name: 'asc' }
        });
        res.status(200).json({ success: true, data: models });
    } catch (error) {
        console.error("Error in getAllModels:", error);
        res.status(500).json({ success: false, error: "Failed to fetch models" });
    }
};

export const createModel = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, type, provider, status, desc } = req.body;
        const model = await prisma.aIModel.create({
            data: { name, type, provider, status, desc }
        });
        res.status(201).json({ success: true, data: model });
    } catch (error) {
        console.error("Error in createModel:", error);
        res.status(500).json({ success: false, error: "Failed to create model" });
    }
};
