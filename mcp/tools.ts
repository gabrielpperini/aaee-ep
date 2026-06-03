/**
 * Tools do MCP da plataforma AAEE-EP — módulo compartilhado entre o transporte
 * stdio (local, mcp/server.ts) e o HTTP remoto (src/app/api/[transport]/route.ts).
 *
 * `registerTools(server)` registra todas as tools num McpServer. A lógica de
 * negócio reaproveita os schemas Zod de @/lib/validations/*, syncEventRoster/
 * syncPersonRoster (escalação automática), APP_TIME_ZONE + fromZonedTime (UTC)
 * e deriveEventStatus (status derivado) — exatamente como as server actions.
 *
 * Diferenças vs. as actions: sem requireRole/requireUser (o caller é tratado
 * como admin; a proteção é a URL-capacidade) e sem revalidatePath. As tools que
 * ENVIAM notificação (send_broadcast, call_supporters) carregam @/lib/push via
 * import() dinâmico dentro do handler — pleno no HTTP (Vercel), degrada no stdio
 * (onde "server-only" é irresolvível). Ver mcp/README.md.
 */

import { z, type ZodRawShape } from "zod";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { prisma } from "@/lib/prisma";
import { syncEventRoster, syncPersonRoster } from "@/lib/roster";
import { APP_TIME_ZONE, nowDate } from "@/lib/time";
import {
  deriveEventStatus,
  DERIVED_STATUS_LABELS,
  COMMITTED_STATUSES,
} from "@/lib/format";
import { eventSchema } from "@/lib/validations/event";
import { personSchema } from "@/lib/validations/person";
import { modalitySchema } from "@/lib/validations/modality";
import { locationSchema } from "@/lib/validations/location";
import { epEditionSchema } from "@/lib/validations/ep-edition";
import { broadcastSchema } from "@/lib/validations/broadcast";
import { callSupportersSchema } from "@/lib/validations/push";
import { phoneDigits, roleEnum } from "@/lib/validations/_primitives";
import { EP_EDITION_ID } from "@/lib/ep-edition";
import { AssignmentRole, EventStatus, Role } from "@/generated/prisma/client";

type Json = Record<string, unknown>;
type JsonOut = Json | Json[] | string;

/** Erro de domínio → vira `isError: true` na resposta da tool. */
export class ToolError extends Error {}

// ============================================================
// Helpers de fuso / serialização
// ============================================================

const WALL = "yyyy-MM-dd'T'HH:mm"; // datetime-local de São Paulo

function toSpWall(d: Date): string {
  return formatInTimeZone(d, APP_TIME_ZONE, WALL);
}
function toSpHuman(d: Date): string {
  return formatInTimeZone(d, APP_TIME_ZONE, "dd/MM/yyyy HH:mm");
}

function serializeEvent(e: {
  id: string;
  title: string;
  modalityId: string;
  day: number;
  startTime: Date;
  endTime: Date;
  timeTbd: boolean;
  status: EventStatus;
  isConditional: boolean;
  priority: string;
  phase: string;
  opponent: string | null;
  description?: string | null;
  locationId: string | null;
  desiredSupportersCount: number;
  modality?: { name: string } | null;
  location?: { name: string } | null;
}): Json {
  const derived = deriveEventStatus(e, nowDate());
  return {
    id: e.id,
    title: e.title,
    modalityId: e.modalityId,
    modality: e.modality?.name ?? null,
    day: e.day,
    startTime: e.startTime.toISOString(),
    endTime: e.endTime.toISOString(),
    when: e.timeTbd ? "Horário a definir" : toSpHuman(e.startTime),
    timeTbd: e.timeTbd,
    status: e.status,
    derivedStatus: derived,
    derivedStatusLabel: DERIVED_STATUS_LABELS[derived],
    isConditional: e.isConditional,
    priority: e.priority,
    phase: e.phase,
    opponent: e.opponent,
    ...(e.description !== undefined ? { description: e.description } : {}),
    locationId: e.locationId,
    location: e.location?.name ?? null,
    desiredSupportersCount: e.desiredSupportersCount,
  };
}

// ============================================================
// Helpers de args
// ============================================================

function reqStr(a: Json, key: string): string {
  const v = a[key];
  if (typeof v !== "string" || !v) throw new ToolError(`Campo obrigatório ausente: ${key}`);
  return v;
}
function pick<T>(incoming: unknown, existing: T | null | undefined, fallback: T): T {
  if (incoming !== undefined && incoming !== null) return incoming as T;
  if (existing !== undefined && existing !== null) return existing;
  return fallback;
}
function zodMsg(err: {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}): string {
  return err.issues
    .map((i) => `${i.path.map(String).join(".") || "(root)"}: ${i.message}`)
    .join("; ");
}
function isUniqueEmail(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as { code?: string }).code === "P2002" &&
    String((e as { meta?: { target?: string[] } }).meta?.target ?? "").includes("email")
  );
}

// ============================================================
// Implementações compartilhadas (create/update com merge)
// ============================================================

async function savePersonImpl(a: Json, id: string | null): Promise<Json> {
  const existing = id
    ? await prisma.person.findUnique({
        where: { id },
        include: { modalityAthlete: { select: { modalityId: true } } },
      })
    : null;
  if (id && !existing) throw new ToolError("Pessoa não encontrada.");

  const merged = {
    id: id ?? undefined,
    name: a.name ?? existing?.name,
    nickname: a.nickname ?? existing?.nickname ?? "",
    email: a.email ?? existing?.email ?? "",
    phone: a.phone ?? existing?.phone ?? "",
    isAthlete: pick(a.isAthlete, existing?.isAthlete, false),
    isSupporter: pick(a.isSupporter, existing?.isSupporter, true),
    isDirector: pick(a.isDirector, existing?.isDirector, false),
    isSupport: pick(a.isSupport, existing?.isSupport, false),
    isBateria: pick(a.isBateria, existing?.isBateria, false),
    notes: a.notes ?? existing?.notes ?? "",
    modalityIds: Array.isArray(a.modalityIds)
      ? (a.modalityIds as string[])
      : existing?.modalityAthlete.map((m) => m.modalityId) ?? [],
  };

  const parsed = personSchema.safeParse(merged);
  if (!parsed.success) throw new ToolError(zodMsg(parsed.error));

  const { modalityIds, name, nickname, email, phone, notes, ...flags } = parsed.data;
  const data = {
    name,
    nickname: nickname?.trim() || null,
    email: email?.trim().toLowerCase() || null,
    phone: phone ? phoneDigits(phone) || null : null,
    notes: notes?.trim() || null,
    ...flags,
  };

  let personId = id ?? "";
  try {
    await prisma.$transaction(async (tx) => {
      if (id) {
        await tx.person.update({ where: { id }, data });
        await tx.modalityAthlete.deleteMany({ where: { personId: id } });
        if (modalityIds.length > 0) {
          await tx.modalityAthlete.createMany({
            data: modalityIds.map((modalityId) => ({ personId: id, modalityId })),
          });
        }
      } else {
        const person = await tx.person.create({
          data: {
            ...data,
            modalityAthlete: { create: modalityIds.map((modalityId) => ({ modalityId })) },
          },
        });
        personId = person.id;
      }
      await syncPersonRoster(tx, personId, modalityIds);
    });
  } catch (e) {
    if (isUniqueEmail(e)) throw new ToolError("Já existe uma pessoa com esse email.");
    throw e;
  }
  return { id: personId, saved: true };
}

