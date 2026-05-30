import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * IDs dos usuários da diretoria (DIRECTOR/ADMIN), pra avisos como conflito de
 * escalação na sincronização offline. `excludeUserId` tira o próprio autor da
 * ação (ele já vê o conflito no painel de sync dele).
 */
export async function getDirectorUserIds(
  excludeUserId?: string,
): Promise<string[]> {
  const directors = await prisma.user.findMany({
    where: {
      role: { in: ["DIRECTOR", "ADMIN"] },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  });
  return directors.map((d) => d.id);
}
