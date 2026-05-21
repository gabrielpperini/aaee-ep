"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { checkIn, undoCheckIn } from "./actions";

type Props = {
  eventId: string;
  checkedAt: Date | null;
  disabled?: boolean;
};

export function CheckInButton({ eventId, checkedAt, disabled }: Props) {
  const [pending, startTransition] = useTransition();

  if (disabled) {
    return (
      <p className="text-xs text-muted-foreground">
        Complete seu perfil para registrar presença.
      </p>
    );
  }

  if (checkedAt) {
    return (
      <div className="space-y-2">
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" />
            Você fez check-in
          </div>
          <div className="mt-0.5 text-muted-foreground tabular-nums">
            às {formatDateTime(checkedAt)}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await undoCheckIn(eventId);
              if (!result.ok) toast.error(result.error);
            })
          }
          className="text-xs"
        >
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
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
          const result = await checkIn(eventId);
          if (!result.ok) toast.error(result.error);
          else toast.success("Check-in registrado");
        })
      }
    >
      {pending ? "Registrando…" : "Estou aqui"}
    </Button>
  );
}
