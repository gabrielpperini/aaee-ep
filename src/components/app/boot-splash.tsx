"use client";

import { useEffect, useState } from "react";

/**
 * Splash de inicialização que cobre o flash branco entre o splash nativo do
 * sistema (ao abrir a PWA instalada) sumir e a aplicação React montar.
 *
 * Apesar de ser um client component, seu HTML é renderizado no servidor e
 * entra no documento inicial — então pinta no primeiro frame, antes do JS
 * hidratar. Quando o componente monta no cliente (app pronta), inicia o
 * fade-out via atributo `data-hidden` e desmonta após a transição.
 *
 * Os estilos (`#boot-splash`) ficam em globals.css, fora de @layer, pra
 * garantirem prioridade sem depender do bundle de JS.
 */
export function BootSplash() {
  const [visible, setVisible] = useState(true);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Dois rAFs garantem que o navegador pintou o splash antes de disparar a
    // transição de opacidade — sem isso o fade pode ser pulado.
    let raf2 = 0;
    let removeTimer: ReturnType<typeof setTimeout>;

    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setHidden(true);
        removeTimer = setTimeout(() => setVisible(false), 450);
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      id="boot-splash"
      data-hidden={hidden}
      role="status"
      aria-label="Carregando"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- markup crítico pré-hidratação, sem otimização do next/image */}
      <img src="/logo.png" alt="" className="boot-splash__mark" draggable={false} />
      <div className="boot-splash__bar" aria-hidden />
      <span className="sr-only">Carregando Delegação EP…</span>
    </div>
  );
}
