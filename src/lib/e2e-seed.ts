/**
 * Seed determinístico para testes E2E.
 *
 * Pressupõe `E2E_FROZEN_TIME=2026-05-22T15:00:00.000Z` — meio do `day1`.
 * Cria 5 personas, 3 locais, 5 modalidades e eventos cobrindo os estados
 * derivados (em andamento, futuro, finalizado, cancelado, possível, dias 0 e 4).
 *
 * Pode rodar como módulo (importado em globalSetup) ou via `tsx`.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const FROZEN = new Date("2026-05-22T15:00:00.000Z"); // meio do day1

// EpEdition: dias 0..4 normalizados a 00:00 UTC do dia local.
const day = (offsetDays: number) => {
  const d = new Date(FROZEN);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};
const at = (offsetDays: number, hour: number, minute = 0) => {
  const d = day(offsetDays);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
};

export type SeededIds = {
  users: Record<"admin" | "director" | "user" | "supporter" | "nolink", string>;
  persons: Record<"admin" | "director" | "user" | "supporter" | "pending", string>;
  modalities: Record<"volei" | "basquete" | "atletismo" | "showmicio" | "trote", string>;
  locations: Record<"ginasio" | "pista" | "cultural", string>;
  events: Record<
    | "happeningNow"
    | "upcomingSoon"
    | "finishedToday"
    | "futureDay2"
    | "cancelled"
    | "possible"
    | "dayZero"
    | "dayFour"
    | "criticalNoSupport",
    string
  >;
};

/**
 * Apaga tudo na ordem inversa de FKs e repopula. Usa `deleteMany` em vez
 * de TRUNCATE pra funcionar mesmo sem permissão de owner no banco de teste.
 */