async function saveEventImpl(a: Json, id: string | null): Promise<Json> {
  const existing = id ? await prisma.event.findUnique({ where: { id } }) : null;
  if (id && !existing) throw new ToolError("Evento não encontrado.");

  const timeTbd = pick(a.timeTbd, existing?.timeTbd, false);
  const merged = {
    id: id ?? undefined,
    modalityId: a.modalityId ?? existing?.modalityId,
    title: a.title ?? existing?.title,
    description: a.description ?? existing?.description ?? "",
    day: pick(a.day, existing?.day, 0),
    startTime: a.startTime ?? (existing ? toSpWall(existing.startTime) : undefined),
    endTime: a.endTime ?? (existing ? toSpWall(existing.endTime) : ""),
    timeTbd,
    locationId: a.locationId ?? existing?.locationId ?? "",
    opponent: a.opponent ?? existing?.opponent ?? "",
    phase: a.phase ?? existing?.phase ?? "OTHER",
    priority: a.priority ?? existing?.priority ?? "NORMAL",
    status: a.status ?? existing?.status ?? "CONFIRMED",
    isConditional: pick(a.isConditional, existing?.isConditional, false),
    desiredSupportersCount: pick(a.desiredSupportersCount, existing?.desiredSupportersCount, 0),
  };

  const parsed = eventSchema.safeParse(merged);
  if (!parsed.success) throw new ToolError(zodMsg(parsed.error));

  const { id: _omit, locationId, startTime, endTime, description, opponent, ...rest } = parsed.data;
  const start = fromZonedTime(startTime, APP_TIME_ZONE);
  const data = {
    ...rest,
    startTime: start,
    endTime: rest.timeTbd ? start : fromZonedTime(endTime, APP_TIME_ZONE),
    locationId: locationId || null,
    description: description?.trim() || null,
    opponent: opponent?.trim() || null,
  };

  const eventId = await prisma.$transaction(async (tx) => {
    const event = id
      ? await tx.event.update({ where: { id }, data })
      : await tx.event.create({ data });
    await syncEventRoster(tx, event.id, event.modalityId);
    return event.id;
  });
  return { id: eventId, saved: true };
}

// ============================================================
// Registro das tools
// ============================================================

/** Envolve um handler retornando Json/string no formato CallToolResult. */
async function toResult(run: () => Promise<JsonOut>): Promise<CallToolResult> {
  try {
    const r = await run();
    const text = typeof r === "string" ? r : JSON.stringify(r, null, 2);
    return { content: [{ type: "text", text }] };
  } catch (e) {
    const text = e instanceof ToolError ? e.message : `Erro: ${(e as Error).message}`;
    return { isError: true, content: [{ type: "text", text }] };
  }
}

// ============================================================
// Helpers de domínio replicados (sem tocar nas páginas/actions do app)
// ============================================================

/** EpEdition: "YYYY-MM-DD" → Date UTC ancorada às 12:00 de São Paulo. */
function toDateOrNull(value: string | undefined | null): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const d = fromZonedTime(`${trimmed}T12:00:00`, APP_TIME_ZONE);
  return Number.isNaN(d.getTime()) ? null : d;
}

const NOTIF_DEFAULT = { allocation: true, eventReminder: true, captainCall: true, syncConflict: true };

/**
 * Candidatos a torcida de um evento (replica eventos/[id]/page.tsx). Todo mundo
 * é disponível por padrão, menos quem é atleta do evento ou já está alocado.
 * Marca `conflict` (já alocado em evento sobreposto) e `competingElsewhere`
 * (atleta em evento sobreposto). Choque só vale entre eventos com horário definido.
 */
async function getAvailableSupportersForEvent(eventId: string): Promise<Json> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      athletes: { select: { personId: true } },
      assignments: { select: { personId: true } },
    },
  });
  if (!event) throw new ToolError("Evento não encontrado.");

  const assignedIds = new Set(event.assignments.map((a) => a.personId));
  const competingIds = new Set(event.athletes.map((a) => a.personId));

  const overlapEvent = event.timeTbd
    ? null
    : {
        startTime: { lt: event.endTime },
        endTime: { gt: event.startTime },
        status: { in: COMMITTED_STATUSES },
        timeTbd: false,
      };

  type OverlapRow = { personId: string; event: { id: string; title: string } };
  const [people, conflicts, competingConflicts] = await Promise.all([
    prisma.person.findMany({
      where: { id: { notIn: [...assignedIds, ...competingIds] } },
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true, nickname: true, phone: true },
    }),
    overlapEvent
      ? prisma.assignment.findMany({
          where: { eventId: { not: event.id }, event: overlapEvent },
          select: { personId: true, event: { select: { id: true, title: true } } },
        })
      : Promise.resolve([] as OverlapRow[]),
    overlapEvent
      ? prisma.eventAthlete.findMany({
          where: { eventId: { not: event.id }, event: overlapEvent },
          select: { personId: true, event: { select: { id: true, title: true } } },
        })
      : Promise.resolve([] as OverlapRow[]),
  ]);

  const conflictBy = new Map<string, { eventId: string; title: string }>();
  for (const c of conflicts)
    if (!conflictBy.has(c.personId)) conflictBy.set(c.personId, { eventId: c.event.id, title: c.event.title });
  const competingBy = new Map<string, { eventId: string; title: string }>();
  for (const c of competingConflicts)
    if (!competingBy.has(c.personId)) competingBy.set(c.personId, { eventId: c.event.id, title: c.event.title });

  return {
    eventId: event.id,
    eventTitle: event.title,
    timeTbd: event.timeTbd,
    available: people.map((p) => ({
      ...p,
      conflict: conflictBy.get(p.id) ?? null,
      competingElsewhere: competingBy.get(p.id) ?? null,
    })),
  };
}

const SOON_HORIZON_MS = 3 * 60 * 60 * 1000; // 3h
const PRIORITY_RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 };

/** Visão operacional do dashboard (replica dashboard/page.tsx). */
async function getDashboardDetail(): Promise<Json> {
  const now = nowDate();
  const soonEnd = new Date(now.getTime() + SOON_HORIZON_MS);

  const [happeningNow, upcomingSoon, allActive, busyNow, competingNow, totalPeople] = await Promise.all([
    prisma.event.findMany({
      where: { startTime: { lte: now }, endTime: { gt: now }, status: "CONFIRMED" },
      orderBy: { startTime: "asc" },
      include: { modality: { select: { name: true } }, location: { select: { name: true } }, _count: { select: { assignments: true, checkIns: true } } },
    }),
    prisma.event.findMany({
      where: { startTime: { gt: now, lte: soonEnd }, status: "CONFIRMED" },
      orderBy: { startTime: "asc" },
      include: { modality: { select: { name: true } }, location: { select: { name: true } }, _count: { select: { assignments: true } } },
    }),
    prisma.event.findMany({
      where: { endTime: { gt: now }, status: "CONFIRMED" },
      orderBy: [{ priority: "asc" }, { startTime: "asc" }],
      include: { modality: { select: { name: true } }, _count: { select: { assignments: true } } },
    }),
    prisma.assignment.findMany({ where: { event: { startTime: { lte: now }, endTime: { gt: now }, status: "CONFIRMED" } }, select: { personId: true }, distinct: ["personId"] }),
    prisma.eventAthlete.findMany({ where: { event: { startTime: { lte: now }, endTime: { gt: now }, status: "CONFIRMED" } }, select: { personId: true }, distinct: ["personId"] }),
    prisma.person.count(),
  ]);

  const busyIds = new Set<string>();
  for (const b of busyNow) busyIds.add(b.personId);
  for (const c of competingNow) busyIds.add(c.personId);
  const busyCount = busyIds.size;

  const understaffedPriority = allActive
    .filter((e) => (e.priority === "HIGH" || e.priority === "CRITICAL") && e.desiredSupportersCount > 0 && e._count.assignments < e.desiredSupportersCount)
    .sort((a, b) => {
      const ra = PRIORITY_RANK[a.priority] ?? 9;
      const rb = PRIORITY_RANK[b.priority] ?? 9;
      if (ra !== rb) return ra - rb;
      return a.startTime.getTime() - b.startTime.getTime();
    })
    .map((e) => ({ id: e.id, title: e.title, modality: e.modality.name, priority: e.priority, desired: e.desiredSupportersCount, allocated: e._count.assignments, startTime: e.startTime.toISOString() }));

  return {
    now: now.toISOString(),
    happeningNow: happeningNow.map((e) => ({ id: e.id, title: e.title, modality: e.modality.name, location: e.location?.name ?? null, assignments: e._count.assignments, checkIns: e._count.checkIns, when: toSpHuman(e.startTime) })),
    upcomingSoon: upcomingSoon.map((e) => ({ id: e.id, title: e.title, modality: e.modality.name, location: e.location?.name ?? null, assignments: e._count.assignments, when: toSpHuman(e.startTime) })),
    understaffedPriority,
    totalPeople,
    busyNow: busyCount,
    freeNow: Math.max(0, totalPeople - busyCount),
  };
}

