"use client";

import { useEffect } from "react";
import { db } from "@/lib/db/dexie";
import type { HydrationData } from "@/lib/db/hydration-source";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";

/**
 * Espelha no Dexie os dados próprios da pessoa (eventos, alocações, check-ins)
 * a cada navegação autenticada enquanto online. Não renderiza nada.
 *
 * - `events`/`assignments` usam `bulkPut` (upsert, sem apagar) — o cache da
 *   agenda de outras telas não é tocado.
 * - `checkIns` confirmados do servidor são gravados, mas NÃO sobrescrevem
 *   check-ins ainda `pending` (otimistas) da fila offline (Bloco C2/C3).
 */
export function OfflineHydrator({ data }: { data: HydrationData }) {
  const online = useOnlineStatus();

  useEffect(() => {
    if (!online) return;
    let cancelled = false;

    void (async () => {
      try {
        await db.transaction(
          "rw",
          db.events,
          db.assignments,
          db.checkIns,
          db.meta,
          async () => {
            await db.events.bulkPut(data.events);
            await db.assignments.bulkPut(data.assignments);

            for (const c of data.checkIns) {
              const existing = await db.checkIns.get([c.eventId, c.personId]);
              if (existing?.pending) continue; // preserva otimista pendente
              await db.checkIns.put(c);
            }

            await db.meta.put({
              key: "lastSyncedAt",
              value: new Date().toISOString(),
            });
          },
        );
      } catch (err) {
        if (!cancelled) console.warn("[offline] hidratação falhou", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [online, data]);

  return null;
}
