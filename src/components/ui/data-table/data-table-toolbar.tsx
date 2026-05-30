"use client";

import type * as React from "react";
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      {searchColumn && searchPlaceholder && (
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => searchColumn.setFilterValue(e.target.value || undefined)}
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
