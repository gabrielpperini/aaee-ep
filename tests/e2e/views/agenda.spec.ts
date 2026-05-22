import { test, expect } from "../fixtures";

test.beforeEach(async ({ reseed }) => {
  await reseed();
});

test.describe("Agenda — 5 dias", () => {
  test("renderiza pra USER comum", async ({ asUser }) => {
    await asUser.goto("/agenda");
    await expect(asUser.getByRole("heading", { name: "Agenda" })).toBeVisible();

    await expect(asUser.getByText("Vôlei — Em andamento")).toBeVisible();
    await expect(asUser.getByText("Ida — Embarque ônibus")).toBeVisible();
    await expect(asUser.getByText("Volta — Desembarque")).toBeVisible();
  });

  test("evento cancelado mostra badge 'Cancelado'", async ({ asUser }) => {
    await asUser.goto("/agenda");
    const card = asUser.getByRole("link").filter({ hasText: "Trote — Cancelado" });
    // Mobile + desktop layouts duplicam o badge — pegamos só o visível.
    await expect(
      card.locator('[data-slot="badge"]:visible', { hasText: "Cancelado" }).first(),
    ).toBeVisible();
  });

  test("evento condicional mostra badge 'Condicional'", async ({ asUser }) => {
    // Agenda usa STATUS_LABELS (não o derivado), então um evento
    // isConditional=true aparece como 'Confirmado' + badge auxiliar 'Condicional'.
    await asUser.goto("/agenda");
    const card = asUser.getByRole("link").filter({ hasText: "Showmício — Possível" });
    await expect(card.getByText(/Condicional/i).first()).toBeVisible();
  });
});
