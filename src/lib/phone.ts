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
