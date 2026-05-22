/**
 * Gera URL do Google Maps a partir de um endereço em texto livre.
 * Mantém compatibilidade com o app nativo do iOS/Android: o protocolo
 * https://www.google.com/maps abre o app instalado, caindo no web caso contrário.
 */
export function mapsUrlForAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  const trimmed = address.trim();
  if (!trimmed) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;
}
