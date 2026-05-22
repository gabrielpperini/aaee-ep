import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { request, type FullConfig } from "@playwright/test";
import { PERSONAS, authDir, storageStatePath } from "./personas";

/**
 * Roda 1x antes de todas as suítes:
 * 1. Aplica migrations no banco de teste (idempotente).
 * 2. Reseta + popula via `pnpm tsx src/lib/e2e-seed.ts` (processo separado
 *    porque o Prisma client gerado é CommonJS — o loader ESM do Playwright
 *    não consegue importá-lo direto).
 * 3. Loga cada persona via /api/e2e/login e salva storageState em
 *    tests/e2e/.auth/<key>.json — usado pelos fixtures.
 */
export default async function globalSetup(config: FullConfig) {
  const env = process.env as NodeJS.ProcessEnv;

  // -- 1. migrations
  try {
    execSync("pnpm exec prisma migrate deploy", { stdio: "inherit", env });
  } catch {
    throw new Error(
      "Falha ao aplicar migrations. Suba o banco com `pnpm test:db:up` antes.",
    );
  }

  // -- 2. seed (subprocesso pra contornar o loader ESM do Playwright)
  execSync("pnpm exec tsx src/lib/e2e-seed.ts", { stdio: "inherit", env });

  // -- 3. storageStates por persona
  mkdirSync(authDir(), { recursive: true });

  const baseURL = config.projects[0].use.baseURL!;
  for (const persona of PERSONAS) {
    const ctx = await request.newContext({ baseURL });
    const res = await ctx.post("/api/e2e/login", {
      data: { email: persona.email, password: "test-password" },
    });
    if (!res.ok()) {
      throw new Error(
        `Falha ao logar persona ${persona.key} (${persona.email}): ${res.status()} ${await res.text()}`,
      );
    }
    await ctx.storageState({ path: storageStatePath(persona.key) });
    await ctx.dispose();
  }
}
