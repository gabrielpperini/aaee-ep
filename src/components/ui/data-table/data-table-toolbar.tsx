"use client";

import * as React from "react";
import type { Table } from "@tanstack/react-table";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DataTableFacetedFilter,
  type FacetOption,
} from "./data-table-faceted-filter";

/** Id da coluna oculta usada como alvo da busca textual global. */
export const SEARCH_COLUMN_ID = "__search";

export type FacetConfig = {
  columnId: string;
  title: string;
  options: FacetOption[];
};

export function DataTableToolbar<TData>({
  table,
  searchPlaceholder,
  facets = [],
  extra,
}: {
  table: Table<TData>;
  searchPlaceholder?: string;
  facets?: FacetConfig[];
  extra?: React.ReactNode;
}) {
  const searchColumn = table.getColumn(SEARCH_COLUMN_ID);
  const searchValue = (searchColumn?.getFilterValue() as string) ?? "";
  const isFiltered = table.getState().columnFilters.length > 0;

  // Busca: valor local imediato + escrita debounced na URL. Sincroniza com o
  // valor derivado da URL quando muda externamente ("Limpar", voltar do nav).
  const [search, setSearch] = React.useState(searchValue);
  const lastWritten = React.useRef(searchValue);
  React.useEffect(() => {
    if (searchValue !== lastWritten.current) {
      lastWritten.current = searchValue;
      setSearch(searchValue);
    }
  }, [searchValue]);

  const setFilter = searchColumn?.setFilterValue;
  React.useEffect(() => {
    if (search === lastWritten.current) return;
    const t = setTimeout(() => {
      lastWritten.current = search;
      setFilter?.(search || undefined);
    }, 300);
    return () => clearTimeout(t);
  }, [search, setFilter]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {searchColumn && searchPlaceholder && (
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8"
            aria-label="Buscar"
          />
        </div>
      )}

      {facets.map((f) => (
        <DataTableFacetedFilter
          key={f.columnId}
          column={table.getColumn(f.columnId)}
          title={f.title}
          options={f.options}
        />
      ))}

      {extra}

      {isFiltered && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => table.resetColumnFilters()}
        >
          Limpar
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
