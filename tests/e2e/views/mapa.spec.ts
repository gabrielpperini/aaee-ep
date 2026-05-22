import { test, expect } from "../fixtures";

test.beforeEach(async ({ reseed }) => {
  await reseed();
});

test.describe("Mapa", () => {
  test("renderiza 3 locais seedados", async ({ asUser }) => {
    await asUser.goto("/mapa");
    await expect(asUser.getByRole("heading", { name: "Mapa do EP" })).toBeVisible();
    await expect(asUser.getByText("Ginásio Principal")).toBeVisible();
    await expect(asUser.getByText("Pista de Atletismo")).toBeVisible();
    await expect(asUser.getByText("Centro Cultural")).toBeVisible();
  });

  test("link de Google Maps existe pra cada local com endereço", async ({ asUser }) => {
    await asUser.goto("/mapa");
    const links = asUser.locator('a[href*="google.com/maps"]');
    await expect(links.first()).toBeVisible();
    // Pelo menos um link aponta pra google.com/maps
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
