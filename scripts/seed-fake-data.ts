// Seed de dados fake para desenvolvimento.
// Modalidades baseadas no Art. 52 do Estatuto dos Engenharíadas Paranaense.
// Uso: pnpm tsx --env-file=.env scripts/seed-fake-data.ts
//
// Modo additive: NÃO limpa dados existentes. Modalidades e locais usam upsert
// pelo nome; pessoas e eventos são sempre inseridos novos.

import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  type Course,
  type EventPhase,
  type EventPriority,
  type ModalityCategory,
  type AssignmentRole,
} from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Catálogo de modalidades (Art. 52 do Estatuto)
// ---------------------------------------------------------------------------

type ModalitySeed = {
  name: string;
  category: ModalityCategory;
  priority: EventPriority;
};

const MODALITIES: ModalitySeed[] = [
  // Esportes do estatuto
  { name: "Atletismo Masculino", category: "SPORT", priority: "NORMAL" },
  { name: "Atletismo Feminino", category: "SPORT", priority: "NORMAL" },
  { name: "Basquete Masculino", category: "SPORT", priority: "HIGH" },
  { name: "Basquete Feminino", category: "SPORT", priority: "HIGH" },
  { name: "Futebol de Campo", category: "SPORT", priority: "CRITICAL" },
  { name: "Futsal Masculino", category: "SPORT", priority: "HIGH" },
  { name: "Futsal Feminino", category: "SPORT", priority: "HIGH" },
  { name: "Handebol Masculino", category: "SPORT", priority: "NORMAL" },
  { name: "Handebol Feminino", category: "SPORT", priority: "NORMAL" },
  { name: "Judô Masculino", category: "SPORT", priority: "NORMAL" },
  { name: "Judô Feminino", category: "SPORT", priority: "NORMAL" },
  { name: "Natação Masculina", category: "SPORT", priority: "NORMAL" },
  { name: "Natação Feminina", category: "SPORT", priority: "NORMAL" },
  { name: "Tênis de Campo Masculino", category: "SPORT", priority: "LOW" },
  { name: "Tênis de Campo Feminino", category: "SPORT", priority: "LOW" },
  { name: "Tênis de Mesa Masculino", category: "SPORT", priority: "LOW" },
  { name: "Tênis de Mesa Feminino", category: "SPORT", priority: "LOW" },
  { name: "Voleibol Masculino", category: "SPORT", priority: "HIGH" },
  { name: "Voleibol Feminino", category: "SPORT", priority: "HIGH" },
  { name: "Vôlei de Areia Masculino", category: "SPORT", priority: "NORMAL" },
  { name: "Vôlei de Areia Feminino", category: "SPORT", priority: "NORMAL" },
  { name: "Xadrez", category: "SPORT", priority: "LOW" },

  // Outras categorias
  { name: "Concentração da Torcida", category: "CHEERING", priority: "NORMAL" },
  { name: "Treino de Grito de Guerra", category: "CHEERING", priority: "LOW" },
  { name: "Embarque do Ônibus", category: "LOGISTICS", priority: "CRITICAL" },
  { name: "Retorno do Ônibus", category: "LOGISTICS", priority: "CRITICAL" },
  { name: "Reunião de Delegação", category: "GENERAL", priority: "HIGH" },
  { name: "Cerimônia de Abertura", category: "GENERAL", priority: "HIGH" },
];

const LOCATIONS = [
  { name: "Ginásio Principal", address: "Av. dos Engenheiros, 100" },
  { name: "Quadra Coberta 1", address: "Av. dos Engenheiros, 100" },
  { name: "Quadra Coberta 2", address: "Av. dos Engenheiros, 100" },
  { name: "Campo de Futebol", address: "Av. dos Atletas, 200" },
  { name: "Piscina Olímpica", address: "Rua da Natação, 50" },
  { name: "Pista de Atletismo", address: "Av. dos Engenheiros, 100" },
  { name: "Arena de Vôlei de Praia", address: "Rua da Areia, 30" },
  { name: "Sala de Xadrez — Centro de Eventos", address: "Centro de Eventos, sala 12" },
  { name: "Dojô Municipal", address: "Rua das Artes Marciais, 88" },
  { name: "Alojamento — Escola Estadual XV", address: "Rua da Hospedagem, 1" },
];

// ---------------------------------------------------------------------------
// Pessoas (delegação ~80)
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  "Lucas", "Mariana", "Pedro", "Ana", "Gabriel", "Júlia", "Rafael", "Beatriz",
  "Felipe", "Camila", "Bruno", "Larissa", "Thiago", "Isabela", "Matheus",
  "Carolina", "Diego", "Fernanda", "Rodrigo", "Letícia", "André", "Bruna",
  "Vinícius", "Amanda", "Eduardo", "Patrícia", "Henrique", "Natália",
  "Leonardo", "Renata", "Igor", "Bianca", "Caio", "Tatiana", "Daniel",
  "Priscila", "Marcelo", "Vitória", "Gustavo", "Sofia", "João", "Helena",
  "Ricardo", "Yasmin", "Alexandre", "Manuela", "Davi", "Clara", "Murilo",
  "Lívia",
];

