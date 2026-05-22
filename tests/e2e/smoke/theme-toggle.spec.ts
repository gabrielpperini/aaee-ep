import { test, expect } from "../fixtures";

test.describe("Theme toggle — light/dark", () => {
  test("clicar alterna a classe dark no <html>", async ({ asDirector }) => {
    await asDirector.goto("/");

    const initial = await asDirector.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );

    await asDirector.getByRole("button", { name: "Alternar tema" }).first().click();

    // Aguarda o `next-themes` aplicar a classe.
    await expect
      .poll(async () =>
        asDirector.evaluate(() => document.documentElement.classList.contains("dark")),
      )
      .toBe(!initial);
  });
});
