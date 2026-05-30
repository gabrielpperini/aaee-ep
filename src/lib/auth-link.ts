import "server-only";

import type { Prisma } from "@/generated/prisma/client";

/** Normaliza telefone pra dígitos (10/11). Tira prefixo +55 (12/13 dígitos). */
function normalizePhone(value: string | null | undefined): string | null {
  const d = (value ?? "").replace(/\D/g, "");
  if (d.length === 12 || d.length === 13) return d.slice(d.length - 11);
  if (d.length === 10 || d.length === 11) return d;
  return null;
}

export type LinkablePerson = { id: string; email: string | null };

/**
 * Encontra um `Person` ainda sem `User` vinculado para auto-linkar à conta.
 *
 * Estratégia: tenta casar por **email** (case-insensitive) e, se não achar,
 * por **telefone** (dígitos) — necessário pra pessoas importadas da planilha
 * que têm telefone mas não email. Exige **exatamente 1** candidato; se houver
 * mais de um, não linka e registra aviso (admin resolve em /admin/usuarios).
 */
const normName = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

export async function resolveLinkablePerson(
  tx: Prisma.TransactionClient,
  opts: { email?: string | null; phone?: string | null; name?: string | null; authUserId: string },
): Promise<LinkablePerson | null> {
  const email = opts.email?.trim().toLowerCase() || null;
  const phone = normalizePhone(opts.phone);
  const name = opts.name?.trim() || null;

  if (email) {
    const byEmail = await tx.person.findMany({
      where: { userId: null, email: { equals: email, mode: "insensitive" } },
      select: { id: true, email: true },
      take: 2,
    });
    if (byEmail.length === 1) return byEmail[0];
    if (byEmail.length > 1) {
      console.warn(
        `[auth] Auto-link por email ambíguo para authUserId=${opts.authUserId}: ${byEmail.length}+ candidatos. Resolva em /admin/usuarios.`,
      );
      return null;
    }
  }

  if (phone) {
    const byPhone = await tx.person.findMany({
      where: { userId: null, phone },
      select: { id: true, email: true },
      take: 2,
    });
    if (byPhone.length === 1) return byPhone[0];
    if (byPhone.length > 1) {
      console.warn(
        `[auth] Auto-link por telefone ambíguo para authUserId=${opts.authUserId}: ${byPhone.length}+ candidatos. Resolva em /admin/usuarios.`,
      );
      return null;
    }
  }

  // Fallback por NOME completo (case/acento-insensível) — pega logins Google
  // (têm nome no metadata mas sem telefone, e os importados não têm email).
  if (name) {
    const candidates = await tx.person.findMany({
      where: { userId: null },
      select: { id: true, email: true, name: true },
    });
    const target = name ? normName(name) : "";
    const hits = candidates.filter((p) => normName(p.name) === target);
    if (hits.length === 1) return { id: hits[0].id, email: hits[0].email };
    if (hits.length > 1) {
      console.warn(
        `[auth] Auto-link por nome ambíguo para authUserId=${opts.authUserId}: ${hits.length} candidatos "${name}". Resolva em /admin/usuarios.`,
      );
      return null;
    }
  }

  return null;
}
