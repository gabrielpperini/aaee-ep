"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertTriangle, Crown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";
import { ASSIGNMENT_ROLE_LABELS, formatEventWhen } from "@/lib/format";
import type { AssignmentRole } from "@/generated/prisma/client";
import { cn, normalizeSearch } from "@/lib/utils";
import { enqueueOrRun } from "@/lib/db/sync-queue";
import { removeAssignment, upsertAssignment } from "./actions";

type AssignmentItem = {
  personId: string;
  name: string;
  nickname: string | null;
  phone: string | null;
  role: AssignmentRole;
  isCaptain: boolean;
  notes: string | null;
};

type AvailableItem = {
  id: string;
  name: string;
  nickname: string | null;
  phone: string | null;
  conflict: { eventId: string; title: string } | null;
  competingElsewhere: { eventId: string; title: string } | null;
};

type Props = {
  eventId: string;
  eventTitle: string;
  eventStartTime: Date;
  eventTimeTbd: boolean;
  desiredSupportersCount: number;
  assignments: AssignmentItem[];
  available: AvailableItem[];
};

function eventGreeting(
  nickname: string | null,
  name: string,
  eventTitle: string,
  when: Date,
  timeTbd: boolean,
): string {
  const greeting = nickname || name.split(" ")[0];
  return `Oi ${greeting}, tudo bem? Sobre o evento ${eventTitle} em ${formatEventWhen(when, timeTbd)}...`;
}

const ROLE_OPTIONS: AssignmentRole[] = ["SUPPORTER", "CAPTAIN", "MATERIAL_LEAD", "SUPPORT"];

