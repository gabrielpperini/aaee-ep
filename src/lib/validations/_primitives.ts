import { z } from "zod";

/* ---------- Texto ---------- */

export const requiredText = (label: string, max = 240) =>
  z
    .string({ message: `${label} é obrigatório` })
    .trim()
    .min(1, `${label} é obrigatório`)
    .max(max, `${label} muito longo (máx. ${max})`);

export const optionalText = (max = 500) =>
  z.string().trim().max(max).optional().or(z.literal(""));

/* ---------- Email ---------- */

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Email inválido");

export const optionalEmail = z.union([email, z.literal("")]).optional();

/* ---------- Telefone BR ---------- */

const BR_PHONE_RE = /^\d{10,11}$/u;

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizeBrPhone(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = phoneDigits(value);
  return d.length >= 10 ? d : null;
}

/** Aceita string com máscara ou só dígitos; valida que tem 10/11 dígitos. */
export const phoneBR = z
  .string()
  .min(1, "Telefone obrigatório")
  .refine((v) => BR_PHONE_RE.test(phoneDigits(v)), {
    message: "Telefone deve ter 10 ou 11 dígitos — ex: (51) 99999-9999",
  });

export const optionalPhoneBR = z
  .string()
  .refine(
    (v) => v === "" || BR_PHONE_RE.test(phoneDigits(v)),
    "Telefone deve ter 10 ou 11 dígitos — ex: (51) 99999-9999",
  )
  .optional()
  .or(z.literal(""));

/* ---------- Senha ---------- */

export const password = z
  .string()
  .min(8, "Senha precisa ter pelo menos 8 caracteres")
  .regex(/[A-Za-z]/u, "Senha precisa conter pelo menos 1 letra")
  .regex(/[0-9]/u, "Senha precisa conter pelo menos 1 número");

/* ---------- Data/hora ---------- */

/** String "YYYY-MM-DDTHH:mm" do datetime-local / DateTimePicker. */
export const datetimeLocal = z
  .string()
  .min(1, "Selecione data e hora")
  .refine((v) => !Number.isNaN(new Date(v).getTime()), {
    message: "Data inválida",
  });

/* ---------- Enums do domínio (espelham prisma/schema.prisma) ---------- */

export const roleEnum = z.enum(["USER", "DIRECTOR", "ADMIN"]);
export type RoleValue = z.infer<typeof roleEnum>;

export const eventStatusEnum = z.enum([
  "CONFIRMED",
  "CANCELLED",
  "POSTPONED",
]);
export type EventStatusValue = z.infer<typeof eventStatusEnum>;

export const eventPriorityEnum = z.enum([
  "LOW",
  "NORMAL",
  "HIGH",
  "CRITICAL",
]);
export type EventPriorityValue = z.infer<typeof eventPriorityEnum>;

export const eventPhaseEnum = z.enum([
  "GROUP",
  "ROUND_OF_16",
  "QUARTER",
  "SEMI",
  "FINAL",
  "THIRD_PLACE",
  "HEAT",
  "ELIMINATORY",
  "OTHER",
]);
export type EventPhaseValue = z.infer<typeof eventPhaseEnum>;

export const modalityCategoryEnum = z.enum([
  "SPORT",
  "CULTURAL",
  "CHEERING",
  "LOGISTICS",
  "GENERAL",
]);
export type ModalityCategoryValue = z.infer<typeof modalityCategoryEnum>;

export const courseEnum = z.enum([
  "CIVIL",
  "ELETRICA",
  "MECANICA",
  "COMPUTACAO",
  "CONTROLE_AUTOMACAO",
  "MATERIAIS",
  "CARTOGRAFICA",
  "ENERGIA",
  "METALURGICA",
  "QUIMICA",
  "ALIMENTOS",
  "MINAS",
  "PRODUCAO",
  "AMBIENTAL",
  "FISICA",
  "ARQUITETURA_URBANISMO",
  "AGRONOMIA",
]);
export type CourseValue = z.infer<typeof courseEnum>;

/* ---------- Helpers ---------- */

export const semester = z
  .number({ message: "Selecione um semestre" })
  .int("Semestre inválido")
  .min(1, "Semestre inválido")
  .max(10, "Semestre inválido");

export const cuid = z.string().min(1, "ID inválido");

export const idList = z.array(z.string());
