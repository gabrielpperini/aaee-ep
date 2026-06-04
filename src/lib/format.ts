import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import type {
  AssignmentRole,
  Course,
  EventPhase,
  EventPriority,
  EventStatus,
  ModalityCategory,
} from "@/generated/prisma/client";
import { APP_TIME_ZONE, nowDate } from "./time";

/** Rótulo usado quando o evento ainda não tem horário definido (`timeTbd`). */
export const TIME_TBD_LABEL = "Horário a definir";

/** Hora isolada (HH:mm) pinada em São Paulo — nunca usar getHours()/toLocaleTimeString cru, que seguem o fuso do runtime (UTC em produção). */
export function formatTime(date: Date): string {
  return formatInTimeZone(date, APP_TIME_ZONE, "HH:mm");
}

export function formatEventTime(start: Date, end: Date, timeTbd = false): string {
  if (timeTbd) return TIME_TBD_LABEL;
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function formatDate(date: Date): string {
  return formatInTimeZone(date, APP_TIME_ZONE, "dd 'de' MMMM", { locale: ptBR });
}

export function formatDateTime(date: Date): string {
  return formatInTimeZone(date, APP_TIME_ZONE, "dd/MM HH:mm");
}

/** "Quando" pra mensagens (WhatsApp): data+hora, ou só data se sem horário. */
export function formatEventWhen(start: Date, timeTbd = false): string {
  return timeTbd ? `${formatDate(start)} (horário a definir)` : formatDateTime(start);
}

export function toDatetimeLocal(date: Date): string {
  // Wall-clock de São Paulo pro DateTimePicker (string sem timezone). Pinado em
  // APP_TIME_ZONE pra não depender do fuso do navegador/servidor que renderiza.
  return formatInTimeZone(date, APP_TIME_ZONE, "yyyy-MM-dd'T'HH:mm");
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
  timeTbd?: boolean;
}, now: Date = nowDate()): DerivedEventStatus {
  if (event.status === "CANCELLED" || event.status === "POSTPONED") {
    return event.status;
  }
  // Sem horário definido não dá pra derivar "em andamento"/"finalizado".
  if (event.timeTbd) return event.isConditional ? "POSSIBLE" : "CONFIRMED";
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
  ALIMENTOS: "Alimentos",
  MINAS: "Minas",
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
