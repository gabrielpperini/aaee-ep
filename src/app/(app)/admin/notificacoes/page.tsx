import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { OfflineUnsupportedNotice } from "@/components/app/offline-unsupported-notice";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import type { MultiSelectOption } from "@/components/ui/multi-select";
import { BroadcastForm } from "./broadcast-form";

export default async function NotificacoesAdminPage() {
  await requireRole(["DIRECTOR", "ADMIN"]);

  const [modalities, events, broadcasts] = await Promise.all([
    prisma.modality.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.event.findMany({
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
      select: {
        id: true,
        title: true,
        modality: { select: { name: true } },
      },
    }),
    prisma.broadcast.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        sentBy: {
          select: { email: true, person: { select: { name: true } } },
        },
      },
    }),
  ]);

  const modalityOptions: MultiSelectOption[] = modalities.map((m) => ({
    value: m.id,
    label: m.name,
  }));

  const eventOptions: MultiSelectOption[] = events.map((e) => ({
    value: e.id,
    label: e.title,
    hint: e.modality.name,
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Administração · Diretoria"
        title="Enviar notificação"
        description="Mande um aviso push para todo mundo ou para grupos por modalidade e evento. O envio é imediato e ignora as preferências de notificação (aviso oficial)."
      />
      <OfflineUnsupportedNotice />

      <Card>
        <CardContent className="pt-6">
          <BroadcastForm
            modalityOptions={modalityOptions}
            eventOptions={eventOptions}
          />
        </CardContent>
      </Card>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Últimos envios
        </h2>
        {broadcasts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum aviso enviado ainda.
          </p>
        ) : (
          <ul className="space-y-3">
            {broadcasts.map((b) => {
              const sender =
                b.sentBy?.person?.name ?? b.sentBy?.email ?? "—";
              const audience = b.toEveryone
                ? "Todo mundo"
                : [
                    b.modalityIds.length
                      ? `${b.modalityIds.length} modalidade(s)`
                      : null,
                    b.eventIds.length
                      ? `${b.eventIds.length} evento(s)`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Grupos";
              return (
                <li
                  key={b.id}
                  className="rounded-lg border bg-card p-4 text-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{b.title}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatDateTime(b.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{b.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {audience} · {b.recipientCount} pessoa(s) ·{" "}
                    {b.sentCount} dispositivo(s) · por {sender}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
