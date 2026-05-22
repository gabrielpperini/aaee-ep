import { test, expect } from "../fixtures";
import { inTable, confirmDelete } from "../helpers";

test.beforeEach(async ({ reseed }) => {
  await reseed();
});

test.describe("Pessoas — CRUD", () => {
  test("DIRECTOR cria pessoa com nome + email", async ({ asDirector }) => {
    await asDirector.goto("/pessoas");
    await asDirector.getByRole("button", { name: /Nova pessoa/i }).click();

    const dialog = asDirector.getByRole("dialog");
    await dialog.getByLabel("Nome completo *").fill("Carlos Capitão");
    await dialog.getByLabel("Email").fill("carlos@test.local");
    await dialog.getByRole("button", { name: /Salvar/i }).click();

    await expect(inTable(asDirector).getByText("Carlos Capitão")).toBeVisible();
  });

  test("email duplicado é rejeitado", async ({ asDirector }) => {
    await asDirector.goto("/pessoas");
    await asDirector.getByRole("button", { name: /Nova pessoa/i }).click();

    const dialog = asDirector.getByRole("dialog");
    await dialog.getByLabel("Nome completo *").fill("Conflito");
    await dialog.getByLabel("Email").fill("admin@test.local");
    await dialog.getByRole("button", { name: /Salvar/i }).click();

    // FormMessage do RHF mostra o erro do server-action (fieldErrors.email).
    // Dialog permanece aberto.
    await expect(dialog).toBeVisible();
  });

  test("editar nome", async ({ asDirector }) => {
    await asDirector.goto("/pessoas");
    await asDirector.getByRole("button", { name: "Ações para Sofia Suporte" }).click();
    await asDirector.getByRole("menuitem", { name: "Editar" }).click();

    const dialog = asDirector.getByRole("dialog");
    await dialog.getByLabel("Nome completo *").fill("Sofia Soares");
    await dialog.getByRole("button", { name: /Salvar/i }).click();

    await expect(inTable(asDirector).getByText("Sofia Soares")).toBeVisible();
  });

  test("excluir pessoa sem dependências", async ({ asDirector }) => {
    await asDirector.goto("/pessoas");
    await asDirector.getByRole("button", { name: "Ações para Pedro Pendente" }).click();
    await asDirector.getByRole("menuitem", { name: "Excluir" }).click();
    await confirmDelete(asDirector);

    await expect(inTable(asDirector).getByText("Pedro Pendente")).not.toBeVisible();
  });
});
