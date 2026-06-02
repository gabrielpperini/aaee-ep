/**
 * Fuso canônico da plataforma. Todo evento acontece em São Paulo e todo usuário
 * deve ver o horário de São Paulo, independente do fuso do dispositivo ou do
 * servidor (que em produção roda em UTC). Datas são SEMPRE armazenadas como
 * instante UTC no banco e convertidas pra cá só na borda de gravação/exibição —
 * nunca via `new Date(stringSemTimezone)`, que depende do fuso do runtime.
 */
export const APP_TIME_ZONE = "America/Sao_Paulo";

/**
 * Fonte única de "agora" no server-side.
 *
 * Em produção retorna `new Date()`. Em testes E2E, se `E2E_FROZEN_TIME` estiver
 * setado (ISO 8601), retorna esse instante fixo — torna o status derivado de
 * eventos, dashboard, agenda e check-in determinísticos sem precisar congelar
 * o relógio do browser via Playwright (que não atinge o servidor).
 *
 * Lê o env a cada chamada de propósito: o seed pode alterar a variável entre
 * suítes sem precisar reiniciar o processo Next.
 */
export function nowDate(): Date {
  const frozen = process.env.E2E_FROZEN_TIME;
  if (frozen) {
    const d = new Date(frozen);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}
