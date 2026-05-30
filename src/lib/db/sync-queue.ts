// Fila de escrita offline (client-only) — MVP 3 / Bloco C2+C3.
//
// `enqueueOrRun` é o ponto único por onde passam as escritas que precisam
// funcionar offline: check-in (idempotente) e alocação de torcida (gera
// conflito). Online, executa a action direto; offline (ou se a rede cair no
// meio), enfileira em `pendingOps` e aplica o efeito otimista no cache local.
//
// Merge: a fila guarda só o ÚLTIMO intento por chave (família+evento+pessoa).
// Como `upsert`/`delete` são operações absolutas (não deltas), uma nova op na
// mesma chave SUBSTITUI a anterior pendente — last-write-wins. Sincronizar o
// último intento contra o servidor produz o estado final correto.
//
// O processamento da fila (drenagem + conflitos) vive em `processQueue` (C3).

import {
  db,
  type PendingOp,
  type PendingOpPayload,
  type SyncOpKind,
  type SyncLogEntry,
} from "@/lib/db/dexie";
import type { ConflictKind } from "@/lib/sync/conflict";
import type { AssignmentRole } from "@/generated/prisma/client";
import {
  checkIn,
  undoCheckIn,
  upsertAssignment,
  removeAssignment,
} from "@/app/(app)/eventos/[id]/actions";
import { logSyncOperation } from "@/lib/db/sync-actions";

/** Shape estrutural do retorno das server actions (`ActionResult`). */
export type QueueActionResult =
  | { ok: true }
  | { ok: false; error: string; conflict?: ConflictKind };

export type EnqueueResult =
  | { status: "done" }
  | { status: "queued" }
  | { status: "error"; error: string; conflict?: ConflictKind };

/** Tudo que a fila precisa pra re-executar e refletir a op localmente. */
export type OpMeta = {
  kind: SyncOpKind;
  eventId: string;
  personId: string;
  role?: AssignmentRole;
  isCaptain?: boolean;
  notes?: string;
  force?: boolean;
};

const SYNC_LOG_LIMIT = 50;