/**
 * Resolve o público de um broadcast em User.id (dedup). Replica
 * resolveRecipientUserIds de admin/notificacoes/actions.ts.
 */
async function resolveRecipientUserIds(audience: { toEveryone: boolean; modalityIds: string[]; eventIds: string[] }): Promise<string[]> {
  const ids = new Set<string>();
  if (audience.toEveryone) {
    const people = await prisma.person.findMany({ where: { userId: { not: null } }, select: { userId: true } });
    for (const p of people) if (p.userId) ids.add(p.userId);
    return [...ids];
  }
  const { modalityIds, eventIds } = audience;
  const [modalityAthletes, eventAthletes, assignments] = await Promise.all([
    modalityIds.length ? prisma.modalityAthlete.findMany({ where: { modalityId: { in: modalityIds } }, select: { person: { select: { userId: true } } } }) : [],
    eventIds.length ? prisma.eventAthlete.findMany({ where: { eventId: { in: eventIds } }, select: { person: { select: { userId: true } } } }) : [],
    eventIds.length ? prisma.assignment.findMany({ where: { eventId: { in: eventIds } }, select: { person: { select: { userId: true } } } }) : [],
  ]);
  for (const row of [...modalityAthletes, ...eventAthletes, ...assignments]) if (row.person.userId) ids.add(row.person.userId);
  return [...ids];
}

/** Nome do metadata do Supabase (auth.users). Map authUserId → name. Tolera ausência do schema. */
async function authNamesByAuthId(): Promise<Map<string, string | null>> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ id: string; name: string | null }[]>(
      `SELECT id, COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name') AS name FROM auth.users`,
    );
    return new Map(rows.map((r) => [r.id, r.name]));
  } catch {
    return new Map();
  }
}