export function AllocationPanel({
  eventId,
  eventTitle,
  eventStartTime,
  eventTimeTbd,
  desiredSupportersCount,
  assignments,
  available,
}: Props) {
  const [search, setSearch] = useState("");
  const [hideConflicts, setHideConflicts] = useState(true);
  // Set (não string única): várias pessoas podem estar sendo escaladas ao mesmo
  // tempo. Cada toque é independente — não bloqueia os outros botões.
  const [busyPersons, setBusyPersons] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const markBusy = (id: string) =>
    setBusyPersons((s) => new Set(s).add(id));
  const clearBusy = (id: string) =>
    setBusyPersons((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });

  // Estado otimista local: offline a action não revalida o servidor, então a
  // UI tem que refletir a mudança na hora. Online, a revalidação do RSC traz
  // props novas e o efeito abaixo reconcilia.
  const [localAssignments, setLocalAssignments] = useState(assignments);
  const [localAvailable, setLocalAvailable] = useState(available);

  useEffect(() => {
    setLocalAssignments(assignments);
    setLocalAvailable(available);
  }, [assignments, available]);

  const byName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name, "pt-BR");

  const filteredAvailable = localAvailable.filter((p) => {
    if (hideConflicts && (p.conflict || p.competingElsewhere)) return false;
    if (!search) return true;
    const haystack = normalizeSearch(`${p.name} ${p.nickname ?? ""}`);
    return haystack.includes(normalizeSearch(search));
  });

  function add(personId: string) {
    const person = localAvailable.find((p) => p.id === personId);
    if (!person) return;
    // Se a UI mostrou alerta de conflito, o usuário já viu — manda force.
    const hasConflict = Boolean(person.conflict);
    const prevAvailable = localAvailable;
    const prevAssignments = localAssignments;

    // Otimista: move pra escalados.
    setLocalAvailable((list) => list.filter((p) => p.id !== personId));
    setLocalAssignments((list) =>
      [
        ...list,
        {
          personId,
          name: person.name,
          nickname: person.nickname,
          phone: person.phone,
          role: "SUPPORTER" as AssignmentRole,
          isCaptain: false,
          notes: null,
        },
      ].sort(byName),
    );

    markBusy(personId);
    startTransition(async () => {
      const r = await enqueueOrRun(
        () =>
          upsertAssignment({
            eventId,
            personId,
            role: "SUPPORTER",
            isCaptain: false,
            notes: "",
            force: hasConflict,
          }),
        { kind: "allocate", eventId, personId, role: "SUPPORTER", isCaptain: false, notes: "", force: hasConflict },
      );
      clearBusy(personId);
      if (r.status === "error") {
        setLocalAvailable(prevAvailable);
        setLocalAssignments(prevAssignments);
        toast.error(r.error);
      } else if (r.status === "queued") {
        toast.success("Escalação salva offline — sincroniza ao reconectar");
      } else {
        toast.success("Pessoa escalada");
      }
    });
  }

  function update(input: {
    personId: string;
    role?: AssignmentRole;
    isCaptain?: boolean;
    notes?: string;
  }) {
    const current = localAssignments.find((a) => a.personId === input.personId);
    if (!current) return;
    const role = input.role ?? current.role;
    const isCaptain = input.isCaptain ?? current.isCaptain;
    const notes = input.notes ?? current.notes ?? "";
    const prevAssignments = localAssignments;

    setLocalAssignments((list) =>
      list.map((a) =>
        a.personId === input.personId ? { ...a, role, isCaptain, notes } : a,
      ),
    );

    markBusy(input.personId);
    startTransition(async () => {
      const r = await enqueueOrRun(
        () =>
          upsertAssignment({
            eventId,
            personId: input.personId,
            role,
            isCaptain,
            notes,
            // Já está escalada aqui — alteração de papel não deve reabrir
            // conflito de "já alocada em outro evento".
            force: true,
          }),
        { kind: "allocate", eventId, personId: input.personId, role, isCaptain, notes, force: true },
      );
      clearBusy(input.personId);
      if (r.status === "error") {
        setLocalAssignments(prevAssignments);
        toast.error(r.error);
      } else if (r.status === "queued") {
        toast.success("Alteração salva offline — sincroniza ao reconectar");
      }
    });
  }

  function remove(personId: string) {
    const current = localAssignments.find((a) => a.personId === personId);
    if (!current) return;
    const prevAvailable = localAvailable;
    const prevAssignments = localAssignments;

    // Otimista: volta pra disponíveis.
    setLocalAssignments((list) => list.filter((a) => a.personId !== personId));
    setLocalAvailable((list) =>
      [
        ...list,
        {
          id: personId,
          name: current.name,
          nickname: current.nickname,
          phone: current.phone,
          conflict: null,
          competingElsewhere: null,
        },
      ].sort(byName),
    );

    markBusy(personId);
    startTransition(async () => {
      const r = await enqueueOrRun(
        () => removeAssignment({ eventId, personId }),
        { kind: "deallocate", eventId, personId },
      );
      clearBusy(personId);
      if (r.status === "error") {
        setLocalAvailable(prevAvailable);
        setLocalAssignments(prevAssignments);
        toast.error(r.error);
      } else if (r.status === "queued") {
        toast.success("Remoção salva offline — sincroniza ao reconectar");
      } else {
        toast.success("Pessoa removida da escala");
      }
    });
  }

  const allocatedCount = localAssignments.length;
  const shortBy = Math.max(0, desiredSupportersCount - allocatedCount);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Disponíveis no horário ({filteredAvailable.length})
          </p>
          {shortBy > 0 && (
            <Badge variant="outline" className="text-[10px]">
              Faltam {shortBy}
            </Badge>
          )}
        </div>
        <div className="mb-2 flex gap-2">
          <Input
            placeholder="Buscar nome…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            variant={hideConflicts ? "default" : "outline"}
            size="sm"
            onClick={() => setHideConflicts((v) => !v)}
            title={
              hideConflicts
                ? "Mostrando só quem está realmente livre. Clique pra ver todos."
                : "Mostrando todos, com alerta de conflito."
            }
          >
            {hideConflicts ? "Só livres" : "Todos"}
          </Button>
        </div>
        {/* No mobile o scroll fica no flow da página (sem container aninhado, que
            travava o toque e escondia o botão). No desktop volta o scroll interno. */}
        <div className="rounded-md border border-border bg-background sm:max-h-80 sm:overflow-y-auto sm:overscroll-contain">
          {filteredAvailable.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              Ninguém disponível no horário deste evento.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {filteredAvailable.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {p.name}
                      {p.nickname && (
                        <span className="text-muted-foreground"> ({p.nickname})</span>
                      )}
                    </div>
                    {p.competingElsewhere && (
                      <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-destructive">
                        <AlertTriangle className="h-3 w-3" />
                        Competindo em &ldquo;{p.competingElsewhere.title}&rdquo;
                      </div>
                    )}
                    {p.conflict && (
                      <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="h-3 w-3" />
                        Já alocada em &ldquo;{p.conflict.title}&rdquo;
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <WhatsAppButton
                      phone={p.phone}
                      message={eventGreeting(p.nickname, p.name, eventTitle, eventStartTime, eventTimeTbd)}
                      size="icon-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      // Sem disable global: a pessoa some da lista na hora
                      // (otimista), então dá pra tocar em várias seguidas sem
                      // esperar o loading de cada uma.
                      onClick={() => add(p.id)}
                    >
                      Escalar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Escalados ({allocatedCount}
          {desiredSupportersCount ? `/${desiredSupportersCount}` : ""})
        </p>
        {localAssignments.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-card/60 px-3 py-6 text-center text-xs text-muted-foreground">
            Comece pelo painel à esquerda.
          </p>
        ) : (
          <ul className="space-y-2">
            {localAssignments.map((a) => (
              <li
                key={a.personId}
                className={cn(
                  "rounded-md border border-border bg-card/60 px-3 py-2 text-sm space-y-2",
                  busyPersons.has(a.personId) && "opacity-60",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {a.name}
                      {a.nickname && (
                        <span className="text-muted-foreground"> ({a.nickname})</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <WhatsAppButton
                      phone={a.phone}
                      message={eventGreeting(a.nickname, a.name, eventTitle, eventStartTime, eventTimeTbd)}
                      size="icon-xs"
                    />
                    <button
                      type="button"
                      onClick={() => remove(a.personId)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remover"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    items={ASSIGNMENT_ROLE_LABELS}
                    value={a.role}
                    onValueChange={(v) => update({ personId: a.personId, role: v as AssignmentRole })}
                  >
                    <SelectTrigger size="sm" className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ASSIGNMENT_ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    variant={a.isCaptain ? "default" : "outline"}
                    onClick={() => update({ personId: a.personId, isCaptain: !a.isCaptain })}
                  >
                    <Crown className="mr-1 h-3.5 w-3.5" />
                    {a.isCaptain ? "Capitão" : "Tornar capitão"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
