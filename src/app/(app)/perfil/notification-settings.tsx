"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { BellRing, Loader2, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  updateNotificationPreferences,
  unsubscribePush,
} from "./push-actions";
import {
  enablePush,
  getExistingSubscription,
  pushSupported,
} from "@/lib/push-client";
import { describeUserAgent } from "@/lib/user-agent";
import { formatDateTime } from "@/lib/format";

type Prefs = {
  allocation: boolean;
  eventReminder: boolean;
  captainCall: boolean;
  syncConflict: boolean;
};

type Device = {
  id: string;
  endpoint: string;
  userAgent: string | null;
  lastSeenAt: Date;
};

const CATEGORY_LABELS: { key: keyof Prefs; label: string; hint: string }[] = [
  { key: "allocation", label: "Escalações", hint: "Quando você é escalado, removido ou vira capitão." },
  { key: "eventReminder", label: "Lembretes de evento", hint: "~30min antes dos seus eventos." },
  { key: "captainCall", label: "Chamado da torcida", hint: "Quando um capitão convoca a torcida." },
];

// Categorias só relevantes pra diretoria — escondidas de quem não gerencia.
const MANAGER_CATEGORY_LABELS: { key: keyof Prefs; label: string; hint: string }[] = [
  { key: "syncConflict", label: "Conflitos de escalação", hint: "Quando uma escalação feita offline conflita ao sincronizar." },
];

export function NotificationSettings({
  initialPrefs,
  devices,
  canManage = false,
}: {
  initialPrefs: Prefs;
  devices: Device[];
  canManage?: boolean;
}) {
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  const [deviceList, setDeviceList] = useState<Device[]>(devices);
  const [thisEndpoint, setThisEndpoint] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [pending, startTransition] = useTransition();
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    const sync = async () => {
      if (!pushSupported()) {
        setPermission("unsupported");
        return;
      }
      setPermission(Notification.permission);
      const sub = await getExistingSubscription();
      setThisEndpoint(sub?.toJSON().endpoint ?? null);
    };
    void sync();
  }, []);

  const handleToggle = (key: keyof Prefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    startTransition(async () => {
      const res = await updateNotificationPreferences(next);
      if (!res.ok) {
        setPrefs(prefs); // rollback
        toast.error(res.error);
      }
    });
  };

  const handleEnable = async () => {
    setEnabling(true);
    const res = await enablePush();
    setEnabling(false);
    if (res.ok) {
      setPermission("granted");
      toast.success("Notificações ativadas neste dispositivo.");
      // o registro novo aparece após refresh; força sync do endpoint atual
      const sub = await getExistingSubscription();
      setThisEndpoint(sub?.toJSON().endpoint ?? null);
    } else if (res.reason === "denied") {
      setPermission("denied");
      toast.error("Permissão de notificações negada no navegador.");
    } else if (res.reason === "unsupported") {
      toast.error("Este navegador não suporta notificações push.");
    } else {
      toast.error("Não foi possível ativar as notificações.");
    }
  };

  const handleRemove = (endpoint: string) => {
    startTransition(async () => {
      const res = await unsubscribePush({ endpoint });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setDeviceList((list) => list.filter((d) => d.endpoint !== endpoint));
      if (endpoint === thisEndpoint) setThisEndpoint(null);
      toast.success("Dispositivo removido.");
    });
  };

  const showEnable =
    permission !== "unsupported" && (permission !== "granted" || !thisEndpoint);

  return (
    <div className="space-y-5">
      {permission === "unsupported" ? (
        <p className="text-xs text-muted-foreground">
          Este navegador não suporta notificações push. Instale o app e use um
          navegador compatível (Chrome, Edge, Firefox ou Safari recente).
        </p>
      ) : (
        showEnable && (
          <div className="rounded-md border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground mb-2">
              {permission === "denied"
                ? "As notificações estão bloqueadas. Libere a permissão nas configurações do navegador e tente de novo."
                : "Ative as notificações neste dispositivo para receber avisos durante o EP."}
            </p>
            <Button size="sm" onClick={handleEnable} disabled={enabling}>
              {enabling ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <BellRing className="mr-1.5 h-4 w-4" />
              )}
              {enabling ? "Ativando…" : "Ativar neste dispositivo"}
            </Button>
          </div>
        )
      )}

      <div className="space-y-3">
        {[
          ...CATEGORY_LABELS,
          ...(canManage ? MANAGER_CATEGORY_LABELS : []),
        ].map(({ key, label, hint }) => (
          <div key={key} className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium">{label}</div>
              <div className="text-xs text-muted-foreground">{hint}</div>
            </div>
            <Switch
              checked={prefs[key]}
              onCheckedChange={(v) => handleToggle(key, v)}
              disabled={pending}
            />
          </div>
        ))}
      </div>

      <div className="border-t pt-3">
        <div className="text-muted-foreground text-xs mb-2">
          Dispositivos registrados
        </div>
        {deviceList.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhum dispositivo registrado ainda.
          </p>
        ) : (
          <ul className="space-y-2">
            {deviceList.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-2 rounded-md border bg-card/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {describeUserAgent(d.userAgent)}
                    {d.endpoint === thisEndpoint && (
                      <span className="text-muted-foreground"> · este</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    Visto {formatDateTime(d.lastSeenAt)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={pending}
                  onClick={() => handleRemove(d.endpoint)}
                  aria-label="Remover dispositivo"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
