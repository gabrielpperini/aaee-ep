// Dexie (IndexedDB) — MVP 3 / Bloco C: offline-first
//
// Cache local dos dados que a pessoa usa offline + fila de escrita.
// Hidratado a partir do servidor pelo <OfflineHydrator/> quando online.
//
// Datas são guardadas como ISO string (serializável e ordenável). `day` fica
// como number pra indexar a agenda por dia.
//
// IMPORTANTE: este módulo só roda no client. Componentes que o importam devem
// ser "use client" e tocar o banco apenas dentro de effects/handlers (o
// IndexedDB não existe durante o SSR).

import Dexie, { type Table } from "dexie";
import type { ConflictKind } from "@/lib/sync/conflict";

export type OfflineEvent = {
  id: string;
  day: number;
  title: string;
  startTime: string; // ISO
  endTime: string; // ISO
  modalityName: string;
  locationName: string | null;
  locationAddress: string | null;
  status: string;
};

export type OfflineAssignment = {
  eventId: string;
  personId: string;
  role: string;
  isCaptain: boolean;
  /** Marca alocações criadas otimisticamente offline, ainda não confirmadas. */
  pending?: boolean;
};

export type OfflineCheckIn = {
  eventId: string;
  personId: string;
  checkedAt: string; // ISO
  /** Marca check-ins criados otimisticamente offline, ainda não confirmados. */
  pending?: boolean;
};

export type MetaEntry = { key: string; value: unknown };

/** Tipos de escrita que a fila offline cobre (Bloco C2). */
export type SyncOpKind = "checkIn" | "undoCheckIn" | "allocate" | "deallocate";
export type SyncOpStatus = "pending" | "done" | "conflict" | "failed";

/**
 * Dados que a action precisa pra re-executar. `eventId` + `personId` sempre
 * presentes; os campos de alocação só fazem sentido pra `allocate`.
 */
export type PendingOpPayload = {
  eventId: string;
  personId: string;
  role?: string;
  isCaptain?: boolean;
  notes?: string;
  /** Sobrepõe conflito de "já alocada" na hora de sincronizar (resolução). */
  force?: boolean;
};

export type PendingOp = {
  id: string; // cuid gerado no client
  kind: SyncOpKind;
  payload: PendingOpPayload;
  status: SyncOpStatus;
  /** Quando `status === "conflict"`, classifica o motivo pra resolução na UI. */
  conflict?: ConflictKind;
  error?: string;
  createdAt: string; // ISO
};

export type SyncLogEntry = {
  id?: number; // auto-increment
  at: string; // ISO
  message: string;
  level: "info" | "warn" | "error";
};

class OfflineDB extends Dexie {
  events!: Table<OfflineEvent, string>;
  assignments!: Table<OfflineAssignment, [string, string]>;
  checkIns!: Table<OfflineCheckIn, [string, string]>;
  meta!: Table<MetaEntry, string>;
  pendingOps!: Table<PendingOp, string>;
  syncLog!: Table<SyncLogEntry, number>;

  constructor() {
    super("aaee-ep-offline");
    this.version(1).stores({
      events: "id, day, startTime",
      assignments: "[eventId+personId], eventId, personId",
      checkIns: "[eventId+personId], eventId, personId, pending",
      meta: "key",
      pendingOps: "id, status, createdAt",
      syncLog: "++id, at",
    });
  }
}

// Singleton. `new Dexie(name)` não abre o IndexedDB (abre lazy na 1ª operação),
// então é seguro instanciar no escopo do módulo mesmo durante o SSR de um
// client component.
export const db = new OfflineDB();
