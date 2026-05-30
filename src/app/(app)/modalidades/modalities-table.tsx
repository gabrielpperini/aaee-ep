"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  DataTableColumnHeader,
  equalsAnyFilter,
  type FacetConfig,
} from "@/components/ui/data-table";
import {
  MODALITY_CATEGORY_LABELS,
  PRIORITY_LABELS,
  priorityVariant,
} from "@/lib/format";
import type {
  EventPriority,
  ModalityCategory,
} from "@/generated/prisma/client";
import { ModalityRowActions } from "./row-actions";

export type ModalityRow = {
  id: string;
  name: string;
  category: ModalityCategory;
  priority: EventPriority;
  athletesCount: number;
  eventsCount: number;
  notes: string | null;
};

export function ModalitiesTable({ modalities }: { modalities: ModalityRow[] }) {
  const columns = React.useMemo<ColumnDef<ModalityRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Nome" />
        ),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        id: "category",
        accessorFn: (m) => m.category,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Categoria" />
        ),
        filterFn: equalsAnyFilter,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {MODALITY_CATEGORY_LABELS[row.original.category]}
          </span>
        ),
      },
      {
        id: "priority",
        accessorFn: (m) => m.priority,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Prioridade" />
        ),
        filterFn: equalsAnyFilter,
        cell: ({ row }) => (
          <Badge variant={priorityVariant(row.original.priority)}>
            {PRIORITY_LABELS[row.original.priority]}
          </Badge>
        ),
      },
      {
        id: "athletes",
        accessorFn: (m) => m.athletesCount,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Atletas" align="right" />
        ),
        cell: ({ row }) => row.original.athletesCount,
        meta: {
          headClassName: "text-right",
          cellClassName: "text-right tabular-nums",
        },
      },
      {
        id: "events",
        accessorFn: (m) => m.eventsCount,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Eventos" align="right" />
        ),
        cell: ({ row }) => row.original.eventsCount,
        meta: {
          headClassName: "text-right",
          cellClassName: "text-right tabular-nums",
        },
      },
      {
        id: "actions",
        header: () => null,
        cell: ({ row }) => (
          <ModalityRowActions
            modality={{
              id: row.original.id,
              name: row.original.name,
              category: row.original.category,
              priority: row.original.priority,
              notes: row.original.notes,
            }}
          />
        ),
        meta: { headClassName: "w-12" },
      },
    ],
    [],
  );

  const facets = React.useMemo<FacetConfig[]>(
    () => [
      {
        columnId: "category",
        title: "Categoria",
        options: (Object.keys(MODALITY_CATEGORY_LABELS) as ModalityCategory[]).map(
          (c) => ({ label: MODALITY_CATEGORY_LABELS[c], value: c }),
        ),
      },
      {
        columnId: "priority",
        title: "Prioridade",
        options: (Object.keys(PRIORITY_LABELS) as EventPriority[]).map((p) => ({
          label: PRIORITY_LABELS[p],
          value: p,
        })),
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={modalities}
      searchAccessor={(m) => m.name}
      searchPlaceholder="Buscar modalidade…"
      facets={facets}
      initialSorting={[{ id: "name", desc: false }]}
      emptyMessage="Nenhuma modalidade encontrada."
    />
  );
}
