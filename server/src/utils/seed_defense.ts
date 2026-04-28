import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const AI_MODELS = [
  { name: "llama3.2:1b", type: "offline", provider: "Ollama", status: "online", desc: "Local Ollama model - installed" },
  { name: "Mistral 7B", type: "offline", provider: "Ollama", status: "online", desc: "Local LLM • Fast inference" },
  { name: "Phi-3 Mini", type: "offline", provider: "Ollama", status: "online", desc: "Local LLM • Compact" },
  { name: "Gemma 2 9B", type: "offline", provider: "Ollama", status: "online", desc: "Local LLM • Google base" },
  { name: "Gemini 1.5 Pro", type: "online", provider: "Google Gemini", status: "online", desc: "Online • Multimodal" },
  { name: "Claude Sonnet 4", type: "online", provider: "Anthropic", status: "online", desc: "Online • Reasoning" },
  { name: "GPT-4o", type: "online", provider: "OpenAI Canvas", status: "online", desc: "Online • Canvas-capable" },
  { name: "Microsoft Copilot", type: "online", provider: "Microsoft", status: "online", desc: "Online • Office integrated" },
  { name: "Perplexity AI", type: "online", provider: "Perplexity", status: "online", desc: "Online • Web search AI" },
];

const ACTIVITIES = [
  { title: "Basic Prompting", body: "Task: Practice basic prompting by writing clear instructions and refining the AI response.", type: "Offline+Online", duration: "15 min", difficulty: "Beginner", category: "Prompt Design", maxScore: 100 },
  { title: "Generate Video Based on Prompt", body: "Task: Generate a video concept or video output based on a written prompt.", type: "Online", duration: "30 min", difficulty: "Beginner", category: "Video Generation", maxScore: 100 },
  { title: "Create AI Voice Based on Text", body: "Task: Convert written text into an AI-generated voice or narration.", type: "Online", duration: "20 min", difficulty: "Beginner", category: "Voice Generation", maxScore: 100 },
  { title: "Summarize Excel, Word, or PDF Data", body: "Task: Summarize the provided Excel, Word, or PDF data into key points.", type: "Offline+Online", duration: "25 min", difficulty: "Beginner", category: "Summarization", maxScore: 100 },
  { title: "Quiz Maker from Data", body: "Task: Create a quiz from the given data, including questions and answer options.", type: "Offline+Online", duration: "20 min", difficulty: "Beginner", category: "Assessment", maxScore: 100 },
  { title: "Global Translation", body: "Task: Translate the provided text into multiple languages for global communication.", type: "Offline+Online", duration: "15 min", difficulty: "Beginner", category: "Translation", maxScore: 100 },
  { title: "Convert Data into Excel, PDF, or Word", body: "Task: Convert the given data into Excel, PDF, or Word format as required.", type: "Offline+Online", duration: "25 min", difficulty: "Beginner", category: "Data Conversion", maxScore: 100 },
  { title: "Formal Communication", body: "Task: Draft a formal message, letter, or email using a clear and respectful tone.", type: "Offline", duration: "15 min", difficulty: "Beginner", category: "Communication", maxScore: 100 },
];

const CANDIDATES = [
  { serviceId: "BEG001", name: "Sep Arjun Kumar", rank: "Sepoy", batch: "2026-A", unit: "BEG Centre", email: "arjun@army.mil", progress: 75, completed: 9, score: 82 },
  { serviceId: "BEG002", name: "Hav Rajesh Singh", rank: "Havildar", batch: "2026-A", unit: "BEG Centre", email: "rajesh@army.mil", progress: 100, completed: 12, score: 91 },
  { serviceId: "BEG003", name: "Rfn Suresh Yadav", rank: "Rifleman", batch: "2026-A", unit: "10 Inf Div", email: "suresh@army.mil", progress: 50, completed: 6, score: 74 },
  { serviceId: "BEG004", name: "Lt Priya Sharma", rank: "Lieutenant", batch: "2026-B", unit: "Corps HQ", email: "priya@army.mil", progress: 33, completed: 4, score: 68 },
  { serviceId: "BEG005", name: "Spr Vikram Tiwari", rank: "Sapper", batch: "2026-B", unit: "BEG Centre", email: "vikram@army.mil", progress: 83, completed: 10, score: 88 },
  { serviceId: "BEG006", name: "Nb Sub Mohan Lal", rank: "Nb Subedar", batch: "2026-A", unit: "EME Corps", email: "mohan@army.mil", progress: 0, completed: 0, score: 0 },
];

async function seed() {
  console.log("🌱 Starting High School Level Defense AI Lab Seeding...");

  await prisma.aIModel.deleteMany();
  await prisma.userProgress.deleteMany();
  await prisma.content.deleteMany();
  await prisma.user.deleteMany();

  for (const m of AI_MODELS) {
    await prisma.aIModel.create({ data: m });
  }

  const createdActivities = [];
  for (const a of ACTIVITIES) {
    const content = await prisma.content.create({ data: a });
    createdActivities.push(content);
  }

  const hashedPassword = await bcrypt.hash("defense123", 10);
  for (const c of CANDIDATES) {
    const { progress, completed, score, ...userData } = c;
    const user = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        role: c.rank === "Lieutenant" ? "admin" : "soldier",
      }
    });

    for (let i = 0; i < Math.min(completed, createdActivities.length); i++) {
      await prisma.userProgress.create({
        data: {
          userId: user.id,
          contentId: createdActivities[i].id,
          completed: true,
          status: "completed",
          score: score,
          modelUsed: AI_MODELS[i % AI_MODELS.length].name
        }
      });
    }
  }
  console.log("🚀 Seeding Complete with High School Level Tasks!");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
