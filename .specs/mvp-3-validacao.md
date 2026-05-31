# MVP 3 — Relatório de validação dos DoDs

Consolidação de **30/05/2026**, validação de campo concluída em **31/05/2026**.
Cruza os "Definition of Done" do [plano de execução](./mvp-3-plano.md) com o estado
real do repositório.

> **Status: MVP 3 validado.** Todos os DoDs verificáveis por código estão confirmados,
> a suíte E2E passa (89/89) e os testes manuais de device/produção (§3) foram executados
> com sucesso em 31/05/2026.

Cada DoD cai em uma de três categorias:

- **✅ Verificável por código/artefato** — confirmado neste ambiente, com evidência.
- **⚠️ Achado** — algo que divergiu do plano ou mereceu atenção (todos resolvidos/anotados).
- **✅ Manual validado** — exigia device real ou medição externa; executado em campo (§3).

---

## 1. Verificado por código/artefato

| Bloco | DoD | Evidência |
|-------|-----|-----------|
| A1 | SW registrado, estratégias de cache | `public/sw.js` (cache-first estáticos, network-first navegação → `/offline`), `<ServiceWorkerRegister />` só em `NODE_ENV=production` |
| A1 | Página `/offline` existe | rota presente; precache em `PRECACHE_URLS` |
| A2 | Manifest instalável completo | `GET /manifest.webmanifest` → `name`, `short_name`, `display: standalone`, `start_url: /`, `theme_color`, `lang: pt-BR`, ícones **192 + 512 + 512 maskable + 1024** |
| A2 | Suprime modal em standalone | `<InstallPrompt />` gated por `useStandaloneMode()` |
| B1 | Modelo `PushSubscription` + handlers SW | migration `20260529212846_mvp3_push`; handlers `push` e `notificationclick` em `sw.js` |
| B3 | Cleanup 410/404 + `lastSeenAt` | `src/lib/push.ts` (`statusCode === 410 || 404` → delete; `lastSeenAt` em sucesso) |
| B3 | `renotify` com tag | `sw.js` `renotify: Boolean(payload.tag)` (commit `588e0f9`) |
| B4 | Disparo de alocação com categoria | `eventos/[id]/actions.ts:161/192` → `category: "allocation"` |
| B5 | Cron idempotente + protegido | `vercel.json` cron `*/5`; janela `[+25min,+35min]`, `status` confirmado, `timeTbd=false`, `reminderSentAt`; `Authorization: Bearer ${CRON_SECRET}` |
| B6 | Só capitão/manager dispara | `callSupporters` valida `isCaptain`/role; botão condicional |
| B7 | **Desligar categoria impede disparo** | cadeia completa: `sendPushToUser` → `categoryEnabled` lê `NotificationPreference`; callers passam `allocation`/`captainCall`/`eventReminder` |
| B7 | Remover dispositivo | `notification-settings.tsx` lista subscriptions e deleta |
| C1 | Cache de leitura em Dexie | `src/lib/db/dexie.ts` (`events`, `assignments`, `checkIns`, `meta`, `pendingOps`, `syncLog`); hidratação por `loadHydrationData` |
| C2 | Fila com efeito otimista | `enqueueOrRun` enfileira offline + aplica local; coalescência last-write-wins por chave |
| C2 | Cobre check-in **e alocação** | `allocate`/`deallocate` via `allocation-panel.tsx` (estado otimista local) |
| C2 | Indicador de pendentes | `<PendingSyncBadge />` usa `pendingCount()` |
| C3 | Drenagem ao voltar online | `<SyncProcessor />` ouve `online` + msg `sync-queue` do SW (Background Sync + fallback) |
| C3 | Conflito estruturado (sem regex) | `ActionResult.conflict: ConflictKind`; `competing`/`athlete-here`/`event-cancelled`/`already-allocated` |
| C3 | Resolução por tipo | `sync-panel.tsx`: "Forçar" só p/ `already-allocated`; "Tentar"/"Descartar" no resto |
| C3 | Aviso à diretoria | conflito de `allocate` → `sendPushToUsers(directors, {category:"syncConflict"})` via `sync-actions.ts` |
| C3 | Teste E2E de conflito | `tests/e2e/event/offline-conflict.spec.ts` — **executado, verde** (suíte completa 89/89) |
| C4 | Banner offline + forçar sync + limpar cache + log 50 | `<OfflineBanner />`, `forceSync`, `clearLocalCache`, `syncLog` (limite 50) |

---

## 2. Achados

### #1 — `/sw.js` e `/offline` não estão na allowlist do `proxy.ts` — ✅ CORRIGIDO (30/05/2026)

> **Resolvido:** `sw\.js|offline` adicionados à negativa do matcher em `proxy.ts`.
> Confirmado: `GET /sw.js`, `GET /offline` e `GET /manifest.webmanifest` agora retornam **200**
> sem sessão. O texto abaixo fica como registro do diagnóstico original.


O matcher em [`src/proxy.ts`](../src/proxy.ts) exclui `manifest.webmanifest`, ícones e
assets do Next, mas **não** `/sw.js` nem `/offline`. Sem sessão, ambos retornam **307 → `/login`**:

```
GET /manifest.webmanifest  → 200  (excluído do matcher)
GET /sw.js                 → 307 → /login?redirectTo=/sw.js
GET /offline               → 307 → /login?redirectTo=/offline
```

