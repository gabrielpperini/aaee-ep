import "dotenv/config";
import { defineConfig } from "prisma/config";

// DIRECT_URL aponta para conexão direta ao Postgres do Supabase (porta 5432).
// É o que o Prisma Migrate precisa, já que pgbouncer não suporta os comandos
// de migração. Em runtime usamos DATABASE_URL via lib/prisma.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
