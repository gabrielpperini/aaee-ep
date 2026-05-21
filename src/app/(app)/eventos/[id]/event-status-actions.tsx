"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { EventStatus } from "@/generated/prisma/client";
import { setEventStatus } from "./actions";

const TRANSITIONS: Record<EventStatus, Array<{ status: EventStatus; label: string; variant?: "default" | "outline" | "destructive" | "secondary" }>> = {
  CONFIRMED: [
    { status: "POSTPONED", label: "Adiar", variant: "outline" },
    { status: "CANCELLED", label: "Cancelar", variant: "destructive" },
  ],
  CANCELLED: [
    { status: "CONFIRMED", label: "Reabrir", variant: "outline" },
  ],
  POSTPONED: [
    { status: "CONFIRMED", label: "Reagendar e confirmar" },
    { status: "CANCELLED", label: "Cancelar", variant: "destructive" },
  ],
};

export function EventStatusActions({
  eventId,
  status,
}: {
  eventId: string;
  status: EventStatus;
}) {
  const [pending, startTransition] = useTransition();
  const transitions = TRANSITIONS[status] ?? [];

  function trigger(next: EventStatus, label: string) {
    startTransition(async () => {
      const result = await setEventStatus({ eventId, status: next });
      if (!result.ok) toast.error(result.error);
      else toast.success(`Status alterado: ${label}`);
    });
  }

  if (transitions.length === 0) return null;

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
            onClick={() => trigger(t.status, t.label)}
          >
            {t.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
