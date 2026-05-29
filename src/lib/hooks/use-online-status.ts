"use client";

import { useEffect, useState } from "react";

type ConnectionLike = {
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
};

/**
 * Retorna `true` quando o navegador acredita estar online.
 *
 * - `navigator.onLine` + eventos `online`/`offline` (sinal principal).
 * - `navigator.connection.change` pega trocas de rede que nem sempre disparam
 *   `online`/`offline`.
 *
 * Assume `true` durante SSR e na primeira render pra evitar flash de "offline"
 * e mismatch de hidratação — reavalia logo após o mount.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();

    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    const conn = (navigator as Navigator & { connection?: ConnectionLike })
      .connection;
    conn?.addEventListener?.("change", update);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      conn?.removeEventListener?.("change", update);
    };
  }, []);

  return online;
}
