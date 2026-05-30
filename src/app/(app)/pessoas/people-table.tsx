"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableColumnHeader,
  arrayOverlapFilter,
  type FacetConfig,
} from "@/components/ui/data-table";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";
import { PersonRowActions } from "./row-actions";

type ModalityRef = { id: string; name: string };

export type PersonRow = {
  id: string;
  name: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  isAthlete: boolean;
  isSupporter: boolean;
  isDirector: boolean;
  isSupport: boolean;
  isBateria: boolean;
  notes: string | null;
  modalities: ModalityRef[];
};

type PeopleRow = PersonRow & { isBusy: boolean };

const PARTICIPATION: { key: keyof PersonRow; label: string }[] = [
  { key: "isAthlete", label: "Atleta" },
  { key: "isSupporter", label: "Torcida" },
  { key: "isDirector", label: "Diretor" },
  { key: "isSupport", label: "Apoio" },
  { key: "isBateria", label: "Bateria" },
];

function participationLabels(p: PersonRow): string[] {
  return PARTICIPATION.filter((x) => p[x.key]).map((x) => x.label);
}

type Props = {
  people: PersonRow[];
  modalities: ModalityRef[];
  busyPersonIds: string[];
};

export function PeopleTable({ people, modalities, busyPersonIds }: Props) {
  const [onlyFree, setOnlyFree] = React.useState(false);
  const busySet = React.useMemo(() => new Set(busyPersonIds), [busyPersonIds]);

  const rows = React.useMemo<PeopleRow[]>(
    () => people.map((p) => ({ ...p, isBusy: busySet.has(p.id) })),
    [people, busySet],
  );
  const data = onlyFree ? rows.filter((p) => !p.isBusy) : rows;
  const freeCount = rows.length - busySet.size;

  const columns = React.useMemo<ColumnDef<PeopleRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Nome" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 font-medium">
            <span>{row.original.name}</span>
            {row.original.isBusy && (
              <Badge variant="outline" className="text-[10px]">
                Em evento
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: "nickname",
        accessorFn: (p) => p.nickname ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Apelido" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.nickname || "—"}</span>
        ),
      },
      {
        id: "phone",
        accessorFn: (p) => p.phone ?? "",
        header: () => "Telefone",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-muted-foreground tabular-nums">
            <span>{row.original.phone || "—"}</span>
            {row.original.phone && (
              <WhatsAppButton phone={row.original.phone} size="icon-xs" />
            )}
          </div>
        ),
      },
      {
        id: "email",
        accessorFn: (p) => p.email ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Email" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.email || "—"}</span>
        ),
      },
      {
        id: "participation",
        accessorFn: (p) => participationLabels(p),
        header: () => "Participação",
        enableSorting: false,
        filterFn: arrayOverlapFilter,
        cell: ({ row }) => {
          const tags = participationLabels(row.original);
          return (
            <div className="flex flex-wrap gap-1">
              {tags.length === 0 ? (
                <span className="text-xs text-muted-foreground">—</span>
              ) : (
                tags.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))
              )}
            </div>
          );
        },
      },
      {
        id: "modalities",
        accessorFn: (p) => p.modalities.map((m) => m.id),
        header: () => "Modalidades",
        enableSorting: false,
        filterFn: arrayOverlapFilter,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.modalities.length === 0 ? (
              <span className="text-xs text-muted-foreground">—</span>
            ) : (
              row.original.modalities.map((m) => (
                <Badge key={m.id} variant="outline">
                  {m.name}
                </Badge>
              ))
            )}
          </div>
        ),
      },
      {
        id: "actions",
        header: () => null,
        cell: ({ row }) => (
          <PersonRowActions
            person={{
              id: row.original.id,
              name: row.original.name,
              nickname: row.original.nickname,
              email: row.original.email,
              phone: row.original.phone,
              isAthlete: row.original.isAthlete,
              isSupporter: row.original.isSupporter,
              isDirector: row.original.isDirector,
              isSupport: row.original.isSupport,
              isBateria: row.original.isBateria,
              notes: row.original.notes,
              modalityIds: row.original.modalities.map((m) => m.id),
            }}
            modalities={modalities}
          />
        ),
        meta: { headClassName: "w-12" },
      },
    ],
    [modalities],
  );

  const facets = React.useMemo<FacetConfig[]>(
    () => [
      {
        columnId: "participation",
        title: "Participação",
        options: PARTICIPATION.map((p) => ({ label: p.label, value: p.label })),
      },
      {
        columnId: "modalities",
        title: "Modalidade",
        options: [...modalities]
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
          .map((m) => ({ label: m.name, value: m.id })),
      },
    ],
    [modalities],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      searchAccessor={(p) =>
        `${p.name} ${p.nickname ?? ""} ${p.email ?? ""} ${p.phone ?? ""}`
      }
      searchPlaceholder="Buscar por nome, apelido, email ou telefone…"
      facets={facets}
      initialSorting={[{ id: "name", desc: false }]}
      emptyMessage="Nenhuma pessoa encontrada."
      toolbarExtra={
        <Button
          type="button"
          variant={onlyFree ? "default" : "outline"}
          size="sm"
          onClick={() => setOnlyFree((v) => !v)}
          title={
            onlyFree
              ? "Mostrando só quem não está em evento agora."
              : "Mostrar só quem não está em evento neste momento."
          }
        >
          {onlyFree ? `Só livres agora (${freeCount})` : `Livres agora (${freeCount})`}
        </Button>
      }
    />
  );
}
