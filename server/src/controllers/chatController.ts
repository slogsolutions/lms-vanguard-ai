import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import dotenv from "dotenv";

dotenv.config();

const normalizeModelName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const withTrailingSlashTrimmed = (url: string) => url.replace(/\/+$/, "");

const fetchWithTimeout = async (input: string, init: RequestInit & { timeoutMs?: number } = {}) => {
    const { timeoutMs = 60_000, ...rest } = init;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(input, { ...rest, signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
};

const resolveOllamaModel = async (ollamaUrl: string, requestedModel: string) => {
    const envModel = process.env.MODEL?.trim();
    if (envModel) return envModel;

    const fallbackModel = "llama3.2:1b";

    try {
        const base = withTrailingSlashTrimmed(ollamaUrl);
        const response = await fetchWithTimeout(`${base}/api/tags`, { timeoutMs: 10_000 });
        if (!response.ok) return fallbackModel;

        const data: any = await response.json();
        const installedModels = Array.isArray(data.models)
            ? data.models.map((model: any) => model.name || model.model).filter(Boolean)
            : [];

        if (installedModels.length === 0) return fallbackModel;

        const normalizedRequest = normalizeModelName(requestedModel);
        const exactMatch = installedModels.find((model: string) => normalizeModelName(model) === normalizedRequest);
        if (exactMatch) return exactMatch;

        const familyMatch = installedModels.find((model: string) => {
            const normalizedInstalled = normalizeModelName(model);
            return normalizedRequest.includes("llama") && normalizedInstalled.includes("llama")
                || normalizedRequest.includes("mistral") && normalizedInstalled.includes("mistral")
                || normalizedRequest.includes("gemma") && normalizedInstalled.includes("gemma")
                || normalizedRequest.includes("phi") && normalizedInstalled.includes("phi");
        });

        return familyMatch || installedModels[0];
    } catch {
        return fallbackModel;
    }
};

type ActivityContext = {
    title: string;
    body: string;
    category?: string | null;
    type?: string | null;
};

type ToolResult = {
    handled: boolean;
    reply?: string;
};

type ToolMode = "offline" | "online";

const getTaskKey = (activity?: ActivityContext | null) => {
    const text = `${activity?.title || ""} ${activity?.category || ""} ${activity?.body || ""}`.toLowerCase();
    if (text.includes("video")) return "video";
    if (text.includes("voice")) return "voice";
    if (text.includes("summarize") || text.includes("summary") || text.includes("excel") || text.includes("word") || text.includes("pdf")) return "summary";
    if (text.includes("quiz") || text.includes("assessment")) return "quiz";
    if (text.includes("translation") || text.includes("translate")) return "translation";
    if (text.includes("convert") || text.includes("conversion")) return "conversion";
    if (text.includes("formal") || text.includes("communication")) return "communication";
    if (text.includes("prompt")) return "prompting";
    return "general";
};

const taskToolEnv: Record<string, Record<ToolMode, string>> = {
    prompting: { offline: "OLLAMA_URL", online: "ONLINE_PROMPT_TOOL_URL" },
    video: { offline: "OFFLINE_VIDEO_TOOL_URL", online: "ONLINE_VIDEO_TOOL_URL" },
    voice: { offline: "OFFLINE_VOICE_TOOL_URL", online: "ONLINE_VOICE_TOOL_URL" },
    summary: { offline: "OFFLINE_SUMMARY_TOOL_URL", online: "ONLINE_SUMMARY_TOOL_URL" },
    quiz: { offline: "OFFLINE_QUIZ_TOOL_URL", online: "ONLINE_QUIZ_TOOL_URL" },
    translation: { offline: "LIBRETRANSLATE_URL", online: "ONLINE_TRANSLATION_TOOL_URL" },
    conversion: { offline: "OFFLINE_CONVERSION_TOOL_URL", online: "ONLINE_CONVERSION_TOOL_URL" },
    communication: { offline: "OFFLINE_COMMUNICATION_TOOL_URL", online: "ONLINE_COMMUNICATION_TOOL_URL" },
    general: { offline: "OLLAMA_URL", online: "ONLINE_GENERAL_TOOL_URL" },
};

const getToolMode = (modelType?: string): ToolMode => modelType === "online" ? "online" : "offline";

const extractToolReply = (data: any) => {
    if (typeof data === "string") return data;
    return data?.reply
        || data?.text
        || data?.output
        || data?.result
        || data?.message?.content
        || data?.choices?.[0]?.message?.content
        || JSON.stringify(data, null, 2);
};

const formatToolConfigHint = (toolMode: ToolMode, taskKey: string, toolUrl?: string) => {
    const snippet = toolUrl ? `Tool URL: \`${toolUrl}\`\n\n` : "";
    return `${snippet}Task: \`${taskKey}\`\nMode: \`${toolMode}\``;
};

const callHttpAiTool = async (toolUrl: string, payload: object) => {
    const response = await fetch(toolUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    if (!response.ok) {
        throw new Error(`AI tool error ${response.status}: ${responseText}`);
    }

    try {
        return extractToolReply(JSON.parse(responseText));
    } catch {
        return responseText;
    }
};

const callLibreTranslateTool = async (toolUrl: string, message: string) => {
    const response = await fetch(`${toolUrl.replace(/\/$/, "")}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            q: message,
            source: "auto",
            target: process.env.TRANSLATE_TARGET || "hi",
            format: "text",
        }),
    });

    const data: any = await response.json();
    if (!response.ok) {
        throw new Error(`LibreTranslate error ${response.status}: ${JSON.stringify(data)}`);
    }

    return data.translatedText || JSON.stringify(data, null, 2);
};

const callOllamaTool = async (ollamaUrl: string, modelName: string, messages: Array<{ role: string; content: string }>) => {
    const base = withTrailingSlashTrimmed(ollamaUrl);
    const ollamaModel = await resolveOllamaModel(base, modelName);
    const response = await fetchWithTimeout(`${base}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: ollamaModel,
            messages,
            stream: false,
            options: { temperature: 0.6 }
        }),
        timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS || 120_000),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama Error: ${response.status} ${errorText}`);
    }

    const data: any = await response.json();
    return data.message?.content || JSON.stringify(data, null, 2);
};

const getMissingToolMessage = (taskKey: string, toolMode: ToolMode, envName: string) => {
    return `**AI Tool Not Configured**\n\nThis task is set to run through a real ${toolMode} AI tool, but the connector is missing.\n\nAdd this to \`server/.env\`:\n\n\`\`\`env\n${envName}=http://localhost:YOUR_TOOL_PORT\n\`\`\`\n\nTask: \`${taskKey}\`\nMode: \`${toolMode}\`\n\nNo local fallback was used.`;
};

const runIntegratedAiTool = async ({
    taskKey,
    toolMode,
    message,
    activity,
    modelName,
    messagesForAI,
    ollamaUrl,
}: {
    taskKey: string;
    toolMode: ToolMode;
    message: string;
    activity: ActivityContext | null;
    modelName: string;
    messagesForAI: Array<{ role: string; content: string }>;
    ollamaUrl: string;
}): Promise<ToolResult> => {
    const envName = taskToolEnv[taskKey]?.[toolMode] || taskToolEnv.general[toolMode];
    const toolUrl = process.env[envName]?.trim();

    if (toolMode === "offline" && (taskKey === "prompting" || taskKey === "general")) {
        return {
            handled: true,
            reply: await callOllamaTool(ollamaUrl, modelName, messagesForAI),
        };
    }

    if (!toolUrl) {
        return {
            handled: true,
            reply: getMissingToolMessage(taskKey, toolMode, envName),
        };
    }

    if (taskKey === "translation" && envName === "LIBRETRANSLATE_URL") {
        return {
            handled: true,
            reply: await callLibreTranslateTool(toolUrl, message),
        };
    }

    try {
        const reply = await callHttpAiTool(toolUrl, {
            input: message,
            task: taskKey,
            mode: toolMode,
            activity,
        });

        return { handled: true, reply };
    } catch (err) {
        // If an online tool is misconfigured (common: 405), fall back to local Ollama for prompt/general tasks.
        const canFallbackToOllama = (taskKey === "prompting" || taskKey === "general") && (ollamaUrl?.trim()?.length ?? 0) > 0;
        if (toolMode === "online" && canFallbackToOllama) {
            try {
                const localReply = await callOllamaTool(ollamaUrl, modelName, messagesForAI);
                return {
                    handled: true,
                    reply: `**Online tool unavailable — switched to offline model**\n\n${formatToolConfigHint(toolMode, taskKey, toolUrl)}\n\n${err instanceof Error ? err.message : "Unknown tool error"}\n\n---\n\n${localReply}`,
                };
            } catch (fallbackErr) {
                return {
                    handled: true,
                    reply: `**AI Tool Error**\n\nThe configured ${toolMode} tool for \`${taskKey}\` failed, and the offline fallback also failed.\n\n${err instanceof Error ? err.message : "Unknown tool error"}\n\nOffline fallback error: ${fallbackErr instanceof Error ? fallbackErr.message : "Unknown fallback error"}\n\n${formatToolConfigHint(toolMode, taskKey, toolUrl)}`,
                };
            }
        }

        return {
            handled: true,
            reply: `**AI Tool Error**\n\nThe configured ${toolMode} tool for \`${taskKey}\` failed.\n\n${err instanceof Error ? err.message : "Unknown tool error"}\n\n${formatToolConfigHint(toolMode, taskKey, toolUrl)}`,
        };
    }
};

export const askAI = async (req: any, res: Response): Promise<void> => {
    try {
        const { message, chatId, modelId, activityId } = req.body;
        const userId = req.user.id;
        const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";

        // 1. Get Model info
        let modelName = "phi"; // Default fallback
        let modelType = "offline";
        if (modelId) {
            const modelObj = await prisma.aIModel.findUnique({ where: { id: modelId } });
            if (modelObj) {
                modelName = modelObj.name;
                modelType = modelObj.type;
            }
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
        let currentActivity: ActivityContext | null = null;
        if (activityId) {
            const activity = await prisma.content.findUnique({ where: { id: activityId } });
            if (activity) {
                currentActivity = activity;
                contextText = `CURRENT TASK: ${activity.title}
CATEGORY: ${activity.category || "General"}
MODE: ${activity.type}
DESCRIPTION: ${activity.body}
STRICT TASK RULES:
- Keep every response focused on this task only.
- If the learner asks something unrelated, briefly redirect them back to the current task.
- Produce outputs in the format expected by this task.
- Give practical steps, examples, and a final usable deliverable.
- Do not mark the task complete unless the learner has produced or reviewed the deliverable.`;
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
5. When a current task is supplied, act as a task-specific workspace, not a generic chatbot.

${contextText ? `CONTEXTUAL DATA:\n${contextText}` : ""}`;

        const messagesForAI = [
            { role: "system", content: systemMessage },
            ...history.map(m => ({ role: m.role, content: m.content }))
        ];

        let assistantReply = "";
        const taskKey = getTaskKey(currentActivity);
        const toolMode = getToolMode(modelType);

        try {
            const taskToolResult = await runIntegratedAiTool({
                taskKey,
                toolMode,
                message,
                activity: currentActivity,
                modelName,
                messagesForAI,
                ollamaUrl,
            });

            if (taskToolResult.handled && taskToolResult.reply) {
                assistantReply = taskToolResult.reply;
            }
        } catch (err) {
            console.error("AI tool failed:", err);
            assistantReply = `**AI Tool Error**\n\nThe configured ${toolMode} tool for \`${taskKey}\` failed.\n\n${err instanceof Error ? err.message : "Unknown tool error"}\n\nNo local fallback was used.`;
        }

        if (!assistantReply.trim()) {
            assistantReply = "AI did not return a response. Check that your offline model service (Ollama) is running and the selected model is installed.";
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
