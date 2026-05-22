import { test, expect } from "../fixtures";

test.beforeEach(async ({ reseed }) => {
  await reseed();
});

test.describe("Admin · Edição do EP", () => {
  test("DIRECTOR atualiza nome da edição", async ({ asDirector }) => {
    await asDirector.goto("/admin/ep");
    await expect(asDirector.getByRole("heading", { name: "Edição do EP" })).toBeVisible();

    await asDirector.getByLabel("Nome da edição").fill("EP 2026 — Edição Teste");
    await asDirector.getByRole("button", { name: /Salvar/i }).click();

    // Toast / success: o campo persiste após reload.
    await asDirector.reload();
    await expect(asDirector.getByLabel("Nome da edição")).toHaveValue("EP 2026 — Edição Teste");
  });

  test("DIRECTOR atualiza data do Dia 2", async ({ asDirector }) => {
    await asDirector.goto("/admin/ep");
    // Input type="date" aceita ISO YYYY-MM-DD via .fill()
    await asDirector.getByLabel("Dia 2 · competição").fill("2026-06-15");
    await asDirector.getByRole("button", { name: /Salvar/i }).click();

    await asDirector.reload();
    await expect(asDirector.getByLabel("Dia 2 · competição")).toHaveValue("2026-06-15");
  });

  test("USER comum não acessa /admin/ep", async ({ asUser }) => {
    await asUser.goto("/admin/ep");
    await expect(asUser).toHaveURL("/");
  });
});
