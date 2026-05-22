"use client";

import { useEffect } from "react";

/**
 * Registra `/sw.js` no client autenticado. Idempotente — chamar várias vezes
 * apenas atualiza o registration existente.
 *
 * Não rodamos em dev (Turbopack serve assets sem hashing estável, o que faria
 * o cache do SW guardar versões obsoletas).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // silencioso — feature complementar, não pode quebrar app
      });
    };

    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad, { once: true });
      return () => window.removeEventListener("load", onLoad);
    }
  }, []);

  return null;
}
