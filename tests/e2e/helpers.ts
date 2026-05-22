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

/** Resolve um Page a partir de Page ou Locator. */
function asPage(scope: Page | Locator): Page {
  return typeof (scope as Page).keyboard !== "undefined"
    ? (scope as Page)
    : (scope as Locator).page();
}

/**
 * Abre um Combobox a partir do FormItem que contém o label dado e clica
 * na opção que casa com o termo (regex case-insensitive).
 */
export async function pickCombobox(
  scope: Page | Locator,
  label: string,
  optionLabel: string,
): Promise<void> {
  const page = asPage(scope);
  await scope.getByLabel(label, { exact: false }).click();
  // `<CommandItem>` do cmdk renderiza com `role="option"`.
  await page.getByRole("option", { name: new RegExp(optionLabel, "i") })
    .first()
    .click();
}

/**
 * Abre um DateTimePicker e seta data + hora.
 * @param dataDay valor exato esperado em `data-day` (ptBR: `dd/MM/yyyy`).
 * @param time formato `HH:mm`.
 */
export async function pickDateTime(
  scope: Page | Locator,
  label: string,
  dataDay: string,
  time: string,
): Promise<void> {
  const page = asPage(scope);
  await scope.getByLabel(label, { exact: false }).click();
  await page.locator(`[data-day="${dataDay}"]`).first().click();
  await page.locator('input[type="time"]:visible').first().fill(time);
  await page.keyboard.press("Escape");
}
