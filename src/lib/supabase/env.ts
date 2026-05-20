// Supabase renomeou as chaves: o que antes era ANON_KEY agora é PUBLISHABLE_KEY.
// Aceitamos os dois nomes — o que estiver preenchido vence.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
