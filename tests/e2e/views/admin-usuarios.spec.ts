import { test, expect } from "../fixtures";

test.beforeEach(async ({ reseed }) => {
  await reseed();
});

test.describe("Admin · Usuários", () => {
  test("ADMIN promove USER comum a DIRECTOR", async ({ asAdmin }) => {
    await asAdmin.goto("/admin/usuarios");
    await expect(asAdmin.getByRole("heading", { name: "Usuários" })).toBeVisible();

    // Localiza linha do user@test.local e abre Editar
    const row = asAdmin.locator("tbody tr").filter({ hasText: "user@test.local" });
    await expect(row).toBeVisible();
    await row.getByRole("button").first().click(); // toggle do dropdown
    await asAdmin.getByRole("menuitem", { name: "Editar" }).click();

    const dialog = asAdmin.getByRole("dialog");
    await expect(dialog.getByText("Editar usuário")).toBeVisible();

    // Função (base-ui Select) — abre o trigger e clica 'Diretor'
    await dialog.getByLabel("Função").click();
    await asAdmin.getByRole("option", { name: "Diretor" }).click();

    await dialog.getByRole("button", { name: /Salvar/i }).click();

    // Linha agora mostra papel "Diretor"
    await expect(
      asAdmin.locator("tbody tr").filter({ hasText: "user@test.local" }),
    ).toContainText(/Diretor/);
  });

  test("DIRECTOR não acessa /admin/usuarios", async ({ asDirector }) => {
    await asDirector.goto("/admin/usuarios");
    await expect(asDirector).toHaveURL("/");
  });
});
