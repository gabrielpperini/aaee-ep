// Sincroniza modalidades da planilha oficial do EP → sistema (MODO ADITIVO).
// Uso (dry-run, padrão):  pnpm tsx --env-file=.env scripts/sync-modalities-from-sheet.ts
// Aplicar de verdade:     DRY_RUN=false pnpm tsx --env-file=.env scripts/sync-modalities-from-sheet.ts
//
// Só ADICIONA vínculos ModalityAthlete que a planilha tem e o sistema não.
// NUNCA remove. Reusa syncPersonRoster (mesma função das server actions) para
// manter EventAthlete coerente, passando a UNIÃO (atuais ∪ adições) — como a
// união contém as atuais, nenhuma escalação existente é apagada.

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { syncPersonRoster } from "@/lib/roster";

const DRY_RUN = process.env.DRY_RUN !== "false";

// Adições derivadas da comparação planilha × sistema (nomes EXATOS do sistema).
const ADDITIONS: { personName: string; addModality: string }[] = [
  { personName: "Alice da Silva Freitas de Oliveira", addModality: "Tênis de Campo Feminino" },
  { personName: "Artur Porto Borowski", addModality: "Vôlei de Areia Masculino" },
  { personName: "Bárbara Lopes Hippólito da Silva", addModality: "Atletismo" },
  { personName: "Bruce Severo Biral", addModality: "Tênis de Mesa Masculino" },
  { personName: "Eduarda Chagas Pegoraro", addModality: "Tênis de Campo Feminino" },
  { personName: "Enrico Dalpiaz De Bastiani", addModality: "Basquete Masculino" },
  { personName: "Isabela Bemfica Matos", addModality: "Handebol Feminino" },

  // --- Grupo A: cadastrados sem modalidade vinculada (nomes EXATOS do sistema,
  // alguns diferem da planilha). Confirmados na planilha (PACOTE OK). ---
  { personName: "Julia Dentee", addModality: "Basquete Feminino" },
  { personName: "Julia Lovato Roehe", addModality: "Atletismo" },
  { personName: "Julia Lovato Roehe", addModality: "Handebol Feminino" },
  { personName: "Julia Vebber dos Santos da Silva", addModality: "Atletismo" },
  { personName: "JUNIOR MATTE", addModality: "Basquete Masculino" },
  { personName: "Kauã Gustavo Spironello", addModality: "Futebol de Campo" },
  { personName: "Kauã Gustavo Spironello", addModality: "Futsal Masculino" },
  { personName: "Kauã Gustavo Spironello", addModality: "Handebol Masculino" },
  { personName: "Laís Lima  Silveira", addModality: "Futsal Feminino" },
  { personName: "Luiz Gustavo Santos Andrade", addModality: "Atletismo" },
  { personName: "Luiz Gustavo Santos Andrade", addModality: "Futebol de Campo" },
  { personName: "Luiz Gustavo Santos Andrade", addModality: "Handebol Masculino" },
  { personName: "Luiz Gustavo Santos Andrade", addModality: "Judô" },
  { personName: "Luiz Gustavo Santos Andrade", addModality: "Voleibol Masculino" },
  { personName: "Luiza Magnus Vieira", addModality: "Atletismo" },
  { personName: "Luiza Magnus Vieira", addModality: "Basquete Feminino" },
  { personName: "Mariana Machry Jacintho", addModality: "Atletismo" },
  { personName: "Mariana Machry Jacintho", addModality: "Basquete Feminino" },
  { personName: "Mariana Machry Jacintho", addModality: "Futsal Feminino" },
  { personName: "Mariana Machry Jacintho", addModality: "Handebol Feminino" },
  { personName: "Matheus Jaskulski Silva", addModality: "Atletismo" },
  { personName: "Matheus Jaskulski Silva", addModality: "Futebol de Campo" },
  { personName: "Matheus Jaskulski Silva", addModality: "Voleibol Masculino" },
  { personName: "Pedro Brun Tondo", addModality: "Handebol Masculino" },
  { personName: "Pedro Henrique Pires Pereira", addModality: "Handebol Masculino" },
  { personName: "Pedro Henrique Pires Pereira", addModality: "Tênis de Mesa Masculino" },
  { personName: "Pedro Henrique Pires Pereira", addModality: "Xadrez" },
  { personName: "Pietro Rossato", addModality: "Atletismo" },
  { personName: "Rafael Kraether Genehr", addModality: "Tênis de Campo Masculino" },
  { personName: "Rafael Kraether Genehr", addModality: "Tênis de Mesa Masculino" },
  { personName: "Renato Longo Makariewicz", addModality: "Basquete Masculino" },
  { personName: "Renato Longo Makariewicz", addModality: "Handebol Masculino" },
  { personName: "Roberto Medeiros DallAgnol", addModality: "Futebol de Campo" },
  { personName: "Roberto Medeiros DallAgnol", addModality: "Futsal Masculino" },
  { personName: "Roberto Medeiros DallAgnol", addModality: "Voleibol Masculino" },
  { personName: "Rodrigo Vanzelotti", addModality: "Futebol de Campo" },
  { personName: "Rodrigo Vanzelotti", addModality: "Futsal Masculino" },
  { personName: "Talles de Oliveira Rodrigues", addModality: "Futebol de Campo" },
  { personName: "Talles de Oliveira Rodrigues", addModality: "Futsal Masculino" },
  { personName: "Thiago Dalla Rosa Brasil", addModality: "Futebol de Campo" },
  { personName: "Vinicius de Oliveira Jaskulski", addModality: "Basquete Masculino" },
  { personName: "Vinicius de Oliveira Jaskulski", addModality: "Handebol Masculino" },
  { personName: "Vinicius de Oliveira Jaskulski", addModality: "Voleibol Masculino" },
  { personName: "Vinicius de Oliveira Jaskulski", addModality: "Vôlei de Areia Masculino" },
];

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.log(
    `\n=== Sync modalidades planilha → sistema (${DRY_RUN ? "DRY-RUN" : "APLICANDO"}) ===\n`,
  );

  try {
    // Resolver ids por nome exato; abortar se algo não casar.
    const people = await prisma.person.findMany({ select: { id: true, name: true } });
    const modalities = await prisma.modality.findMany({ select: { id: true, name: true } });
    const personByName = new Map(people.map((p) => [p.name, p.id]));
    const modalityByName = new Map(modalities.map((m) => [m.name, m.id]));

    const missing: string[] = [];
    for (const a of ADDITIONS) {
      if (!personByName.has(a.personName)) missing.push(`Person não encontrada: "${a.personName}"`);
      if (!modalityByName.has(a.addModality)) missing.push(`Modality não encontrada: "${a.addModality}"`);
    }
    if (missing.length > 0) {
      console.error("ABORTANDO — não foi possível resolver:\n  " + missing.join("\n  "));
      process.exitCode = 1;
      return;
    }

    // Agrupar adições por pessoa.
    const byPerson = new Map<string, string[]>();
    for (const a of ADDITIONS) {
      const list = byPerson.get(a.personName) ?? [];
      list.push(a.addModality);
      byPerson.set(a.personName, list);
    }

    let totalLinksAdded = 0;
    let totalEventsBefore = 0;
    let totalEventsAfter = 0;

    for (const [personName, addNames] of byPerson) {
      const personId = personByName.get(personName)!;
      const addIds = addNames.map((n) => modalityByName.get(n)!);

      const currentLinks = await prisma.modalityAthlete.findMany({
        where: { personId },
        select: { modalityId: true },
      });
      const currentIds = new Set(currentLinks.map((l) => l.modalityId));
      const newIds = addIds.filter((id) => !currentIds.has(id));
      const finalIds = [...new Set([...currentIds, ...addIds])];

      const eventsBefore = await prisma.eventAthlete.count({ where: { personId } });
      totalEventsBefore += eventsBefore;

      const currentNames = modalities
        .filter((m) => currentIds.has(m.id))
        .map((m) => m.name)
        .sort();
      console.log(`● ${personName}`);
      console.log(`   atual    : ${currentNames.join(", ") || "—"}`);
      console.log(`   adicionar: ${addNames.join(", ")}`);
      if (newIds.length === 0) {
        console.log(`   (nada a fazer — já vinculado)`);
        totalEventsAfter += eventsBefore;
        console.log("");
        continue;
      }

      if (DRY_RUN) {
        const wouldAddEvents = await prisma.event.count({
          where: { modalityId: { in: newIds } },
        });
        console.log(`   → +${newIds.length} vínculo(s), ~+${wouldAddEvents} EventAthlete (estimado)`);
        totalLinksAdded += newIds.length;
        totalEventsAfter += eventsBefore + wouldAddEvents;
      } else {
        await prisma.$transaction(async (tx) => {
          await tx.modalityAthlete.createMany({
            data: newIds.map((modalityId) => ({ personId, modalityId })),
            skipDuplicates: true,
          });
          await syncPersonRoster(tx, personId, finalIds);
        });
        const eventsAfter = await prisma.eventAthlete.count({ where: { personId } });
        console.log(`   → +${newIds.length} vínculo(s) gravado(s); EventAthlete ${eventsBefore} → ${eventsAfter}`);
        totalLinksAdded += newIds.length;
        totalEventsAfter += eventsAfter;
      }
      console.log("");
    }

    console.log("--------------------------------------------------");
    console.log(
      `${DRY_RUN ? "Seriam adicionados" : "Adicionados"}: ${totalLinksAdded} vínculo(s) ModalityAthlete em ${byPerson.size} pessoa(s).`,
    );
    console.log(`EventAthlete (somatório dessas pessoas): ${totalEventsBefore} → ${totalEventsAfter}`);
    if (DRY_RUN) {
      console.log("\nDRY-RUN: nada foi gravado. Rode com DRY_RUN=false para aplicar.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