const LAST_NAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Pereira", "Lima", "Costa",
  "Ferreira", "Almeida", "Ribeiro", "Carvalho", "Gomes", "Martins", "Rocha",
  "Araújo", "Cardoso", "Teixeira", "Moreira", "Nascimento", "Mendes",
  "Barbosa", "Pinto", "Cavalcanti", "Dias", "Castro", "Andrade", "Vieira",
];

const COURSES: Course[] = [
  "CIVIL", "ELETRICA", "MECANICA", "COMPUTACAO", "CONTROLE_AUTOMACAO",
  "MATERIAIS", "ENERGIA", "QUIMICA", "PRODUCAO", "AMBIENTAL", "METALURGICA",
  "CARTOGRAFICA", "FISICA",
];

// PRNG determinístico para resultados reproduzíveis dentro da mesma execução.
let seed = 20260521;
function rand() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0xffffffff;
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)]!;
}
function pickN<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(rand() * copy.length);
    out.push(copy.splice(idx, 1)[0]!);
  }
  return out;
}
function randInt(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function genPerson(i: number) {
  const first = pick(FIRST_NAMES);
  const last1 = pick(LAST_NAMES);
  const last2 = pick(LAST_NAMES);
  const name = `${first} ${last1} ${last2}`;
  const slug = name.toLowerCase().replace(/\s+/g, ".").normalize("NFD").replace(/[̀-ͯ]/g, "");
  // Sufixo numérico evita colisão de email caso o mesmo nome saia duas vezes.
  const email = `${slug}.${i}@fake.engenhariadas.test`;
  const isAthlete = rand() < 0.55;
  return {
    name,
    nickname: rand() < 0.3 ? first.slice(0, 3).toLowerCase() : null,
    email,
    phone: `(51) 9${randInt(1000, 9999)}-${randInt(1000, 9999)}`,
    isAthlete,
    isSupporter: rand() < 0.9,
    isDirector: rand() < 0.08,
    isSupport: rand() < 0.15,
    course: pick(COURSES) as Course,
    semester: randInt(1, 10),
  };
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------

// Estatuto Art. 4º: EP tem no mínimo 4 dias consecutivos.
// Vou usar dias 1..4 — startTime real é em julho/2026.
const BASE_DATE = new Date("2026-07-15T00:00:00.000Z"); // Day 1 = 15/07/2026

function dayDate(day: number, hour: number, minute = 0) {
  const d = new Date(BASE_DATE);
  d.setUTCDate(d.getUTCDate() + (day - 1));
  d.setUTCHours(hour - 3, minute, 0, 0); // -3 = BRT
  return d;
}

const PHASES: EventPhase[] = ["GROUP", "ROUND_OF_16", "QUARTER", "SEMI", "FINAL", "HEAT", "ELIMINATORY"];

const OPPONENTS = [
  "UEM", "UEL", "UEPG", "UFPR", "PUC-CT", "UTFPR-CT", "UTFPR-LD",
  "UTFPR-CP", "UTFPR-PB", "UTFPR-PG", "UNIOESTE-TD", "UFSC", "UFGD",
  "UNICESUMAR", "CAMPO REAL",
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  console.log("→ Modalidades…");
  const modalityMap = new Map<string, string>();
  for (const m of MODALITIES) {
    const row = await prisma.modality.upsert({
      where: { name: m.name },
      update: { category: m.category, priority: m.priority },
      create: m,
    });
    modalityMap.set(m.name, row.id);
  }
  console.log(`  ${modalityMap.size} modalidades garantidas.`);

  console.log("→ Locais…");
  const locationIds: string[] = [];
  for (const l of LOCATIONS) {
    // Location não tem unique em name; procuramos antes de inserir pra ficar
    // idempotente em re-runs.
    const existing = await prisma.location.findFirst({ where: { name: l.name } });
    const row = existing ?? (await prisma.location.create({ data: l }));
    locationIds.push(row.id);
  }
  console.log(`  ${locationIds.length} locais.`);

  console.log("→ Pessoas (80)…");
  const personIds: string[] = [];
  const athleteIds: string[] = [];
  for (let i = 0; i < 80; i++) {
    const data = genPerson(i);
    const p = await prisma.person.create({ data });
    personIds.push(p.id);
    if (p.isAthlete) athleteIds.push(p.id);
  }
  console.log(`  ${personIds.length} pessoas (${athleteIds.length} atletas).`);

  console.log("→ Vinculação atleta ↔ modalidade…");
  const sportModalityNames = MODALITIES.filter((m) => m.category === "SPORT").map((m) => m.name);
  let modAthleteLinks = 0;
  for (const aid of athleteIds) {
    // Cada atleta entra em 1..3 modalidades esportivas.
    const chosen = pickN(sportModalityNames, randInt(1, 3));
    for (const modName of chosen) {
      await prisma.modalityAthlete.create({
        data: { personId: aid, modalityId: modalityMap.get(modName)! },
      });
      modAthleteLinks++;
    }
  }
  console.log(`  ${modAthleteLinks} vínculos atleta-modalidade.`);

  console.log("→ Eventos (~60)…");
  type EventSpec = {
    modalityName: string;
    day: number;
    startHour: number;
    endHour: number;
    phase: EventPhase;
    opponent?: string;
    isConditional?: boolean;
  };

  const specs: EventSpec[] = [];

  // Distribui ~3-4 eventos por modalidade esportiva ao longo dos 4 dias,
  // cobrindo fases progressivas.
  const sportProgression: EventPhase[][] = [
    ["GROUP", "GROUP", "QUARTER", "SEMI"],
    ["GROUP", "ROUND_OF_16", "QUARTER", "FINAL"],
    ["GROUP", "QUARTER", "SEMI", "FINAL"],
    ["HEAT", "HEAT", "ELIMINATORY", "FINAL"],
  ];

  for (const modName of sportModalityNames) {
    const progression = pick(sportProgression);
    for (let d = 1; d <= 4; d++) {
      // ~75% chance da modalidade ter evento naquele dia.
      if (rand() > 0.75) continue;
      const startHour = randInt(8, 19);
      specs.push({
        modalityName: modName,
        day: d,
        startHour,
        endHour: startHour + (modName.includes("Futebol de Campo") ? 2 : 1),
        phase: progression[d - 1]!,
        opponent: rand() < 0.85 ? pick(OPPONENTS) : undefined,
        isConditional: rand() < 0.08,
      });
    }
  }

  // Eventos não-esportivos (logística / torcida / gerais)
  specs.push(
    { modalityName: "Embarque do Ônibus", day: 1, startHour: 5, endHour: 6, phase: "OTHER" },
    { modalityName: "Cerimônia de Abertura", day: 1, startHour: 19, endHour: 21, phase: "OTHER" },
    { modalityName: "Reunião de Delegação", day: 1, startHour: 23, endHour: 24, phase: "OTHER" },
    { modalityName: "Reunião de Delegação", day: 2, startHour: 23, endHour: 24, phase: "OTHER" },
    { modalityName: "Reunião de Delegação", day: 3, startHour: 23, endHour: 24, phase: "OTHER" },
    { modalityName: "Treino de Grito de Guerra", day: 2, startHour: 7, endHour: 8, phase: "OTHER" },
    { modalityName: "Concentração da Torcida", day: 3, startHour: 17, endHour: 18, phase: "OTHER" },
    { modalityName: "Retorno do Ônibus", day: 4, startHour: 22, endHour: 23, phase: "OTHER" },
  );

  let eventsCreated = 0;
  for (const s of specs) {
    const modalityId = modalityMap.get(s.modalityName);
    if (!modalityId) continue;
    const startTime = dayDate(s.day, s.startHour);
    const endTime = dayDate(s.day, s.endHour);
    const isSport = MODALITIES.find((m) => m.name === s.modalityName)?.category === "SPORT";
    const event = await prisma.event.create({
      data: {
        modalityId,
        title: s.opponent ? `${s.modalityName} vs ${s.opponent}` : s.modalityName,
        description: isSport ? `Confronto de fase ${s.phase.toLowerCase()}.` : null,
        day: s.day,
        startTime,
        endTime,
        locationId: pick(locationIds),
        opponent: s.opponent ?? null,
        phase: s.phase,
        priority: isSport ? "NORMAL" : "HIGH",
        status: "CONFIRMED",
        isConditional: s.isConditional ?? false,
        desiredSupportersCount: isSport ? randInt(5, 25) : 0,
      },
    });
    eventsCreated++;

    // Para eventos esportivos: escala atletas da modalidade e aloca torcida.
    if (isSport) {
      const modAthletes = await prisma.modalityAthlete.findMany({
        where: { modalityId },
        select: { personId: true },
      });
      const scaled = pickN(
        modAthletes.map((m) => m.personId),
        Math.min(modAthletes.length, randInt(3, 8)),
      );
      for (const pid of scaled) {
        await prisma.eventAthlete.create({
          data: { eventId: event.id, personId: pid },
        });
      }

      // Aloca torcida (~5..15 pessoas que não estejam jogando esse evento).
      const supporterPool = personIds.filter((id) => !scaled.includes(id));
      const supporters = pickN(supporterPool, randInt(3, 12));
      let captainAssigned = false;
      for (const pid of supporters) {
        const role: AssignmentRole = !captainAssigned && rand() < 0.5
          ? "CAPTAIN"
          : rand() < 0.15
            ? "MATERIAL_LEAD"
            : rand() < 0.2
              ? "SUPPORT"
              : "SUPPORTER";
        const isCaptain = role === "CAPTAIN" && !captainAssigned;
        if (isCaptain) captainAssigned = true;
        await prisma.assignment.create({
          data: { eventId: event.id, personId: pid, role, isCaptain },
        });

        // ~40% dos alocados fazem check-in.
        if (rand() < 0.4) {
          await prisma.checkIn.create({
            data: {
              eventId: event.id,
              personId: pid,
              checkedAt: new Date(startTime.getTime() + randInt(-15, 30) * 60_000),
            },
          });
        }
      }
    }
  }
  console.log(`  ${eventsCreated} eventos criados.`);

  console.log("\n✅ Seed concluído.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
