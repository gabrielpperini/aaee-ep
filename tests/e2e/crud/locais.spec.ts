import { test, expect } from "../fixtures";
import { inTable, confirmDelete } from "../helpers";

test.beforeEach(async ({ reseed }) => {
  await reseed();
});

test.describe("Locais — CRUD", () => {
  test("DIRECTOR cria, edita e exclui um local", async ({ asDirector }) => {
    await asDirector.goto("/locais");

    // ---- create
    await asDirector.getByRole("button", { name: /Novo local/i }).click();
    const dialog = asDirector.getByRole("dialog");
    await expect(dialog.getByText("Novo local")).toBeVisible();
    await dialog.getByLabel("Nome *").fill("Quadra da Música");
    await dialog.getByLabel("Endereço").fill("Rua dos Sons, 42");
    await dialog.getByRole("button", { name: /Salvar|Criar/i }).click();

    await expect(inTable(asDirector).getByText("Quadra da Música")).toBeVisible();

    // ---- edit
    await asDirector.getByRole("button", { name: "Ações para Quadra da Música" }).click();
    await asDirector.getByRole("menuitem", { name: "Editar" }).click();
    const editDialog = asDirector.getByRole("dialog");
    await expect(editDialog.getByText("Editar local")).toBeVisible();
    await editDialog.getByLabel("Nome *").fill("Quadra Coberta");
    await editDialog.getByRole("button", { name: /Salvar/i }).click();

    await expect(inTable(asDirector).getByText("Quadra Coberta")).toBeVisible();
    await expect(inTable(asDirector).getByText("Quadra da Música")).not.toBeVisible();
    // Garante que o dialog de edição fechou (seu overlay bloquearia o menu).
    await expect(asDirector.getByRole("dialog")).toHaveCount(0);

    // ---- delete
    await asDirector.getByRole("button", { name: "Ações para Quadra Coberta" }).click();
    await asDirector.getByRole("menuitem", { name: "Excluir" }).click();
    await confirmDelete(asDirector);
    await expect(inTable(asDirector).getByText("Quadra Coberta")).not.toBeVisible();
  });

  test("excluir local com evento associado é bloqueado (onDelete Restrict)", async ({ asDirector }) => {
    await asDirector.goto("/locais");

    await asDirector.getByRole("button", { name: "Ações para Ginásio Principal" }).click();
    await asDirector.getByRole("menuitem", { name: "Excluir" }).click();
    await confirmDelete(asDirector);

    // Continua na lista — Restrict barra a operação.
    await expect(inTable(asDirector).getByText("Ginásio Principal")).toBeVisible();
  });

  test("USER comum não acessa /locais", async ({ asUser }) => {
    await asUser.goto("/locais");
    await expect(asUser).toHaveURL("/");
  });
});
