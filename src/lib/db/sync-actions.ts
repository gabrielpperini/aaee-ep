"use server";

// Auditoria server-side da fila offline (MVP 3 / C3).
// A fila operacional vive no client (Dexie); aqui só registramos o RESULTADO
// do processamento que precisa de visibilidade — conflitos e falhas — pra
// diretoria poder acompanhar.

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export async function logSyncOperation(input: {
  kind: string;
  payload: Record<string, unknown>;
  status: "done" | "conflict" | "failed";
  error?: string;
}): Promise<void> {
  const user = await requireUser();
  await prisma.syncOperation.create({
    data: {
      userId: user.id,
      kind: input.kind,
      payload: input.payload as Prisma.InputJsonValue,
      status: input.status,
      error: input.error ?? null,
    },
  });
}
