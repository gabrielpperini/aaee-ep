import { test, expect } from "../fixtures";
import type { Page } from "@playwright/test";

test.beforeEach(async ({ reseed }) => {
  await reseed();
});

async function openEventByTitle(page: Page, title: string): Promise<string> {
  await page.goto("/agenda");
  await page.getByRole("link").filter({ hasText: title }).first().click();
  await page.waitForURL(/\/eventos\/[^/?#]+/);
  const match = page.url().match(/\/eventos\/([^/?#]+)/);
  if (!match) throw new Error(`URL inesperada: ${page.url()}`);
  return match[1];
}

test.describe("Sincronização offline — conflito de escalação", () => {
  // Cenário determinístico do seed: Ulisses é atleta em "Vôlei — Em andamento"
  // (14-16). Escalá-lo OFFLINE para "Basquete — Próximo" (15:30-17:00) sobrepõe.
  // Como o alerta é `competingElsewhere` (não `conflict`), o painel NÃO manda
  // `force` — então ao reconectar e sincronizar, vira conflito "competing".
  test("escalação offline conflitante aparece como conflito no /perfil", async ({
    asDirector,
  }) => {
    const page = asDirector;
    await openEventByTitle(page, "Basquete — Próximo");

    // O botão alterna o texto: "Só livres" (filtrando) → clicar mostra todos.
    await page.getByRole("button", { name: "Só livres" }).click();
    await page.getByPlaceholder("Buscar nome…").fill("Ulisses");
    const row = page.locator("li", { hasText: "Ulisses" });
    await expect(row.getByText(/Competindo em/i)).toBeVisible();

    // Fica offline e escala — deve enfileirar (otimista), não bloquear.
    await page.context().setOffline(true);
    await row.getByRole("button", { name: "Escalar" }).click();
    await expect(
      page.getByText(/Escalação salva offline/i).first(),
    ).toBeVisible();

    // Reconecta → o SyncProcessor drena a fila → a action retorna conflito.
    await page.context().setOffline(false);

    await page.goto("/perfil#sync");
    // O item de escalação aparece marcado como conflito, com a mensagem do servidor.
    await expect(page.getByText("Escalação").first()).toBeVisible();
    await expect(page.getByText("Conflito").first()).toBeVisible();
    await expect(page.getByText(/competindo/i).first()).toBeVisible();
    // Conflito duro (competindo) não é forçável — só "Tentar"/"Descartar".
    // `exact` pra não casar com o botão "Forçar sync agora" do cabeçalho.
    await expect(
      page.getByRole("button", { name: "Forçar", exact: true }),
    ).toHaveCount(0);
  });
});
