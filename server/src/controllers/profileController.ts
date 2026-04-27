import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export const getProfile = async (req: any, res: Response): Promise<void> => {
    try {
        const userId = req.user.id;
        
        const chatCount = await prisma.chat.count({ where: { userId } });
        const contentCount = req.user.role === 'admin' 
            ? await prisma.content.count({ where: { createdBy: userId } })
            : 0;

        res.status(200).json({ 
            success: true, 
            data: {
                ...req.user,
                stats: {
                    chatCount,
                    contentCount
                }
            } 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: "Profile fetch failed" });
    }
};
