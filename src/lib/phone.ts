/**
 * Formata uma string de dígitos como telefone brasileiro:
 * `(51) 99999-9999` (celular) ou `(51) 9999-9999` (fixo).
 * Aceita parcial — usado também enquanto o usuário digita.
 */
export function formatBrPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** True se o telefone (digitado ou puro) tem 10 ou 11 dígitos. */
export function isValidBrPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11;
}

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Normaliza um telefone BR (10/11 dígitos) para o formato com DDI usado pela
 * WhatsApp Cloud API e por links `wa.me` — ex: `5551999999999`.
 * Retorna `null` se não tiver 10 ou 11 dígitos.
 */
export function toWhatsAppNumber(
  phone: string | null | undefined,
): string | null {
  const digits = phoneDigits(phone ?? "");
  if (digits.length !== 10 && digits.length !== 11) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
}

/**
 * Monta uma URL `wa.me` a partir de um telefone BR.
 * Retorna `null` se o telefone não tem 10 ou 11 dígitos.
 */
export function whatsappUrl(
  phone: string | null | undefined,
  message?: string,
): string | null {
  const withCountry = toWhatsAppNumber(phone);
  if (!withCountry) return null;
  const base = `https://wa.me/${withCountry}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
