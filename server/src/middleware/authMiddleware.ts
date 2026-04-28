import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

export const protectRoute = async (req: any, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            res.status(401).json({ success: false, error: "Not authorized - No token provided" });
            return;
        }

        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "default_secret");
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                serviceId: true,
                name: true,
                email: true,
                rank: true,
                batch: true,
                unit: true,
                role: true,
                createdAt: true,
            }
        });

        if (!user) {
            res.status(401).json({ success: false, error: "User not found" });
            return;
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Error in protectRoute middleware:", error);
        res.status(401).json({ success: false, error: "Not authorized - Token failed" });
    }
};

export const adminOnly = (req: any, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === "admin") {
        next();
    } else {
        res.status(403).json({ success: false, error: "Forbidden - Admins only" });
    }
};