function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `op_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}

/** Família da operação — ops da mesma família+chave se substituem. */
function family(kind: SyncOpKind): "checkin" | "allocation" {
  return kind === "checkIn" || kind === "undoCheckIn" ? "checkin" : "allocation";
}

/** Chave de coalescência: uma escrita "viva" por família+evento+pessoa. */
function keyOf(kind: SyncOpKind, eventId: string, personId: string): string {
  return `${family(kind)}:${eventId}:${personId}`;
}

function payloadFromMeta(meta: OpMeta): PendingOpPayload {
  return {
    eventId: meta.eventId,
    personId: meta.personId,
    role: meta.role,
    isCaptain: meta.isCaptain,
    notes: meta.notes,
    force: meta.force,
  };
}

/** Reflete a escrita no cache local. `pending` distingue otimista de confirmado. */
async function applyLocal(meta: OpMeta, pending: boolean): Promise<void> {
  switch (meta.kind) {
    case "checkIn":
      await db.checkIns.put({
        eventId: meta.eventId,
        personId: meta.personId,
        checkedAt: new Date().toISOString(),
        pending,
      });
      break;
    case "undoCheckIn":
      await db.checkIns.delete([meta.eventId, meta.personId]);
      break;
    case "allocate":
      await db.assignments.put({
        eventId: meta.eventId,
        personId: meta.personId,
        role: meta.role ?? "SUPPORTER",
        isCaptain: meta.isCaptain ?? false,
        pending,
      });
      break;
    case "deallocate":
      await db.assignments.delete([meta.eventId, meta.personId]);
      break;
  }
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
 * operação e aplica o efeito otimista. Coalescência last-write-wins: uma nova
 * op na mesma chave (família+evento+pessoa) substitui a pendente anterior.
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
      return { status: "error", error: result.error, conflict: result.conflict };
    } catch {
      // Falha de rede no meio — cai pro enfileiramento.
    }
  }

  const key = keyOf(meta.kind, meta.eventId, meta.personId);
  const all = await db.pendingOps.toArray();
  const prior = all.find(
    (o) =>
      o.status === "pending" &&
      keyOf(o.kind, o.payload.eventId, o.payload.personId) === key,
  );
  const payload = payloadFromMeta(meta);

  if (prior) {
    // Substitui o intento anterior pelo novo (inclui cancelar via inverso).
    await db.pendingOps.update(prior.id, {
      kind: meta.kind,
      payload,
      conflict: undefined,
      error: undefined,
    });
    await applyLocal(meta, true);
    await log("info", `Fila: ${meta.kind} substituiu ${prior.kind} (${key})`);
    return { status: "queued" };
  }

  await db.pendingOps.add({
    id: newId(),
    kind: meta.kind,
    payload,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
  await applyLocal(meta, true);
  await log("info", `Enfileirado: ${meta.kind} (${key})`);
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

function runAction(op: PendingOp): Promise<QueueActionResult> {
  const { eventId, personId, role, isCaptain, notes, force } = op.payload;
  switch (op.kind) {
    case "checkIn":
      return checkIn(eventId);
    case "undoCheckIn":
      return undoCheckIn(eventId);
    case "allocate":
      return upsertAssignment({
        eventId,
        personId,
        role: (role ?? "SUPPORTER") as AssignmentRole,
        isCaptain: isCaptain ?? false,
        notes: notes ?? "",
        force: force ?? false,
      });
    case "deallocate":
      return removeAssignment({ eventId, personId });
  }
}

/** Confirma no cache local o efeito de uma op recém-sincronizada. */
async function confirmLocal(op: PendingOp): Promise<void> {
  const { eventId, personId } = op.payload;
  if (op.kind === "checkIn") {
    await db.checkIns.update([eventId, personId], { pending: false });
  } else if (op.kind === "allocate") {
    await db.assignments.update([eventId, personId], { pending: false });
  }
}

let processing = false;

/**
 * Drena a fila serialmente quando online. Cada item chama a action real:
 * - sucesso → `done` (remove da fila, confirma o cache local)
 * - conflito (`result.conflict` setado) → `conflict` (mantém na fila + registra
 *   no servidor, que avisa a diretoria)
 * - erro de validação → `failed` (mantém na fila pra retry/descartar)
 * Se a rede cair no meio, interrompe e deixa o resto pendente.
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
        await confirmLocal(op);
        await db.pendingOps.delete(op.id);
        summary.done++;
        await log("info", `Sincronizado: ${op.kind} (${op.payload.eventId})`);
      } else {
        const isConflict = Boolean(result.conflict);
        const status = isConflict ? "conflict" : "failed";
        await db.pendingOps.update(op.id, {
          status,
          conflict: result.conflict,
          error: result.error,
        });
        await logSyncOperation({
          kind: op.kind,
          payload: { ...op.payload },
          status,
          conflict: result.conflict,
          error: result.error,
        }).catch(() => undefined);
        if (isConflict) summary.conflict++;
        else summary.failed++;
        await log(
          isConflict ? "warn" : "error",
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
  await db.pendingOps.update(id, { status: "pending", conflict: undefined, error: "" });
  return processQueue();
}

/**
 * Resolve um conflito de "já alocada" sobrepondo (`force`) e reprocessa.
 * Só faz sentido pra `allocate` com conflito `already-allocated`.
 */
export async function resolveOp(
  id: string,
  opts: { force?: boolean } = {},
): Promise<ProcessSummary> {
  const op = await db.pendingOps.get(id);
  if (!op) return { done: 0, conflict: 0, failed: 0 };
  await db.pendingOps.update(id, {
    status: "pending",
    conflict: undefined,
    error: "",
    payload: { ...op.payload, force: opts.force ?? op.payload.force },
  });
  return processQueue();
}

/** Remove uma operação da fila, revertendo o efeito otimista quando possível. */
export async function discardOp(id: string): Promise<void> {
  const op = await db.pendingOps.get(id);
  if (!op) return;
  const { eventId, personId } = op.payload;
  if (op.kind === "checkIn") {
    const row = await db.checkIns.get([eventId, personId]);
    if (row?.pending) await db.checkIns.delete([eventId, personId]);
  } else if (op.kind === "allocate") {
    const row = await db.assignments.get([eventId, personId]);
    if (row?.pending) await db.assignments.delete([eventId, personId]);
  }
  await db.pendingOps.delete(id);
  await log("info", `Operação descartada: ${op.kind} (${eventId})`);
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