**Por que não quebra hoje:** o `<ServiceWorkerRegister />` só roda dentro do layout
autenticado, então `register("/sw.js")` vai com cookie de sessão → middleware passa →
arquivo servido. O `/offline` é precacheado no `install` (também autenticado).

**Risco residual:** se o browser tentar atualizar o SW após a sessão expirar, `/sw.js`
pode resolver pro HTML de login (registro falha silenciosamente). Idem se o precache de
`/offline` rodar sem cookie.

**Correção sugerida (1 linha):** adicionar `sw.js|offline` à negativa do matcher:

```ts
"/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw\\.js|offline|opengraph-image|twitter-image|icon\\.png|apple-icon\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
```

### #2 — DoD do B5 "rodar o cron 2× não duplica" — ✅ VALIDADO (31/05/2026)

A idempotência depende de `reminderSentAt` ser setado no mesmo passo do envio. Validado
manualmente via §3.5 (duas chamadas seguidas à rota → push chega uma única vez). Sem teste
automatizado dedicado; coberto por smoke manual.

### #3 — Desvio consciente: throttle do B6 removido

O plano pedia "máximo 1 chamada a cada 5min por evento". Foi **removido** (commit `e32fd94`).
Não é pendência — é decisão de produto. Plano já anotado.

---

## 3. DoDs manuais (device real / medição externa) — ✅ validados em 31/05/2026

Executados em campo. Os roteiros abaixo são o procedimento usado; todos passaram.

### 3.1 — Lighthouse "PWA ≥ 80" (A1) — **métrica obsoleta** · ✅ instalabilidade ok

A categoria **PWA foi removida do Lighthouse a partir da v12** (2024). O score não existe
mais como no plano. O que aquele score media (instalabilidade) já está **verificado em §1**:
manifest válido + ícones 192/512/maskable + SW + `/offline` + `start_url`.

Se quiser um número equivalente hoje, rodar contra um **build de produção** (SW não registra
em dev):

```bash
pnpm build && pnpm start            # serve em :3000
npx lighthouse http://localhost:3000 --view --only-categories=performance,best-practices
# "Installable" agora vive em Best Practices / no relatório de instalabilidade do Chrome DevTools
```

### 3.2 — Instalação + push no iOS/iPadOS Safari (A2 + B2) · ✅ passou

Requer iPhone/iPad **iOS 16.4+**. iOS só recebe push com o app instalado como PWA.

1. Abrir o app no Safari → **Compartilhar → Adicionar à Tela de Início**.
2. Abrir pelo ícone (standalone). Confirmar que `<InstallPrompt />` **não** aparece.
3. `<EnablePushPrompt />` deve aparecer → "Ativar notificações" → permitir.
4. Conferir registro no DB: `select * from "PushSubscription" where "userId" = ...`.
5. Disparar `pnpm tsx scripts/push-test.ts <userId> "teste"` → notificação chega no device.
6. Em **aba normal do Safari (não instalado)**: o prompt de push **não** deve aparecer.

### 3.3 — Instalação em Android Chrome / Desktop Chrome-Edge / macOS Safari (A2) · ✅ passou

- **Android Chrome / Desktop Chrome-Edge:** modal mostra botão "Instalar" nativo
  (`beforeinstallprompt`); após instalar, abrir standalone → modal some.
- **macOS Safari:** instruções "Arquivo → Adicionar ao Dock".
- **Demais navegadores:** instruções genéricas.
- "Não mostrar de novo" persiste em `localStorage` (`install-prompt-dismissed-v1`);
  link "Instalar app" em `/perfil` reabre.

### 3.4 — Smoke offline 10min em modo avião (C4) · ✅ passou

Precisa de **build de produção** (SW). Idealmente em celular no EP, mas dá pra simular no
desktop com Chrome DevTools → Network → Offline.

1. `pnpm build && pnpm start`, logar, abrir `/agenda` e um `/eventos/[id]` próprio (popula Dexie).
2. DevTools → **Offline**. Reload de `/agenda` e do detalhe → conteúdo aparece do cache.
3. Fazer **check-in** offline → UI confirma (otimista), badge "N pendentes" sobe.
4. Desfazer e refazer → operações inversas se cancelam na fila.
5. Voltar **online** → fila drena em <5s, badge zera, check-in persiste no DB.
6. Telas não-offline (`/pessoas`, `/locais`, `/mapa`) mostram o aviso de indisponível.
7. `/perfil`: "Forçar sync agora" e "Limpar cache local" funcionam; log mostra os eventos.

### 3.5 — Cron de lembrete não duplica (B5) · ✅ passou

1. Criar evento com `startTime` ≈ agora + 30min, status confirmado, `timeTbd=false`,
   com ao menos 1 `Assignment`.
2. Chamar a rota 2× com o header de cron:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/event-reminders
   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/event-reminders
   ```
3. Esperado: push chega **uma** vez; 2ª chamada não reenvia (`reminderSentAt` já setado).

---

## Resumo

- **Blocos A, B, C: implementados, cabeados e validados.** Nenhuma tarefa A1–C4 está sem código.
- **Suíte E2E:** 89/89 verde.
- **Achados resolvidos:** #1 (matcher do `proxy.ts`) corrigido; #2 (idempotência do cron)
  validado em campo; #3 (throttle B6) é desvio consciente de produto.
- **Testes manuais de §3:** executados em device/build de produção em 31/05/2026 — todos OK.
- **MVP 3 validado em campo.** Sem pendências de validação.
