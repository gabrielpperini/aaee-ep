/**
 * Tools do MCP da plataforma AAEE-EP — módulo compartilhado entre o transporte
 * stdio (local, mcp/server.ts) e o HTTP remoto (src/app/api/[transport]/route.ts).
 *
 * `registerTools(server)` registra todas as 26 tools num McpServer. A lógica de
 * negócio reaproveita os schemas Zod de @/lib/validations/*, syncEventRoster/
 * syncPersonRoster (escalação automática), APP_TIME_ZONE + fromZonedTime (UTC)
 * e deriveEventStatus (status derivado) — exatamente como as server actions.
 *
 * Diferenças vs. as actions: sem requireRole/revalidatePath/push (ver mcp/README.md).
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
import { phoneDigits } from "@/lib/validations/_primitives";
import { AssignmentRole, EventStatus } from "@/generated/prisma/client";

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
}
