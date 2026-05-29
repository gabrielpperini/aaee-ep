"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { pendingCount } from "@/lib/db/sync-queue";

/**
 * Indicador "N alterações pendentes". Só aparece quando há operações na fila
 * offline. Leva pra lista de sincronização em /perfil.
 */
export function PendingSyncBadge({ className }: { className?: string }) {
  const count = useLiveQuery(() => pendingCount(), [], 0);
  if (!count) return null;

  return (
    <Link
      href="/perfil#sync"
      title={`${count} ${count === 1 ? "alteração pendente" : "alterações pendentes"} de sincronização`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-accent/50 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent-foreground",
        className,
      )}
    >
      <CloudOff className="h-3.5 w-3.5" />
      <span className="tabular-nums">{count}</span>
    </Link>
  );
}
