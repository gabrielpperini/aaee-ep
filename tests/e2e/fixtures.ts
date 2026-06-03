import { test as base, expect, type Page } from "@playwright/test";
import { PERSONAS, storageStatePath, type Persona, type PersonaKey } from "./personas";

type PersonaPages = Record<PersonaKey, Page>;

type Fixtures = {
  /** Pages prontas, autenticadas com a persona correspondente. */
  asAdmin: Page;
  asDirector: Page;
  asUser: Page;
  asSupporter: Page;
  asNolink: Page;
  /** Page deslogada (sem storageState). */
  guest: Page;
  /** Reseta + reseeda o banco antes do teste. Chame quando precisar de estado limpo. */
  reseed: () => Promise<void>;
  /** Lookup utilitário pra metadados de persona. */
  personas: typeof PERSONAS;
};

/**
 * Mesmo instante do seed/server (`E2E_FROZEN_TIME`). O server-side já é
 * determinístico via `nowDate()`, mas componentes client-side que leem
 * `new Date()` (ex: o mês default do <Calendar> no DateTimePicker) divergiriam
 * quando a data real do runner passasse do frozen. `setFixedTime` alinha o
 * relógio do browser sem pausar timers — debounce/transições seguem rodando.
 */
const FROZEN_TIME = new Date(
  process.env.E2E_FROZEN_TIME ?? "2026-05-22T15:00:00.000Z",
);

async function authedPage(browser: import("@playwright/test").Browser, key: PersonaKey): Promise<Page> {
  const ctx = await browser.newContext({ storageState: storageStatePath(key) });
  // Suprime o modal <InstallPrompt /> (abre 1200ms pós-login e seu overlay
  // bloqueia cliques nos fluxos mais longos). Nenhum teste depende dele.
  await ctx.addInitScript(() => {
    try {
      window.localStorage.setItem("install-prompt-dismissed-v1", "1");
    } catch {
      // sem storage — ignora
    }
  });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(FROZEN_TIME);
  return page;
}

export const test = base.extend<Fixtures>({
  asAdmin: async ({ browser }, use) => {
    const page = await authedPage(browser, "admin");
    await use(page);
    await page.context().close();
  },
  asDirector: async ({ browser }, use) => {
    const page = await authedPage(browser, "director");
    await use(page);
    await page.context().close();
  },
  asUser: async ({ browser }, use) => {
    const page = await authedPage(browser, "user");
    await use(page);
    await page.context().close();
  },
  asSupporter: async ({ browser }, use) => {
    const page = await authedPage(browser, "supporter");
    await use(page);
    await page.context().close();
  },
  asNolink: async ({ browser }, use) => {
    const page = await authedPage(browser, "nolink");
    await use(page);
    await page.context().close();
  },
  guest: async ({ browser }, use) => {
    const ctx = await browser.newContext(); // sem storageState
    const page = await ctx.newPage();
    await page.clock.setFixedTime(FROZEN_TIME);
    await use(page);
    await ctx.close();
  },
  reseed: async ({ request }, use) => {
    await use(async () => {
      const res = await request.post("/api/e2e/reseed");
      if (!res.ok()) throw new Error(`reseed falhou: ${res.status()}`);
    });
  },
  personas: async ({}, use) => {
    await use(PERSONAS);
  },
});

export { expect };
export type { Persona, PersonaKey, Page };
