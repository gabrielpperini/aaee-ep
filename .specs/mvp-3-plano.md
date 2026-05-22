# MVP 3 — Plano de execução

Quebra do [MVP 3 do roadmap](./ROADMAP.md#mvp-3--offline-first-e-notificações-push) em tarefas sequenciais. Cada tarefa é um entregável fechado: vira um PR, é testável, mergeia sem bloquear o resto.

## Visão geral

Três blocos:

- **A. Fundação PWA** — base obrigatória pra B e C
- **B. Notificações push** — independente do C, pode rodar em paralelo depois do A
- **C. Offline-first** — independente do B, pode rodar em paralelo depois do A

Ordem recomendada: A → B → C (push tem mais valor imediato pra torcida; offline cobre os cenários de internet ruim no EP).

---

## A. Fundação PWA

### A1. Service worker base + detecção de standalone

**Objetivo:** SW registrado em produção; primitivos pra saber se o app está instalado.

**Entregas:**
- SW mínimo em `public/sw.js` (ou via build) registrado no client autenticado
- Cache estratégico básico: assets estáticos com `cache-first`, navegação com `network-first` + fallback pra última página
- Hook `useStandaloneMode()` em `src/lib/hooks/use-standalone-mode.ts` baseado em `matchMedia("(display-mode: standalone)")` e `navigator.standalone` (iOS)
- Página `/offline` mínima

**DoD:**
- DevTools → Application → Service Workers mostra SW ativo
- Reload com rede desligada mostra última página ou `/offline`
- Lighthouse PWA score ≥ 80

### A2. Modal de instalação pós-login

**Objetivo:** Toda pessoa que loga e ainda não tem o app instalado vê um prompt pra instalar.

**Entregas:**
- Componente `<InstallPrompt />` em `src/components/app/install-prompt.tsx`, montado no layout autenticado
- Suprimido se `useStandaloneMode()` é true
- Captura `beforeinstallprompt` (Android Chrome/Edge, Desktop Chrome/Edge) e expõe botão "Instalar"
- Detecta plataforma e renderiza instruções condicionais:
  - iOS Safari → passo a passo "Compartilhar → Adicionar à Tela de Início" com ícones
  - macOS Safari → "Arquivo → Adicionar ao Dock"
  - Demais → instruções genéricas
- "Não mostrar de novo" persistido em `localStorage` (chave `install-prompt-dismissed-v1`)
- Link em `/perfil` "Instalar app" pra reabrir o modal

**DoD:**
- Testado manualmente em: Android Chrome, iOS Safari, Desktop Chrome, Desktop Safari
- Modal não aparece quando o app já está rodando standalone

---

## B. Notificações push

### B1. VAPID + modelo PushSubscription

**Objetivo:** Backend pronto pra receber e armazenar subscriptions; SW pronto pra exibir notificações.

**Entregas:**
- Gerar par VAPID, guardar como env vars (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`)
- Adicionar dep `web-push`
- Migration Prisma:
  ```
  model PushSubscription {
    id          String   @id @default(cuid())
    userId      String
    endpoint    String   @unique
    p256dh      String
    auth        String
    userAgent   String?
    createdAt   DateTime @default(now())
    lastSeenAt  DateTime @default(now())
    user        User     @relation(...)
    @@index([userId])
  }
  ```
- Server actions: `subscribePush({ subscription })`, `unsubscribePush({ endpoint })`
- Handler `push` no SW exibindo notificação com payload JSON `{ title, body, url?, tag? }`
- Handler `notificationclick` no SW que abre a URL passada

**DoD:**
- Subscrever via console + ver registro no DB
- Script `pnpm tsx scripts/push-test.ts <userId> "<msg>"` dispara notificação real no dispositivo registrado

### B2. Onboarding de permissão pós-instalação

**Objetivo:** Permissão de push só é pedida depois que o app foi instalado.

**Entregas:**
- Componente `<EnablePushPrompt />` em `src/components/app/enable-push-prompt.tsx`
- Aparece no layout autenticado **se** `useStandaloneMode()` é true **e** `Notification.permission === "default"` **e** sem subscription registrada do dispositivo
- Botão "Ativar notificações" → `Notification.requestPermission()` → `PushManager.subscribe({ applicationServerKey })` → `subscribePush()`
- Texto curto explicando o que será enviado
- "Pular por enquanto" volta a aparecer no próximo login
- Reuso em `/perfil` (entrada manual) quando recusada anteriormente

**DoD:**
- Em iOS browser tab, prompt não aparece (espera instalação)
- Em standalone, prompt aparece; após permitir, registro persistido

### B3. Helper central de envio com cleanup de 410

**Objetivo:** Toda futura origem de push usa uma função única que cuida de cleanup.

**Entregas:**
- `src/lib/push.ts` com:
  - `sendPushToUser(userId: string, payload: PushPayload): Promise<{ sent: number; cleaned: number }>`
  - `sendPushToUsers(userIds: string[], payload: PushPayload)`
- Captura `statusCode === 410` e `404` e deleta subscription
- Atualiza `lastSeenAt` em sucesso
- Tipo `PushPayload = { title: string; body: string; url?: string; tag?: string }`

**DoD:**
- Subscription com endpoint manualmente quebrada some no primeiro envio
- Disparo dupla via `tag` substitui notificação anterior em vez de empilhar

### B4. Disparo: mudança de alocação

**Objetivo:** Pessoa é notificada quando entra/sai/muda papel numa alocação.

**Entregas:**
- Hooks nas actions `upsertAssignment` e `removeAssignment` em `src/app/(app)/eventos/[id]/actions.ts`
- Mensagens:
  - Escalada nova → `Você foi escalada para {evento}` (com `url` apontando pro detalhe)
  - Mudança de role → `Sua função em {evento} mudou para {role}`
  - Promovida a capitão → `Você é capitão em {evento}!`
  - Removida → `Sua alocação em {evento} foi cancelada`
- Tag única por personId+eventId pra substituir notificação anterior

**DoD:**
- Manager escala pessoa X → X recebe push
- Manager troca role de X → X recebe push de update
- Manager remove X → X recebe push

### B5. Disparo: lembrete T-30min antes do evento

**Objetivo:** Quem está escalado pra um evento recebe lembrete ~30min antes.

**Entregas:**
- Vercel Cron rodando a cada 5min em `src/app/api/cron/event-reminders/route.ts`
- Query: eventos com `startTime` entre `now+25min` e `now+35min`, status committed
- Pra cada evento, envia push pra todos com Assignment ativo
- Tabela auxiliar ou flag `Assignment.reminderSentAt` pra garantir idempotência
- Header `Authorization: Bearer ${CRON_SECRET}` pra segurança

**DoD:**
- Mock evento começando em 30min → push chega
- Rodar cron duas vezes seguidas não duplica push

### B6. Disparo manual: capitão chama torcida

**Objetivo:** Capitão tem um botão "Chamar torcida" no detalhe do evento que dispara push pra toda a torcida alocada.

**Entregas:**
- Action `callSupporters({ eventId, message })` em `src/app/(app)/eventos/[id]/actions.ts`
- Permissão: só capitães daquele evento (Assignment.isCaptain = true) ou managers
- Botão `<CallSupportersButton />` no detalhe do evento (visível se a pessoa é capitão)
- Mensagem livre (textarea com limite ~100 chars) ou template
- Throttle: máximo 1 chamada a cada 5min por evento

**DoD:**
- Capitão clica → torcida alocada recebe push
- Pessoa não-capitão não vê o botão

### B7. Preferências e dispositivos em `/perfil`

**Objetivo:** Pessoa controla o que recebe e em quais dispositivos.

**Entregas:**
- Migration Prisma:
  ```
  model NotificationPreference {
    userId         String  @id
    allocation     Boolean @default(true)
    eventReminder  Boolean @default(true)
    captainCall    Boolean @default(true)
    user           User    @relation(...)
  }
  ```
- UI em `/perfil` com switches por categoria
- Listagem de dispositivos registrados (nome derivado de `userAgent` via parser simples) com botão "Remover"
- `sendPushToUser` consulta preferência (filtro por `category: "allocation" | "eventReminder" | "captainCall"` no `PushPayload`)

**DoD:**
- Desligar `allocation` impede disparos de B4
- Remover dispositivo apaga subscription e não recebe mais

---

## C. Offline-first

### C1. Dexie setup + cache de leitura

**Objetivo:** Dados que a pessoa usa offline ficam disponíveis sem rede.

**Entregas:**
- Dep `dexie`
- Schema em `src/lib/db/dexie.ts`:
  - `events` (id, startTime, endTime, title, modalityId, locationId, day, status)
  - `assignments` (eventId, personId, role, isCaptain)
  - `availability` (próprios slots derivados)
  - `meta` (kv para `lastSyncedAt` etc.)
- Hook `useOfflineSync()` montado no layout autenticado, hidrata Dexie a partir do server quando online
- Wrapper de leitura `getEventsOfflineAware()` que usa Dexie como fonte quando offline

**DoD:**
- Carregar `/agenda` online → ficar offline (DevTools) → reload mostra mesma agenda
- Idem pro detalhe de evento próprio

### C2. Fila de SyncOperation

**Objetivo:** Escritas offline ficam enfileiradas em vez de falhar.

**Entregas:**
- Migration Prisma:
  ```
  model SyncOperation {
    id        String   @id @default(cuid())
    userId    String
    kind      String   // "checkIn", "availability", "assignment"
    payload   Json
    status    String   @default("pending") // "pending" | "done" | "conflict" | "failed"
    error     String?
    createdAt DateTime @default(now())
    user      User     @relation(...)
    @@index([userId, status])
  }
  ```
- Espelho local em Dexie (table `pendingOps`)
- Wrapper `enqueueOrRun(actionFn, { kind, payload })`: tenta executar online; offline, enfileira e mostra UI otimista
- Aplicar wrapper em: check-in, edição de disponibilidade da própria pessoa
- Indicador no header "N alterações pendentes" (clicável → tela `/perfil` com lista)

**DoD:**
- Offline + check-in: UI confirma; entra na fila local
- Voltando online: ainda não sincroniza automaticamente (isso é C3), mas dá pra inspecionar

### C3. Processamento da fila + resolução de conflitos

**Objetivo:** Quando volta online, fila esvazia e conflitos ficam visíveis.

**Entregas:**
- Listener `online` event + `navigator.connection.onchange`
- Background Sync API (`SyncManager`) com fallback pra `setInterval`
- Processador serial: cada item da fila chama a action real, marca `done` / `conflict` / `failed`
- Regras:
  - Check-in já existe (idempotente) → `done`
  - Alocação conflitante (já alocada em outro evento sobreposto) → `conflict`, push pro diretor
  - Erro de validação → `failed`, mostra na UI
- UI em `/perfil`: lista de operações com status e botão "Tentar novamente" / "Descartar"

**DoD:**
- Cenário típico: offline → check-in + 3 mudanças de disponibilidade → online → tudo vira `done` em <5s
- Cenário de conflito: alocação que sobrepõe vira `conflict` e aparece na UI

### C4. Polimento offline

**Objetivo:** Casos comuns do EP cobertos.

**Entregas:**
- Banner global "Você está offline" no header
- Telas que não funcionam offline (`/admin/*`, `/pessoas`, etc.) mostram aviso claro
- Botão "Forçar sync agora" em `/perfil` (debug + recuperação manual)
- Log de últimos 50 eventos de sync em Dexie pra suporte
- Reset rápido em `/perfil`: "Limpar cache local" (para casos de corrupção)

**DoD:**
- Smoke test manual rodando o app em modo avião por 10min, fazendo check-ins e mudando disponibilidade — dados batem ao reconectar

---

## Notas de execução

- Cada tarefa deve ter **migration própria** quando muda schema (manter histórico Prisma limpo)
- Testes E2E: cobrir B4 (alocação dispara push) e C2/C3 (offline → online) com Playwright e mock de `serviceWorker`/`PushManager` quando viável; do contrário, smoke manual documentado
- Não há dependência circular entre B e C — depois de A1+A2, qualquer um dos blocos pode começar
- Materiais ficam **fora de escopo** do MVP 3 — registrados no Pós-MVP do roadmap
