// Tipos de conflito de sincronização (MVP 3 / Bloco C3).
//
// Módulo PLANO de propósito — sem "use server" e sem dependências de runtime —
// pra poder ser importado tanto pela server action (`eventos/[id]/actions.ts`)
// quanto pelo código client da fila offline (`lib/db/*`). Ver AGENTS.md: tipos
// nunca devem ser re-exportados de um arquivo "use server" (turbopack quebra em
// runtime).

/**
 * Classifica POR QUE uma escalação conflitou, pra decidir como resolver:
 * - `already-allocated` — pessoa já escalada em evento sobreposto. **Resolvível
 *   com `force`** (o diretor decide sobrepor).
 * - `competing` — pessoa competindo em evento sobreposto. Conflito duro.
 * - `athlete-here` — pessoa é atleta NESTE evento. Conflito duro.
 * - `event-cancelled` — evento foi cancelado. Conflito duro.
 *
 * Só `upsertAssignment` produz conflito; check-in/remoção são idempotentes.
 */
export type ConflictKind =
  | "already-allocated"
  | "competing"
  | "athlete-here"
  | "event-cancelled";

/** Conflitos que o diretor pode sobrepor com `force` na resolução. */
export function isForceable(kind: ConflictKind): boolean {
  return kind === "already-allocated";
}
