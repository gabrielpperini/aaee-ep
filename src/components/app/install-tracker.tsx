"use client";

import { useEffect, useRef } from "react";
import { useStandaloneMode } from "@/lib/hooks/use-standalone-mode";
import { markAppInstalled } from "@/app/(app)/install-actions";

/**
 * Quando o app roda instalado (standalone/PWA), avisa o servidor uma vez por
 * sessão pra registrar `User.appInstalledAt`. Não renderiza nada.
 */
export function InstallTracker() {
  const standalone = useStandaloneMode();
  const sent = useRef(false);

  useEffect(() => {
    if (standalone && !sent.current) {
      sent.current = true;
      void markAppInstalled();
    }
  }, [standalone]);

  return null;
}
