import { test, expect } from "../fixtures";

/**
 * Estado da tabela (busca, facetas, ordenação, paginação) vive na URL e
 * persiste após salvar no dialog de edição (que não navega). Exercita o
 * fluxo completo na lista de /eventos.
 */
test.beforeEach(async ({ reseed }) => {
  await reseed();
});

test.describe("DataTable — estado na URL", () => {
  test("ordenação, faceta, page size e busca refletem na query string", async ({
    asDirector: page,
  }) => {
    await page.goto("/eventos");
    await expect(
      page.getByPlaceholder("Buscar por evento ou adversário…"),
    ).toBeVisible();

    // Ordenação: header começa em schedule asc (default, sem param). Clicar
    // alterna para desc → sort=-schedule.
    await page.getByRole("button", { name: "Dia / Horário" }).click();
    await page.waitForURL(/[?&]sort=-schedule\b/);

    // Faceta "Status": o botão da toolbar (haspopup=dialog) vem antes do header
    // ordenável homônimo dentro da tabela; .first() pega o trigger da faceta.
    await page
      .getByRole("button", { name: "Status" })
      .first()
      .click();
    await page.getByRole("option", { name: "Confirmado" }).click();
    await page.waitForURL(/[?&]status=CONFIRMED\b/);

    // Page size: o trigger do select (data-slot) é único; clicar nele fecha o
    // popover da faceta (outside click) antes de abrir o listbox.
    await page.locator('[data-slot="select-trigger"]').click();
    await page.getByRole("option", { name: "50", exact: true }).click();
    await page.waitForURL(/[?&]size=50\b/);

    // Busca (debounced ~300ms) → q=Basquete.
    await page
      .getByPlaceholder("Buscar por evento ou adversário…")
      .fill("Basquete");
    await page.waitForURL(/[?&]q=Basquete\b/);

    // Todos os params coexistem.
    const url = new URL(page.url());
    expect(url.searchParams.get("sort")).toBe("-schedule");
    expect(url.searchParams.get("status")).toBe("CONFIRMED");
    expect(url.searchParams.get("size")).toBe("50");
    expect(url.searchParams.get("q")).toBe("Basquete");
  });

  test("estado persiste após salvar no dialog de edição e após reload", async ({
    asDirector: page,
  }) => {
    await page.goto("/eventos?q=Basquete&sort=-schedule&size=50");

    // A busca deve estar refletida no input ao carregar a partir da URL.
    await expect(
      page.getByPlaceholder("Buscar por evento ou adversário…"),
    ).toHaveValue("Basquete");

    // Abre o dialog de edição da primeira linha visível e salva sem alterar.
    await page
      .getByRole("button", { name: /^Ações para / })
      .first()
      .click();
    await page.getByRole("menuitem", { name: "Editar" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Salvar" }).click();

    // Dialog fecha e a URL (estado da tabela) permanece intacta.
    await expect(page.getByRole("dialog")).toBeHidden();
    const after = new URL(page.url());
    expect(after.searchParams.get("q")).toBe("Basquete");
    expect(after.searchParams.get("sort")).toBe("-schedule");
    expect(after.searchParams.get("size")).toBe("50");

    // Reload restaura o estado a partir da URL.
    await page.reload();
    await expect(
      page.getByPlaceholder("Buscar por evento ou adversário…"),
    ).toHaveValue("Basquete");
  });

  test('"Limpar" remove filtros mas mantém ordenação e page size', async ({
    asDirector: page,
  }) => {
    await page.goto("/eventos?q=Basquete&status=CONFIRMED&sort=-schedule&size=50");

    await page.getByRole("button", { name: "Limpar" }).click();

    await page.waitForURL((u) => !u.searchParams.has("q"));
    const url = new URL(page.url());
    expect(url.searchParams.has("q")).toBe(false);
    expect(url.searchParams.has("status")).toBe(false);
    // Ordenação e tamanho de página não são filtros — permanecem.
    expect(url.searchParams.get("sort")).toBe("-schedule");
    expect(url.searchParams.get("size")).toBe("50");
    await expect(
      page.getByPlaceholder("Buscar por evento ou adversário…"),
    ).toHaveValue("");
  });
});
