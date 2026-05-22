"use client";

import { useEffect, useState } from "react";

/**
 * Retorna `true` quando o app está rodando como PWA instalada (standalone).
 *
 * - `matchMedia("(display-mode: standalone)")` cobre Android/Desktop.
 * - `navigator.standalone` cobre iOS Safari.
 *
 * Durante o SSR e na primeira render no cliente o valor é `false` —
 * o hook reavalia após `useEffect` pra evitar mismatch de hidratação.
 */
export function useStandaloneMode(): boolean {
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const compute = () => {
      const mq = window.matchMedia("(display-mode: standalone)").matches;
      const iosStandalone =
        "standalone" in window.navigator &&
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      setStandalone(mq || iosStandalone);
    };

    compute();

    const mql = window.matchMedia("(display-mode: standalone)");
    mql.addEventListener("change", compute);
    return () => mql.removeEventListener("change", compute);
  }, []);

  return standalone;
}
