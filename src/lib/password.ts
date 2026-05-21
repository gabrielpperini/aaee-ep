/** Regras MVP 2: mínimo 8 caracteres, com ao menos 1 letra E 1 número. */
export function validatePassword(password: string): { ok: true } | { ok: false; reason: string } {
  if (password.length < 8) {
    return { ok: false, reason: "Senha precisa ter pelo menos 8 caracteres." };
  }
  if (!/[A-Za-z]/.test(password)) {
    return { ok: false, reason: "Senha precisa conter pelo menos 1 letra." };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, reason: "Senha precisa conter pelo menos 1 número." };
  }
  return { ok: true };
}
