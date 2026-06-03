import type { Row } from "@tanstack/react-table";

import { normalizeSearch } from "@/lib/utils";

/**
 * Faceta de coluna escalar: mantém a linha quando o valor (string) está entre
 * os selecionados. `filterValue` é o array de valores marcados na faceta.
 *
 * Declarada como função genérica (em vez de `FilterFn<unknown>`) para inferir
 * `TData` no ponto de uso — `FilterFn<T>` é invariante em `T`.
 */
export function equalsAnyFilter<TData>(
  row: Row<TData>,
  columnId: string,
  filterValue: unknown,
): boolean {
  const selected = filterValue as string[] | undefined;
  if (!selected?.length) return true;
  return selected.includes(row.getValue<string>(columnId));
}

/**
 * Faceta de coluna com valor em array (ex: ids de modalidade, tags de
 * participação): mantém a linha quando há interseção com os selecionados.
 */
export function arrayOverlapFilter<TData>(
  row: Row<TData>,
  columnId: string,
  filterValue: unknown,
): boolean {
  const selected = filterValue as string[] | undefined;
  if (!selected?.length) return true;
  const values = row.getValue<string[]>(columnId) ?? [];
  return selected.some((v) => values.includes(v));
}

/**
 * Busca textual global: substring insensível a acento e caixa. Substitui o
 * `includesString` nativo do TanStack (sensível a acento) na coluna de busca.
 */
export function includesNormalized<TData>(
  row: Row<TData>,
  columnId: string,
  filterValue: unknown,
): boolean {
  const cell = normalizeSearch(String(row.getValue(columnId) ?? ""));
  return cell.includes(normalizeSearch(String(filterValue ?? "")));
}
