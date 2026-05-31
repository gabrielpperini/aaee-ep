# Roadmap — App de Gestão da Delegação e Torcida (EP)

Documento de planejamento das fases de entrega. O documento de requisitos completo está em [requisitos-app-delegacao-ep.md](./requisitos-app-delegacao-ep.md).

---

## Stack escolhida

- **Next.js 16** (App Router, Turbopack, Server Actions com `useActionState`)
- **React 19** + **TypeScript**
- **Supabase** (Postgres + Auth com email/senha + OTP + Storage)
- **Prisma 7** com `@prisma/adapter-pg` (adapter PG nativo, sem engine binário)
- **Tailwind CSS v4** + **shadcn/ui** style `base-nova` (sobre `@base-ui/react`)
- **React Hook Form** + **Zod** com schemas centralizados em `src/lib/validations/`
- **TanStack Query** para cache no cliente e, na fase 3, sincronização offline
- **Dexie.js** + **Service Worker** (fase 3) para IndexedDB e PWA
- Deploy na **Vercel**

---

## Fase atual: MVP 1 — Base do sistema

**Objetivo:** Ter o sistema rodando com cadastros estruturais, login e permissões funcionando. Sem operação de torcida ainda — só a fundação.

### Entregas

- [x] Estrutura do projeto Next.js + Supabase + Prisma
- [x] Autenticação via Supabase Auth (OTP por email)
- [x] Modelo de permissões: `USER`, `DIRECTOR`, `ADMIN`
- [x] CRUD de Pessoas (atletas, torcida, apoio, diretores)
- [x] CRUD de Modalidades
- [x] CRUD de Locais
- [x] CRUD de Eventos (jogos, lutas, provas, atividades)
- [x] Visualização da agenda dos 3 dias (lista + filtro por dia)
- [x] Layout do app com sidebar e gating por role
- [x] README com instruções de setup
- [x] Deploy em produção (Vercel)

### Refinamentos pós-checklist (também entregues)

- [x] **Auto-linking User ↔ Person no primeiro login** por email (case-insensitive); se houver múltiplos candidatos, log de warning e o admin resolve manualmente.
- [x] **Gestão de usuários em `/admin/usuarios`** (só ADMIN): troca de role, link/unlink com Person, proteção contra auto-rebaixamento.
- [x] **Tela `/perfil`** ("Meu perfil"): usuário comum vê email/role e edita seus dados (nome, apelido, email, telefone, modalidades). Cria Person automaticamente se ainda não existir, sem permitir auto-promoção de role/flags.

### Entidades cobertas

`User`, `Person`, `Modality`, `Event`, `Location`. As demais (`AvailabilitySlot`, `Assignment`, `CheckIn`, `Material`, `SyncOperation`) ficam para as próximas fases.

---

## MVP 2 — Operação da torcida

**Objetivo:** Habilitar o uso real durante o evento: cada pessoa informa disponibilidade, diretores alocam torcida, check-ins acontecem.

### Cadastro e onboarding

- [x] Auth com **email + senha** (Supabase) como método principal
- [x] **OTP por email** como alternativa ("Entrar com código no email")
- [x] Fluxo "Esqueci a senha" via email de redefinição (`/auth/reset`)
- [x] Tela de **cadastro** (`/signup`) coletando upfront: nome, apelido, telefone (máscara `(51) 99999-9999`), curso, semestre, email + senha
- [x] Cria `auth.users` no Supabase + `User` + `Person` (com `isSupporter=true`) numa transação, com auto-link por email
- [x] Validações no cadastro: senha 8+ com letra e número, telefone brasileiro, email único
- [x] Schema: `Person.course` (enum `Course`) e `Person.semester` (Int?, 1–10) — migration aplicada
- [x] Tela `/perfil` ganha campos curso/semestre (read+edit)
- [x] `/admin/usuarios` mostra curso/semestre na listagem

### Operação da torcida (núcleo do MVP 2)

- [x] Tela **"Meu horário"** (`/disponibilidade`) read-only com slots de 30min em 3 dias mostrando: competindo / escalado(a) / livre
- [x] Tela de detalhe do evento (`/eventos/[id]`) acessível pela agenda e por diretores
- [x] Painel de alocação para diretores no detalhe do evento
  - Todas as pessoas elegíveis (disponível-por-padrão), com toggle "Só livres" vs. "Todos"
  - Alerta de conflito: competindo em outro evento que sobrepõe / já alocada em outro evento
  - Função: torcedor / capitão / responsável material / apoio
