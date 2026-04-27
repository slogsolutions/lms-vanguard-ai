import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 10);
  const user = await prisma.user.upsert({
    where: { email: "admin@slog.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@slog.com",
      password: hashedPassword,
      role: "admin"
    }
  });
  console.log("Admin created/verified: ", user.email);

  const soldier = await prisma.user.upsert({
    where: { email: "soldier@slog.com" },
    update: {},
    create: {
      name: "Soldier User",
      email: "soldier@slog.com",
      password: hashedPassword,
      role: "soldier"
    }
  });
  console.log("Soldier created/verified: ", soldier.email);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
