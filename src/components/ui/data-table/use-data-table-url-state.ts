"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  ColumnFiltersState,
  OnChangeFn,
  PaginationState,
  SortingState,
  Updater,
} from "@tanstack/react-table";

import { SEARCH_COLUMN_ID } from "./data-table-toolbar";

/** Chaves de query reservadas pelo hook (não podem colidir com columnIds de faceta). */
const RESERVED = ["q", "sort", "page", "size"] as const;

function resolveUpdater<T>(updater: Updater<T>, current: T): T {
  return typeof updater === "function"
    ? (updater as (old: T) => T)(current)
    : updater;
}

function sameSorting(a: SortingState, b: SortingState): boolean {
  if (a.length !== b.length) return false;
  return a.every((s, i) => s.id === b[i].id && s.desc === b[i].desc);
}

export type DataTableUrlState = {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  pagination: PaginationState;
  onSortingChange: OnChangeFn<SortingState>;
  onColumnFiltersChange: OnChangeFn<ColumnFiltersState>;
  onPaginationChange: OnChangeFn<PaginationState>;
};

/**
 * Sincroniza o estado do TanStack Table com a query string da URL — a URL é a
 * única fonte de verdade. Cada setter reescreve a query com `router.replace`
 * (`scroll:false`), preservando params alheios. Como os forms de criação/edição
 * são dialogs (não navegam), o estado persiste automaticamente após salvar.
 */
export function useDataTableUrlState({
  initialSorting,
  pageSize,
  facetIds,
  urlKey,
}: {
  initialSorting: SortingState;
  /** Tamanho de página default (prop do DataTable). */
  pageSize: number;
  /** columnIds das facetas — filtros array, keyed pelo próprio id na URL. */
  facetIds: string[];
  /** Prefixo opcional, caso duas tabelas coexistam na mesma rota. */
  urlKey?: string;
}): DataTableUrlState {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const key = React.useCallback(
    (name: string) => (urlKey ? `${urlKey}_${name}` : name),
    [urlKey],
  );

  const facetKey = React.useMemo(() => new Set(facetIds), [facetIds]);
  const sp = searchParams.toString();

  const sorting = React.useMemo<SortingState>(() => {
    const params = new URLSearchParams(sp);
    const raw = params.get(key("sort"));
    if (raw == null) return initialSorting;
    if (raw === "") return [];
    return raw
      .split(",")
      .filter(Boolean)
      .map((tok) =>
        tok.startsWith("-")
          ? { id: tok.slice(1), desc: true }
          : { id: tok, desc: false },
      );
  }, [sp, key, initialSorting]);

  const columnFilters = React.useMemo<ColumnFiltersState>(() => {
    const params = new URLSearchParams(sp);
    const out: ColumnFiltersState = [];
    const q = params.get(key("q"));
    if (q) out.push({ id: SEARCH_COLUMN_ID, value: q });
    for (const id of facetIds) {
      const v = params.get(key(id));
      if (v) out.push({ id, value: v.split(",").filter(Boolean) });
    }
    return out;
  }, [sp, key, facetIds]);

  const pagination = React.useMemo<PaginationState>(() => {
    const params = new URLSearchParams(sp);
    const pageRaw = Number(params.get(key("page")));
    const sizeRaw = Number(params.get(key("size")));
    const pageIndex =
      Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw - 1 : 0;
    const size = Number.isInteger(sizeRaw) && sizeRaw > 0 ? sizeRaw : pageSize;
    return { pageIndex, pageSize: size };
  }, [sp, key, pageSize]);

  const commit = React.useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(sp);
      mutate(params);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [sp, pathname, router],
  );

  const onSortingChange = React.useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      const next = resolveUpdater(updater, sorting);
      commit((p) => {
        if (sameSorting(next, initialSorting)) p.delete(key("sort"));
        else
          p.set(
            key("sort"),
            next.map((s) => (s.desc ? `-${s.id}` : s.id)).join(","),
          );
        p.delete(key("page"));
      });
    },
    [commit, sorting, initialSorting, key],
  );

  const onColumnFiltersChange = React.useCallback<
    OnChangeFn<ColumnFiltersState>
  >(
    (updater) => {
      const next = resolveUpdater(updater, columnFilters);
      commit((p) => {
        p.delete(key("q"));
        for (const id of facetKey) p.delete(key(id));
        for (const f of next) {
          if (f.id === SEARCH_COLUMN_ID) {
            if (f.value) p.set(key("q"), String(f.value));
          } else if (facetKey.has(f.id)) {
            const arr = (f.value as string[] | undefined) ?? [];
            if (arr.length) p.set(key(f.id), arr.join(","));
          }
        }
        p.delete(key("page"));
      });
    },
    [commit, columnFilters, facetKey, key],
  );

  const onPaginationChange = React.useCallback<OnChangeFn<PaginationState>>(
    (updater) => {
      const next = resolveUpdater(updater, pagination);
      commit((p) => {
        if (next.pageIndex > 0) p.set(key("page"), String(next.pageIndex + 1));
        else p.delete(key("page"));
        if (next.pageSize !== pageSize) p.set(key("size"), String(next.pageSize));
        else p.delete(key("size"));
      });
    },
    [commit, pagination, pageSize, key],
  );

  return {
    sorting,
    columnFilters,
    pagination,
    onSortingChange,
    onColumnFiltersChange,
    onPaginationChange,
  };
}

export { RESERVED as DATA_TABLE_RESERVED_PARAMS };
