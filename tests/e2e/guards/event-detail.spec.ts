import { test, expect, type Page } from "../fixtures";

test.beforeEach(async ({ reseed }) => {
  await reseed();
});

async function openEventByTitle(page: Page, title: string): Promise<void> {
  await page.goto("/agenda");
  await page.getByRole("link").filter({ hasText: title }).first().click();
  await page.waitForURL(/\/eventos\/[^/?#]+/);
}

test.describe("Guards — visibilidade de UI no /eventos/[id]", () => {
  test("USER vê detalhes mas não vê 'Painel da diretoria'", async ({ asUser }) => {
    await openEventByTitle(asUser, "Vôlei — Em andamento");
    await expect(asUser.getByRole("heading", { name: "Vôlei — Em andamento" })).toBeVisible();
    await expect(asUser.getByText(/Painel da diretoria/i)).not.toBeVisible();
    await expect(asUser.getByPlaceholder("Buscar nome…")).not.toBeVisible();
    await expect(asUser.getByRole("button", { name: /Adiar|Cancelar/ })).toHaveCount(0);
  });

  test("DIRECTOR vê painel + ações de status", async ({ asDirector }) => {
    await openEventByTitle(asDirector, "Vôlei — Em andamento");
    await expect(asDirector.getByText(/Painel da diretoria/i)).toBeVisible();
    await expect(asDirector.getByPlaceholder("Buscar nome…")).toBeVisible();
    await expect(asDirector.getByRole("button", { name: /Adiar/ })).toBeVisible();
    await expect(asDirector.getByRole("button", { name: /Cancelar/ })).toBeVisible();
  });

  test("USER sem Person não vê botão 'Estou aqui' (precisa perfil completo)", async ({ asNolink }) => {
    await openEventByTitle(asNolink, "Vôlei — Em andamento");
    await expect(asNolink.getByRole("button", { name: /Estou aqui/ })).toHaveCount(0);
  });
});
