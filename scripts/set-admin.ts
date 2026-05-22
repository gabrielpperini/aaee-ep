import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const targetEmail = process.argv[2] ?? "gabrielprestes@airia.com";
  const u = await prisma.user.findFirst({ where: { email: targetEmail } });
  if (!u) {
    console.log(`User com email "${targetEmail}" não encontrado. Lista atual:`);
    const all = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
    console.table(all);
    return;
  }
  const updated = await prisma.user.update({
    where: { id: u.id },
    data: { role: "ADMIN" },
  });
  console.log("Updated:", updated);
}

main().finally(() => prisma.$disconnect());
