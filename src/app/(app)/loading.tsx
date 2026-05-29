import { PageSkeleton } from "@/components/app/page-skeleton";

/**
 * Fallback de carregamento para as rotas autenticadas. O App Router exibe
 * isto enquanto o Server Component da rota de destino busca dados, mantendo a
 * sidebar e a nav mobile no lugar (renderiza só na área de conteúdo).
 *
 * O flash de boot da PWA (full page load) é coberto pelo <BootSplash />; este
 * skeleton cobre as transições client-side entre telas.
 */
export default function AppLoading() {
  return <PageSkeleton />;
}
