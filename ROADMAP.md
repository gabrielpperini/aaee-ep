# Roadmap — App de Gestão da Delegação e Torcida (EP)

Documento de planejamento das fases de entrega. O documento de requisitos completo está em [requisitos-app-delegacao-ep.md](./requisitos-app-delegacao-ep.md).

---

## Stack escolhida

- **Next.js 15** (App Router) + **TypeScript**
- **Supabase** (Postgres + Auth + Storage)
- **Prisma** como ORM, conectado ao Postgres do Supabase
- **Tailwind CSS** + **shadcn/ui** para UI
- **Zod** + **React Hook Form** para validação de formulários
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

## MVP 3 — Offline-first e materiais

**Objetivo:** Tornar o app utilizável durante o evento mesmo com internet ruim, e controlar os materiais individuais.

### Entregas

- [ ] CRUD de Materiais (individuais, com código único)
  - Status: disponível, em uso, com responsável, em transporte, guardado, perdido, danificado
  - Vinculação a evento + responsável atual
  - Histórico de movimentação
  - Validação: um material não pode estar em dois lugares ao mesmo tempo
- [ ] PWA: manifest + service worker
- [ ] IndexedDB com Dexie para cache local de:
  - Agenda completa dos 3 dias
  - Disponibilidade da própria pessoa
  - Alocações da própria pessoa
  - Materiais sob responsabilidade da pessoa
- [ ] Fila de `SyncOperation` para alterações offline
  - Disponibilidade, check-in, movimentação de material, alocação
- [ ] Sincronização ao voltar online
- [ ] Resolução de conflitos
  - Dados pessoais: última alteração da própria pessoa vence
  - Alocações conflitantes: alerta para diretores
  - Materiais duplicados em locais diferentes: alerta
  - Check-ins: mantidos como histórico, sem sobrescrever
- [ ] Indicador de "alterações pendentes" na UI

### Entidades adicionadas

`Material`, `SyncOperation`.

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
- Notificações push para próximo evento / mudança de alocação
- Geração de QR code por evento para check-in escaneado
- Histórico/relatório pós-evento (presença, materiais)
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
