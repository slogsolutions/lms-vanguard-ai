import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import dotenv from "dotenv";

dotenv.config();

export const askAI = async (req: any, res: Response): Promise<void> => {
    try {
        const { message, chatId, modelId, activityId } = req.body;
        const userId = req.user.id;
        const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";

        // 1. Get Model info
        let modelName = "phi"; // Default fallback
        if (modelId) {
            const modelObj = await prisma.aIModel.findUnique({ where: { id: modelId } });
            if (modelObj) modelName = modelObj.name;
        }

        // 2. Determine or create chat session
        let activeChatId = chatId;
        if (!activeChatId) {
            const newChat = await prisma.chat.create({
                data: { userId }
            });
            activeChatId = newChat.id;
        }

        // 3. Save user message
        await prisma.message.create({
            data: {
                chatId: activeChatId,
                role: "user",
                content: message
            }
        });

        // 4. Get conversation history
        const previousMessages = await prisma.message.findMany({
            where: { chatId: activeChatId },
            orderBy: { createdAt: 'desc' },
            take: 6
        });
        const history = previousMessages.reverse();

        // 5. Get Context (Specific activity if provided, or general)
        let contextText = "";
        if (activityId) {
            const activity = await prisma.content.findUnique({ where: { id: activityId } });
            if (activity) {
                contextText = `CURRENT TASK: ${activity.title}\nDESCRIPTION: ${activity.body}\nINSTRUCTIONS: Guide the student through this task. Do not give the answer immediately, but help them learn.`;
            }
        } else {
            const contents = await prisma.content.findMany({ take: 5 });
            contextText = contents.map(c => `[Lab Module: ${c.title}]\n${c.body}`).join("\n\n");
        }

        const systemMessage = `You are "Defence AI Lab Instructor", an elite AI assistant trained for the Indian Army's SLOG LMS.
Your tone is professional, disciplined, and encouraging.

MISSION OBJECTIVE:
1. Provide expert guidance on AI and LLM concepts.
2. Use military analogies where appropriate (e.g., comparing Prompt Engineering to 'Fire Control' or 'Mission Briefing').
3. Be concise and structured. Use bullet points.
4. Maintain high operational security (OPSEC) - remind users not to share classified info with online models.

${contextText ? `CONTEXTUAL DATA:\n${contextText}` : ""}`;

        const messagesForAI = [
            { role: "system", content: systemMessage },
            ...history.map(m => ({ role: m.role, content: m.content }))
        ];

        let assistantReply = "";

        // Check if we should use local Ollama
        try {
            const response = await fetch(`${ollamaUrl}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: modelName.toLowerCase().replace(/ /g, "-").replace(/\.[0-9]/g, ""), // Simple normalization for Ollama
                    messages: messagesForAI,
                    stream: false,
                    options: { temperature: 0.6 }
                })
            });

            if (response.ok) {
                const data: any = await response.json();
                assistantReply = data.message.content;
            } else {
                throw new Error("Ollama Error");
            }
        } catch (err) {
            // Fallback for demo/interactive if Ollama is not running
            assistantReply = `[SIMULATED - OLLAMA OFFLINE]\n\nAs your Defence AI Lab Instructor, I have processed your input regarding "${message.substring(0, 30)}...". \n\nNormally, I would use the ${modelName} model to respond, but the local AI server is currently unreachable. \n\n**Key Guidance:**\n- Ensure you follow the prompt engineering principles discussed in TASK-01.\n- Keep your queries structured and clear.\n- Verify the AI response before implementation.\n\nHow else can I assist you with your current mission?`;
        }

        // 6. Save AI response
        await prisma.message.create({
            data: {
                chatId: activeChatId,
                role: "assistant",
                content: assistantReply
            }
        });

        res.status(200).json({ 
            success: true, 
            reply: assistantReply,
            chatId: activeChatId 
        });

    } catch (error) {
        console.error("Error in askAI:", error);
        res.status(500).json({ success: false, error: "AI interaction failed" });
    }
};

export const getMyChats = async (req: any, res: Response): Promise<void> => {
    try {
        const chats = await prisma.chat.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            include: {
                messages: {
                    take: 1,
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        res.status(200).json({ success: true, data: chats });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch chats" });
    }
};

export const getChatMessages = async (req: any, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const messages = await prisma.message.findMany({
            where: { chatId: id },
            orderBy: { createdAt: 'asc' }
        });
        res.status(200).json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch messages" });
    }
};

export const deleteChat = async (req: any, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        await prisma.chat.delete({
            where: { id, userId: req.user.id }
        });
        res.status(200).json({ success: true, message: "Chat deleted" });
    } catch (error) {
        res.status(500).json({ success: false, error: "Delete failed" });
    }
};
