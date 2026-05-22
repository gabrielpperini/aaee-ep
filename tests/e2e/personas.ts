import path from "node:path";

export type PersonaKey = "admin" | "director" | "user" | "supporter" | "nolink";

export type Persona = {
  key: PersonaKey;
  email: string;
  name: string;
  role: "USER" | "DIRECTOR" | "ADMIN";
};

export const PERSONAS: Persona[] = [
  { key: "admin",     email: "admin@test.local",     name: "Ana Admin",       role: "ADMIN" },
  { key: "director",  email: "director@test.local",  name: "Daniel Diretor",  role: "DIRECTOR" },
  { key: "user",      email: "user@test.local",      name: "Ulisses Usuário", role: "USER" },
  { key: "supporter", email: "supporter@test.local", name: "Sofia Suporte",   role: "USER" },
  { key: "nolink",    email: "nolink@test.local",    name: "(sem person)",    role: "USER" },
];

export function personaByKey(key: PersonaKey): Persona {
  const p = PERSONAS.find((x) => x.key === key);
  if (!p) throw new Error(`Persona desconhecida: ${key}`);
  return p;
}

export function authDir(): string {
  return path.join(__dirname, ".auth");
}

export function storageStatePath(key: PersonaKey): string {
  return path.join(authDir(), `${key}.json`);
}
