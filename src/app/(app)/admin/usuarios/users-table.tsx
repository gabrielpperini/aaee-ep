"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DataTable,
  DataTableColumnHeader,
  arrayOverlapFilter,
  equalsAnyFilter,
  type FacetConfig,
} from "@/components/ui/data-table";
import { COURSE_LABELS } from "@/lib/format";
import type { Role, Course } from "@/generated/prisma/client";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";
import { UserRowActions } from "./row-actions";

const ROLE_LABEL: Record<Role, string> = {
  USER: "Membro",
  DIRECTOR: "Diretor",
  ADMIN: "Admin",
};

const ROLE_VARIANT: Record<Role, "default" | "secondary" | "outline"> = {
  USER: "outline",
  DIRECTOR: "secondary",
  ADMIN: "default",
};

const PARTICIPATION: { key: keyof PersonData; label: string }[] = [
  { key: "isAthlete", label: "Atleta" },
  { key: "isSupporter", label: "Torcida" },
  { key: "isDirector", label: "Diretor" },
  { key: "isSupport", label: "Apoio" },
  { key: "isBateria", label: "Bateria" },
];

type PersonData = {
  id: string;
  name: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  course: Course | null;
  semester: number | null;
  isAthlete: boolean;
  isSupporter: boolean;
  isDirector: boolean;
  isSupport: boolean;
  isBateria: boolean;
  modalities: { id: string; name: string }[];
};

export type UserRow = {
  id: string;
  email: string | null;
  phone: string | null;
  role: Role;
  /** Nome vindo do metadata do Supabase (usado quando não há Person). */
  authName: string | null;
  person: PersonData | null;
};

export type UnlinkedPerson = {
  id: string;
  name: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
};

function participationLabels(p: PersonData): string[] {
  return PARTICIPATION.filter((x) => p[x.key]).map((x) => x.label);
}

export function UsersTable({
  users,
  unlinkedPersons,
}: {
  users: UserRow[];
  unlinkedPersons: UnlinkedPerson[];
}) {
  const columns = React.useMemo<ColumnDef<UserRow>[]>(
    () => [
      {
        id: "name",
        accessorFn: (u) => u.person?.name ?? u.authName ?? u.email ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Nome / Apelido" />
        ),
        cell: ({ row }) => {
          const u = row.original;
          return u.person ? (
            <Link href="/pessoas" className="font-medium hover:underline">
              {u.person.name}
              {u.person.nickname && (
                <span className="text-muted-foreground"> ({u.person.nickname})</span>
              )}
            </Link>
          ) : (
            <div className="flex items-center gap-2 font-medium">
              <span>{u.authName || u.email || "—"}</span>
              <Badge variant="destructive" className="text-[10px]">
                Sem pessoa
              </Badge>
            </div>
          );
        },
      },
      {
        id: "email",
        accessorFn: (u) => u.person?.email ?? u.email ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Email" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.person?.email || row.original.email || "—"}
          </span>
        ),
      },
      {
        id: "phone",
        accessorFn: (u) => u.person?.phone ?? u.phone ?? "",
        header: () => "Telefone",
        enableSorting: false,
        cell: ({ row }) => {
          const phone = row.original.person?.phone || row.original.phone;
          return (
            <div className="flex items-center gap-1.5 text-muted-foreground tabular-nums">
              <span>{phone || "—"}</span>
              {phone && <WhatsAppButton phone={phone} size="icon-xs" />}
            </div>
          );
        },
      },
      {
        id: "course",
        accessorFn: (u) => (u.person?.course ? COURSE_LABELS[u.person.course] : ""),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Curso / Sem." />
        ),
        cell: ({ row }) => {
          const p = row.original.person;
          return (
            <span className="text-sm whitespace-nowrap text-muted-foreground">
              {p?.course ? COURSE_LABELS[p.course] : "—"}
              {p?.semester && (
                <span className="text-muted-foreground/70"> · {p.semester}º</span>
              )}
            </span>
          );
        },
      },
      {
        id: "participation",
        accessorFn: (u) => (u.person ? participationLabels(u.person) : []),
        header: () => "Participação",
        enableSorting: false,
        filterFn: arrayOverlapFilter,
        cell: ({ row }) => {
          const tags = row.original.person
            ? participationLabels(row.original.person)
            : [];
          return (
            <div className="flex flex-wrap gap-1">
              {tags.length === 0 ? (
                <span className="text-xs text-muted-foreground">—</span>
              ) : (
                tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px]">
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
        accessorFn: (u) => u.person?.modalities.map((m) => m.id) ?? [],
        header: () => "Modalidades",
        enableSorting: false,
        filterFn: arrayOverlapFilter,
        cell: ({ row }) => {
          const mods = row.original.person?.modalities ?? [];
          return (
            <div className="flex flex-wrap gap-1">
              {mods.length === 0 ? (
                <span className="text-xs text-muted-foreground">—</span>
              ) : (
                mods.map((m) => (
                  <Badge key={m.id} variant="outline" className="text-[10px]">
                    {m.name}
                  </Badge>
                ))
              )}
            </div>
          );
        },
      },
      {
        id: "role",
        accessorFn: (u) => u.role,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Função" />
        ),
        filterFn: equalsAnyFilter,
        cell: ({ row }) => (
          <Badge variant={ROLE_VARIANT[row.original.role]}>
            {ROLE_LABEL[row.original.role]}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: () => null,
        cell: ({ row }) => (
          <UserRowActions
            user={{
              id: row.original.id,
              email: row.original.email,
              role: row.original.role,
              person: row.original.person,
            }}
            unlinkedPersons={unlinkedPersons}
          />
        ),
        meta: { headClassName: "w-12" },
      },
    ],
    [unlinkedPersons],
  );

  const facets = React.useMemo<FacetConfig[]>(() => {
    const modalityMap = new Map<string, string>();
    for (const u of users) {
      for (const m of u.person?.modalities ?? []) modalityMap.set(m.id, m.name);
    }
    return [
      {
        columnId: "role",
        title: "Função",
        options: (Object.keys(ROLE_LABEL) as Role[]).map((r) => ({
          label: ROLE_LABEL[r],
          value: r,
        })),
      },
      {
        columnId: "participation",
        title: "Participação",
        options: PARTICIPATION.map((p) => ({ label: p.label, value: p.label })),
      },
      {
        columnId: "modalities",
        title: "Modalidade",
        options: Array.from(modalityMap, ([value, label]) => ({ label, value })).sort(
          (a, b) => a.label.localeCompare(b.label, "pt-BR"),
        ),
      },
    ];
  }, [users]);

  return (
    <div className="space-y-6">
      <DataTable
        columns={columns}
        data={users}
        searchAccessor={(u) =>
          [
            u.email ?? "",
            u.phone ?? "",
            u.person?.name ?? "",
            u.person?.nickname ?? "",
            u.person?.email ?? "",
            u.person?.phone ?? "",
            u.person?.modalities.map((m) => m.name).join(" ") ?? "",
          ].join(" ")
        }
        searchPlaceholder="Buscar por email, telefone ou nome…"
        facets={facets}
        initialSorting={[{ id: "email", desc: false }]}
        emptyMessage="Nenhum usuário encontrado."
      />

      {unlinkedPersons.length > 0 && (
        <section>
          <p className="mb-2 text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
            Pessoas sem login vinculado ({unlinkedPersons.length})
          </p>
          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Apelido</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {unlinkedPersons.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.nickname || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{p.email || "—"}</TableCell>
                    <TableCell>
                      <WhatsAppButton phone={p.phone} size="icon-xs" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>
      )}
    </div>
  );
}
