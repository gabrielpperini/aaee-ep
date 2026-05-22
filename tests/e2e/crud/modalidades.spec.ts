import { test, expect } from "../fixtures";
import { inTable, confirmDelete } from "../helpers";

test.beforeEach(async ({ reseed }) => {
  await reseed();
});

test.describe("Modalidades — CRUD", () => {
  test("DIRECTOR cria modalidade com defaults (SPORT/NORMAL)", async ({ asDirector }) => {
    await asDirector.goto("/modalidades");
    await asDirector.getByRole("button", { name: /Nova modalidade/i }).click();

    const dialog = asDirector.getByRole("dialog");
    await dialog.getByLabel("Nome *").fill("Sarau de Poesia");
    await dialog.getByRole("button", { name: /Salvar/i }).click();

    await expect(inTable(asDirector).getByText("Sarau de Poesia")).toBeVisible();
  });

  test("editar nome de modalidade existente", async ({ asDirector }) => {
    await asDirector.goto("/modalidades");
    await asDirector.getByRole("button", { name: "Ações para Vôlei" }).click();
    await asDirector.getByRole("menuitem", { name: "Editar" }).click();

    const dialog = asDirector.getByRole("dialog");
    await dialog.getByLabel("Nome *").fill("Vôlei de Quadra");
    await dialog.getByRole("button", { name: /Salvar/i }).click();

    await expect(inTable(asDirector).getByText("Vôlei de Quadra")).toBeVisible();
  });

  test("excluir modalidade com eventos vinculados é bloqueado", async ({ asDirector }) => {
    await asDirector.goto("/modalidades");
    await asDirector.getByRole("button", { name: "Ações para Vôlei" }).click();
    await asDirector.getByRole("menuitem", { name: "Excluir" }).click();
    await confirmDelete(asDirector);

    await expect(inTable(asDirector).getByText("Vôlei", { exact: true })).toBeVisible();
  });
});
