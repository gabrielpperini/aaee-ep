import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/** Singleton id da edição atual do EP. */
export const EP_EDITION_ID = "current";

/** Dias modeláveis no EP. 0=ida/chegada, 1..3=competição, 4=volta. */
export const EP_DAYS = [0, 1, 2, 3, 4] as const;
export type EpDay = (typeof EP_DAYS)[number];

/** Label curto de cada day. Usado em badges/headers. */
export const EP_DAY_SHORT_LABEL: Record<number, string> = {
  0: "Ida",
  1: "Dia 1",
  2: "Dia 2",
  3: "Dia 3",
  4: "Volta",
};

/** Label longo (pra empty states / títulos). */
export const EP_DAY_LONG_LABEL: Record<number, string> = {
  0: "Ida / chegada",
  1: "Dia 1 · competição",
  2: "Dia 2 · competição",
  3: "Dia 3 · competição",
  4: "Volta / desembarque",
};

export type EpEditionDates = {
  name: string | null;
  byDay: Record<number, Date | null>;
};

/** Formata a data de um day como "qua, 22/05". Retorna null se não houver. */
export function formatEpDayDate(date: Date | null | undefined): string | null {
  if (!date) return null;
  return format(date, "EEE, dd/MM", { locale: ptBR });
}
