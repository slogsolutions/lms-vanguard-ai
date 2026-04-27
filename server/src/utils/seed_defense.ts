import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const AI_MODELS = [
  { name: "Llama 3.1 70B", type: "offline", provider: "Ollama", status: "online", desc: "Local LLM • No internet" },
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
  { title: "The Perfect Prompt", body: "Learn to write clear instructions. Task: Write a prompt to explain how a jet engine works to a 10-year-old child.", type: "Offline+Online", duration: "15 min", difficulty: "Beginner", category: "Prompt Design", maxScore: 100 },
  { title: "Short Story Creator", body: "Collaborative writing. Task: Work with the AI to write a 200-word sci-fi story about a brave soldier stationed on Mars.", type: "Offline", duration: "20 min", difficulty: "Beginner", category: "Creative Writing", maxScore: 100 },
  { title: "Homework Helper", body: "Simplifying complex topics. Task: Use AI to explain Pythagoras' Theorem using a real-world example like a ladder.", type: "Offline", duration: "15 min", difficulty: "Beginner", category: "Education", maxScore: 100 },
  { title: "Instant Summary", body: "Information processing. Task: Paste a news article about space exploration and ask AI to summarize it into 3 bullet points.", type: "Online", duration: "10 min", difficulty: "Beginner", category: "Summarization", maxScore: 100 },
  { title: "Grammar Guard", body: "Editing and proofreading. Task: Give AI a paragraph with 5 spelling mistakes and ask it to find and fix them.", type: "Offline", duration: "10 min", difficulty: "Beginner", category: "Language", maxScore: 100 },
  { title: "Fact Finder", body: "Verifying information. Task: Ask AI 3 questions about the 1971 war and check if the dates and names are accurate.", type: "Online", duration: "15 min", difficulty: "Beginner", category: "Research", maxScore: 100 },
  { title: "Global Translator", body: "Cross-border communication. Task: Use AI to translate 'I need medical assistance' into Hindi, Punjabi, French, Spanish, and Mandarin.", type: "Offline", duration: "15 min", difficulty: "Beginner", category: "Translation", maxScore: 100 },
  { title: "Haiku Poet", body: "Creative constraints. Task: Command the AI to write a 3-line Haiku poem about the pride of the Indian Army.", type: "Offline", duration: "10 min", difficulty: "Beginner", category: "Creative Writing", maxScore: 100 },
  { title: "Chef AI", body: "Practical logic. Task: Give AI a list of ingredients (Eggs, Onion, Bread) and ask it for a 5-minute breakfast recipe.", type: "Offline", duration: "15 min", difficulty: "Beginner", category: "Practical AI", maxScore: 100 },
  { title: "Study Quiz Maker", body: "Self-assessment. Task: Ask AI to generate a 5-question multiple-choice quiz about the planets in our Solar System.", type: "Offline", duration: "20 min", difficulty: "Beginner", category: "Education", maxScore: 100 },
  { title: "Professional Emailer", body: "Communication skills. Task: Draft a polite email to a senior officer requesting leave using a 'Professional and Respectful' tone.", type: "Offline", duration: "15 min", difficulty: "Beginner", category: "Communication", maxScore: 100 },
  { title: "Historical Roleplay", body: "Interactive history. Task: Have a 5-minute conversation with AI where it pretends to be Subhash Chandra Bose.", type: "Offline+Online", duration: "20 min", difficulty: "Beginner", category: "Roleplay", maxScore: 100 },
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

    for (let i = 0; i < completed; i++) {
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
