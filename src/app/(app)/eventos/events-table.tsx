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
  PHASE_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  formatEventTime,
  priorityVariant,
  statusVariant,
} from "@/lib/format";
import type {
  EventPhase,
  EventPriority,
  EventStatus,
} from "@/generated/prisma/client";
import type { EventFormValues } from "@/lib/validations/event";
import { EventRowActions } from "./row-actions";

type Option = { id: string; name: string };
type PersonOption = { id: string; name: string; nickname: string | null };

export type EventRow = {
  id: string;
  title: string;
  opponent: string | null;
  isConditional: boolean;
  day: number;
  startTime: Date;
  endTime: Date;
  timeTbd: boolean;
  modalityName: string;
  locationName: string | null;
  phase: EventPhase;
  priority: EventPriority;
  status: EventStatus;
  desiredSupportersCount: number;
  initial: Partial<EventFormValues> & { id: string; title: string };
};

export function EventsTable({
  events,
  modalities,
  locations,
  athletes,
}: {
  events: EventRow[];
  modalities: Option[];
  locations: Option[];
  athletes: PersonOption[];
}) {
  const columns = React.useMemo<ColumnDef<EventRow>[]>(
    () => [
      {
        id: "schedule",
        accessorFn: (e) => e.day * 1e13 + e.startTime.getTime(),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Dia / Horário" />
        ),
        cell: ({ row }) => {
          const e = row.original;
          return (
            <div>
              <div className="text-xs text-muted-foreground">Dia {e.day}</div>
              <div className="text-sm tabular-nums">
                {formatEventTime(e.startTime, e.endTime, e.timeTbd)}
              </div>
            </div>
          );
        },
        meta: { cellClassName: "whitespace-nowrap" },
      },
      {
        accessorKey: "title",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Evento" />
        ),
        cell: ({ row }) => {
          const e = row.original;
          return (
            <span className="font-medium">
              {e.title}
              {e.opponent && (
                <span className="text-muted-foreground"> · vs {e.opponent}</span>
              )}
              {e.isConditional && (
                <Badge variant="outline" className="ml-2">
                  Condicional
                </Badge>
              )}
            </span>
          );
        },
      },
      {
        id: "modality",
        accessorFn: (e) => e.modalityName,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Modalidade" />
        ),
        filterFn: equalsAnyFilter,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.modalityName}</span>
        ),
      },
      {
        id: "location",
        accessorFn: (e) => e.locationName ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Local" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.locationName ?? "—"}
          </span>
        ),
      },
      {
        id: "phase",
        accessorFn: (e) => e.phase,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Fase" />
        ),
        filterFn: equalsAnyFilter,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {PHASE_LABELS[row.original.phase]}
          </span>
        ),
      },
      {
        id: "priority",
        accessorFn: (e) => e.priority,
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
        id: "status",
        accessorFn: (e) => e.status,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        filterFn: equalsAnyFilter,
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.status)}>
            {STATUS_LABELS[row.original.status]}
          </Badge>
        ),
      },
      {
        id: "supporters",
        accessorFn: (e) => e.desiredSupportersCount,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Torcida" align="right" />
        ),
        cell: ({ row }) => row.original.desiredSupportersCount || "—",
        meta: {
          headClassName: "text-right",
          cellClassName: "text-right tabular-nums",
        },
      },
      {
        id: "day",
        accessorFn: (e) => String(e.day),
        filterFn: equalsAnyFilter,
        enableSorting: false,
        meta: { hidden: true },
      },
      {
        id: "actions",
        header: () => null,
        cell: ({ row }) => (
          <EventRowActions
            event={row.original.initial}
            modalities={modalities}
            locations={locations}
            athletes={athletes}
          />
        ),
        meta: { headClassName: "w-12" },
      },
    ],
    [modalities, locations, athletes],
  );

  const facets = React.useMemo<FacetConfig[]>(() => {
    const days = Array.from(new Set(events.map((e) => e.day))).sort(
      (a, b) => a - b,
    );
    return [
      {
        columnId: "modality",
        title: "Modalidade",
        options: [...modalities]
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
          .map((m) => ({ label: m.name, value: m.name })),
      },
      {
        columnId: "phase",
        title: "Fase",
        options: (Object.keys(PHASE_LABELS) as EventPhase[]).map((p) => ({
          label: PHASE_LABELS[p],
          value: p,
        })),
      },
      {
        columnId: "priority",
        title: "Prioridade",
        options: (Object.keys(PRIORITY_LABELS) as EventPriority[]).map((p) => ({
          label: PRIORITY_LABELS[p],
          value: p,
        })),
      },
      {
        columnId: "status",
        title: "Status",
        options: (Object.keys(STATUS_LABELS) as EventStatus[]).map((s) => ({
          label: STATUS_LABELS[s],
          value: s,
        })),
      },
      {
        columnId: "day",
        title: "Dia",
        options: days.map((d) => ({ label: `Dia ${d}`, value: String(d) })),
      },
    ];
  }, [events, modalities]);

  return (
    <DataTable
      columns={columns}
      data={events}
      searchAccessor={(e) => `${e.title} ${e.opponent ?? ""}`}
      searchPlaceholder="Buscar por evento ou adversário…"
      facets={facets}
      initialSorting={[{ id: "schedule", desc: false }]}
      emptyMessage="Nenhum evento encontrado."
    />
  );
}
