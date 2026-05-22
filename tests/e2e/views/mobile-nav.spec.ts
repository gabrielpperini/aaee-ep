import { test, expect } from "../fixtures";

test.describe("Mobile nav — viewport mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 13/14

  test("DIRECTOR abre menu e vê itens dos 3 grupos", async ({ asDirector }) => {
    await asDirector.goto("/");

    // Sidebar desktop está escondida em viewport mobile.
    await asDirector.getByRole("button", { name: "Abrir menu" }).click();

    // Sheet abre com role=dialog
    const sheet = asDirector.getByRole("dialog");
    await expect(sheet).toBeVisible();

    // Itens das 3 seções
    await expect(sheet.getByRole("link", { name: /In[ií]cio/ })).toBeVisible();
    await expect(sheet.getByRole("link", { name: /Eventos/ })).toBeVisible();
    await expect(sheet.getByRole("link", { name: /Edi[çc][ãa]o do EP/ })).toBeVisible();
  });

  test("USER comum não vê itens de gestão no menu mobile", async ({ asUser }) => {
    await asUser.goto("/");
    await asUser.getByRole("button", { name: "Abrir menu" }).click();

    const sheet = asUser.getByRole("dialog");
    await expect(sheet.getByRole("link", { name: /In[ií]cio/ })).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Eventos" })).toHaveCount(0);
    await expect(sheet.getByRole("link", { name: "Pessoas" })).toHaveCount(0);
  });

  test("clicar num link do menu navega e fecha o sheet", async ({ asDirector }) => {
    await asDirector.goto("/");
    await asDirector.getByRole("button", { name: "Abrir menu" }).click();

    await asDirector.getByRole("dialog").getByRole("link", { name: /Agenda/ }).click();
    await expect(asDirector).toHaveURL("/agenda");
  });
});
