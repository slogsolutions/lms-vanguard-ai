import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(process.cwd(), '.env') });
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  // Production: create a new instance
  prisma = new PrismaClient();
} else {
  // Development: reuse instance to prevent too many connections
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: ["query", "error", "warn"],
    });
  }
  prisma = globalForPrisma.prisma;
}

// Graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

export { prisma };
