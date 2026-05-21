import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

async function main() {
  const email = process.argv[2];
  if (!email) {
    throw new Error("Usage: tsx scripts/confirm-user.ts <email>");
  }
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const result = await prisma.$queryRawUnsafe<unknown[]>(
    `UPDATE auth.users SET email_confirmed_at = now() WHERE email = $1 RETURNING id, email, email_confirmed_at`,
    email,
  );
  console.log("Confirmed:", JSON.stringify(result, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
