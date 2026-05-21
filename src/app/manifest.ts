import type { MetadataRoute } from "next";

const NAVY = "#0F1F33";

/**
 * Web manifest da PWA.
 *
 * O splash screen que aparece quando o app é aberto a partir da tela inicial
 * (Android/iOS recentes) é renderizado pelo sistema a partir destes campos:
 *   - `background_color` → fundo do splash
 *   - `theme_color`       → cor da barra de status / chrome
 *   - o maior ícone disponível no array `icons`
 *
 * Sem service worker ainda — isso entra no MVP 3. Mas com o manifest no lugar,
 * a "instalação" via Add to Home Screen já funciona com identidade visual.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Delegação EP — Engenharia UFRGS",
    short_name: "Delegação EP",
    description:
      "Gestão da delegação e torcida da Engenharia UFRGS no Engenheiradas (EP).",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: NAVY,
    theme_color: NAVY,
    lang: "pt-BR",
    icons: [
      {
        src: "/icon.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "any",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["sports", "productivity"],
  };
}
