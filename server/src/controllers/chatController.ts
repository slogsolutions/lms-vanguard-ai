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

const getLibreTranslateEndpoint = (toolUrl: string) => {
    const normalizedUrl = toolUrl.replace(/\/+$/, "");
    return normalizedUrl.endsWith("/translate") ? normalizedUrl : `${normalizedUrl}/translate`;
};

const callLibreTranslateTool = async (toolUrl: string, message: string, targetLanguage?: string) => {
    const response = await fetch(getLibreTranslateEndpoint(toolUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            q: message,
            source: "auto",
            target: targetLanguage || process.env.TRANSLATE_TARGET || "hi",
            format: "text",
        }),
    });

    const responseText = await response.text();
    let data: any;
    try {
        data = JSON.parse(responseText);
    } catch {
        throw new Error(`LibreTranslate returned non-JSON response. Check LIBRETRANSLATE_URL. Response starts with: ${responseText.slice(0, 80)}`);
    }

    if (!response.ok) {
        throw new Error(`LibreTranslate error ${response.status}: ${JSON.stringify(data)}`);
    }

    return data.translatedText || JSON.stringify(data, null, 2);
};

const callOllamaTool = async (
    ollamaUrl: string,
    modelName: string,
    messages: Array<{ role: string; content: string }>,
    options: Record<string, unknown> = {},
) => {
    const base = withTrailingSlashTrimmed(ollamaUrl);
    const ollamaModel = await resolveOllamaModel(base, modelName);
    const response = await fetchWithTimeout(`${base}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: ollamaModel,
            messages,
            stream: false,
            options: {
                temperature: 0.25,
                top_p: 0.9,
                repeat_penalty: 1.08,
                num_predict: 420,
                num_ctx: 2048,
                ...options,
            }
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

const cleanPromptingReply = (reply: string) => {
    return reply
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/^\s*\*\s+/gm, "- ")
        .replace(/```(?:text|markdown)?\s*/g, "")
        .replace(/```/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
};

const buildPromptingMessages = (
    message: string,
    history: Array<{ role: string; content: string }>,
    activity: ActivityContext | null,
) => {
    const recentHistory = history
        .slice(-8)
        .filter(m => m.content?.trim())
        .map(m => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
        }));

    const lastHistoryMessage = recentHistory[recentHistory.length - 1];
    const hasCurrentMessage = lastHistoryMessage?.role === "user" && lastHistoryMessage.content === message;

    return [
        {
            role: "system",
            content: `You are a precise Prompt Builder and chat assistant inside a training workspace.

Primary job:
- Answer the user's question directly.
- Generate a prompt only when the user clearly asks for a prompt, asks to improve a prompt, or provides rough prompt text.
- When given a rough prompt, improve it with role, context, task, constraints, output format, and examples if useful.
- When chatting normally, be helpful and concise without forcing every answer into a lesson.

Identity and conduct:
- Your name is Defence AI Lab Assistant.
- Never invent another assistant name, personal history, location, rank, or organization.
- Keep every response professional, respectful, and suitable for a training platform.
- Do not generate vulgar, sexually explicit, abusive, hateful, or insulting content.
- If the user asks for vulgar or unsafe content, refuse briefly and offer a clean alternative.
- If the user writes in Hindi/Hinglish, answer naturally in Hindi/Hinglish unless they ask for English.
- If the message is a greeting or casual chat, reply like normal chat. Do not create a prompt.

Response rules:
- Start with the useful answer, not a long explanation.
- Use clear headings only when they help.
- Use plain text formatting. Do not use Markdown bold markers like **text**.
- Prefer short sections with simple hyphen bullets.
- Keep normal answers short: 2-6 lines unless the user asks for detail.
- For explicit prompt generation requests, provide:
  1. Final Prompt as a full copy-paste prompt, not a short title
  2. Why it works
  3. Optional variations, only if useful
- The Final Prompt must include enough detail for another AI model to perform the task without extra explanation.
- Ask a follow-up only when required information is missing.
- Do not overuse military analogies.
- Do not refuse normal prompt-writing, summarizing, rewriting, planning, coding, or chatting requests.
- Before answering, decide the user's intent:
  - greeting/chat: answer directly
  - question: answer directly
  - prompt request: create or improve a prompt
  - unclear typo: answer the most likely meaning and ask a short clarification if needed

Workspace task: ${activity?.title || "Basic Prompting"}
Task description: ${activity?.body || "Practice prompt writing, prompt improvement, and AI chat."}`,
        },
        ...recentHistory,
        ...(hasCurrentMessage ? [] : [{ role: "user", content: message }]),
    ];
};

const getPromptingDirectReply = (message: string) => {
    const text = message.trim().toLowerCase();
    const normalized = text.replace(/[^a-z0-9\u0900-\u097f\s]/g, " ").replace(/\s+/g, " ").trim();

    const unsafePattern = /\b(vulgar|abuse|abusive|sex|sexual|porn|nude|gaali|gali|गाली|अश्लील|गंदा|भद्दा)\b/i;
    if (unsafePattern.test(normalized)) {
        return "I cannot create vulgar, abusive, or explicit content. I can help make it formal, respectful, humorous in a clean way, or suitable for training use.";
    }

    const greetingPattern = /^(hi|hello|hey|namaste|namaskar|नमस्ते|नमस्कार|kaise ho|kaise ho aap|कैसे हो|आप कैसे हो|aap kaise ho)\b/i;
    if (greetingPattern.test(normalized)) {
        if (/kaise|कैसे/.test(normalized)) {
            return "Main theek hoon, dhanyavaad. Aap batayein, main prompt banana, prompt improve karna, ya kisi topic par direct answer dene mein madad kar sakta hoon.";
        }
        return "Hello. I am ready to help with chat, prompt writing, prompt improvement, examples, and task preparation.";
    }

    const identityPattern = /\b(what is your name|whats your name|what's your name|your name|tumhara naam|aapka naam|आपका नाम|तुम्हारा नाम)\b/i;
    if (identityPattern.test(normalized)) {
        return "My name is Defence AI Lab Assistant. I can help with normal chat, prompt generation, prompt improvement, summaries, and training-related task support.";
    }

    const rolePattern = /\b(what is your role|whats your role|what's your role|your role|wahts are role|what are role|role kya hai|आपकी भूमिका|tumhara role|aapka role)\b/i;
    if (rolePattern.test(normalized)) {
        return "My role is to help you use this Basic Prompting workspace. I can answer questions, create prompts, improve rough prompts, explain prompt structure, and keep the output clear and professional.";
    }

    const promptCreatePattern = /\b(create|generate|write|make|draft|prepare)\s+(a\s+|an\s+)?(precise\s+|good\s+|best\s+)?prompt\b|\bprompt\s+for\b/i;
    if (promptCreatePattern.test(normalized)) {
        const taskText = message
            .replace(/\b(create|generate|write|make|draft|prepare)\s+(a\s+|an\s+)?(precise\s+|good\s+|best\s+)?prompt\s*(for|to|about)?/i, "")
            .trim()
            || "[describe the task]";

        return `Final Prompt
You are an expert assistant.

Task: ${taskText}

Input material:
[Paste the training notes, report, paragraph, or source content here.]

Instructions:
- Use only the information provided in the input material.
- Do not invent facts, names, numbers, dates, examples, or scores.
- If important information is missing, write "Not provided" or ask a short clarification question.
- Keep the output clear, structured, and suitable for training use.

Output format:
1. Main output
2. Key points
3. Action items or next steps, if applicable
4. Short review/checklist

Why it works
It gives the AI a role, a clear task, source material boundaries, anti-hallucination rules, and a fixed output format.`;
    }

    return null;
};

const getPromptingDirectReplyOld = (message: string) => {
    const text = message.trim().toLowerCase();
    const normalized = text.replace(/[^a-z0-9\u0900-\u097f\s]/g, " ").replace(/\s+/g, " ").trim();

    const promptCreatePattern = /\b(create|generate|write|make|draft|prepare)\s+(a\s+|an\s+)?(precise\s+|good\s+|best\s+)?prompt\b|\bprompt\s+for\b/i;
    if (promptCreatePattern.test(normalized)) {
        const taskText = message
            .replace(/\b(create|generate|write|make|draft|prepare)\s+(a\s+|an\s+)?(precise\s+|good\s+|best\s+)?prompt\s*(for|to|about)?/i, "")
            .trim()
            || "[describe the task]";

        return `Final Prompt
You are an expert assistant.

Task: ${taskText}

Input material:
[Paste the training notes, report, paragraph, or source content here.]

Instructions:
- Use only the information provided in the input material.
- Do not invent facts, names, numbers, dates, examples, or scores.
- If important information is missing, write "Not provided" or ask a short clarification question.
- Keep the output clear, structured, and suitable for training use.

Output format:
1. Main output
2. Key points
3. Action items or next steps, if applicable
4. Short review/checklist

Why it works
It gives the AI a role, a clear task, source material boundaries, anti-hallucination rules, and a fixed output format.`;
    }

    return null;
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
    translateTarget,
    promptHistory,
}: {
    taskKey: string;
    toolMode: ToolMode;
    message: string;
    activity: ActivityContext | null;
    modelName: string;
    messagesForAI: Array<{ role: string; content: string }>;
    ollamaUrl: string;
    translateTarget?: string;
    promptHistory?: Array<{ role: string; content: string }>;
}): Promise<ToolResult> => {
    const envName = taskToolEnv[taskKey]?.[toolMode] || taskToolEnv.general[toolMode];
    const toolUrl = process.env[envName]?.trim();

    if (taskKey === "translation") {
        const libreUrl = process.env.LIBRETRANSLATE_URL?.trim() || toolUrl;
        if (!libreUrl) {
            return {
                handled: true,
                reply: getMissingToolMessage(taskKey, "offline", "LIBRETRANSLATE_URL"),
            };
        }

        return {
            handled: true,
            reply: await callLibreTranslateTool(libreUrl, message, translateTarget),
        };
    }

    if (taskKey === "prompting") {
        const directReply = getPromptingDirectReply(message);
        if (directReply) {
            return {
                handled: true,
                reply: directReply,
            };
        }

        return {
            handled: true,
            reply: await callOllamaTool(
                ollamaUrl,
                modelName,
                buildPromptingMessages(message, promptHistory || [], activity),
            ),
        };
    }

    if (taskKey === "communication") {
        return {
            handled: true,
            reply: await callOllamaTool(ollamaUrl, modelName, messagesForAI),
        };
    }

    if (toolMode === "offline" && (taskKey === "general" || taskKey === "summary" || taskKey === "voice" || taskKey === "quiz" || taskKey === "video" || taskKey === "conversion")) {
        return {
            handled: true,
            reply: await callOllamaTool(ollamaUrl, modelName, messagesForAI),
        };
    }

    const canFallbackToOllama = (taskKey === "prompting" || taskKey === "general" || taskKey === "voice" || taskKey === "summary" || taskKey === "communication" || taskKey === "quiz" || taskKey === "video" || taskKey === "conversion") && (ollamaUrl?.trim()?.length ?? 0) > 0;

    if (!toolUrl) {
        if (toolMode === "online" && canFallbackToOllama) {
            try {
                const localReply = await callOllamaTool(
                    ollamaUrl,
                    modelName,
                    taskKey === "prompting"
                        ? buildPromptingMessages(message, promptHistory || [], activity)
                        : messagesForAI,
                );
                return {
                    handled: true,
                    reply: `**Online tool unavailable — switched to offline model**\n\nThe dedicated connector for \`${taskKey}\` is not configured, falling back to local model.\n\n---\n\n${localReply}`,
                };
            } catch (fallbackErr) {
                // Fallback failed, let it show the missing tool message
            }
        }

        return {
            handled: true,
            reply: getMissingToolMessage(taskKey, toolMode, envName),
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
        if (toolMode === "online" && canFallbackToOllama) {
            try {
                const localReply = await callOllamaTool(
                    ollamaUrl,
                    modelName,
                    taskKey === "prompting"
                        ? buildPromptingMessages(message, promptHistory || [], activity)
                        : messagesForAI,
                );
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

const formalCommunicationSystemRules = `You are a formal communication assistant designed for structured, official writing for legitimate administrative/training use.

Your task is to generate clear, respectful, and properly formatted formal content.

Rules:
1. Support two languages only: Hindi and English.
2. Use the language specified in the input. Do NOT mix languages.
3. Maintain a formal and respectful tone at all times.
4. Do NOT add unnecessary creativity or informal phrases.
5. Follow the exact structure based on the selected type.
6. Keep sentences clear, concise, and professional.
7. Do NOT fabricate facts (names, dates, unit details, reference numbers). Use only what the user provides.
8. Only refuse if the user explicitly requests deception/forgery/impersonation or misleading content. Otherwise, comply normally.

Supported Types:
- Email
- Letter
- Message
- Notice
- Application
- Report

Formatting Rules:

[Email]
To: <receiver>
Subject: <subject>

<Salutation>

<Body>

<Closing>
<Sender Name>

---

[Letter]
To,
<Receiver Details>

Subject: <subject>

<Salutation>

<Body>

<Closing>
<Sender Name>

---

[Message]
<Short formal message content>
- <Sender Name>

---

[Notice]
NOTICE

<Title>
Date: <date>

<Content>

<Authority Name>

---

[Application]
To,
<Authority>

Subject: <subject>

<Salutation>

I respectfully wish to state that <purpose>.
<Details>

Kindly consider my request.

<Closing>
<Sender Name>

---

[Report]
REPORT

Date: <date>
Location: <location>

Subject: <subject>

<Description of incident or details>

<Conclusion>

<Sender Name>

---

Tone Guidelines:
- English: Use phrases like "I respectfully request", "Kindly consider", "I wish to inform".
- Hindi: Use phrases like "सविनय निवेदन है", "कृपया विचार करें", "मैं यह सूचित करना चाहता हूँ".

Output:
- Only return the final formatted content.
- Do NOT include explanations.

Refusal rule (only when necessary):
- If the user explicitly asks to deceive/mislead/forge/impersonate, respond with exactly:
I cannot assist with generating content that may be used to deceive or mislead others. Is there anything else I can help you with?`;

export const askAI = async (req: any, res: Response): Promise<void> => {
    try {
        const { message, chatId, modelId, activityId, translateTarget } = req.body;
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

        const taskKey = getTaskKey(currentActivity);

        let finalSystemMessage = systemMessage;

        if (taskKey === "voice") {
            finalSystemMessage = `You are a strict Text-to-Speech (TTS) Script Generator.
Your ONLY purpose is to generate the EXACT text to be spoken by a TTS audio engine.

CRITICAL RULES:
1. NEVER introduce yourself, your role, or mention the LMS.
2. NEVER add conversational filler like "Here is the script:", "Sure!", or "As an AI...".
3. DO NOT provide instructions or explain what you are doing.
4. If the user inputs a simple word or phrase (e.g. "hello world"), simply output that exact phrase so the engine can speak it.
5. If the user asks you to write a story, speech, or script, output ONLY the spoken words.
6. The output must be pure text, ready to be read aloud immediately.`;
        } else if (taskKey === "communication") {
            finalSystemMessage += `\n\nFORMAL COMMUNICATION TASK RULES:\n${formalCommunicationSystemRules}\n`;
        }

        const messagesForAI = [
            { role: "system", content: finalSystemMessage },
            ...history.map(m => ({ role: m.role, content: m.content }))
        ];

        let assistantReply = "";
        const toolMode = getToolMode(modelType);

        if (taskKey === "voice") {
            assistantReply = message;
        } else {
            try {
                const taskToolResult = await runIntegratedAiTool({
                    taskKey,
                    toolMode,
                    message,
                    activity: currentActivity,
                    modelName,
                    messagesForAI,
                    ollamaUrl,
                    translateTarget,
                    promptHistory: history.map(m => ({ role: m.role, content: m.content })),
                });

                if (taskToolResult.handled && taskToolResult.reply) {
                    assistantReply = taskToolResult.reply;
                }
            } catch (err) {
                console.error("AI tool failed:", err);
                assistantReply = `**AI Tool Error**\n\nThe configured ${toolMode} tool for \`${taskKey}\` failed.\n\n${err instanceof Error ? err.message : "Unknown tool error"}\n\nNo local fallback was used.`;
            }
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