- [x] Marcação de capitão por alocação (`Assignment.isCaptain`)
- [x] Prioridade por evento (já existia; usada como filtro no dashboard)
- [x] Avanço/cancelamento de eventos condicionais (botões no detalhe do evento)
- [x] **Check-in** ("Estou aqui") no detalhe do evento, com histórico
- [x] **Dashboard da diretoria** (`/dashboard`)
  - Eventos acontecendo agora
  - Próximos eventos (janela de 3h)
  - Pessoas livres × ocupadas agora
  - Eventos prioritários com torcida abaixo do desejado

### Entidades adicionadas no MVP 2

`Assignment`, `CheckIn` — migradas. `AvailabilitySlot` foi descartado: disponibilidade virou implícita.

### Regras-chave do MVP 2

- **Toda pessoa é disponível por padrão.** Indisponibilidade é implícita: ou está competindo, ou já foi alocada em outro evento que sobrepõe no horário
- Uma pessoa não pode estar alocada em dois eventos no mesmo horário (alerta no painel de alocação)
- Atleta competindo aparece como indisponível para torcida no mesmo horário
- Senha é gerenciada pelo Supabase Auth (nunca chega ao nosso banco)

---

## MVP 3 — Offline-first e notificações push

**Objetivo:** Tornar o app utilizável durante o evento mesmo com internet ruim, e avisar a pessoa quando algo relevante muda (próximo evento, mudança de alocação, capitão chamando torcida).

> **Status (2026-05-31):** MVP 3 **concluído e validado**. Os três blocos do
> [plano de execução](./mvp-3-plano.md) (A/B/C) estão implementados e cabeados em produção,
> a suíte E2E passa (89/89) e a validação de campo (device real + build de produção) foi
> concluída — ver [relatório de validação](./mvp-3-validacao.md).

### Entregas

- [x] PWA: manifest + service worker (`src/app/manifest.ts`, `public/sw.js`) — Bloco A
- [x] IndexedDB com Dexie para cache local (`src/lib/db/dexie.ts`) — Bloco C1
  - Agenda completa dos 3 dias (`events`)
  - Alocações da própria pessoa (`assignments`)
  - Check-ins (`checkIns`) — _disponibilidade virou read-only/implícita no MVP 2,_
    _não há tabela própria; ver `AvailabilitySlot` descartado_
- [x] Fila de `SyncOperation` para alterações offline (`src/lib/db/sync-queue.ts`) — Bloco C2
  - Check-in: enfileirado via `enqueueOrRun` com efeito otimista
  - _Disponibilidade: N/A — read-only desde o MVP 2, nada a enfileirar_
  - _Alocação: caminho de fila pronto (conflito → `conflict`) mas ainda não cabeado_
    _na UI de alocação; só diretores escalam, sempre online_
- [x] Sincronização ao voltar online (`processQueue` + `<SyncProcessor />`) — Bloco C3
  - Listener `online` + Background Sync API (tag `sync-queue`) com fallback
- [x] Resolução de conflitos — Bloco C3
  - Dados pessoais: última alteração da própria pessoa vence
  - Alocações conflitantes: detecção por heurística de erro → `conflict` + log no servidor
    (`SyncOperation`); _não exercitado na prática pois a fila só cobre check-in idempotente_
  - Check-ins: idempotentes (upsert), mantidos como histórico
- [x] Indicador de "alterações pendentes" na UI (`<PendingSyncBadge />`) — Bloco C4
- [x] Banner "Você está offline" + aviso em telas não-offline + "Forçar sync" +
  "Limpar cache local" + log de 50 eventos de sync — Bloco C4
