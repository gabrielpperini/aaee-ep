"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * Marca que o usuário abriu o app instalado (standalone/PWA).
 * Chamado pelo <InstallTracker/> quando detecta display-mode standalone.
 * Idempotente: só grava `appInstalledAt` na primeira vez (best-effort, nunca
 * lança — é só telemetria de instalação).
 */
export async function markAppInstalled(): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user || user.appInstalledAt) return;
    await prisma.user.update({
      where: { id: user.id },
      data: { appInstalledAt: new Date() },
    });
  } catch {
    // best-effort
  }
}
