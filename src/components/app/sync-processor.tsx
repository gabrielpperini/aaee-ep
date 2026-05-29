"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { pendingCount, processQueue } from "@/lib/db/sync-queue";

const POLL_MS = 30_000;

/**
 * Drena a fila offline quando volta a conexão. Gatilhos:
 * - evento `online` / `navigator.connection.change` (via useOnlineStatus)
 * - Background Sync (`SyncManager`) → o SW faz `postMessage({type:"sync-queue"})`
 * - fallback: poll a cada 30s enquanto online
 * Não renderiza nada.
 */
export function SyncProcessor() {
  const online = useOnlineStatus();

  useEffect(() => {
    if (!online) return;
    let cancelled = false;

    const run = async () => {
      if (cancelled || (await pendingCount()) === 0) return;
      const r = await processQueue();
      if (cancelled) return;
      if (r.done)
        toast.success(
          `${r.done} ${r.done === 1 ? "alteração sincronizada" : "alterações sincronizadas"}`,
        );
      if (r.conflict)
        toast.error(`${r.conflict} conflito(s) na sincronização — veja em Perfil`);
      if (r.failed)
        toast.error(`${r.failed} falha(s) na sincronização — veja em Perfil`);
    };

    void run(); // ao ficar online / montar

    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "sync-queue") void run();
    };
    navigator.serviceWorker?.addEventListener?.("message", onMessage);

    // Registra Background Sync (best-effort; nem todo browser suporta).
    navigator.serviceWorker?.ready
      ?.then((reg) => {
        (
          reg as ServiceWorkerRegistration & {
            sync?: { register: (tag: string) => Promise<void> };
          }
        ).sync
          ?.register("sync-queue")
          .catch(() => undefined);
      })
      .catch(() => undefined);

    const interval = window.setInterval(() => void run(), POLL_MS);

    return () => {
      cancelled = true;
      navigator.serviceWorker?.removeEventListener?.("message", onMessage);
      window.clearInterval(interval);
    };
  }, [online]);

  return null;
}
