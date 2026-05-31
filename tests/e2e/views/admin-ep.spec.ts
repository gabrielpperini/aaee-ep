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

    // Espera a action concluir (toast) antes de recarregar — senão o reload
    // pode abortar o POST do server action em voo.
    await expect(asDirector.getByText("Edição atualizada")).toBeVisible();
    await asDirector.reload();
    await expect(asDirector.getByLabel("Nome da edição")).toHaveValue("EP 2026 — Edição Teste");
  });

  test("DIRECTOR atualiza data do Dia 2", async ({ asDirector }) => {
    await asDirector.goto("/admin/ep");
    // `.fill()` num <input type="date"> controlado pelo RHF não dispara o
    // onChange do React (o value reverte). Digitar os segmentos via teclado
    // emite eventos nativos que o RHF captura. Formato do Chromium aqui é
    // mm/dd/aaaa — daí "06152026" → 2026-06-15. O assert abaixo trava o
    // pressuposto: se outro ambiente usar dd/mm, falha aqui em vez de salvar
    // a data errada silenciosamente.
    const dia2 = asDirector.getByLabel("Dia 2 · competição");
    await dia2.click();
    await dia2.press("ArrowLeft");
    await dia2.press("ArrowLeft");
    await dia2.press("ArrowLeft");
    await dia2.pressSequentially("06152026");
    await expect(dia2).toHaveValue("2026-06-15");

    await asDirector.getByRole("button", { name: /Salvar/i }).click();
    await expect(asDirector.getByText("Edição atualizada")).toBeVisible();
    await asDirector.reload();
    await expect(dia2).toHaveValue("2026-06-15");
  });

  test("USER comum não acessa /admin/ep", async ({ asUser }) => {
    await asUser.goto("/admin/ep");
    await expect(asUser).toHaveURL("/");
  });
});
