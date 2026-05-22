import type { Page, Locator } from "@playwright/test";

/**
 * Escopo só na tabela de dados, evitando colidir com headings de Dialog
 * (`Excluir "X"?`) e outros textos repetidos fora do tbody.
 */
export function inTable(page: Page): Locator {
  return page.locator("tbody");
}

/** Confirma o delete e aguarda o dialog sumir. */
export async function confirmDelete(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  // Dialog do confirm fecha após sucesso; em caso de erro server fica aberto.
  await page.waitForTimeout(300);
}
