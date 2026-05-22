import { test, expect, type Page } from "../fixtures";

test.beforeEach(async ({ reseed }) => {
  await reseed();
});

/**
 * Navega via /agenda (que renderiza links pra detalhe) e retorna o id do
 * evento clicado, lido da URL pós-navegação. Mais robusto do que tentar
 * achar uma `link by name` exata na listagem de /eventos.
 */
async function openEventByTitle(page: Page, title: string): Promise<string> {
  await page.goto("/agenda");
  await page.getByRole("link").filter({ hasText: title }).first().click();
  await page.waitForURL(/\/eventos\/[^/?#]+/);
  const match = page.url().match(/\/eventos\/([^/?#]+)/);
  if (!match) throw new Error(`URL inesperada: ${page.url()}`);
  return match[1];
}

test.describe("Evento — alocação de torcida", () => {
  test("DIRECTOR escala uma pessoa disponível", async ({ asDirector }) => {
    await openEventByTitle(asDirector, "Basquete — Próximo");

    // Painel default filtra conflitos. Sofia tem assignment em happeningNow
    // (14-16) que sobrepõe com Basquete (15:30-17:00), então usamos Pedro
    // Pendente — sem assignments, sem competing em modalidades.
    await asDirector.getByPlaceholder("Buscar nome…").fill("Pedro");
    await asDirector.getByRole("button", { name: "Escalar" }).first().click();

    await expect(asDirector.getByText("Pedro Pendente").first()).toBeVisible();
  });

  test("USER atleta não vê o painel de gestão (sem campo 'Buscar nome…')", async ({ asUser }) => {
    await openEventByTitle(asUser, "Vôlei — Em andamento");
    await expect(asUser.getByPlaceholder("Buscar nome…")).not.toBeVisible();
  });
});

test.describe("Evento — check-in", () => {
  test("USER atleta faz check-in em evento que está rolando agora", async ({ asUser }) => {
    await openEventByTitle(asUser, "Vôlei — Em andamento");
    await asUser.getByRole("button", { name: /Estou aqui/ }).click();

    // Após sucesso: aparece estado de "Check-in feito" ou botão "Desfazer".
    await expect(asUser.getByText(/Check-in feito|Desfazer|presente/i).first()).toBeVisible();
  });
});
