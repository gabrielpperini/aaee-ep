import { addMinutes } from "date-fns";

export const SLOT_MINUTES = 30;

/** Arredonda uma data para baixo no múltiplo de 30 minutos. */
export function floorToSlot(d: Date): Date {
  const ms = SLOT_MINUTES * 60 * 1000;
  return new Date(Math.floor(d.getTime() / ms) * ms);
}

/** Arredonda para cima no múltiplo de 30 minutos. */
export function ceilToSlot(d: Date): Date {
  const ms = SLOT_MINUTES * 60 * 1000;
  return new Date(Math.ceil(d.getTime() / ms) * ms);
}

/** Gera todos os slots de 30 min de `start` (inclusive) até `end` (exclusivo). */
export function generateSlots(start: Date, end: Date): Date[] {
  const slots: Date[] = [];
  let cur = floorToSlot(start);
  const limit = ceilToSlot(end);
  while (cur < limit) {
    slots.push(cur);
    cur = addMinutes(cur, SLOT_MINUTES);
  }
  return slots;
}

/** True se algum intervalo `[evStart, evEnd)` cobre o slot `[slotStart, slotStart+30)`. */
export function slotCoveredBy(
  slotStart: Date,
  intervals: { start: Date; end: Date }[],
): boolean {
  const slotEnd = addMinutes(slotStart, SLOT_MINUTES);
  for (const i of intervals) {
    // sobreposição estrita
    if (i.start < slotEnd && i.end > slotStart) return true;
  }
  return false;
}

/** Chave estável para identificar um slot (ISO sem sub-segundos). */
export function slotKey(d: Date): string {
  return d.toISOString();
}

/** Formata `HH:mm`. */
export function slotLabel(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
