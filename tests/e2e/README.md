# Testes E2E — Playwright

Stack: Playwright 1.60 + Postgres local (Docker) + Next.js dev server + shim de Supabase Auth gated por `E2E_TEST_MODE`.

## Estrutura

```
tests/e2e/
  README.md
  personas.ts          # 5 personas (admin, director, user, supporter, nolink)
  global-setup.ts      # roda migrations + seed + cria storageStates
  fixtures.ts          # `test` estendido com asAdmin/asDirector/asUser/... e reseed()
  smoke/               # P0 — login, sidebar, route guards, signup
  crud/                # P1 — pessoas, modalidades, locais, eventos (listagem)
  event/               # P2 — alocação de torcida, check-in
  views/               # P3 — dashboard, agenda, disponibilidade, mapa
  .auth/               # storageStates por persona (gerados pelo globalSetup, gitignored)
```

## Como tudo se encaixa

**Auth mock**: `src/lib/supabase/e2e-shim.ts` define um cookie `e2e-auth` (JSON base64url
com `{id, email}`). Quando `E2E_TEST_MODE=true`:
- `createSupabaseServerClient` retorna um objeto que lê esse cookie em `getUser()`
- `createSupabaseBrowserClient` retorna um shim cujos `signInWithPassword`/`signUp`
  vão pra `/api/e2e/login` e `/api/e2e/signup`
- middleware lê o cookie diretamente, sem chamar Supabase
- O resto do app (incluindo `getCurrentUser` no `lib/auth.ts`) funciona sem saber
  que está em modo teste.

**Tempo congelado**: `src/lib/time.ts` expõe `nowDate()`. Em modo E2E, lê
`E2E_FROZEN_TIME` (default `2026-05-22T15:00:00Z`, meio do `day1` do seed).
Refatorados: `format.ts:deriveEventStatus`, `dashboard/page.tsx`,
`(app)/page.tsx`, `eventos/[id]/actions.ts:checkIn`.

**Banco**: docker-compose dedicado na porta 5433. Migrations aplicadas pelo
`globalSetup` via `prisma migrate deploy`. Cada teste que muta dados chama
`reseed()` (helper do fixture, hit em `/api/e2e/reseed`) no `beforeEach`.

**Seed**: `src/lib/e2e-seed.ts` exporta `runSeed()` (chamado pelo globalSetup,
pelo endpoint `/api/e2e/reseed` e disponível via CLI `pnpm tsx`).

## Pré-requisitos (uma vez)

1. **Docker**: instale Docker Desktop ou equivalente.
2. **Browsers do Playwright**: já instalados via `pnpm exec playwright install chromium`.

## Loop de desenvolvimento

```bash
# 1. Subir Postgres de teste (mantém rodando)
pnpm test:db:up

# 2. Rodar todos os testes E2E
pnpm test:e2e

# Variantes:
pnpm test:e2e:ui       # modo interativo do Playwright
pnpm test:e2e:headed   # browser visível

# Quando terminar
pnpm test:db:down
```

> O `test:e2e` automaticamente:
> - sobe `next dev` na porta 3001 com `.env.test`
> - roda migrations (`prisma migrate deploy`)
> - executa o seed
> - cria storageStates pra cada persona
> - reusa o servidor entre runs locais (em CI sempre boot novo)

## Adicionando um teste

```ts
import { test, expect } from "../fixtures";

test.beforeEach(async ({ reseed }) => {
  await reseed(); // estado limpo
});

test("...", async ({ asDirector }) => {
  await asDirector.goto("/eventos");
  // ...
});
```

Personas disponíveis no fixture:
- `asAdmin` — Ana Admin (ADMIN, com Person)
- `asDirector` — Daniel Diretor (DIRECTOR, com Person)
- `asUser` — Ulisses Usuário (USER, atleta em Vôlei/Atletismo)
- `asSupporter` — Sofia Suporte (USER, escalada em happeningNow)
- `asNolink` — User sem Person vinculada
- `guest` — sem auth

## Limitações conhecidas

- **OTP, magic link, reset de senha**: não são testáveis sem Supabase real (precisariam
  de interceptação de email). Os fluxos relevantes do shim retornam erro/no-op.
- **Combobox/DateTimePicker/Select do base-ui**: complexos pra automatizar via UI;
  pulamos o form completo de criação de evento. Eventos vêm do seed.
- **Workers**: testes rodam sequenciais (`workers: 1`) porque o `reseed()`
  é global. Pra paralelizar seria necessário schema-per-worker.
