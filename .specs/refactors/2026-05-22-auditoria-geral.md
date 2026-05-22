# Auditoria completa & plano de correção — AAEE-EP

**Data:** 2026-05-22
**Escopo:** revisão geral do código (segurança, regras de negócio, UX, a11y, responsividade) e plano priorizado de correção.

## Contexto

Revisão geral do app de gestão da delegação do EP (Next.js 16 + Prisma 7 + Supabase Auth + Tailwind v4 + shadcn/base-ui). Varredura por **vulnerabilidades de segurança**, **bugs de regra de negócio**, **bugs de UX/responsividade** e **a11y**. Cada achado foi confirmado lendo o código diretamente — falsos positivos descartados (ex.: `eventSchema.refine` já usa `>` estrito, então `endTime == startTime` não passa; `slots.ts` opera em ms UTC e formata com `getHours/getMinutes` locais, comportamento correto pra inputs `datetime-local`).

O objetivo é fechar os gaps antes de uso real em produção, principalmente porque o MVP 2 já mexe em **alocação** e **check-in** — áreas onde bug de regra tem impacto operacional direto durante o EP.

---

## Catálogo de achados

Severidade: **C** crítico · **A** alto · **M** médio · **B** baixo.

### Segurança / Auth

| ID | Sev | Onde | Problema |
|----|-----|------|----------|
| S1 | A | [src/app/login/page.tsx:54](../../src/app/login/page.tsx#L54), usado em [linhas 139, 160](../../src/app/login/page.tsx#L139) | **Open redirect**. `redirectTo` vem de `searchParams` sem validar prefixo `/`. Link `/login?redirectTo=https://evil.com` redireciona pós-login pra site externo (phishing). |
| S2 | A | [src/lib/auth.ts:36-71](../../src/lib/auth.ts#L36-L71) | `getCurrentUser` cria `User` no primeiro login dentro de `prisma.$transaction`. Se for chamado em paralelo no mesmo request inicial (RSC + server action), há **race condition** que pode disparar `Unique constraint failed on authUserId`. O `cache()` mitiga dentro do mesmo request, mas não entre requests concorrentes. |
| S3 | M | [src/lib/auth.ts:61-63](../../src/lib/auth.ts#L61-L63) | Email (PII) logado em `console.warn`. Logs vão pra Vercel/host; evitar PII em texto livre — preferir IDs ou hash. |
| S4 | M | rate limiting | Login/OTP/signup confiam 100% no rate limit nativo do Supabase. Não há proteção adicional no app, nem captcha. Documentar e confirmar config no console Supabase. |
| S5 | B | [src/app/(app)/admin/usuarios/actions.ts:17-39](../../src/app/(app)/admin/usuarios/actions.ts#L17-L39) | `applyRoleChange` é função interna não-exportada — **falso positivo**. `requireRole(["ADMIN"])` está corretamente no topo da action exposta (`saveUserEdit`). |

### Regra de negócio

| ID | Sev | Onde | Problema |
|----|-----|------|----------|
| B1 | **C** | [src/app/(app)/eventos/[id]/actions.ts:19-38](../../src/app/(app)/eventos/[id]/actions.ts#L19-L38) | **`upsertAssignment` não valida conflito de horário no servidor.** O painel de alocação mostra alerta visual de conflito, mas o backend aceita escalar a mesma pessoa em dois eventos sobrepostos. UI-only validation = bypass trivial. |
| B2 | A | [src/app/(app)/eventos/[id]/actions.ts:53-66](../../src/app/(app)/eventos/[id]/actions.ts#L53-L66) | **`checkIn` não valida status nem janela temporal.** Permite check-in em evento `CANCELLED`, `POSTPONED`, finalizado ou ainda não começado. Mínimo: bloquear se `status != CONFIRMED`. Provável regra: liberar de `startTime - 30min` até `endTime + 1h`. |
| B3 | A | [prisma/schema.prisma:110](../../prisma/schema.prisma#L110) | `Person.email` sem `@unique`. Duplicatas quebram o auto-linking determinístico em [src/lib/auth.ts:45-64](../../src/lib/auth.ts#L45-L64) — com 2+ matches o link é abortado, deixando a Person órfã. |
| B4 | M | [src/app/(app)/disponibilidade/page.tsx:60](../../src/app/(app)/disponibilidade/page.tsx#L60) vs [src/app/(app)/dashboard/page.tsx:30,42,54,67,78](../../src/app/(app)/dashboard/page.tsx#L30) | **POSTPONED tratado inconsistentemente.** "Meu horário" inclui POSTPONED (filtra só `notIn: ["CANCELLED"]`); dashboard só conta `CONFIRMED`. Pessoa aparece com compromisso na agenda, mas dashboard a marca como livre. Definir regra única. |
| B5 | M | [prisma/schema.prisma:210-211](../../prisma/schema.prisma#L210-L211) | Cascade inconsistente: `modalityId` é `Restrict`, `locationId` é `SetNull`. Deletar `Location` deixa eventos órfãos sem local; deletar `Modality` é bloqueado. Definir política única. |
| B6 | M | [src/app/(app)/eventos/[id]/actions.ts:96-99](../../src/app/(app)/eventos/[id]/actions.ts#L96-L99) | `setEventStatus` muda status sem validação adicional. Ao cancelar evento com check-ins/assignments, nada é avisado/limpo. Mínimo: avisar o admin de qtos check-ins/assignments serão invalidados. |
| B7 | M | [src/lib/auth.ts:67-70](../../src/lib/auth.ts#L67-L70) | Em `getCurrentUser`, o `findUniqueOrThrow` final dentro da transação re-lê o user. Se outro request concorrente fizer linking via `applyPersonLink`, o `person` recém-incluído pode não aparecer. Edge case raro. |
| B8 | B | regra de capacidade | Schema tem `desiredSupportersCount` (meta) mas não há `maxAssignments`. Confirmar com domínio se "meta" é só sugestão ou se vira limite duro. |
| B9 | B | [src/lib/auth.ts:48](../../src/lib/auth.ts#L48) | Auto-linking matcha email com `mode: "insensitive"` no read, mas o `personSchema` não normaliza email na **escrita** — admin pode salvar `Joao@Test.com`. Duplicatas com case diferente passam (relacionado a B3). |

### UX / Responsividade / A11y

| ID | Sev | Onde | Problema |
|----|-----|------|----------|
| U1 | A | 4 arquivos: [locais](../../src/app/(app)/locais/row-actions.tsx#L31), [pessoas](../../src/app/(app)/pessoas/row-actions.tsx#L39), [modalidades](../../src/app/(app)/modalidades/row-actions.tsx#L32), [eventos](../../src/app/(app)/eventos/row-actions.tsx#L36) | **`confirm()` nativo do browser** para deletes. Visual destoa, não é PT-BR, a11y ruim. Substituir por `AlertDialog`. |
| U2 | A | tabelas em [eventos](../../src/app/(app)/eventos/page.tsx), [pessoas](../../src/app/(app)/pessoas/page.tsx), [admin/usuarios](../../src/app/(app)/admin/usuarios/page.tsx) | Tabelas com 6–9 colunas sem fallback mobile. Sem `overflow-x-auto`, sem layout de card em `<md`. |
| U3 | A | [src/app/(app)/admin/usuarios/page.tsx:35-55](../../src/app/(app)/admin/usuarios/page.tsx#L35-L55) | Sem paginação, busca ou sort. `unlinkedPersons` é buscado mas **nunca renderizado** — código morto. |
| U4 | A | [src/app/(app)/eventos/[id]/checkin-button.tsx:30-32](../../src/app/(app)/eventos/[id]/checkin-button.tsx#L30-L32) | Cores hardcoded (`emerald-500/10`, `emerald-700`) em vez de tokens. Quebra coerência de tema. |
| U5 | M | overlays de [dialog.tsx](../../src/components/ui/dialog.tsx), [sheet.tsx](../../src/components/ui/sheet.tsx) | `bg-black/10` hardcoded. Em dark mode fica fraco/invisível; deveria ser `bg-foreground/10`. |
| U6 | M | dialogs/forms com `pending` | Loading só troca texto ("Salvar" → "Salvando…"). Sem spinner. Affordance fraca. |
| U7 | M | [maps-link.tsx](../../src/components/app/maps-link.tsx) + [mapa/page.tsx:61](../../src/app/(app)/mapa/page.tsx#L61) | Comportamento com `address=null` precisa de disabled state ou esconder, não link com href quebrado. |
| U8 | M | event-dialog.tsx | Em mobile pequeno (<360px) com `max-w-2xl`+`max-h-[65vh]`, conteúdo apertado. |
| U9 | B | formatação de hora | `formatHour` em [disponibilidade/page.tsx:248-251](../../src/app/(app)/disponibilidade/page.tsx#L248-L251) duplica `slotLabel` em [src/lib/slots.ts:48-51](../../src/lib/slots.ts#L48-L51). |
| U10 | B | `EpEdition.byDay` | Se `edition.byDay[day]` é `null` (dia não configurado), validar fallback de `formatEpDayDate`. |

---

## Plano de correção (priorizado)

### Fase 1 — Críticos (bloqueia release)

1. **B1: Validar conflito de horário em `upsertAssignment`** — [src/app/(app)/eventos/[id]/actions.ts:19-38](../../src/app/(app)/eventos/[id]/actions.ts#L19-L38)
   - Antes do `upsert`, buscar `assignments` da pessoa em eventos com `endTime > novoStart` AND `startTime < novoEnd`, com `status != CANCELLED`, excluindo o próprio evento.
   - Também checar `EventAthlete` (pessoa competindo).
   - Aceitar `force: true` opcional pra override consciente (UI já alerta — backend precisa confiar).
2. **B2: Validar status/horário em `checkIn`** — [src/app/(app)/eventos/[id]/actions.ts:53-66](../../src/app/(app)/eventos/[id]/actions.ts#L53-L66)
   - Buscar `event.status`, `startTime`, `endTime`.
   - Bloquear se `status != CONFIRMED` ou `now < startTime - 30min` ou `now > endTime + 1h` (confirmar janela).
3. **S1: Sanitizar `redirectTo`** — [src/app/login/page.tsx:54](../../src/app/login/page.tsx#L54)
   - Helper `safeRedirect(raw)` que retorna `"/"` se `raw` não começar com `/` ou começar com `//`.
   - Aplicar nas duas chamadas `router.replace(redirectTo)` (linhas 139 e 160).

### Fase 2 — Schema / dados (migration)

4. **B3 + B9: `Person.email` unique (case-insensitive)** — [prisma/schema.prisma:110](../../prisma/schema.prisma#L110)
   - Adicionar `@unique` no campo. Como Postgres não suporta unique case-insensitive nativo, usar migration manual:
     ```sql
     CREATE UNIQUE INDEX person_email_lower_idx ON "Person" (LOWER(email)) WHERE email IS NOT NULL;
     ```
   - Detectar duplicatas existentes antes: `SELECT LOWER(email), COUNT(*) FROM "Person" GROUP BY 1 HAVING COUNT(*) > 1;`.
   - Normalizar email no `personSchema` ([src/lib/validations/person.ts](../../src/lib/validations/person.ts)) com `.transform(s => s?.trim().toLowerCase())`.
5. **B5: Padronizar cascade de `Event`** — [prisma/schema.prisma:210-211](../../prisma/schema.prisma#L210-L211)
   - Decidir entre `Restrict` em ambos (recomendado) ou `SetNull` em ambos.
   - Atualizar `deleteLocation`/`deleteModality` actions com mensagem clara quando bloqueado.

### Fase 3 — Regras de negócio & consistência

6. **B4: Padronizar tratamento de POSTPONED**
   - Sugestão: POSTPONED conta como compromisso ("Meu horário") **mas não conta como ocupação** (dashboard ignora pra "livre/ocupado").
   - Documentar em [src/lib/format.ts](../../src/lib/format.ts) junto de `deriveEventStatus`.
   - Auditar todos os `where: { status: ... }` e padronizar.
7. **B6: Avisos em `setEventStatus`**
   - Ao cancelar evento com assignments/checkIns, retornar contagem pro client mostrar dialog de confirmação ("Esse evento tem 12 alocações e 4 check-ins — cancelar mesmo assim?").

### Fase 4 — UX / Responsividade / A11y

8. **U1: Substituir `confirm()` por `AlertDialog`** nos 4 row-actions
   - Adicionar `src/components/ui/alert-dialog.tsx` (shadcn) se não existe.
   - Wrapper `ConfirmDelete` reutilizável em `src/components/app/confirm-delete.tsx`.
9. **U2: Responsividade de tabelas grandes**
   - Wrapper `overflow-x-auto` (mínimo).
   - Ideal: em `<sm`, renderizar grid de cards (componente `EntityCardList`).
   - Aplicar em [eventos/page.tsx](../../src/app/(app)/eventos/page.tsx), [pessoas/page.tsx](../../src/app/(app)/pessoas/page.tsx), [admin/usuarios/page.tsx](../../src/app/(app)/admin/usuarios/page.tsx).
10. **U3: Lista de usuários admin**
    - Adicionar busca client-side por email.
    - Renderizar `unlinkedPersons` em seção própria ("Pessoas sem login vinculado") ou remover do query se não for usado.
11. **U4 + U5: Tokens de cor em vez de hardcoded**
    - Adicionar tokens `--success`, `--success-foreground` em `src/app/globals.css`.
    - Variante `success` no [badge.tsx](../../src/components/ui/badge.tsx); atualizar [checkin-button.tsx](../../src/app/(app)/eventos/[id]/checkin-button.tsx).
    - Overlays: `bg-black/10` → `bg-foreground/10` em [dialog.tsx](../../src/components/ui/dialog.tsx) e [sheet.tsx](../../src/components/ui/sheet.tsx).
12. **U6: Spinner em pending**
    - `<Loader2 className="h-4 w-4 animate-spin" />` quando `pending=true` em todos os Buttons de submit (locais, pessoas, modalidades, eventos, perfil, admin/ep, admin/usuarios).
13. **U7: `MapsLink` com fallback** — retornar `null` ou badge "sem endereço" se address vazio.

### Fase 5 — Polimento

14. **S3**: Trocar `console.warn` com email por log estruturado sem PII (usar `personId` ou hash).
15. **S4**: Documentar em [README.md](../../README.md) que rate limit de auth depende do Supabase; confirmar config no painel.
16. **U9**: Consolidar `formatHour` duplicado em [src/lib/format.ts](../../src/lib/format.ts) ou [src/lib/slots.ts](../../src/lib/slots.ts).
17. **U10**: Auditar `formatEpDayDate(null)`.

---

## Arquivos críticos a modificar

- [src/app/(app)/eventos/[id]/actions.ts](../../src/app/(app)/eventos/[id]/actions.ts) — B1, B2, B6
- [prisma/schema.prisma](../../prisma/schema.prisma) — B3, B5 (+ migration manual)
- [src/lib/validations/person.ts](../../src/lib/validations/person.ts) — B9
- [src/app/login/page.tsx](../../src/app/login/page.tsx) — S1
- [src/lib/auth.ts](../../src/lib/auth.ts) — S3
- 4× `row-actions.tsx` (locais, pessoas, modalidades, eventos) — U1
- 3× `page.tsx` em listas (eventos, pessoas, admin/usuarios) — U2, U3
- [src/components/ui/badge.tsx](../../src/components/ui/badge.tsx), [dialog.tsx](../../src/components/ui/dialog.tsx), [sheet.tsx](../../src/components/ui/sheet.tsx) — U4, U5
- Forms com botão de submit (todos os `*-dialog.tsx`, `*-form.tsx`) — U6
- [src/lib/format.ts](../../src/lib/format.ts) — documentação de POSTPONED, consolidação de `formatHour`

## Reuso de utilidades existentes

- `deriveEventStatus` em [src/lib/format.ts](../../src/lib/format.ts) — usar consistentemente nas listagens em vez de comparar `event.status` direto.
- `requireRole`, `requireUser` em [src/lib/auth.ts](../../src/lib/auth.ts) — não criar novos helpers.
- `FormState`, `useFormAction`, `failure`, `success` em [src/lib/validations/](../../src/lib/validations/) — usar pra retornar erros de regra (ex.: B1 conflito → `failure("Conflito com evento X às 14:30")`).
- `MultiSelect`, `Combobox`, `DateTimePicker` em [src/components/ui/](../../src/components/ui/) — não duplicar.

## Verificação end-to-end

1. **B1**: criar 2 eventos sobrepostos; alocar pessoa em A; tentar alocar a mesma em B via painel → backend recusa com mensagem; com `force: true` aceita.
2. **B2**: cancelar evento; tentar check-in → botão disabled / action retorna erro.
3. **S1**: abrir `/login?redirectTo=https://example.com`; logar; deve cair em `/`.
4. **B3**: cadastrar 2 Persons com email `joao@test.com` — segunda falha por unique; depois `Joao@Test.com` — também falha.
5. **U1**: deletar local — modal customizado, focusable, ESC fecha.
6. **U2**: abrir `/eventos`, `/pessoas`, `/admin/usuarios` no devtools mobile (375px) — sem overflow horizontal.
7. **U4**: alternar tema light/dark — botão "Fazer check-in" mantém legibilidade.
8. Rodar `pnpm build && pnpm lint`. Rodar `pnpm dev` e clicar fluxos críticos (criar evento, alocar, check-in, cancelar).

## Falsos positivos descartados

- `endTime == startTime` em evento — já bloqueado por `refine(>strict)` no schema.
- Timezone em `slots.ts` — correto para entradas `datetime-local`.
- `applyRoleChange` em admin/usuarios actions — função interna não-exportada, com `requireRole` no caller.