export async function runSeed(): Promise<SeededIds> {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  try {
    await prisma.$transaction([
      prisma.checkIn.deleteMany(),
      prisma.assignment.deleteMany(),
      prisma.eventAthlete.deleteMany(),
      prisma.modalityAthlete.deleteMany(),
      prisma.event.deleteMany(),
      prisma.location.deleteMany(),
      prisma.modality.deleteMany(),
      prisma.person.deleteMany(),
      prisma.user.deleteMany(),
      prisma.epEdition.deleteMany(),
    ]);

    // ----- EpEdition (singleton id="current") -----
    await prisma.epEdition.create({
      data: {
        id: "current",
        name: "EP 2026 — Pelotas",
        day0: day(-1),
        day1: day(0),
        day2: day(1),
        day3: day(2),
        day4: day(3),
      },
    });

    // ----- Users + Persons -----
    // authUserId precisa ser único e estável; UUIDs determinísticos.
    const mk = (role: "USER" | "DIRECTOR" | "ADMIN", email: string, authId: string) =>
      prisma.user.create({ data: { authUserId: authId, email, role } });

    const admin = await mk("ADMIN", "admin@test.local", "00000000-0000-0000-0000-000000000001");
    const director = await mk("DIRECTOR", "director@test.local", "00000000-0000-0000-0000-000000000002");
    const user = await mk("USER", "user@test.local", "00000000-0000-0000-0000-000000000003");
    const supporter = await mk("USER", "supporter@test.local", "00000000-0000-0000-0000-000000000004");
    const nolink = await mk("USER", "nolink@test.local", "00000000-0000-0000-0000-000000000005");

    const personAdmin = await prisma.person.create({
      data: {
        userId: admin.id, name: "Ana Admin", email: "admin@test.local",
        isDirector: true, course: "COMPUTACAO", semester: 8,
      },
    });
    const personDirector = await prisma.person.create({
      data: {
        userId: director.id, name: "Daniel Diretor", email: "director@test.local",
        isDirector: true, isSupporter: true, course: "MECANICA", semester: 7,
      },
    });
    const personUser = await prisma.person.create({
      data: {
        userId: user.id, name: "Ulisses Usuário", email: "user@test.local",
        isAthlete: true, isSupporter: true, course: "ELETRICA", semester: 5,
      },
    });
    const personSupporter = await prisma.person.create({
      data: {
        userId: supporter.id, name: "Sofia Suporte", email: "supporter@test.local",
        isSupporter: true, course: "CIVIL", semester: 6,
      },
    });
    // Person SEM User vinculado — usada para teste de auto-link no signup.
    const personPending = await prisma.person.create({
      data: { name: "Pedro Pendente", email: "pending@test.local", isAthlete: true },
    });

    // ----- Locations -----
    const ginasio = await prisma.location.create({
      data: { name: "Ginásio Principal", address: "Rua A, 100", description: "Quadra coberta" },
    });
    const pista = await prisma.location.create({
      data: { name: "Pista de Atletismo", address: "Av B, 200" },
    });
    const cultural = await prisma.location.create({
      data: { name: "Centro Cultural", address: "Praça C, 30" },
    });

    // ----- Modalities -----
    const volei = await prisma.modality.create({
      data: { name: "Vôlei", category: "SPORT", priority: "NORMAL" },
    });
    const basquete = await prisma.modality.create({
      data: { name: "Basquete", category: "SPORT", priority: "HIGH" },
    });
    const atletismo = await prisma.modality.create({
      data: { name: "Atletismo", category: "SPORT", priority: "NORMAL" },
    });
    const showmicio = await prisma.modality.create({
      data: { name: "Showmício", category: "CULTURAL", priority: "HIGH" },
    });
    const trote = await prisma.modality.create({
      data: { name: "Trote", category: "CHEERING", priority: "NORMAL" },
    });

    // user (athleteIn) compete em Vôlei e Atletismo
    await prisma.modalityAthlete.createMany({
      data: [
        { modalityId: volei.id, personId: personUser.id },
        { modalityId: atletismo.id, personId: personUser.id },
      ],
    });

    // ----- Events -----
    // FROZEN = day1 15:00 UTC. Eventos cobrindo cada estado derivado.
    const happeningNow = await prisma.event.create({
      data: {
        modalityId: volei.id, locationId: ginasio.id,
        title: "Vôlei — Em andamento",
        day: 1, startTime: at(0, 14), endTime: at(0, 16),
        phase: "GROUP", priority: "NORMAL", status: "CONFIRMED",
        desiredSupportersCount: 4,
      },
    });
    const upcomingSoon = await prisma.event.create({
      data: {
        modalityId: basquete.id, locationId: ginasio.id,
        title: "Basquete — Próximo",
        day: 1, startTime: at(0, 15, 30), endTime: at(0, 17),
        phase: "QUARTER", priority: "HIGH", status: "CONFIRMED",
        desiredSupportersCount: 3,
      },
    });
    const finishedToday = await prisma.event.create({
      data: {
        modalityId: atletismo.id, locationId: pista.id,
        title: "Atletismo — Finalizado",
        day: 1, startTime: at(0, 10), endTime: at(0, 12),
        phase: "HEAT", priority: "NORMAL", status: "CONFIRMED",
      },
    });
    const futureDay2 = await prisma.event.create({
      data: {
        modalityId: volei.id, locationId: ginasio.id,
        title: "Vôlei — Semifinal day2",
        day: 2, startTime: at(1, 10), endTime: at(1, 12),
        phase: "SEMI", priority: "HIGH", status: "CONFIRMED",
        desiredSupportersCount: 5,
      },
    });
    const cancelled = await prisma.event.create({
      data: {
        modalityId: trote.id, locationId: cultural.id,
        title: "Trote — Cancelado",
        day: 1, startTime: at(0, 14), endTime: at(0, 16),
        phase: "OTHER", priority: "LOW", status: "CANCELLED",
      },
    });
    const possible = await prisma.event.create({
      data: {
        modalityId: showmicio.id, locationId: cultural.id,
        title: "Showmício — Possível",
        day: 1, startTime: at(0, 17), endTime: at(0, 19),
        phase: "OTHER", priority: "NORMAL", status: "CONFIRMED",
        isConditional: true,
      },
    });
    const dayZero = await prisma.event.create({
      data: {
        modalityId: trote.id, locationId: cultural.id,
        title: "Ida — Embarque ônibus",
        day: 0, startTime: at(-1, 8), endTime: at(-1, 12),
        phase: "OTHER", priority: "NORMAL", status: "CONFIRMED",
      },
    });
    const dayFour = await prisma.event.create({
      data: {
        modalityId: trote.id, locationId: cultural.id,
        title: "Volta — Desembarque",
        day: 4, startTime: at(3, 14), endTime: at(3, 18),
        phase: "OTHER", priority: "NORMAL", status: "CONFIRMED",
      },
    });
    const criticalNoSupport = await prisma.event.create({
      data: {
        modalityId: basquete.id, locationId: ginasio.id,
        title: "Basquete — Final crítica",
        day: 1, startTime: at(0, 16), endTime: at(0, 18),
        phase: "FINAL", priority: "CRITICAL", status: "CONFIRMED",
        desiredSupportersCount: 8,
      },
    });

    // user (athlete) compete em happeningNow + futureDay2
    await prisma.eventAthlete.createMany({
      data: [
        { eventId: happeningNow.id, personId: personUser.id },
        { eventId: futureDay2.id, personId: personUser.id },
      ],
    });

    // supporter já tem 1 alocação confirmada em happeningNow
    await prisma.assignment.create({
      data: {
        eventId: happeningNow.id, personId: personSupporter.id,
        role: "SUPPORTER",
      },
    });

    return {
      users: {
        admin: admin.id, director: director.id, user: user.id,
        supporter: supporter.id, nolink: nolink.id,
      },
      persons: {
        admin: personAdmin.id, director: personDirector.id, user: personUser.id,
        supporter: personSupporter.id, pending: personPending.id,
      },
      modalities: {
        volei: volei.id, basquete: basquete.id, atletismo: atletismo.id,
        showmicio: showmicio.id, trote: trote.id,
      },
      locations: { ginasio: ginasio.id, pista: pista.id, cultural: cultural.id },
      events: {
        happeningNow: happeningNow.id,
        upcomingSoon: upcomingSoon.id,
        finishedToday: finishedToday.id,
        futureDay2: futureDay2.id,
        cancelled: cancelled.id,
        possible: possible.id,
        dayZero: dayZero.id,
        dayFour: dayFour.id,
        criticalNoSupport: criticalNoSupport.id,
      },
    };
  } finally {
    await prisma.$disconnect();
  }
}

// Permite rodar via `pnpm tsx src/lib/e2e-seed.ts`
if (require.main === module) {
  runSeed()
    .then((ids) => {
      console.log("[seed] ok");
      console.log(JSON.stringify(ids, null, 2));
    })
    .catch((e) => {
      console.error("[seed] erro:", e);
      process.exit(1);
    });
}
