import type { Prisma } from "@/generated/prisma/client";

/**
 * Escalação automática: a "escalação" de um evento (EventAthlete) é derivada da
 * modalidade — todo atleta vinculado à modalidade (ModalityAthlete) compete em
 * todos os eventos daquela modalidade. Estas funções mantêm o EventAthlete como
 * espelho dessa regra, chamadas dentro das transações de saveEvent/savePerson.
 */

type Tx = Prisma.TransactionClient;

/** Sincroniza a escalação de UM evento = todos os atletas da sua modalidade. */
export async function syncEventRoster(
  tx: Tx,
  eventId: string,
  modalityId: string,
): Promise<void> {
  const athletes = await tx.modalityAthlete.findMany({
    where: { modalityId },
    select: { personId: true },
  });
  const personIds = athletes.map((a) => a.personId);

  if (personIds.length === 0) {
    await tx.eventAthlete.deleteMany({ where: { eventId } });
    return;
  }
  // remove quem não é (mais) da modalidade; adiciona os que faltam
  await tx.eventAthlete.deleteMany({
    where: { eventId, personId: { notIn: personIds } },
  });
  await tx.eventAthlete.createMany({
    data: personIds.map((personId) => ({ eventId, personId })),
    skipDuplicates: true,
  });
}

/**
 * Sincroniza as escalações de UMA pessoa para baterem com suas modalidades:
 * presente em todos os eventos das modalidades dela, ausente das demais.
 */
export async function syncPersonRoster(
  tx: Tx,
  personId: string,
  modalityIds: string[],
): Promise<void> {
  if (modalityIds.length === 0) {
    await tx.eventAthlete.deleteMany({ where: { personId } });
    return;
  }
  await tx.eventAthlete.deleteMany({
    where: { personId, event: { modalityId: { notIn: modalityIds } } },
  });
  const events = await tx.event.findMany({
    where: { modalityId: { in: modalityIds } },
    select: { id: true },
  });
  if (events.length > 0) {
    await tx.eventAthlete.createMany({
      data: events.map((e) => ({ eventId: e.id, personId })),
      skipDuplicates: true,
    });
  }
}
