# App de Gestão da Delegação e Torcida — EP

Aplicativo para organização da delegação da **Engenharia UFRGS** durante o **EP — Engenhariadas Paranaense**: disponibilidade, alocação de torcida, check-ins, capitães, materiais e operação offline-first.

- Requisitos completos: [`.specs/requisitos-app-delegacao-ep.md`](./.specs/requisitos-app-delegacao-ep.md)
- Roadmap por fases: [`.specs/ROADMAP.md`](./.specs/ROADMAP.md)

## Status atual

**MVP 1 — Base do sistema** ✅ · **MVP 2 — Operação da torcida** ✅

- Login por **email + senha** (Supabase Auth) + OTP por email como alternativa
- Cadastro completo em `/signup` (nome, apelido, telefone BR, curso, semestre, email, senha)
- Fluxo "Esqueci a senha" via email de redefinição (`/auth/reset`)
- Permissões `USER` / `DIRECTOR` / `ADMIN` (auto-link User↔Person por email)
- CRUD de Pessoas, Modalidades, Locais e Eventos com forms padronizados (RHF + Zod + shadcn)
- MultiSelect com badges removíveis para modalidades/atletas, Combobox searchable para selects grandes
- Detalhe do evento (`/eventos/[id]`): alocação de torcida, check-in, transições de status
- Dashboard da diretoria (`/dashboard`): eventos agora, próximos, livres × ocupados, prioritários sem torcida
- Tela "Meu horário" (`/disponibilidade`) com slots de 30min mostrando competindo / escalado(a) / livre
- Agenda dos 3 dias com link pro detalhe do evento
- PWA-ready: manifest, OG/Twitter dinâmicos via `next/og`, ícones via file convention

**MVP 3** (offline-first + materiais) — em planejamento. Veja o [roadmap](./.specs/ROADMAP.md).

## Stack

- **Next.js 16** (App Router, Turbopack, Server Actions com `useActionState`)
- **React 19**
- **TypeScript**
- **Supabase** (Postgres + Auth com email/senha + OTP)
- **Prisma 7** com adapter PG (`@prisma/adapter-pg`)
- **Tailwind CSS v4** + **shadcn/ui** style `base-nova` (sobre `@base-ui/react`)
- **React Hook Form** + **Zod** com `@hookform/resolvers` — schemas centralizados em `src/lib/validations/`
- **react-day-picker**, **cmdk**, **@radix-ui/react-slot** (componentes compostos)
- **date-fns** com locale `pt-BR`
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
pnpm install            # roda `prisma generate` no postinstall
pnpm prisma migrate dev # aplica todas as migrations pendentes
```

### 5. Rodar localmente

```bash
pnpm dev
```

Abra http://localhost:3000 — você será redirecionado para `/login`.

### Métodos de autenticação

- **Email + senha** (padrão): cadastre-se em `/signup`, depois entre em `/login`.
- **Código no email (OTP)**: clique em "Entrar com código no email" ou "Esqueci a senha" no login. Útil como fallback / reset.

### Configuração obrigatória no Supabase (uma vez)

Antes de testar em produção:

1. **URL Configuration** (`Auth → URL Configuration`):
   - **Site URL**: `https://ep.aaee.com.br` (ou seu domínio)
   - **Redirect URLs**: adicione `https://ep.aaee.com.br/**` e `http://localhost:3000/**`
2. **Email template do Magic Link** (`Auth → Templates → Magic Link`): inclua `{{ .Token }}` no HTML para que o código de 6 dígitos apareça no email (e não só o link). Exemplo:
   ```html
   <p>Seu código: <strong>{{ .Token }}</strong></p>
   <p>Ou clique: <a href="{{ .ConfirmationURL }}">entrar diretamente</a></p>
   ```
