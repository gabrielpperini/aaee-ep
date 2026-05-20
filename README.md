# App de Gestão da Delegação e Torcida — EP

Aplicativo para organização da delegação da **Engenharia UFRGS** durante o **EP — Engenhariadas Paranaense**: disponibilidade, alocação de torcida, check-ins, capitães, materiais e operação offline-first.

- Requisitos completos: [`requisitos-app-delegacao-ep.md`](./requisitos-app-delegacao-ep.md)
- Roadmap por fases: [`ROADMAP.md`](./ROADMAP.md)

## Status atual

**MVP 1 — Base do sistema** ✅

- Login por email (OTP) via Supabase Auth
- Permissões `USER` / `DIRECTOR` / `ADMIN`
- CRUD de Pessoas, Modalidades, Locais e Eventos
- Visualização da agenda dos 3 dias (com filtro por dia)
- Dashboard inicial com contagens e próximos eventos

**MVP 2** (operação da torcida) e **MVP 3** (offline + materiais) — ainda não implementados. Veja o [roadmap](./ROADMAP.md).

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Supabase** (Postgres + Auth)
- **Prisma 7** com adapter PG (`@prisma/adapter-pg`)
- **Tailwind CSS v4** + **shadcn/ui** (Base UI)
- **Zod** + **React Hook Form** para formulários
- **TanStack Query** (preparado para fases offline)

## Setup

### 1. Pré-requisitos

- Node.js 20+ (usado: 24.x)
- pnpm 10+
- Conta no [Supabase](https://supabase.com)

### 2. Criar projeto no Supabase

1. Crie um novo projeto em https://supabase.com/dashboard
2. Em **Project Settings → API**, copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
3. Em **Project Settings → Database → Connect**, copie:
   - Connection string do **Pooler / Transaction** (porta 6543) → `DATABASE_URL`
   - Connection string **Session** (porta 5432) → `DIRECT_URL`

### 3. Variáveis de ambiente

```bash
cp .env.example .env
# preencha o .env com os valores do Supabase
```

### 4. Instalar dependências e migrar o banco

```bash
pnpm install
pnpm prisma migrate dev --name init
pnpm prisma generate
```

### 5. Rodar localmente

```bash
pnpm dev
```

Abra http://localhost:3000 — você será redirecionado para `/login`. Use seu email para receber um código de acesso.

### 6. Promover-se a admin

Como o sistema cria usuários com `role = USER` por padrão, você precisa promover manualmente o primeiro admin. No SQL Editor do Supabase, depois de fazer login uma vez:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'seu@email.com';
```

Depois recarregue o app — o menu lateral passará a mostrar Pessoas, Modalidades, Locais e Eventos.

> Dica: a partir desta versão, se você cadastrar a **Pessoa** com o email correto **antes** dela logar pela primeira vez, o vínculo `User ↔ Person` é feito automaticamente no primeiro login (match por email, case-insensitive). Útil para já deixar diretores/atletas pré-cadastrados.

## Estrutura

```
src/
├─ app/
│  ├─ (app)/             # área autenticada (layout com sidebar)
│  │  ├─ page.tsx        # dashboard inicial
│  │  ├─ agenda/         # visualização pública dos 3 dias
│  │  ├─ eventos/        # CRUD de eventos (diretor+)
│  │  ├─ pessoas/        # CRUD de pessoas (diretor+)
│  │  ├─ modalidades/    # CRUD de modalidades (diretor+)
│  │  └─ locais/         # CRUD de locais (diretor+)
│  ├─ login/             # OTP por email
│  └─ auth/actions.ts    # signOut
├─ components/
│  ├─ ui/                # shadcn/ui (Base UI)
│  └─ app/               # componentes do app (sidebar, headers)
├─ lib/
│  ├─ supabase/          # clients server / browser / proxy
│  ├─ auth.ts            # getCurrentUser, requireUser, requireRole
│  ├─ prisma.ts          # cliente Prisma compartilhado
│  └─ format.ts          # rótulos, badges, helpers de data
├─ generated/prisma/     # cliente Prisma gerado (gitignored)
└─ proxy.ts              # refresh de sessão Supabase + gating de rotas
```

## Comandos úteis

```bash
pnpm dev                      # dev server
pnpm build                    # build de produção
pnpm prisma studio            # GUI do banco
pnpm prisma migrate dev       # criar nova migration
pnpm prisma generate          # regenerar client
pnpm tsc --noEmit             # type check
```

## Deploy (Vercel)

1. Importe o repo na Vercel.
2. Configure as variáveis de ambiente (mesmas do `.env`).
3. O build roda `next build`; o Prisma será gerado pelo `postinstall` (adicione o script se quiser):
   ```json
   "scripts": { "postinstall": "prisma generate" }
   ```
4. Para o pooler funcionar com serverless, `DATABASE_URL` precisa usar o **Transaction pooler** (porta 6543, `pgbouncer=true`).
