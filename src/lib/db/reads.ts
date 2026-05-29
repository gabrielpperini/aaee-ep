// Leituras offline-aware (client-only).
//
// Quando online, prefere os dados que vieram do servidor (props/SSR); quando
// offline, lê do cache Dexie hidratado pelo <OfflineHydrator/>. Consumido pelos
// widgets interativos (check-in, listas no client). As páginas SSR continuam
// servidas via cache de HTML do service worker.

import { db, type OfflineCheckIn, type OfflineEvent } from "@/lib/db/dexie";

/** Eventos próprios do cache, ordenados por dia e horário. */
export async function readEventsFromCache(): Promise<OfflineEvent[]> {
  const all = await db.events.toArray();
  return all.sort(
    (a, b) => a.day - b.day || a.startTime.localeCompare(b.startTime),
  );
}

/** Estado de check-in da pessoa num evento (inclui otimistas pendentes). */
export function readMyCheckIn(
  eventId: string,
  personId: string,
): Promise<OfflineCheckIn | undefined> {
  return db.checkIns.get([eventId, personId]);
}

/**
 * Online → usa o `fallback` (dados do servidor já em mãos); offline → lê do
 * cache local.
 */
export async function getEventsOfflineAware(
  online: boolean,
  fallback?: OfflineEvent[],
): Promise<OfflineEvent[]> {
  if (online && fallback) return fallback;
  return readEventsFromCache();
}
