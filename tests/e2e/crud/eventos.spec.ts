import { test, expect } from "../fixtures";

test.beforeEach(async ({ reseed }) => {
  await reseed();
});

test.describe("Eventos — listagem", () => {
  test("DIRECTOR vê todos os eventos seedados", async ({ asDirector }) => {
    await asDirector.goto("/eventos");
    await expect(asDirector.getByText("Vôlei — Em andamento")).toBeVisible();
    await expect(asDirector.getByText("Basquete — Próximo")).toBeVisible();
    await expect(asDirector.getByText("Atletismo — Finalizado")).toBeVisible();
    await expect(asDirector.getByText("Showmício — Possível")).toBeVisible();
  });

  test("badge derivado: 'Em andamento' aparece pro evento happeningNow", async ({ asDirector }) => {
    await asDirector.goto("/eventos");
    // Linha do happeningNow tem o label derivado.
    const row = asDirector.getByText("Vôlei — Em andamento").locator("..");
    await expect(row.getByText(/Em andamento/i)).toBeVisible();
  });

  test("USER comum não acessa /eventos", async ({ asUser }) => {
    await asUser.goto("/eventos");
    await expect(asUser).toHaveURL("/");
  });

  test("botão 'Novo evento' está presente para DIRECTOR", async ({ asDirector }) => {
    await asDirector.goto("/eventos");
    await expect(asDirector.getByRole("button", { name: /Novo evento/i })).toBeVisible();
  });
});

// Criar um Event via UI é caro (Combobox/DateTimePicker/Select do base-ui).
// Cobrimos esse caminho indiretamente em tests/e2e/seed.ts (que cria 9 eventos
// via Prisma) e nos testes de detalhe. Quando rolar appetite por flake, dá pra
// estender este arquivo com um fluxo de form completo.
test.describe("Eventos — UI de criação", () => {
  test.skip("TODO: criar evento via form (Combobox + DateTimePicker)", () => {});
});
