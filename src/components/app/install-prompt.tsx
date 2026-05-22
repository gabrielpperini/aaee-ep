"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

const DISMISS_KEY = "install-prompt-dismissed-v1";
const OPEN_EVENT = "aaee:open-install-prompt";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "android-chrome" | "ios-safari" | "macos-safari" | "desktop-chrome" | "other";

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "other";
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
  const isAndroid = /Android/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua);
  const isChrome = /Chrome|Chromium|Edg/.test(ua) && !/OPR/.test(ua);
  const isMac = /Macintosh|Mac OS X/.test(ua);

  if (isIOS && isSafari) return "ios-safari";
  if (isAndroid && isChrome) return "android-chrome";
  if (isMac && isSafari) return "macos-safari";
  if (isChrome) return "desktop-chrome";
  return "other";
}

/**
 * Aciona o modal de instalação manualmente (ex: link no /perfil).
 * Limpa a flag de "não mostrar de novo" do localStorage.
 */
export function openInstallPrompt() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DISMISS_KEY);
  } catch {
    // ignora storage indisponível
  }
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export function InstallPrompt() {
  const standalone = useStandaloneMode();
  const [open, setOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [platform] = useState<Platform>(() =>
    typeof window === "undefined" ? "other" : detectPlatform(),
  );

  // Captura beforeinstallprompt (Android/Desktop Chromium)
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Auto-abre depois do login se não dismissado e não standalone
  useEffect(() => {
    if (standalone) return;
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      // sem storage → trata como não dismissado
    }
    if (dismissed) return;

    // pequeno delay pra não aparecer junto com o paint inicial
    const t = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(t);
  }, [standalone]);

  // Handler do evento manual (/perfil)
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, []);

  const handleDontShowAgain = useCallback(() => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignora storage indisponível
    }
    setOpen(false);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (choice.outcome === "accepted") {
      setOpen(false);
    }
  }, [deferredPrompt]);

  const instructions = useMemo(() => {
    switch (platform) {
      case "ios-safari":
        return (
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>
              Toque no botão <strong>Compartilhar</strong> na barra do Safari
              (quadrado com seta pra cima).
            </li>
            <li>
              Role e escolha <strong>Adicionar à Tela de Início</strong>.
            </li>
            <li>
              Confirme em <strong>Adicionar</strong>. O ícone vai aparecer na
              sua tela inicial.
            </li>
          </ol>
        );
      case "android-chrome":
        return (
          <p className="text-sm text-muted-foreground">
            Toque no botão <strong>Instalar</strong> abaixo. Se não aparecer,
            abra o menu (⋮) do Chrome e escolha{" "}
            <strong>Adicionar à tela inicial</strong>.
          </p>
        );
      case "macos-safari":
        return (
          <p className="text-sm text-muted-foreground">
            No Safari, abra o menu <strong>Arquivo</strong> e escolha{" "}
            <strong>Adicionar ao Dock…</strong> para instalar o app.
          </p>
        );
      case "desktop-chrome":
        return (
          <p className="text-sm text-muted-foreground">
            Clique em <strong>Instalar</strong> abaixo. Você também pode usar
            o ícone de instalação na barra de endereço do navegador.
          </p>
        );
      default:
        return (
          <p className="text-sm text-muted-foreground">
            Procure no menu do seu navegador a opção{" "}
            <strong>Instalar</strong> ou{" "}
            <strong>Adicionar à tela inicial</strong>.
          </p>
        );
    }
  }, [platform]);

  const canInstallNative = deferredPrompt !== null;

  if (standalone) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Instalar o app</DialogTitle>
          <DialogDescription>
            Instalar como app deixa o acesso mais rápido e libera lembretes de
            jogos durante o EP.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">{instructions}</div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleDontShowAgain}>
            Não mostrar de novo
          </Button>
          {canInstallNative ? (
            <Button onClick={handleInstall}>Instalar</Button>
          ) : (
            <Button onClick={() => setOpen(false)}>Entendi</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
