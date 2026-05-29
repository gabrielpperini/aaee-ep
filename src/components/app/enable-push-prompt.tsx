"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useStandaloneMode } from "@/lib/hooks/use-standalone-mode";
import {
  enablePush,
  getExistingSubscription,
  pushSupported,
} from "@/lib/push-client";

const OPEN_EVENT = "aaee:open-enable-push";

/**
 * Aciona o prompt de notificações manualmente (ex: a partir do /perfil quando
 * a permissão foi recusada antes). Funciona mesmo fora do standalone.
 */
export function openEnablePush() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export function EnablePushPrompt() {
  const standalone = useStandaloneMode();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [forced, setForced] = useState(false); // aberto manualmente via /perfil

  // Auto-abre só quando: standalone + permissão default + sem subscription.
  useEffect(() => {
    if (!standalone) return;
    if (!pushSupported()) return;
    if (Notification.permission !== "default") return;

    let cancelled = false;
    const t = window.setTimeout(async () => {
      const existing = await getExistingSubscription();
      if (!cancelled && !existing) setOpen(true);
    }, 1800); // depois do InstallPrompt, pra não empilhar modais

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [standalone]);

  // Handler do evento manual (/perfil)
  useEffect(() => {
    const handler = () => {
      setForced(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, []);

  const handleEnable = useCallback(async () => {
    setPending(true);
    const res = await enablePush();
    setPending(false);
    if (res.ok) setOpen(false);
    // Se negada/erro, mantém o modal? Fecha — push é complementar, não insiste.
    if (!res.ok) setOpen(false);
  }, []);

  // Fora do standalone, só aparece se forçado manualmente.
  if (!standalone && !forced) return null;
  if (!pushSupported()) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ativar notificações</DialogTitle>
          <DialogDescription>
            Receba avisos quando você for escalado(a), lembretes ~30min antes
            dos seus eventos e o chamado da torcida do capitão.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Pular por enquanto
          </Button>
          <Button onClick={handleEnable} disabled={pending}>
            {pending ? "Ativando…" : "Ativar notificações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
