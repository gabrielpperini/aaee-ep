"use client";

import { useState, useTransition } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  RefreshCw,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db, type PendingOp, type SyncOpStatus } from "@/lib/db/dexie";
import {
  clearLocalCache,
  discardOp,
  forceSync,
  retryOp,
} from "@/lib/db/sync-queue";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";

const KIND_LABEL: Record<PendingOp["kind"], string> = {
  checkIn: "Check-in",
  undoCheckIn: "Desfazer check-in",
};

const STATUS_META: Record<
  SyncOpStatus,
  { label: string; variant: "secondary" | "outline" | "destructive" }
> = {
  pending: { label: "Pendente", variant: "secondary" },
  done: { label: "Concluído", variant: "outline" },
  conflict: { label: "Conflito", variant: "destructive" },
  failed: { label: "Falhou", variant: "destructive" },
};

function fmt(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SyncPanel() {
  const online = useOnlineStatus();
  const [pending, startTransition] = useTransition();
  const [showLog, setShowLog] = useState(false);

  const ops = useLiveQuery(
    () => db.pendingOps.orderBy("createdAt").reverse().toArray(),
    [],
    [] as PendingOp[],
  );
  const titles = useLiveQuery(
    async () => {
      const map = new Map<string, string>();
      for (const e of await db.events.toArray()) map.set(e.id, e.title);
      return map;
    },
    [],
    new Map<string, string>(),
  );
  const lastSynced = useLiveQuery(
    () => db.meta.get("lastSyncedAt"),
    [],
    undefined,
  );
  const logEntries = useLiveQuery(
    () => db.syncLog.orderBy("at").reverse().limit(50).toArray(),
    [],
    [],
  );

  const pendingItems = ops.filter((o) => o.status === "pending");
  const issueItems = ops.filter(
    (o) => o.status === "conflict" || o.status === "failed",
  );

  const runForceSync = () =>
    startTransition(async () => {
      const r = await forceSync();
      if (r.done) toast.success(`${r.done} sincronizada(s)`);
      if (r.conflict || r.failed)
        toast.error(`${r.conflict + r.failed} com problema — veja abaixo`);
      if (!r.done && !r.conflict && !r.failed)
        toast.info("Nada pendente pra sincronizar");
    });

  const runClear = () =>
    startTransition(async () => {
      if (
        !window.confirm(
          "Limpar o cache local apaga os dados offline e a fila pendente deste dispositivo. Continuar?",
        )
      )
        return;
      await clearLocalCache();
      toast.success("Cache local limpo");
    });

  return (
    <Card id="sync">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CloudOff className="h-4 w-4" />
          Sincronização &amp; cache
        </CardTitle>
        <CardDescription>
          Alterações feitas offline ficam aqui até voltar a conexão.
          {lastSynced?.value
            ? ` Última sincronização: ${fmt(String(lastSynced.value))}.`
            : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={online ? "outline" : "destructive"}>
            {online ? "Online" : "Offline"}
          </Badge>
          <Button
            size="sm"
            variant="secondary"
            disabled={pending || !online || pendingItems.length === 0}
            onClick={runForceSync}
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`}
            />
            Forçar sync agora
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={runClear}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Limpar cache local
          </Button>
        </div>

        {ops.length === 0 ? (
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Tudo sincronizado.
          </p>
        ) : (
          <ul className="space-y-2">
            {[...pendingItems, ...issueItems].map((op) => {
              const meta = STATUS_META[op.status];
              const title = titles.get(op.payload.eventId) ?? op.payload.eventId;
              const isIssue = op.status === "conflict" || op.status === "failed";
              return (
                <li
                  key={op.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border bg-card/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {isIssue ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                      ) : (
                        <CloudOff className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="font-medium">{KIND_LABEL[op.kind]}</span>
                      <Badge variant={meta.variant} className="text-[10px]">
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {title} · {fmt(op.createdAt)}
                    </p>
                    {op.error && (
                      <p className="mt-0.5 text-xs text-destructive">{op.error}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {isIssue && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending || !online}
                        onClick={() =>
                          startTransition(async () => {
                            await retryOp(op.id);
                          })
                        }
                        className="h-7 px-2 text-xs"
                      >
                        <RotateCcw className="mr-1 h-3 w-3" />
                        Tentar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await discardOp(op.id);
                        })
                      }
                      className="h-7 px-2 text-xs text-muted-foreground"
                      aria-label="Descartar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {logEntries.length > 0 && (
          <div className="border-t pt-3">
            <button
              type="button"
              onClick={() => setShowLog((v) => !v)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {showLog ? "Ocultar" : "Ver"} log de sincronização (
              {logEntries.length})
            </button>
            {showLog && (
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto font-mono text-[11px] text-muted-foreground">
                {logEntries.map((e) => (
                  <li key={e.id} className="tabular-nums">
                    <span className="text-muted-foreground/60">{fmt(e.at)}</span>{" "}
                    <span
                      className={
                        e.level === "error"
                          ? "text-destructive"
                          : e.level === "warn"
                            ? "text-accent-foreground"
                            : ""
                      }
                    >
                      {e.message}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
