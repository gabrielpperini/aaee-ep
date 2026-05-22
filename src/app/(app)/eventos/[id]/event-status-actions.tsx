"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EventStatus } from "@/generated/prisma/client";
import { setEventStatus } from "./actions";

type Transition = {
  status: EventStatus;
  label: string;
  variant?: "default" | "outline" | "destructive" | "secondary";
  /** Mostrar dialog de confirmação antes de aplicar. */
  requiresConfirm?: boolean;
};

const TRANSITIONS: Record<EventStatus, Transition[]> = {
  CONFIRMED: [
    { status: "POSTPONED", label: "Adiar", variant: "outline", requiresConfirm: true },
    { status: "CANCELLED", label: "Cancelar", variant: "destructive", requiresConfirm: true },
  ],
  CANCELLED: [{ status: "CONFIRMED", label: "Reabrir", variant: "outline" }],
  POSTPONED: [
    { status: "CONFIRMED", label: "Reagendar e confirmar" },
    { status: "CANCELLED", label: "Cancelar", variant: "destructive", requiresConfirm: true },
  ],
};

type Counts = { assignments: number; checkIns: number };

export function EventStatusActions({
  eventId,
  status,
  counts,
}: {
  eventId: string;
  status: EventStatus;
  counts: Counts;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<Transition | null>(null);
  const transitions = TRANSITIONS[status] ?? [];

  function trigger(next: EventStatus, label: string) {
    startTransition(async () => {
      const result = await setEventStatus({ eventId, status: next });
      if (!result.ok) toast.error(result.error);
      else toast.success(`Status alterado: ${label}`);
      setConfirming(null);
    });
  }

  if (transitions.length === 0) return null;

  const hasImpact = counts.assignments > 0 || counts.checkIns > 0;

  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Ações do evento
      </p>
      <div className="flex flex-wrap gap-2">
        {transitions.map((t) => (
          <Button
            key={t.status}
            size="sm"
            variant={t.variant ?? "default"}
            disabled={pending}
            onClick={() => {
              if (t.requiresConfirm && hasImpact) {
                setConfirming(t);
              } else {
                trigger(t.status, t.label);
              }
            }}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <Dialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirming?.status === "CANCELLED" ? "Cancelar evento?" : "Adiar evento?"}
            </DialogTitle>
            <DialogDescription>
              Esse evento tem{" "}
              <strong>
                {counts.assignments} {counts.assignments === 1 ? "pessoa alocada" : "pessoas alocadas"}
              </strong>
              {counts.checkIns > 0 && (
                <>
                  {" "}
                  e <strong>{counts.checkIns} check-in(s)</strong> registrados
                </>
              )}
              . A ação não remove os registros, só muda o status. Quer continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <Button variant="outline" type="button" disabled={pending}>
                  Voltar
                </Button>
              }
            />
            <Button
              type="button"
              variant={confirming?.variant ?? "default"}
              disabled={pending}
              onClick={() => confirming && trigger(confirming.status, confirming.label)}
            >
              {pending ? "Aplicando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
