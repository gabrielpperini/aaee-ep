// Fila de escrita offline (client-only) — MVP 3 / Bloco C2+C3.
//
// `enqueueOrRun` é o ponto único por onde passam as escritas que precisam
// funcionar offline (hoje: check-in / desfazer check-in). Online, executa a
// action direto; offline (ou se a rede cair no meio), enfileira em
// `pendingOps` e aplica o efeito otimista no cache local.
//
// O processamento da fila (drenagem + conflitos) vive em `processQueue`
// (Bloco C3).

import {
  db,
  type PendingOp,
  type SyncOpKind,
  type SyncLogEntry,
} from "@/lib/db/dexie";
import { checkIn, undoCheckIn } from "@/app/(app)/eventos/[id]/actions";
import { logSyncOperation } from "@/lib/db/sync-actions";

/** Shape estrutural do retorno das server actions de check-in (`ActionResult`). */
export type QueueActionResult = { ok: true } | { ok: false; error: string };

export type EnqueueResult =
  | { status: "done" }
  | { status: "queued" }
  | { status: "error"; error: string };

type OpMeta = { kind: SyncOpKind; eventId: string; personId: string };

const SYNC_LOG_LIMIT = 50;

function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `op_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}

/** Reflete a escrita no cache local. `pending` distingue otimista de confirmado. */
async function applyLocal(meta: OpMeta, pending: boolean): Promise<void> {
  if (meta.kind === "checkIn") {
    await db.checkIns.put({
      eventId: meta.eventId,
      personId: meta.personId,
      checkedAt: new Date().toISOString(),
      pending,
    });
  } else {
    await db.checkIns.delete([meta.eventId, meta.personId]);
  }
}

function pendingForEvent(ops: PendingOp[], eventId: string): PendingOp | undefined {
  return ops.find((o) => o.status === "pending" && o.payload.eventId === eventId);
}

export async function log(
  level: SyncLogEntry["level"],
  message: string,
): Promise<void> {
  try {
    await db.syncLog.add({ at: new Date().toISOString(), message, level });
    const count = await db.syncLog.count();
    if (count > SYNC_LOG_LIMIT) {
      const stale = await db.syncLog
        .orderBy("at")
        .limit(count - SYNC_LOG_LIMIT)
        .primaryKeys();
      await db.syncLog.bulkDelete(stale);
    }
  } catch {
    // log é best-effort
  }
}

/**
 * Executa a `action` se online; senão (ou se a rede falhar) enfileira a
 * operação e aplica o efeito otimista. Operações inversas pendentes sobre o
 * mesmo evento se cancelam (check-in seguido de desfazer offline → fila limpa).
 */
export async function enqueueOrRun(
  action: () => Promise<QueueActionResult>,
  meta: OpMeta,
): Promise<EnqueueResult> {
  if (isOnline()) {
    try {
      const result = await action();
      if (result.ok) {
        await applyLocal(meta, false);
        return { status: "done" };
      }
      // Erro de regra (janela fechada, conflito) — não enfileira, propaga.
      return { status: "error", error: result.error };
    } catch {
      // Falha de rede no meio — cai pro enfileiramento.
    }
  }

  const all = await db.pendingOps.toArray();
  const prior = pendingForEvent(all, meta.eventId);

  if (prior && prior.kind !== meta.kind) {
    // Operação inversa cancela a anterior; aplica o novo efeito local.
    await db.pendingOps.delete(prior.id);
    await applyLocal(meta, true);
    await log("info", `Fila: ${meta.kind} cancelou ${prior.kind} (${meta.eventId})`);
    return { status: "queued" };
  }
  if (prior && prior.kind === meta.kind) {
    return { status: "queued" }; // já enfileirado — idempotente
  }

  const op: PendingOp = {
    id: newId(),
    kind: meta.kind,
    payload: { eventId: meta.eventId },
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  await db.pendingOps.add(op);
  await applyLocal(meta, true);
  await log("info", `Enfileirado: ${meta.kind} (${meta.eventId})`);
  return { status: "queued" };
}

/** Quantidade de operações ainda pendentes (usado pelo indicador do header). */
export function pendingCount(): Promise<number> {
  return db.pendingOps.where("status").equals("pending").count();
}

// ------------------------------------------------------------------
// Processamento da fila (C3)
// ------------------------------------------------------------------

export type ProcessSummary = { done: number; conflict: number; failed: number };

/** Heurística: a action sinalizou conflito de alocação? (reusa a msg do server) */
function isConflictError(message: string): boolean {
  return /escalad|conflit|sobrep/i.test(message);
}

function runAction(op: PendingOp): Promise<QueueActionResult> {
  return op.kind === "checkIn"
    ? checkIn(op.payload.eventId)
    : undoCheckIn(op.payload.eventId);
}

let processing = false;

/**
 * Drena a fila serialmente quando online. Cada item chama a action real:
 * - sucesso → `done` (remove da fila, confirma o cache local)
 * - conflito de alocação → `conflict` (mantém na fila + registra no servidor)
 * - erro de validação → `failed` (mantém na fila pra retry/descartar)
 * Se a rede cair no meio, interrompe e deixa o resto pendente.
 *
 * Obs.: hoje a fila só cobre check-in (idempotente), então conflitos não
 * ocorrem na prática — o caminho fica pronto pra quando a fila cobrir alocação.
 */
export async function processQueue(): Promise<ProcessSummary> {
  const summary: ProcessSummary = { done: 0, conflict: 0, failed: 0 };
  if (processing || !isOnline()) return summary;
  processing = true;

  try {
    const ops = await db.pendingOps
      .where("status")
      .equals("pending")
      .sortBy("createdAt");

    for (const op of ops) {
      let result: QueueActionResult;
      try {
        result = await runAction(op);
      } catch {
        await log("warn", `Sync interrompido (rede): ${op.kind}`);
        break; // rede caiu — preserva pendentes
      }

      if (result.ok) {
        if (op.kind === "checkIn") {
          await db.checkIns
            .where("eventId")
            .equals(op.payload.eventId)
            .modify({ pending: false });
        }
        await db.pendingOps.delete(op.id);
        summary.done++;
        await log("info", `Sincronizado: ${op.kind} (${op.payload.eventId})`);
      } else {
        const status = isConflictError(result.error) ? "conflict" : "failed";
        await db.pendingOps.update(op.id, { status, error: result.error });
        await logSyncOperation({
          kind: op.kind,
          payload: op.payload,
          status,
          error: result.error,
        }).catch(() => undefined);
        if (status === "conflict") summary.conflict++;
        else summary.failed++;
        await log(
          status === "conflict" ? "warn" : "error",
          `${op.kind}: ${result.error}`,
        );
      }
    }
  } finally {
    processing = false;
  }

  return summary;
}

/** Recoloca uma operação (conflict/failed) na fila e tenta processar. */
export async function retryOp(id: string): Promise<ProcessSummary> {
  await db.pendingOps.update(id, { status: "pending", error: "" });
  return processQueue();
}

/** Remove uma operação da fila, revertendo o efeito otimista quando possível. */
export async function discardOp(id: string): Promise<void> {
  const op = await db.pendingOps.get(id);
  if (!op) return;
  if (op.kind === "checkIn") {
    await db.checkIns
      .where("eventId")
      .equals(op.payload.eventId)
      .and((c) => Boolean(c.pending))
      .delete();
  }
  await db.pendingOps.delete(id);
  await log("info", `Operação descartada: ${op.kind} (${op.payload.eventId})`);
}

/** Atalho pro botão "Forçar sync agora" (C4). */
export function forceSync(): Promise<ProcessSummary> {
  return processQueue();
}

/**
 * Zera todo o estado offline local (cache + fila + log) e os caches do service
 * worker. Use em recuperação manual / corrupção. APAGA a fila pendente.
 */
export async function clearLocalCache(): Promise<void> {
  await db.transaction(
    "rw",
    [db.events, db.assignments, db.checkIns, db.meta, db.pendingOps, db.syncLog],
    async () => {
      await Promise.all([
        db.events.clear(),
        db.assignments.clear(),
        db.checkIns.clear(),
        db.meta.clear(),
        db.pendingOps.clear(),
        db.syncLog.clear(),
      ]);
    },
  );

  if (typeof caches !== "undefined") {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
}
