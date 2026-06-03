"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
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
 * Mantém o estado do TanStack Table com **feedback imediato** (estado local) e
 * sincroniza a URL **depois do render**, via `window.history.replaceState`.
 *
 * Por que não `router.replace`: a página de listagem é um server component
 * (auth + Prisma) e, mesmo sem ler `searchParams`, qualquer navegação do App
 * Router re-executa o RSC a cada clique/tecla — o que travava a UI. O History
 * API atualiza só a barra de endereço (e `useSearchParams`), sem navegação nem
 * refetch. A persistência após criar/editar continua de graça: os forms são
 * dialogs (não navegam) e o estado local sobrevive ao `revalidatePath`. Reload
 * e deep-link são cobertos pelo seed inicial a partir da URL.
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
  // Lido só no primeiro render pra semear o estado (deep-link / reload).
  const searchParams = useSearchParams();
  const key = React.useCallback(
    (name: string) => (urlKey ? `${urlKey}_${name}` : name),
    [urlKey],
  );

  const [sorting, setSorting] = React.useState<SortingState>(() => {
    const raw = searchParams.get(key("sort"));
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
  });

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    () => {
      const out: ColumnFiltersState = [];
      const q = searchParams.get(key("q"));
      if (q) out.push({ id: SEARCH_COLUMN_ID, value: q });
      for (const id of facetIds) {
        const v = searchParams.get(key(id));
        if (v) out.push({ id, value: v.split(",").filter(Boolean) });
      }
      return out;
    },
  );

  const [pagination, setPagination] = React.useState<PaginationState>(() => {
    const pageRaw = Number(searchParams.get(key("page")));
    const sizeRaw = Number(searchParams.get(key("size")));
    return {
      pageIndex: Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw - 1 : 0,
      pageSize: Number.isInteger(sizeRaw) && sizeRaw > 0 ? sizeRaw : pageSize,
    };
  });

  // `initialSorting` costuma ser um literal novo a cada render; fixa o valor
  // inicial num ref (lido só dentro do efeito) pra não disparar sync à toa.
  const initialSortingRef = React.useRef(initialSorting);
  const mounted = React.useRef(false);

  React.useEffect(() => {
    // Não toca no history no mount: o estado já veio da URL.
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const params = new URLSearchParams(window.location.search);

    if (sameSorting(sorting, initialSortingRef.current)) params.delete(key("sort"));
    else
      params.set(
        key("sort"),
        sorting.map((s) => (s.desc ? `-${s.id}` : s.id)).join(","),
      );

    params.delete(key("q"));
    for (const id of facetIds) params.delete(key(id));
    for (const f of columnFilters) {
      if (f.id === SEARCH_COLUMN_ID) {
        if (f.value) params.set(key("q"), String(f.value));
      } else if (facetIds.includes(f.id)) {
        const arr = (f.value as string[] | undefined) ?? [];
        if (arr.length) params.set(key(f.id), arr.join(","));
      }
    }

    if (pagination.pageIndex > 0)
      params.set(key("page"), String(pagination.pageIndex + 1));
    else params.delete(key("page"));
    if (pagination.pageSize !== pageSize)
      params.set(key("size"), String(pagination.pageSize));
    else params.delete(key("size"));

    const qs = params.toString();
    const url = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [sorting, columnFilters, pagination, facetIds, pageSize, key]);

  const onSortingChange = React.useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      setSorting((prev) => resolveUpdater(updater, prev));
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    [],
  );

  const onColumnFiltersChange = React.useCallback<
    OnChangeFn<ColumnFiltersState>
  >((updater) => {
    setColumnFilters((prev) => resolveUpdater(updater, prev));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const onPaginationChange = React.useCallback<OnChangeFn<PaginationState>>(
    (updater) => {
      setPagination((prev) => resolveUpdater(updater, prev));
    },
    [],
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
