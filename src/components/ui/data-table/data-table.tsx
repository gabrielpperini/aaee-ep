"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type RowData,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "./data-table-pagination";
import {
  DataTableToolbar,
  SEARCH_COLUMN_ID,
  type FacetConfig,
} from "./data-table-toolbar";

// Permite que cada coluna controle classes de alinhamento/largura do header e
// das células (ex: "text-right tabular-nums", "w-12").
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    headClassName?: string;
    cellClassName?: string;
    /** Coluna apenas para filtro/faceta — nunca renderizada como coluna visível. */
    hidden?: boolean;
  }
}

export type { FacetConfig } from "./data-table-toolbar";
export type { FacetOption } from "./data-table-faceted-filter";

export function DataTable<TData, TValue>({
  columns,
  data,
  searchAccessor,
  searchPlaceholder,
  facets,
  initialSorting = [],
  pageSize = 25,
  emptyMessage = "Nenhum resultado encontrado.",
  toolbarExtra,
}: {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Quando informado, habilita a busca textual global sobre esse texto. */
  searchAccessor?: (row: TData) => string;
  searchPlaceholder?: string;
  facets?: FacetConfig[];
  initialSorting?: SortingState;
  pageSize?: number;
  emptyMessage?: string;
  toolbarExtra?: React.ReactNode;
}) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );

  const allColumns = React.useMemo<ColumnDef<TData, TValue>[]>(() => {
    if (!searchAccessor) return columns;
    return [
      ...columns,
      {
        id: SEARCH_COLUMN_ID,
        accessorFn: (row) => searchAccessor(row),
        enableSorting: false,
        filterFn: "includesString",
      } as ColumnDef<TData, TValue>,
    ];
  }, [columns, searchAccessor]);

  const columnVisibility = React.useMemo<VisibilityState>(() => {
    const vis: VisibilityState = {};
    if (searchAccessor) vis[SEARCH_COLUMN_ID] = false;
    for (const col of allColumns) {
      if (col.meta?.hidden && col.id) vis[col.id] = false;
    }
    return vis;
  }, [allColumns, searchAccessor]);

  const table = useReactTable({
    data,
    columns: allColumns,
    state: { sorting, columnFilters, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    initialState: { pagination: { pageSize } },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const colSpan = table.getVisibleLeafColumns().length;

  return (
    <div className="space-y-3">
      <DataTableToolbar
        table={table}
        searchPlaceholder={searchPlaceholder}
        facets={facets}
        extra={toolbarExtra}
      />

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.column.columnDef.meta?.headClassName}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(cell.column.columnDef.meta?.cellClassName)}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <DataTablePagination table={table} />
    </div>
  );
}
