import { test, expect } from "../fixtures";

// Itens do nav-items.ts agrupados pelo role mínimo.
const ALWAYS_VISIBLE = ["Início", "Agenda", "Meu horário", "Mapa", "Meu perfil"];
const DIRECTOR_ITEMS = ["Dashboard", "Eventos", "Pessoas", "Modalidades", "Locais", "Edição do EP"];
const ADMIN_ONLY = ["Usuários"];

async function visibleNavLabels(page: import("@playwright/test").Page): Promise<string[]> {
  // Sidebar desktop ou mobile-nav — basta achar todos os links cujo texto
  // bate com algum dos labels conhecidos. Os spans são `truncate`, então
  // o textContent é exatamente o label.
  const links = await page.locator("nav a, [role='navigation'] a").allTextContents();
  return links.map((t) => t.trim());
}

test.describe("Sidebar — visibilidade por role", () => {
  test("USER comum só vê o grupo principal", async ({ asUser }) => {
    await asUser.goto("/");
    const labels = await visibleNavLabels(asUser);

    for (const item of ALWAYS_VISIBLE) {
      expect(labels, `USER deveria ver "${item}"`).toContain(item);
    }
    for (const item of DIRECTOR_ITEMS) {
      expect(labels, `USER NÃO deveria ver "${item}"`).not.toContain(item);
    }
    for (const item of ADMIN_ONLY) {
      expect(labels, `USER NÃO deveria ver "${item}"`).not.toContain(item);
    }
  });

  test("DIRECTOR vê grupos principal e gestão, mas não admin", async ({ asDirector }) => {
    await asDirector.goto("/");
    const labels = await visibleNavLabels(asDirector);

    for (const item of [...ALWAYS_VISIBLE, ...DIRECTOR_ITEMS]) {
      expect(labels).toContain(item);
    }
    for (const item of ADMIN_ONLY) {
      expect(labels).not.toContain(item);
    }
  });

  test("ADMIN vê tudo", async ({ asAdmin }) => {
    await asAdmin.goto("/");
    const labels = await visibleNavLabels(asAdmin);

    for (const item of [...ALWAYS_VISIBLE, ...DIRECTOR_ITEMS, ...ADMIN_ONLY]) {
      expect(labels).toContain(item);
    }
  });
});
