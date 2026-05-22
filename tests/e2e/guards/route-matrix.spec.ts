import { test, expect } from "../fixtures";
import { storageStatePath, type PersonaKey } from "../personas";
import type { Browser } from "@playwright/test";

async function newPageAs(browser: Browser, key: PersonaKey) {
  const ctx = await browser.newContext({ storageState: storageStatePath(key) });
  const page = await ctx.newPage();
  return { ctx, page };
}

type RouteCase = { path: string; allowed: PersonaKey[]; forbidden: PersonaKey[] };

const ROUTES: RouteCase[] = [
  { path: "/dashboard",       allowed: ["director", "admin"], forbidden: ["user"] },
  { path: "/eventos",         allowed: ["director", "admin"], forbidden: ["user"] },
  { path: "/pessoas",         allowed: ["director", "admin"], forbidden: ["user"] },
  { path: "/modalidades",     allowed: ["director", "admin"], forbidden: ["user"] },
  { path: "/locais",          allowed: ["director", "admin"], forbidden: ["user"] },
  { path: "/admin/ep",        allowed: ["director", "admin"], forbidden: ["user"] },
  { path: "/admin/usuarios",  allowed: ["admin"],             forbidden: ["user", "director"] },
];

const PUBLIC_FOR_AUTHED = ["/", "/agenda", "/disponibilidade", "/mapa", "/perfil"];

test.describe("Guards — matrix de rotas protegidas", () => {
  for (const { path, allowed, forbidden } of ROUTES) {
    for (const persona of allowed) {
      test(`${persona} pode entrar em ${path}`, async ({ browser }) => {
        const { ctx, page } = await newPageAs(browser, persona);
        await page.goto(path);
        await expect(page).toHaveURL(path);
        await ctx.close();
      });
    }
    for (const persona of forbidden) {
      test(`${persona} NÃO pode entrar em ${path}`, async ({ browser }) => {
        const { ctx, page } = await newPageAs(browser, persona);
        await page.goto(path);
        await expect(page).toHaveURL("/");
        await ctx.close();
      });
    }
  }

  for (const path of PUBLIC_FOR_AUTHED) {
    test(`USER autenticado entra em ${path} sem redirect`, async ({ asUser }) => {
      await asUser.goto(path);
      await expect(asUser).toHaveURL(path);
    });
  }
});
