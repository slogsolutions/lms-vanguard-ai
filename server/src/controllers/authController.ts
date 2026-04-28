import type { Request, Response } from "express";
import { validateSignUpData } from "../utils/validation.js";
import { prisma } from "../lib/prisma.js";
import bcrypt from "bcrypt";
import { generateUserJWT } from "../utils/jwt.js";

export const signUp = async (req: Request, res: Response): Promise<void> => {
  try {
    validateSignUpData(req.body);
    const { name, email, password, role, serviceId, rank, batch, unit } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        res.status(400).json({ success: false, error: "User already exists" });
        return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "soldier",
        serviceId,
        rank,
        batch,
        unit,
      },
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

    res.status(201).json({ success: true, message: "User registered successfully", data: user });
  } catch (error: any) {
    console.error("Error in signUp:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ success: false, error: "Email and password required" });
            return;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            res.status(401).json({ success: false, error: "Invalid credentials" });
            return;
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            res.status(401).json({ success: false, error: "Invalid credentials" });
            return;
        }

        const token = generateUserJWT(user.id);
        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                id: user.id,
                serviceId: user.serviceId,
                name: user.name,
                email: user.email,
                rank: user.rank,
                batch: user.batch,
                unit: user.unit,
                role: user.role,
                createdAt: user.createdAt,
            }
        });
    } catch (error: any) {
        console.error("Error in login:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        res.clearCookie("token", {
            path: "/",
            httpOnly: true,
            secure: false,
            sameSite: "strict",
        });
        res.status(200).json({ success: true, message: "Logged out" });
    } catch (error) {
        console.error("Error in logout:", error);
        res.status(500).json({ success: false, error: "Logout failed" });
    }
};

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalTasks = await prisma.content.count();
    const users = await prisma.user.findMany({
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
        progress: {
          select: {
            completed: true,
            score: true,
            status: true
          }
        }
      }
    });

    const data = users.map(u => {
      const completedCount = u.progress.filter(p => p.completed).length;
      const totalScore = u.progress.reduce((acc, p) => acc + (p.score || 0), 0);
      const avgScore = u.progress.length > 0 ? Math.round(totalScore / u.progress.length) : 0;
      
      return {
        ...u,
        completed: completedCount,
        score: avgScore,
        totalTasks,
        progress: totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0
      };
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
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
            res.status(404).json({ success: false, error: "User not found" });
            return;
        }

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        console.error("Error in getProfile:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};
