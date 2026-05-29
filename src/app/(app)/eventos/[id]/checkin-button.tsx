"use client";

import { useTransition } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Check, CloudOff, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { db, type OfflineCheckIn } from "@/lib/db/dexie";
import { enqueueOrRun } from "@/lib/db/sync-queue";
import { checkIn, undoCheckIn } from "./actions";

type Props = {
  eventId: string;
  personId: string | null;
  checkedAt: Date | null;
  disabled?: boolean;
};

export function CheckInButton({ eventId, personId, checkedAt, disabled }: Props) {
  const [pending, startTransition] = useTransition();

  // Estado local autoritativo (hidratado do servidor quando online, otimista
  // offline). `undefined` = ainda carregando → usa o valor do servidor (SSR).
  const live = useLiveQuery(async () => {
    if (!personId) return { row: null as OfflineCheckIn | null };
    const row = await db.checkIns.get([eventId, personId]);
    return { row: row ?? null };
  }, [eventId, personId]);

  if (disabled || !personId) {
    return (
      <p className="text-xs text-muted-foreground">
        Complete seu perfil para registrar presença.
      </p>
    );
  }

  const resolved = live !== undefined;
  const displayedCheckedAt = resolved
    ? live.row
      ? new Date(live.row.checkedAt)
      : null
    : checkedAt;
  const isPendingSync = resolved ? Boolean(live.row?.pending) : false;

  const meta = { personId } as const;

  if (displayedCheckedAt) {
    return (
      <div className="space-y-2">
        <div
          className={
            isPendingSync
              ? "rounded-md border border-accent/50 bg-accent/10 px-3 py-2 text-xs text-accent-foreground"
              : "rounded-md border border-success/40 bg-success/10 px-3 py-2 text-xs text-success"
          }
        >
          <div className="flex items-center gap-1.5 font-semibold">
            {isPendingSync ? (
              <CloudOff className="h-3.5 w-3.5" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            {isPendingSync ? "Check-in pendente" : "Você fez check-in"}
          </div>
          <div className="mt-0.5 text-muted-foreground tabular-nums">
            {isPendingSync
              ? "será sincronizado quando voltar a conexão"
              : `às ${formatDateTime(displayedCheckedAt)}`}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await enqueueOrRun(() => undoCheckIn(eventId), {
                kind: "undoCheckIn",
                eventId,
                ...meta,
              });
              if (r.status === "error") toast.error(r.error);
            })
          }
          className="text-xs"
        >
          {pending ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
          )}
          Desfazer check-in
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      className="w-full"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await enqueueOrRun(() => checkIn(eventId), {
            kind: "checkIn",
            eventId,
            ...meta,
          });
          if (r.status === "error") toast.error(r.error);
          else if (r.status === "queued")
            toast.success("Check-in salvo offline — sincroniza ao reconectar");
          else toast.success("Check-in registrado");
        })
      }
    >
      {pending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
      {pending ? "Registrando…" : "Estou aqui"}
    </Button>
  );
}