export function registerTools(server: McpServer): void {
  const add = (
    name: string,
    description: string,
    shape: ZodRawShape,
    run: (a: Json) => Promise<JsonOut>,
  ) => {
    server.registerTool(
      name,
      { description, inputSchema: shape },
      // args já validado contra `shape` pelo SDK; tratamos como Json genérico.
      (args: unknown) => toResult(() => run((args ?? {}) as Json)),
    );
  };

  const ostr = z.string().optional();
  const obool = z.boolean().optional();
  const oint = z.number().int().optional();
  const ostrList = z.array(z.string()).optional();

  // ---------- Modalidades ----------
  add("list_modalities", "Lista todas as modalidades com contagem de atletas e eventos.", {}, async () => {
    const mods = await prisma.modality.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { athletes: true, events: true } } },
    });
    return mods.map((m) => ({
      id: m.id, name: m.name, category: m.category, priority: m.priority,
      notes: m.notes, athleteCount: m._count.athletes, eventCount: m._count.events,
    }));
  });

  add(
    "create_modality",
    "Cria uma modalidade. category: SPORT|CULTURAL|CHEERING|LOGISTICS|GENERAL. priority: LOW|NORMAL|HIGH|CRITICAL.",
    { name: z.string(), category: ostr, priority: ostr, notes: ostr },
    async (a) => {
      const parsed = modalitySchema.safeParse({
        name: a.name, category: a.category ?? "SPORT", priority: a.priority ?? "NORMAL", notes: a.notes ?? "",
      });
      if (!parsed.success) throw new ToolError(zodMsg(parsed.error));
      const { name, category, priority, notes } = parsed.data;
      const created = await prisma.modality.create({
        data: { name, category, priority, notes: notes?.trim() || null },
      });
      return { id: created.id, name: created.name };
    },
  );

  add(
    "update_modality",
    "Atualiza uma modalidade existente (só os campos enviados).",
    { id: z.string(), name: ostr, category: ostr, priority: ostr, notes: ostr },
    async (a) => {
      const id = reqStr(a, "id");
      const existing = await prisma.modality.findUnique({ where: { id } });
      if (!existing) throw new ToolError("Modalidade não encontrada.");
      const parsed = modalitySchema.safeParse({
        id, name: a.name ?? existing.name, category: a.category ?? existing.category,
        priority: a.priority ?? existing.priority, notes: a.notes ?? existing.notes ?? "",
      });
      if (!parsed.success) throw new ToolError(zodMsg(parsed.error));
      const { name, category, priority, notes } = parsed.data;
      await prisma.modality.update({ where: { id }, data: { name, category, priority, notes: notes?.trim() || null } });
      return { id, updated: true };
    },
  );

  add("delete_modality", "Exclui uma modalidade. Falha se houver eventos vinculados.", { id: z.string() }, async (a) => {
    const id = reqStr(a, "id");
    const eventCount = await prisma.event.count({ where: { modalityId: id } });
    if (eventCount > 0)
      throw new ToolError(`Esta modalidade tem ${eventCount} evento(s) vinculado(s). Reatribua ou exclua antes.`);
    await prisma.modality.delete({ where: { id } });
    return { id, deleted: true };
  });

  // ---------- Locais ----------
  add("list_locations", "Lista todos os locais cadastrados.", {}, async () => {
    const locs = await prisma.location.findMany({ orderBy: { name: "asc" } });
    return locs.map((l) => ({ id: l.id, name: l.name, address: l.address, description: l.description, notes: l.notes }));
  });

  add(
    "create_location", "Cria um local.",
    { name: z.string(), address: ostr, description: ostr, notes: ostr },
    async (a) => {
      const parsed = locationSchema.safeParse({
        name: a.name, address: a.address ?? "", description: a.description ?? "", notes: a.notes ?? "",
      });
      if (!parsed.success) throw new ToolError(zodMsg(parsed.error));
      const { name, address, description, notes } = parsed.data;
      const created = await prisma.location.create({
        data: { name, address: address?.trim() || null, description: description?.trim() || null, notes: notes?.trim() || null },
      });
      return { id: created.id, name: created.name };
    },
  );

  add(
    "update_location", "Atualiza um local (só os campos enviados).",
    { id: z.string(), name: ostr, address: ostr, description: ostr, notes: ostr },
    async (a) => {
      const id = reqStr(a, "id");
      const existing = await prisma.location.findUnique({ where: { id } });
      if (!existing) throw new ToolError("Local não encontrado.");
      const parsed = locationSchema.safeParse({
        id, name: a.name ?? existing.name, address: a.address ?? existing.address ?? "",
        description: a.description ?? existing.description ?? "", notes: a.notes ?? existing.notes ?? "",
      });
      if (!parsed.success) throw new ToolError(zodMsg(parsed.error));
      const { name, address, description, notes } = parsed.data;
      await prisma.location.update({
        where: { id },
        data: { name, address: address?.trim() || null, description: description?.trim() || null, notes: notes?.trim() || null },
      });
      return { id, updated: true };
    },
  );

  // ---------- Pessoas ----------
  add(
    "list_people",
    "Lista pessoas. Filtros: q (nome/apelido/email), isAthlete, isDirector, isSupporter, isSupport, isBateria.",
    { q: ostr, isAthlete: obool, isDirector: obool, isSupporter: obool, isSupport: obool, isBateria: obool },
    async (a) => {
      const where: Json = {};
      if (typeof a.q === "string" && a.q.trim()) {
        where.OR = [
          { name: { contains: a.q, mode: "insensitive" } },
          { nickname: { contains: a.q, mode: "insensitive" } },
          { email: { contains: a.q, mode: "insensitive" } },
        ];
      }
      for (const f of ["isAthlete", "isDirector", "isSupporter", "isSupport", "isBateria"])
        if (typeof a[f] === "boolean") where[f] = a[f];
      const people = await prisma.person.findMany({
        where,
        orderBy: { name: "asc" },
        include: { modalityAthlete: { include: { modality: { select: { name: true } } } } },
      });
      return people.map((p) => ({
        id: p.id, name: p.name, nickname: p.nickname, email: p.email, phone: p.phone,
        isAthlete: p.isAthlete, isSupporter: p.isSupporter, isDirector: p.isDirector,
        isSupport: p.isSupport, isBateria: p.isBateria,
        modalities: p.modalityAthlete.map((ma) => ma.modality.name),
      }));
    },
  );

  add("get_person", "Detalhe de uma pessoa: dados, modalidades (com IDs), alocações e check-ins.", { id: z.string() }, async (a) => {
    const id = reqStr(a, "id");
    const p = await prisma.person.findUnique({
      where: { id },
      include: {
        modalityAthlete: { include: { modality: { select: { id: true, name: true } } } },
        assignments: { include: { event: { select: { id: true, title: true } } } },
        checkIns: { include: { event: { select: { id: true, title: true } } } },
      },
    });
    if (!p) throw new ToolError("Pessoa não encontrada.");
    return {
      id: p.id, name: p.name, nickname: p.nickname, email: p.email, phone: p.phone,
      isAthlete: p.isAthlete, isSupporter: p.isSupporter, isDirector: p.isDirector,
      isSupport: p.isSupport, isBateria: p.isBateria, notes: p.notes,
      modalities: p.modalityAthlete.map((ma) => ({ id: ma.modality.id, name: ma.modality.name })),
      assignments: p.assignments.map((as) => ({ eventId: as.eventId, event: as.event.title, role: as.role, isCaptain: as.isCaptain })),
      checkIns: p.checkIns.map((c) => ({ eventId: c.eventId, event: c.event.title })),
    };
  });

  const personShape: ZodRawShape = {
    name: ostr, nickname: ostr, email: ostr, phone: ostr,
    isAthlete: obool, isSupporter: obool, isDirector: obool, isSupport: obool, isBateria: obool,
    notes: ostr, modalityIds: ostrList,
  };
  add(
    "create_person",
    "Cria uma pessoa. Flags default false (isSupporter default true). modalityIds vincula a modalidades — a escalação nos eventos delas é AUTOMÁTICA.",
    { ...personShape, name: z.string() },
    async (a) => savePersonImpl(a, null),
  );
  add(
    "update_person",
    "Atualiza uma pessoa (só os campos enviados). Enviar modalityIds SUBSTITUI o conjunto e re-sincroniza a escalação.",
    { id: z.string(), ...personShape },
    async (a) => savePersonImpl(a, reqStr(a, "id")),
  );
  add("delete_person", "Exclui uma pessoa (cascateia modalidades, escalações, alocações e check-ins).", { id: z.string() }, async (a) => {
    const id = reqStr(a, "id");
    await prisma.person.delete({ where: { id } });
    return { id, deleted: true };
  });

  // ---------- Eventos ----------
  add(
    "list_events",
    "Lista eventos com status derivado e horário em São Paulo. Filtros: day (0-4), modalityId, status.",
    { day: oint, modalityId: ostr, status: ostr },
    async (a) => {
      const where: Json = {};
      if (typeof a.day === "number") where.day = a.day;
      if (typeof a.modalityId === "string") where.modalityId = a.modalityId;
      if (typeof a.status === "string") where.status = a.status;
      const events = await prisma.event.findMany({
        where,
        orderBy: [{ day: "asc" }, { startTime: "asc" }],
        include: { modality: { select: { name: true } }, location: { select: { name: true } } },
      });
      return events.map(serializeEvent);
    },
  );

  add("get_event", "Detalhe de um evento: dados, escalação (atletas), alocações e check-ins.", { id: z.string() }, async (a) => {
    const id = reqStr(a, "id");
    const e = await prisma.event.findUnique({
      where: { id },
      include: {
        modality: { select: { name: true } },
        location: { select: { name: true } },
        athletes: { include: { person: { select: { id: true, name: true } } } },
        assignments: { include: { person: { select: { id: true, name: true } } } },
        checkIns: { include: { person: { select: { id: true, name: true } } } },
      },
    });
    if (!e) throw new ToolError("Evento não encontrado.");
    return {
      ...serializeEvent(e),
      athletes: e.athletes.map((x) => ({ id: x.person.id, name: x.person.name })),
      assignments: e.assignments.map((x) => ({ personId: x.person.id, name: x.person.name, role: x.role, isCaptain: x.isCaptain, notes: x.notes })),
      checkIns: e.checkIns.map((x) => ({ personId: x.person.id, name: x.person.name })),
    };
  });

  const eventShape: ZodRawShape = {
    modalityId: ostr, title: ostr, description: ostr, day: oint,
    startTime: z.string().optional().describe("Wall-clock São Paulo: 'YYYY-MM-DDTHH:mm'"),
    endTime: z.string().optional().describe("Wall-clock São Paulo (ignorado se timeTbd)"),
    timeTbd: obool, locationId: ostr, opponent: ostr, phase: ostr, priority: ostr,
    status: ostr, isConditional: obool, desiredSupportersCount: oint,
  };
  add(
    "create_event",
    "Cria um evento. startTime/endTime em horário de São Paulo ('YYYY-MM-DDTHH:mm'), gravados em UTC. day 0-4. Escalação AUTOMÁTICA pela modalidade. phase: GROUP|ROUND_OF_16|QUARTER|SEMI|FINAL|THIRD_PLACE|HEAT|ELIMINATORY|OTHER.",
    { ...eventShape, modalityId: z.string(), title: z.string(), day: z.number().int(), startTime: z.string() },
    async (a) => saveEventImpl(a, null),
  );
  add(
    "update_event",
    "Atualiza um evento (só os campos enviados; horários em São Paulo). Re-sincroniza a escalação.",
    { id: z.string(), ...eventShape },
    async (a) => saveEventImpl(a, reqStr(a, "id")),
  );
  add("delete_event", "Exclui um evento (cascateia escalação, alocações e check-ins).", { id: z.string() }, async (a) => {
    const id = reqStr(a, "id");
    await prisma.event.delete({ where: { id } });
    return { id, deleted: true };
  });

  add(
    "set_event_status",
    "Define o status de um evento: CONFIRMED, CANCELLED ou POSTPONED.",
    { eventId: z.string(), status: z.string() },
    async (a) => {
      const eventId = reqStr(a, "eventId");
      const status = reqStr(a, "status");
      if (!(status in EventStatus)) throw new ToolError("status inválido (CONFIRMED|CANCELLED|POSTPONED).");
      const updated = await prisma.event.update({
        where: { id: eventId },
        data: { status: status as EventStatus },
        select: { _count: { select: { assignments: true, checkIns: true } } },
      });
      return { eventId, status, assignments: updated._count.assignments, checkIns: updated._count.checkIns };
    },
  );

  // ---------- Escalação de modalidade ----------
  add("list_modality_athletes", "Lista os atletas vinculados a uma modalidade.", { modalityId: z.string() }, async (a) => {
    const modalityId = reqStr(a, "modalityId");
    const rows = await prisma.modalityAthlete.findMany({
      where: { modalityId },
      include: { person: { select: { id: true, name: true, nickname: true } } },
    });
    return rows.map((r) => ({ id: r.person.id, name: r.person.name, nickname: r.person.nickname }));
  });

  add(
    "set_modality_athletes",
    "Define o conjunto COMPLETO de atletas de uma modalidade (substitui a lista) e re-sincroniza a escalação dos eventos dela.",
    { modalityId: z.string(), personIds: z.array(z.string()) },
    async (a) => {
      const modalityId = reqStr(a, "modalityId");
      const personIds = Array.isArray(a.personIds) ? (a.personIds as string[]) : [];
      await prisma.$transaction(async (tx) => {
        await tx.modalityAthlete.deleteMany({ where: { modalityId } });
        if (personIds.length > 0) {
          await tx.modalityAthlete.createMany({
            data: personIds.map((personId) => ({ modalityId, personId })),
            skipDuplicates: true,
          });
        }
        const events = await tx.event.findMany({ where: { modalityId }, select: { id: true } });
        for (const e of events) await syncEventRoster(tx, e.id, modalityId);
      });
      return { modalityId, athleteCount: personIds.length };
    },
  );

  // ---------- Alocação de torcida ----------
  add(
    "allocate_supporter",
    "Aloca alguém como torcida/apoio/capitão num evento. role: SUPPORTER|CAPTAIN|MATERIAL_LEAD|SUPPORT. Bloqueia conflito de horário (competindo/já alocada — force=true ignora o último), atleta do próprio evento, ou evento cancelado.",
    { eventId: z.string(), personId: z.string(), role: ostr, isCaptain: obool, notes: ostr, force: obool },
    async (a) => {
      const eventId = reqStr(a, "eventId");
      const personId = reqStr(a, "personId");
      const role = (a.role as AssignmentRole) ?? AssignmentRole.SUPPORTER;
      if (!(role in AssignmentRole)) throw new ToolError("role inválido.");
      const isCaptain = a.isCaptain === true;
      const notes = typeof a.notes === "string" ? a.notes : "";
      const force = a.force === true;

      const targetEvent = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, title: true, startTime: true, endTime: true, status: true, timeTbd: true },
      });
      if (!targetEvent) throw new ToolError("Evento não encontrado.");
      if (targetEvent.status === "CANCELLED")
        throw new ToolError("Não é possível escalar pessoas em evento cancelado.");

      const competingElsewhere = targetEvent.timeTbd
        ? null
        : await prisma.eventAthlete.findFirst({
            where: {
              personId, eventId: { not: eventId },
              event: { startTime: { lt: targetEvent.endTime }, endTime: { gt: targetEvent.startTime }, status: { in: COMMITTED_STATUSES }, timeTbd: false },
            },
            select: { event: { select: { title: true } } },
          });
      if (competingElsewhere)
        throw new ToolError(`Pessoa está competindo em "${competingElsewhere.event.title}" no mesmo horário.`);

      const competingHere = await prisma.eventAthlete.findFirst({ where: { eventId, personId }, select: { eventId: true } });
      if (competingHere)
        throw new ToolError("Pessoa é atleta neste evento e não pode ser escalada como torcida.");

      if (!force && !targetEvent.timeTbd) {
        const conflicting = await prisma.assignment.findFirst({
          where: {
            personId, eventId: { not: eventId },
            event: { startTime: { lt: targetEvent.endTime }, endTime: { gt: targetEvent.startTime }, status: { in: COMMITTED_STATUSES }, timeTbd: false },
          },
          select: { event: { select: { title: true } } },
        });
        if (conflicting)
          throw new ToolError(`Pessoa já está escalada em "${conflicting.event.title}" no mesmo horário. Use force=true pra ignorar.`);
      }

      await prisma.assignment.upsert({
        where: { eventId_personId: { eventId, personId } },
        create: { eventId, personId, role, isCaptain, notes: notes || null },
        update: { role, isCaptain, notes: notes || null },
      });
      return { eventId, personId, allocated: true };
    },
  );

  add("remove_assignment", "Remove a alocação de uma pessoa de um evento.", { eventId: z.string(), personId: z.string() }, async (a) => {
    const eventId = reqStr(a, "eventId");
    const personId = reqStr(a, "personId");
    try {
      await prisma.assignment.delete({ where: { eventId_personId: { eventId, personId } } });
    } catch {
      throw new ToolError("Alocação não encontrada.");
    }
    return { eventId, personId, removed: true };
  });

  // ---------- Check-in ----------
  add(
    "check_in",
    "Registra check-in de uma pessoa num evento. Janela: 30min antes até 60min depois. Só em eventos CONFIRMED.",
    { eventId: z.string(), personId: z.string() },
    async (a) => {
      const eventId = reqStr(a, "eventId");
      const personId = reqStr(a, "personId");
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, startTime: true, endTime: true, status: true },
      });
      if (!event) throw new ToolError("Evento não encontrado.");
      if (event.status !== "CONFIRMED") {
        const label = event.status === "CANCELLED" ? "cancelado" : "adiado";
        throw new ToolError(`Evento ${label} — check-in indisponível.`);
      }
      const now = nowDate().getTime();
      if (now < event.startTime.getTime() - 30 * 60 * 1000)
        throw new ToolError("Check-in só libera 30 minutos antes do horário.");
      if (now > event.endTime.getTime() + 60 * 60 * 1000)
        throw new ToolError("Janela de check-in encerrada.");
      await prisma.checkIn.upsert({
        where: { eventId_personId: { eventId, personId } },
        create: { eventId, personId },
        update: {},
      });
      return { eventId, personId, checkedIn: true };
    },
  );

  add("undo_check_in", "Desfaz o check-in de uma pessoa num evento.", { eventId: z.string(), personId: z.string() }, async (a) => {
    const eventId = reqStr(a, "eventId");
    const personId = reqStr(a, "personId");
    try {
      await prisma.checkIn.delete({ where: { eventId_personId: { eventId, personId } } });
    } catch {
      /* já não existia */
    }
    return { eventId, personId, undone: true };
  });

  // ---------- Visão geral ----------
  add("get_ep_edition", "Configuração da edição atual do EP (nome e datas dos dias 0-4).", {}, async () => {
    const ep = await prisma.epEdition.findUnique({ where: { id: "current" } });
    if (!ep) return { configured: false };
    return {
      configured: true, name: ep.name,
      day0: ep.day0?.toISOString() ?? null, day1: ep.day1?.toISOString() ?? null,
      day2: ep.day2?.toISOString() ?? null, day3: ep.day3?.toISOString() ?? null,
      day4: ep.day4?.toISOString() ?? null, notes: ep.notes,
    };
  });

  add("dashboard_summary", "Resumo geral: contagens de pessoas, atletas, modalidades, eventos por status derivado e o que está em andamento.", {}, async () => {
    const [people, athletes, modalities, events] = await Promise.all([
      prisma.person.count(),
      prisma.person.count({ where: { isAthlete: true } }),
      prisma.modality.count(),
      prisma.event.findMany({
        select: { status: true, startTime: true, endTime: true, isConditional: true, timeTbd: true, title: true, id: true },
      }),
    ]);
    const now = nowDate();
    const byDerived: Record<string, number> = {};
    const inProgress: Json[] = [];
    for (const e of events) {
      const d = deriveEventStatus(e, now);
      byDerived[d] = (byDerived[d] ?? 0) + 1;
      if (d === "IN_PROGRESS") inProgress.push({ id: e.id, title: e.title });
    }
    return { people, athletes, modalities, events: events.length, eventsByStatus: byDerived, inProgress };
  });

  // ========================================================
  // Getters / dados restantes (todas as tabelas legíveis)
  // ========================================================

  add("get_modality", "Detalhe de uma modalidade: dados + atletas vinculados + eventos.", { id: z.string() }, async (a) => {
    const id = reqStr(a, "id");
    const m = await prisma.modality.findUnique({
      where: { id },
      include: {
        athletes: { include: { person: { select: { id: true, name: true } } } },
        events: { select: { id: true, title: true, day: true, status: true } },
      },
    });
    if (!m) throw new ToolError("Modalidade não encontrada.");
    return {
      id: m.id, name: m.name, category: m.category, priority: m.priority, notes: m.notes,
      athletes: m.athletes.map((x) => ({ id: x.person.id, name: x.person.name })),
      events: m.events,
    };
  });

  add("get_location", "Detalhe de um local: dados + eventos vinculados.", { id: z.string() }, async (a) => {
    const id = reqStr(a, "id");
    const l = await prisma.location.findUnique({
      where: { id },
      include: { events: { select: { id: true, title: true, day: true, status: true } } },
    });
    if (!l) throw new ToolError("Local não encontrado.");
    return { id: l.id, name: l.name, address: l.address, description: l.description, notes: l.notes, events: l.events };
  });

  add("list_assignments", "Alocações de torcida. Filtros: eventId, personId.", { eventId: ostr, personId: ostr }, async (a) => {
    const where: Json = {};
    if (typeof a.eventId === "string") where.eventId = a.eventId;
    if (typeof a.personId === "string") where.personId = a.personId;
    const rows = await prisma.assignment.findMany({
      where,
      orderBy: [{ eventId: "asc" }, { isCaptain: "desc" }],
      include: { event: { select: { id: true, title: true } }, person: { select: { id: true, name: true } } },
    });
    return rows.map((r) => ({
      eventId: r.eventId, event: r.event.title, personId: r.personId, person: r.person.name,
      role: r.role, isCaptain: r.isCaptain, notes: r.notes,
    }));
  });

  add("list_check_ins", "Check-ins registrados. Filtros: eventId, personId.", { eventId: ostr, personId: ostr }, async (a) => {
    const where: Json = {};
    if (typeof a.eventId === "string") where.eventId = a.eventId;
    if (typeof a.personId === "string") where.personId = a.personId;
    const rows = await prisma.checkIn.findMany({
      where,
      orderBy: { checkedAt: "asc" },
      include: { event: { select: { id: true, title: true } }, person: { select: { id: true, name: true } } },
    });
    return rows.map((r) => ({ eventId: r.eventId, event: r.event.title, personId: r.personId, person: r.person.name, checkedAt: r.checkedAt.toISOString() }));
  });

  add("list_push_subscriptions", "Dispositivos com push registrado (chaves mascaradas). Filtro: userId.", { userId: ostr }, async (a) => {
    const where: Json = {};
    if (typeof a.userId === "string") where.userId = a.userId;
    const rows = await prisma.pushSubscription.findMany({
      where,
      orderBy: { lastSeenAt: "desc" },
      select: { id: true, userId: true, userAgent: true, lastSeenAt: true, createdAt: true },
    });
    return rows.map((r) => ({ id: r.id, userId: r.userId, userAgent: r.userAgent, lastSeenAt: r.lastSeenAt.toISOString(), createdAt: r.createdAt.toISOString() }));
  });

  add("list_notification_preferences", "Preferências de notificação por usuário (categorias ligadas/desligadas).", {}, async () => {
    const rows = await prisma.notificationPreference.findMany();
    return rows.map((r) => ({ userId: r.userId, allocation: r.allocation, eventReminder: r.eventReminder, captainCall: r.captainCall, syncConflict: r.syncConflict }));
  });

  add("list_sync_operations", "Auditoria da fila offline (kind, status, erro). Filtros: status, limit (default 50).", { status: ostr, limit: oint }, async (a) => {
    const where: Json = {};
    if (typeof a.status === "string") where.status = a.status;
    const take = typeof a.limit === "number" ? Math.min(a.limit, 500) : 50;
    const rows = await prisma.syncOperation.findMany({ where, orderBy: { createdAt: "desc" }, take });
    return rows.map((r) => ({ id: r.id, userId: r.userId, kind: r.kind, status: r.status, error: r.error, payload: r.payload, createdAt: r.createdAt.toISOString() }));
  });

  add("get_agenda", "Eventos agrupados por dia (0-4), com a data de cada dia da edição. Filtro: day.", { day: oint }, async (a) => {
    const where: Json = {};
    if (typeof a.day === "number") where.day = a.day;
    const [events, ep] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: [{ day: "asc" }, { startTime: "asc" }],
        include: { modality: { select: { name: true } }, location: { select: { name: true } } },
      }),
      prisma.epEdition.findUnique({ where: { id: EP_EDITION_ID } }),
    ]);
    const epDates: Record<number, string | null> = ep
      ? { 0: ep.day0?.toISOString() ?? null, 1: ep.day1?.toISOString() ?? null, 2: ep.day2?.toISOString() ?? null, 3: ep.day3?.toISOString() ?? null, 4: ep.day4?.toISOString() ?? null }
      : { 0: null, 1: null, 2: null, 3: null, 4: null };
    const byDay: Record<number, Json[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] };
    for (const e of events) (byDay[e.day] ??= []).push(serializeEvent(e));
    return { epName: ep?.name ?? null, days: Object.entries(byDay).map(([day, evs]) => ({ day: Number(day), date: epDates[Number(day)] ?? null, events: evs })) };
  });

  // ========================================================
  // Locais — delete
  // ========================================================
  add("delete_location", "Exclui um local. Falha se houver eventos vinculados (reatribua/exclua antes).", { id: z.string() }, async (a) => {
    const id = reqStr(a, "id");
    const eventCount = await prisma.event.count({ where: { locationId: id } });
    if (eventCount > 0) throw new ToolError(`Este local tem ${eventCount} evento(s) vinculado(s). Reatribua ou exclua antes.`);
    try {
      await prisma.location.delete({ where: { id } });
    } catch {
      throw new ToolError("Não foi possível excluir: há registros vinculados.");
    }
    return { id, deleted: true };
  });

  // ========================================================
  // EpEdition — write (singleton, datas ancoradas 12:00 SP)
  // ========================================================
  add(
    "set_ep_edition",
    "Define/atualiza a edição atual do EP (merge). Datas em 'YYYY-MM-DD' (horário de São Paulo); '' limpa o campo. Dias: 0=ida, 1-3=competição, 4=volta.",
    { name: ostr, day0: ostr, day1: ostr, day2: ostr, day3: ostr, day4: ostr, notes: ostr },
    async (a) => {
      const parsed = epEditionSchema.safeParse({
        name: a.name, day0: a.day0, day1: a.day1, day2: a.day2, day3: a.day3, day4: a.day4, notes: a.notes,
      });
      if (!parsed.success) throw new ToolError(zodMsg(parsed.error));
      const existing = await prisma.epEdition.findUnique({ where: { id: EP_EDITION_ID } });
      const has = (k: string) => a[k] !== undefined;
      const dayVal = (k: "day0" | "day1" | "day2" | "day3" | "day4") =>
        has(k) ? toDateOrNull(a[k] as string) : existing?.[k] ?? null;
      const data = {
        name: has("name") ? (parsed.data.name?.trim() || null) : existing?.name ?? null,
        day0: dayVal("day0"), day1: dayVal("day1"), day2: dayVal("day2"), day3: dayVal("day3"), day4: dayVal("day4"),
        notes: has("notes") ? (parsed.data.notes?.trim() || null) : existing?.notes ?? null,
      };
      await prisma.epEdition.upsert({ where: { id: EP_EDITION_ID }, create: { id: EP_EDITION_ID, ...data }, update: data });
      return { saved: true };
    },
  );

  // ========================================================
  // Disponibilidade + dashboard detalhado
  // ========================================================
  add("available_supporters_for_event", "Pessoas que podem ser escaladas como torcida num evento, com flags conflict (já alocado em evento sobreposto) e competingElsewhere (atleta em evento sobreposto).", { eventId: z.string() }, async (a) => {
    return getAvailableSupportersForEvent(reqStr(a, "eventId"));
  });

  add("dashboard_detail", "Visão operacional: eventos acontecendo agora, próximos 3h, pessoas livres/ocupadas agora, e eventos de alta prioridade com torcida insuficiente.", {}, async () => {
    return getDashboardDetail();
  });

  // ========================================================
  // Usuários / admin
  // ========================================================
  add(
    "list_users",
    "Lista contas. Filtros: q (email/telefone), role (USER|DIRECTOR|ADMIN), appInstalled (instalou o PWA), hasPush (tem notificação ativa). Retorna role, appInstalled, pushActive/deviceCount, pessoa vinculada, nome do login (Google).",
    { q: ostr, role: ostr, appInstalled: obool, hasPush: obool },
    async (a) => {
      const where: Json = {};
      if (typeof a.role === "string") where.role = a.role;
      if (a.appInstalled === true) where.appInstalledAt = { not: null };
      if (a.appInstalled === false) where.appInstalledAt = null;
      if (a.hasPush === true) where.pushSubscriptions = { some: {} };
      if (a.hasPush === false) where.pushSubscriptions = { none: {} };
      if (typeof a.q === "string" && a.q.trim()) {
        where.OR = [
          { email: { contains: a.q, mode: "insensitive" } },
          { phone: { contains: a.q } },
        ];
      }
      const [users, names] = await Promise.all([
        prisma.user.findMany({
          where,
          orderBy: { email: "asc" },
          include: {
            _count: { select: { pushSubscriptions: true } },
            person: { select: { id: true, name: true, nickname: true, modalityAthlete: { select: { modality: { select: { name: true } } } } } },
          },
        }),
        authNamesByAuthId(),
      ]);
      return users.map((u) => ({
        id: u.id, email: u.email, phone: u.phone, role: u.role,
        appInstalled: u.appInstalledAt != null, appInstalledAt: u.appInstalledAt?.toISOString() ?? null,
        pushActive: u._count.pushSubscriptions > 0, deviceCount: u._count.pushSubscriptions,
        authName: u.authUserId ? names.get(u.authUserId) ?? null : null,
        person: u.person ? { id: u.person.id, name: u.person.name, nickname: u.person.nickname, modalities: u.person.modalityAthlete.map((ma) => ma.modality.name) } : null,
      }));
    },
  );

  add("get_user", "Detalhe completo de uma conta: role, app instalado, push ativo + dispositivos (chaves mascaradas), preferências de notificação e pessoa vinculada.", { id: z.string() }, async (a) => {
    const id = reqStr(a, "id");
    const u = await prisma.user.findUnique({
      where: { id },
      include: {
        person: { select: { id: true, name: true, nickname: true, email: true, phone: true, modalityAthlete: { select: { modality: { select: { id: true, name: true } } } } } },
        pushSubscriptions: { select: { id: true, userAgent: true, lastSeenAt: true, createdAt: true } },
        notificationPreference: true,
      },
    });
    if (!u) throw new ToolError("Usuário não encontrado.");
    const names = await authNamesByAuthId();
    const pref = u.notificationPreference;
    return {
      id: u.id, email: u.email, phone: u.phone, role: u.role,
      appInstalled: u.appInstalledAt != null, appInstalledAt: u.appInstalledAt?.toISOString() ?? null,
      authName: u.authUserId ? names.get(u.authUserId) ?? null : null,
      pushActive: u.pushSubscriptions.length > 0,
      devices: u.pushSubscriptions.map((s) => ({ id: s.id, userAgent: s.userAgent, lastSeenAt: s.lastSeenAt.toISOString(), createdAt: s.createdAt.toISOString() })),
      notificationPreferences: pref
        ? { allocation: pref.allocation, eventReminder: pref.eventReminder, captainCall: pref.captainCall, syncConflict: pref.syncConflict }
        : NOTIF_DEFAULT,
      person: u.person ? { id: u.person.id, name: u.person.name, nickname: u.person.nickname, email: u.person.email, phone: u.person.phone, modalities: u.person.modalityAthlete.map((ma) => ({ id: ma.modality.id, name: ma.modality.name })) } : null,
    };
  });

  add("set_user_role", "Define a role de um usuário: USER, DIRECTOR ou ADMIN. (Sem guarda de auto-rebaixamento — o caller é admin.)", { userId: z.string(), role: z.string() }, async (a) => {
    const userId = reqStr(a, "userId");
    const roleParsed = roleEnum.safeParse(a.role);
    if (!roleParsed.success) throw new ToolError("role inválido (USER|DIRECTOR|ADMIN).");
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!target) throw new ToolError("Usuário não encontrado.");
    await prisma.user.update({ where: { id: userId }, data: { role: roleParsed.data as Role } });
    return { userId, role: roleParsed.data };
  });

  add("link_person_to_user", "Vincula uma pessoa a um usuário. Passe personId=null pra desvincular. Falha se a pessoa já está em outro usuário.", { userId: z.string(), personId: z.string().nullable().optional() }, async (a) => {
    const userId = reqStr(a, "userId");
    if (!("personId" in a)) throw new ToolError("Informe personId (ou null para desvincular).");
    const personId = (a.personId ?? null) as string | null;
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { person: { select: { id: true } } } });
    if (!user) throw new ToolError("Usuário não encontrado.");
    const currentPersonId = user.person?.id ?? null;
    if (currentPersonId === personId) return { userId, personId, unchanged: true };

    if (personId === null) {
      if (currentPersonId) await prisma.person.update({ where: { id: currentPersonId }, data: { userId: null } });
      return { userId, personId: null, unlinked: true };
    }
    const target = await prisma.person.findUnique({ where: { id: personId }, select: { id: true, userId: true } });
    if (!target) throw new ToolError("Pessoa não encontrada.");
    if (target.userId && target.userId !== userId) throw new ToolError("Essa pessoa já está vinculada a outro usuário.");
    await prisma.$transaction(async (tx) => {
      if (currentPersonId && currentPersonId !== personId) await tx.person.update({ where: { id: currentPersonId }, data: { userId: null } });
      await tx.person.update({ where: { id: personId }, data: { userId } });
    });
    return { userId, personId, linked: true };
  });

  add("create_person_from_user", "Cria uma Person a partir do login (nome do metadata Google/Supabase, email, telefone) e vincula ao usuário. Falha se o usuário já tem pessoa ou se email/telefone duplica.", { userId: z.string() }, async (a) => {
    const userId = reqStr(a, "userId");
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { person: { select: { id: true } } } });
    if (!user) throw new ToolError("Usuário não encontrado.");
    if (user.person) throw new ToolError("Esse usuário já tem pessoa vinculada.");

    let metaName: string | null = null;
    if (user.authUserId) {
      try {
        const rows = await prisma.$queryRawUnsafe<{ raw_user_meta_data: Record<string, unknown> }[]>(
          `SELECT raw_user_meta_data FROM auth.users WHERE id = $1`,
          user.authUserId,
        );
        const m = rows[0]?.raw_user_meta_data ?? {};
        metaName = (typeof m.name === "string" && m.name.trim()) || (typeof m.full_name === "string" && m.full_name.trim()) || null;
      } catch {
        /* auth.users indisponível */
      }
    }
    const phone = (user.phone ?? "").replace(/\D/g, "") || null;
    if (phone) {
      const phoneOwner = await prisma.person.findFirst({ where: { phone }, select: { id: true } });
      if (phoneOwner) throw new ToolError("Já existe uma pessoa com esse telefone. Use link_person_to_user.");
    }
    try {
      const person = await prisma.person.create({ data: { userId: user.id, name: metaName || user.email || "Membro", email: user.email, phone } });
      return { userId, personId: person.id, created: true };
    } catch (e) {
      if (isUniqueEmail(e)) throw new ToolError("Já existe uma pessoa com esse email. Use link_person_to_user.");
      throw e;
    }
  });

  // ========================================================
  // Broadcasts / notificações (envio via import() dinâmico de @/lib/push)
  // ========================================================
  add("preview_broadcast_recipients", "Conta quantos usuários receberiam um aviso, sem enviar. Público: toEveryone OU modalityIds/eventIds.", { toEveryone: obool, modalityIds: ostrList, eventIds: ostrList }, async (a) => {
    const userIds = await resolveRecipientUserIds({
      toEveryone: a.toEveryone === true,
      modalityIds: Array.isArray(a.modalityIds) ? (a.modalityIds as string[]) : [],
      eventIds: Array.isArray(a.eventIds) ? (a.eventIds as string[]) : [],
    });
    return { count: userIds.length };
  });

  add("list_broadcasts", "Histórico de avisos enviados (com contagens). Filtro: limit (default 30).", { limit: oint }, async (a) => {
    const take = typeof a.limit === "number" ? Math.min(a.limit, 200) : 30;
    const rows = await prisma.broadcast.findMany({ orderBy: { createdAt: "desc" }, take });
    return rows.map((b) => ({
      id: b.id, title: b.title, body: b.body, url: b.url, toEveryone: b.toEveryone,
      modalityIds: b.modalityIds, eventIds: b.eventIds,
      recipientCount: b.recipientCount, sentCount: b.sentCount, whatsappSentCount: b.whatsappSentCount,
      createdAt: b.createdAt.toISOString(),
    }));
  });

  add(
    "send_broadcast",
    "ENVIA um aviso (push + WhatsApp) ao público e registra em Broadcast. Público: toEveryone OU modalityIds/eventIds. ATENÇÃO: dispara notificações reais. No stdio o envio degrada (sem infra) mas o registro é gravado.",
    { title: z.string(), body: z.string(), url: ostr, toEveryone: obool, modalityIds: ostrList, eventIds: ostrList },
    async (a) => {
      const parsed = broadcastSchema.safeParse({
        title: a.title, body: a.body, url: a.url ?? "",
        toEveryone: a.toEveryone === true,
        modalityIds: Array.isArray(a.modalityIds) ? a.modalityIds : [],
        eventIds: Array.isArray(a.eventIds) ? a.eventIds : [],
      });
      if (!parsed.success) throw new ToolError(zodMsg(parsed.error));
      const v = parsed.data;
      const title = v.title.trim();
      const body = v.body.trim();
      const url = v.url?.trim() || null;
      const userIds = await resolveRecipientUserIds(v);

      let sent = 0, whatsappSent = 0, delivered = false, reason: string | null = null;
      try {
        const { sendPushToUsers } = await import("@/lib/push");
        const r = await sendPushToUsers(userIds, { title, body, url: url ?? "/agenda" });
        sent = r.sent; whatsappSent = r.whatsappSent; delivered = true;
      } catch (e) {
        reason = `Envio indisponível neste transporte/ambiente: ${(e as Error).message}`;
      }

      await prisma.broadcast.create({
        data: {
          sentById: null, title, body, url,
          toEveryone: v.toEveryone,
          modalityIds: v.toEveryone ? [] : v.modalityIds,
          eventIds: v.toEveryone ? [] : v.eventIds,
          recipientCount: userIds.length, sentCount: sent, whatsappSentCount: whatsappSent,
        },
      });
      return { delivered, recipientCount: userIds.length, sentCount: sent, whatsappSentCount: whatsappSent, reason };
    },
  );

  add(
    "call_supporters",
    "'Chamado da torcida': ENVIA push pra toda a torcida alocada num evento. Throttle de 5min por evento. ATENÇÃO: dispara notificações reais.",
    { eventId: z.string(), message: z.string() },
    async (a) => {
      const parsed = callSupportersSchema.safeParse({ eventId: a.eventId, message: a.message });
      if (!parsed.success) throw new ToolError(zodMsg(parsed.error));
      const { eventId, message } = parsed.data;
      const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, title: true, lastSupporterCallAt: true } });
      if (!event) throw new ToolError("Evento não encontrado.");

      const now = nowDate();
      const THROTTLE = 5 * 60 * 1000;
      if (event.lastSupporterCallAt && now.getTime() - event.lastSupporterCallAt.getTime() < THROTTLE) {
        const wait = Math.ceil((THROTTLE - (now.getTime() - event.lastSupporterCallAt.getTime())) / 1000);
        throw new ToolError(`Chamado recente — aguarde ${wait}s antes de chamar de novo.`);
      }

      const assignments = await prisma.assignment.findMany({ where: { eventId }, select: { person: { select: { userId: true } } } });
      const userIds = assignments.map((x) => x.person.userId).filter((id): id is string => Boolean(id));

      await prisma.event.update({ where: { id: eventId }, data: { lastSupporterCallAt: now } });

      let sent = 0, whatsappSent = 0, delivered = false, reason: string | null = null;
      try {
        const { sendPushToUsers } = await import("@/lib/push");
        const r = await sendPushToUsers(userIds, { title: `Chamado da torcida · ${event.title}`, body: message, url: `/eventos/${eventId}`, tag: `captain-call-${eventId}`, category: "captainCall" });
        sent = r.sent; whatsappSent = r.whatsappSent; delivered = true;
      } catch (e) {
        reason = `Envio indisponível neste transporte/ambiente: ${(e as Error).message}`;
      }
      return { eventId, recipients: userIds.length, delivered, sentCount: sent, whatsappSentCount: whatsappSent, reason };
    },
  );
}
