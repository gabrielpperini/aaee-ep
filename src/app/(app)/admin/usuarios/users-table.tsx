"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export function UsersTable({
  users,
  unlinkedPersons,
}: {
  users: UserRow[];
  unlinkedPersons: UnlinkedPerson[];
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((u) => {
      const hay = [
        u.email ?? "",
        u.phone ?? "",
        u.person?.name ?? "",
        u.person?.nickname ?? "",
        u.person?.email ?? "",
        u.person?.phone ?? "",
        u.person?.modalities.map((m) => m.name).join(" ") ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [q, users]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por email, telefone ou nome…"
          className="pl-8"
          aria-label="Buscar usuários"
        />
      </div>

      <Card className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome / Apelido</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Curso / Sem.</TableHead>
              <TableHead>Participação</TableHead>
              <TableHead>Modalidades</TableHead>
              <TableHead>Função</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => {
                const tags = u.person
                  ? PARTICIPATION.filter((p) => u.person![p.key]).map((p) => p.label)
                  : [];
                const phone = u.person?.phone || u.phone;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.person ? (
                        <Link href="/pessoas" className="hover:underline">
                          {u.person.name}
                          {u.person.nickname && (
                            <span className="text-muted-foreground"> ({u.person.nickname})</span>
                          )}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>{u.authName || u.email || "—"}</span>
                          <Badge variant="destructive" className="text-[10px]">
                            Sem pessoa
                          </Badge>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {u.person?.email || u.email || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      <div className="flex items-center gap-1.5">
                        <span>{phone || "—"}</span>
                        {phone && <WhatsAppButton phone={phone} size="icon-xs" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {u.person?.course ? COURSE_LABELS[u.person.course] : "—"}
                      {u.person?.semester && (
                        <span className="text-muted-foreground/70"> · {u.person.semester}º</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {tags.length === 0 ? (
                          <span className="text-muted-foreground text-xs">—</span>
                        ) : (
                          tags.map((t) => (
                            <Badge key={t} variant="secondary" className="text-[10px]">
                              {t}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {!u.person || u.person.modalities.length === 0 ? (
                          <span className="text-muted-foreground text-xs">—</span>
                        ) : (
                          u.person.modalities.map((m) => (
                            <Badge key={m.id} variant="outline" className="text-[10px]">
                              {m.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ROLE_VARIANT[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                    </TableCell>
                    <TableCell>
                      <UserRowActions
                        user={{ id: u.id, email: u.email, role: u.role, person: u.person }}
                        unlinkedPersons={unlinkedPersons}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {unlinkedPersons.length > 0 && (
        <section>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
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
