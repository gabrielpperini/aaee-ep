import { test, expect } from "../fixtures";
import { inTable, pickCombobox, pickDateTime } from "../helpers";

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

test.describe("Eventos — criação via form", () => {
  test("DIRECTOR cria evento preenchendo todos os campos obrigatórios", async ({ asDirector }) => {
    await asDirector.goto("/eventos");
    await asDirector.getByRole("button", { name: /Novo evento/i }).click();

    const dialog = asDirector.getByRole("dialog");
    await expect(dialog.getByText("Novo evento")).toBeVisible();

    // Título
    await dialog.getByLabel("Título *").fill("Vôlei — Teste E2E");

    // Modalidade (Combobox)
    await pickCombobox(dialog, "Modalidade *", "Vôlei");

    // Dia 1 (RadioGroup)
    await dialog.getByRole("radio", { name: "Dia 1" }).click();

    // Início e Fim (DateTimePicker) — day1 = 22/05/2026 no frozen time
    await pickDateTime(dialog, "Início *", "22/05/2026", "16:00");
    await pickDateTime(dialog, "Fim *", "22/05/2026", "17:30");

    // Salvar
    await dialog.getByRole("button", { name: /Salvar/i }).click();

    // Volta pra listagem e o evento novo aparece
    await expect(inTable(asDirector).getByText("Vôlei — Teste E2E")).toBeVisible();
  });
});
