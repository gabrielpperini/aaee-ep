import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type {
  AssignmentRole,
  Course,
  EventPhase,
  EventPriority,
  EventStatus,
  ModalityCategory,
} from "@/generated/prisma/client";
import { nowDate } from "./time";

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
  CANCELLED: "Cancelado",
  POSTPONED: "Adiado",
};

/**
 * Status que ainda contam como "compromisso" da pessoa — aparecem em
 * "Meu horário" e geram conflito de alocação. POSTPONED entra aqui porque
 * a remarcação pode voltar a cair no mesmo horário.
 */
export const COMMITTED_STATUSES: EventStatus[] = ["CONFIRMED", "POSTPONED"];

/** Status considerados "ativos" para dashboard ("acontecendo agora", "livre agora"). */
export const LIVE_STATUSES: EventStatus[] = ["CONFIRMED"];

/** Status derivado pra exibição na UI, computado de status + tempos + isConditional. */
export type DerivedEventStatus =
  | "CONFIRMED"
  | "POSSIBLE"
  | "IN_PROGRESS"
  | "FINISHED"
  | "CANCELLED"
  | "POSTPONED";

export const DERIVED_STATUS_LABELS: Record<DerivedEventStatus, string> = {
  CONFIRMED: "Confirmado",
  POSSIBLE: "Possível",
  IN_PROGRESS: "Em andamento",
  FINISHED: "Finalizado",
  CANCELLED: "Cancelado",
  POSTPONED: "Adiado",
};

export function deriveEventStatus(event: {
  status: EventStatus;
  startTime: Date;
  endTime: Date;
  isConditional: boolean;
}, now: Date = nowDate()): DerivedEventStatus {
  if (event.status === "CANCELLED" || event.status === "POSTPONED") {
    return event.status;
  }
  if (event.endTime.getTime() < now.getTime()) return "FINISHED";
  if (event.startTime.getTime() <= now.getTime() && now.getTime() <= event.endTime.getTime()) {
    return "IN_PROGRESS";
  }
  if (event.isConditional) return "POSSIBLE";
  return "CONFIRMED";
}

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
    case "POSTPONED":
      return "outline";
    default:
      return "default";
  }
}

export const COURSE_LABELS: Record<Course, string> = {
  CIVIL: "Civil",
  ELETRICA: "Elétrica",
  MECANICA: "Mecânica",
  COMPUTACAO: "Computação",
  CONTROLE_AUTOMACAO: "Controle e Automação",
  MATERIAIS: "Materiais",
  CARTOGRAFICA: "Cartográfica",
  ENERGIA: "Energia",
  METALURGICA: "Metalúrgica",
  QUIMICA: "Química",
  PRODUCAO: "Produção",
  AMBIENTAL: "Ambiental",
  FISICA: "Física",
  ARQUITETURA_URBANISMO: "Arquitetura e Urbanismo",
  AGRONOMIA: "Agronomia",
};

export const COURSE_OPTIONS: { value: Course; label: string }[] = (
  Object.entries(COURSE_LABELS) as [Course, string][]
).map(([value, label]) => ({ value, label }));

export const ASSIGNMENT_ROLE_LABELS: Record<AssignmentRole, string> = {
  SUPPORTER: "Torcedor(a)",
  CAPTAIN: "Capitão/Capitã",
  MATERIAL_LEAD: "Responsável material",
  SUPPORT: "Apoio",
};
