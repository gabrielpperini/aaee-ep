import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { EventPhase, EventPriority, EventStatus, ModalityCategory } from "@/generated/prisma/client";

export function formatEventTime(start: Date, end: Date): string {
  return `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`;
}

export function formatDate(date: Date): string {
  return format(date, "dd 'de' MMMM", { locale: ptBR });
}

export function formatDateTime(date: Date): string {
  return format(date, "dd/MM HH:mm");
}

export function toDatetimeLocal(date: Date): string {
  // Para inputs do tipo datetime-local — string sem timezone.
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const PRIORITY_LABELS: Record<EventPriority, string> = {
  LOW: "Baixa",
  NORMAL: "Normal",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

export const STATUS_LABELS: Record<EventStatus, string> = {
  CONFIRMED: "Confirmado",
  POSSIBLE: "Possível",
  IN_PROGRESS: "Em andamento",
  FINISHED: "Finalizado",
  CANCELLED: "Cancelado",
  POSTPONED: "Adiado",
};

export const PHASE_LABELS: Record<EventPhase, string> = {
  GROUP: "Fase de grupos",
  ROUND_OF_16: "Oitavas",
  QUARTER: "Quartas",
  SEMI: "Semifinal",
  FINAL: "Final",
  THIRD_PLACE: "Disputa 3º",
  HEAT: "Bateria",
  ELIMINATORY: "Eliminatória",
  OTHER: "Outro",
};

export const MODALITY_CATEGORY_LABELS: Record<ModalityCategory, string> = {
  SPORT: "Esporte",
  CULTURAL: "Cultural",
  CHEERING: "Torcida",
  LOGISTICS: "Logística",
  GENERAL: "Geral",
};

export function priorityVariant(priority: EventPriority): "default" | "secondary" | "destructive" | "outline" {
  switch (priority) {
    case "CRITICAL":
      return "destructive";
    case "HIGH":
      return "default";
    case "LOW":
      return "outline";
    default:
      return "secondary";
  }
}

export function statusVariant(status: EventStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "CANCELLED":
      return "destructive";
    case "POSSIBLE":
    case "POSTPONED":
      return "outline";
    case "FINISHED":
      return "secondary";
    default:
      return "default";
  }
}
