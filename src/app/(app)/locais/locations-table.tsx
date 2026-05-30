"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import { MapsLink } from "@/components/app/maps-link";
import { LocationRowActions } from "./row-actions";

export type LocationRow = {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  notes: string | null;
  eventsCount: number;
};

export function LocationsTable({ locations }: { locations: LocationRow[] }) {
  const columns = React.useMemo<ColumnDef<LocationRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Nome" />
        ),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        id: "address",
        accessorFn: (l) => l.address ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Endereço" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.address || "—"}</span>
        ),
      },
      {
        id: "maps",
        header: () => "Mapa",
        cell: ({ row }) => <MapsLink address={row.original.address} variant="icon" />,
        enableSorting: false,
        meta: { headClassName: "w-16" },
      },
      {
        id: "events",
        accessorFn: (l) => l.eventsCount,
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
          <LocationRowActions
            location={{
              id: row.original.id,
              name: row.original.name,
              address: row.original.address,
              description: row.original.description,
              notes: row.original.notes,
            }}
          />
        ),
        meta: { headClassName: "w-12" },
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={locations}
      searchAccessor={(l) => `${l.name} ${l.address ?? ""}`}
      searchPlaceholder="Buscar por nome ou endereço…"
      initialSorting={[{ id: "name", desc: false }]}
      emptyMessage="Nenhum local encontrado."
    />
  );
}