- [x] **Notificações push em todos os dispositivos possíveis (Web Push API + VAPID)** — Bloco B completo
  - **Cobertura por plataforma:**
    - Android: Chrome/Firefox/Edge/Samsung Internet — direto pelo navegador
    - Desktop: Chrome/Firefox/Edge/Opera (Win/Mac/Linux) + Safari 16+ (macOS) — direto pelo navegador
    - iOS/iPadOS 16.4+: **só funciona com o app instalado como PWA** (Add to Home Screen). Browser tab não recebe push no iOS — limitação da Apple.
  - **Fluxo de instalação (sempre pós-login):**
    - Modal `<InstallPrompt />` aparece **sempre depois do login**, independente de plataforma, instruindo a instalar como PWA
    - Instruções condicionais por SO/navegador:
      - Android Chrome/Edge: usa o evento `beforeinstallprompt` pra mostrar botão nativo "Instalar"
      - iOS Safari: instruções visuais "Compartilhar → Adicionar à Tela de Início" (não há API nativa)
      - Desktop Chrome/Edge: ícone de instalação na omnibox + botão no modal
      - Demais navegadores: instruções genéricas
    - Detecta se já está rodando standalone (`display-mode: standalone` ou `navigator.standalone`) e **não mostra o modal** nesse caso
    - "Não mostrar de novo" guardado em `localStorage`; admin pode forçar reaparecer se quiser
    - Só pede permissão de push **depois** que o app está instalado (no iOS é obrigatório; nos outros é boa prática pra garantir que a permissão persiste)
  - **Subscription:**
    - Endpoint pra registrar/atualizar `PushSubscription` por usuário+dispositivo (uma pessoa pode ter N dispositivos)
    - Limpeza automática de subscriptions com erro 410 Gone
  - **Permissão pedida no onboarding pós-login** com explicação curta do que será enviado; reaproveitar prompt em `/perfil` se foi recusada
  - **Disparos automáticos:**
    - Próximo evento da pessoa (T-30min, configurável)
    - Mudança de alocação que envolve a pessoa (escalado/removido/promovido a capitão)
    - Capitão envia push pra torcida do evento ("Chamado da torcida")
  - **Preferências por usuário em `/perfil`:** liga/desliga categorias; vê dispositivos registrados e remove individualmente
  - **Fallback gracioso:** se push falhar (sem permissão, subscription inválida, navegador sem suporte), nada quebra — a feature complementa, não substitui a UI in-app

### Entidades adicionadas

`SyncOperation`, `PushSubscription`, `NotificationPreference`.

---

## Estilo e identidade visual (transversal)

**Objetivo:** Aplicar a identidade visual da AAEE Engenharia UFRGS em todo o app, com suporte a tema claro/escuro.

### Paleta (extraída do logo)

| Token | Valor                          | Uso                                   |
|-------|--------------------------------|---------------------------------------|
| Navy  | `#0F1F33` / `oklch(0.20 0.04 245)` | Background dark, foreground light       |
| Teal  | `#4A8FA6` / `oklch(0.62 0.08 220)` | Primary actions, highlights, ring     |
| Cream | `#EDE5D0` / `oklch(0.93 0.02 85)`  | Foreground dark, surfaces sutis light |

### Entregas

- [x] shadcn/ui (Base UI) instalado e configurado
- [x] Toggle de tema claro/escuro (next-themes)
- [x] Paleta customizada em `globals.css` com tokens navy/teal/cream
- [x] Logo da AAEE na sidebar (compacto) e na tela de login (grande)
- [x] `public/logo.png` adicionado
- [x] Favicon usando o brasão (`src/app/icon.png` + `apple-icon.png` via Next file convention)
- [x] Open Graph + Twitter image dinâmicos (`next/og` em `opengraph-image.tsx`), 1200×630 com brasão, paleta navy/cyan/cream e tipografia da marca
- [x] `metadataBase` + Open Graph metadata no layout (título, descrição, twitter card, apple-web-app)
- [x] `themeColor` por scheme (light cream / dark navy) via `viewport`
- [x] **Web App Manifest** (`src/app/manifest.ts`): nome, cores, ícones, `display: standalone`, `lang: pt-BR`. Splash do Add-to-Home-Screen é gerado pelo sistema a partir disso — sem precisar de service worker, que fica pro MVP 3

---

## Pós-MVP — Possíveis evoluções

- Importação de tabela oficial do EP (CSV/Excel)
- CRUD de Materiais (individuais, com código único, status, histórico de movimentação) — descopado do MVP 3
- Geração de QR code por evento para check-in escaneado
- Histórico/relatório pós-evento (presença)
- Chat por evento ou por capitão
- Integração com calendário externo (iCal)
- Multi-edição (curso/atlética), se o app for adotado por outras delegações

---

## Princípios de produto

1. **A pessoa comum precisa de pouquíssimos cliques.** Marcar disponibilidade e fazer check-in têm que ser óbvios.
2. **Diretor precisa de visão geral em uma tela.** Dashboard é prioridade na fase 2.
3. **Offline não pode quebrar o app.** Toda escrita relevante deve aceitar enfileiramento local.
4. **Slots de 30min são a unidade temporal canônica.** Toda lógica de cruzamento (disponibilidade × eventos × alocações) opera sobre eles.
5. **Eventos podem ser condicionais.** A tabela muda durante o EP; o app tem que aceitar isso sem retrabalho.