3. **Email confirmation** (`Auth → Providers → Email`): se você desabilitar "Confirm email", o signup loga o usuário imediatamente. Se mantiver habilitado, o usuário precisa clicar no link de confirmação antes de logar.

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
│  ├─ (app)/                # área autenticada (layout com sidebar)
│  │  ├─ page.tsx           # home com "Em destaque" + stats
│  │  ├─ agenda/            # visualização dos 3 dias (linka pro detalhe)
│  │  ├─ dashboard/         # painel da diretoria (DIRECTOR+)
│  │  ├─ disponibilidade/   # "Meu horário" (slots de 30min)
│  │  ├─ eventos/           # CRUD de eventos (diretor+)
│  │  │  └─ [id]/           # detalhe: alocação, check-in, status
│  │  ├─ pessoas/           # CRUD de pessoas (diretor+)
│  │  ├─ modalidades/       # CRUD de modalidades (diretor+)
│  │  ├─ locais/            # CRUD de locais (diretor+)
│  │  ├─ perfil/            # "Meu perfil"
│  │  └─ admin/usuarios/    # gestão de usuários (admin)
│  ├─ login/                # senha + OTP fallback + esqueci-senha
│  ├─ signup/               # cadastro completo (RHF + setupNewAccount)
│  ├─ auth/reset/           # criar nova senha após email de redefinição
│  ├─ manifest.ts           # Web App Manifest (PWA Add-to-Home)
│  ├─ opengraph-image.tsx   # OG 1200×630 dinâmico via next/og
│  ├─ twitter-image.tsx     # Twitter card (re-exporta OG)
│  ├─ icon.png              # favicon (file convention do Next)
│  └─ apple-icon.png        # touch icon iOS
├─ components/
│  ├─ ui/                   # shadcn + compostos (form, multi-select, combobox,
│  │                        # datetime-picker, calendar, command, popover,
│  │                        # checkbox, radio-group, switch, ...)
│  ├─ app/                  # sidebar, page-header, nav-items, ...
│  └─ phone-input.tsx       # Input com máscara BR (51) 99999-9999
├─ lib/
│  ├─ supabase/             # clients server / browser / proxy
│  ├─ validations/          # schemas Zod centralizados:
│  │  ├─ _primitives.ts     #   email, phoneBR, password, enums, ...
│  │  ├─ _action-result.ts  #   FormState + helpers (zod→fieldErrors)
│  │  ├─ use-form-action.ts #   hook que cola RHF + useActionState
│  │  ├─ auth.ts            #   login/signup/reset
│  │  ├─ {event,person,location,modality,profile,user}.ts
│  ├─ auth.ts               # getCurrentUser, requireUser, requireRole
│  ├─ prisma.ts             # cliente Prisma compartilhado
│  ├─ format.ts             # rótulos (PT-BR), badges, deriveEventStatus
│  ├─ phone.ts              # máscara/normalização BR
│  ├─ password.ts           # validatePassword
│  └─ slots.ts              # 30min slot helpers (generate, cover, label)
├─ generated/prisma/        # cliente Prisma gerado (gitignored)
└─ proxy.ts                 # middleware Supabase + gating de rotas
```

## Comandos úteis

```bash
pnpm dev                      # dev server (turbopack)
pnpm build                    # build de produção
pnpm lint                     # eslint
pnpm tsc --noEmit             # type check
pnpm prisma studio            # GUI do banco
pnpm prisma migrate dev       # criar/aplicar migration em dev
pnpm prisma migrate deploy    # aplicar migrations em prod
pnpm prisma generate          # regenerar client
```

## Deploy (Vercel)

1. Importe o repo na Vercel.
2. Configure as variáveis de ambiente (mesmas do `.env`).
3. O build roda `next build`; o Prisma será gerado pelo `postinstall` (adicione o script se quiser):
   ```json
   "scripts": { "postinstall": "prisma generate" }
   ```
4. Para o pooler funcionar com serverless, `DATABASE_URL` precisa usar o **Transaction pooler** (porta 6543, `pgbouncer=true`).
