"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { useStandaloneMode } from "@/lib/hooks/use-standalone-mode";

/**
 * Pull-to-refresh próprio, ativo SÓ no modo instalado (standalone) — no
 * navegador o gesto nativo já existe. Arrastar pra baixo no topo do conteúdo
 * revela um indicador que "enche" conforme a puxada; passar do limite e soltar
 * força `location.reload()` (o sw.js é network-first, então o reload pega a
 * versão nova).
 *
 * O transform/opacidade do indicador são manipulados direto via ref durante o
 * `touchmove` — sem setState por frame, pra não dar jank.
 */

const THRESHOLD = 70; // px (após damping) pra armar o refresh
const MAX = 110; // teto visual da puxada
const DAMPING = 0.5; // resistência da puxada

export function PullToRefresh() {
  const standalone = useStandaloneMode();
  const [refreshing, setRefreshing] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!standalone || refreshing) return;
    const scroller = document.getElementById("app-scroll");
    if (!scroller) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let startY = 0;
    let pulling = false;
    let armed = false;
    let distance = 0;

    const setVisual = (d: number) => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const progress = Math.min(d / THRESHOLD, 1);
      wrap.style.transform = `translate(-50%, ${d}px)`;
      wrap.style.opacity = String(progress);
      const icon = iconRef.current;
      if (icon && !armed && !reduceMotion) {
        icon.style.transform = `rotate(${progress * 270}deg)`;
      }
    };

    const setArmed = (next: boolean) => {
      if (next === armed) return;
      armed = next;
      const icon = iconRef.current;
      if (!icon) return;
      if (armed && !reduceMotion) {
        icon.style.transform = "";
        icon.classList.add("animate-spin");
      } else {
        icon.classList.remove("animate-spin");
      }
    };

    const reset = (animate: boolean) => {
      const wrap = wrapRef.current;
      if (wrap) {
        wrap.style.transition = animate
          ? "transform .2s ease, opacity .2s ease"
          : "none";
        wrap.style.transform = "translate(-50%, 0px)";
        wrap.style.opacity = "0";
      }
      const icon = iconRef.current;
      if (icon) {
        icon.classList.remove("animate-spin");
        icon.style.transform = "rotate(0deg)";
      }
      armed = false;
      distance = 0;
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        pulling = false;
        return;
      }
      pulling = scroller.scrollTop <= 0;
      startY = e.touches[0].clientY;
      distance = 0;
      if (pulling && wrapRef.current) {
        wrapRef.current.style.transition = "none";
      }
    };

    const onMove = (e: TouchEvent) => {
      if (!pulling) return;
      // Se o usuário scrollou no meio do gesto, aborta.
      if (scroller.scrollTop > 0) {
        pulling = false;
        reset(false);
        return;
      }
      const delta = e.touches[0].clientY - startY;
      if (delta <= 0) {
        distance = 0;
        setArmed(false);
        setVisual(0);
        return;
      }
      e.preventDefault();
      distance = Math.min(delta * DAMPING, MAX);
      setArmed(distance >= THRESHOLD);
      setVisual(distance);
    };

    const onEnd = () => {
      if (!pulling) return;
      pulling = false;
      if (distance >= THRESHOLD) {
        setRefreshing(true);
        const wrap = wrapRef.current;
        if (wrap) {
          wrap.style.transition = "transform .2s ease";
          wrap.style.transform = `translate(-50%, ${THRESHOLD}px)`;
          wrap.style.opacity = "1";
        }
        const icon = iconRef.current;
        if (icon && !reduceMotion) {
          icon.style.transform = "";
          icon.classList.add("animate-spin");
        }
        // Mostra o spinner um instante antes de recarregar.
        window.setTimeout(() => window.location.reload(), 150);
      } else {
        reset(true);
      }
    };

    scroller.addEventListener("touchstart", onStart, { passive: true });
    scroller.addEventListener("touchmove", onMove, { passive: false });
    scroller.addEventListener("touchend", onEnd, { passive: true });
    scroller.addEventListener("touchcancel", onEnd, { passive: true });

    return () => {
      scroller.removeEventListener("touchstart", onStart);
      scroller.removeEventListener("touchmove", onMove);
      scroller.removeEventListener("touchend", onEnd);
      scroller.removeEventListener("touchcancel", onEnd);
    };
  }, [standalone, refreshing]);

  if (!standalone) return null;

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="pointer-events-none fixed left-1/2 top-1 z-50 flex h-10 w-10 items-center justify-center"
      style={{ transform: "translate(-50%, 0px)", opacity: 0 }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-background text-foreground shadow-md">
        <Loader2 ref={iconRef} className="h-5 w-5" />
      </div>
    </div>
  );
}
