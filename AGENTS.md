<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Padrão de formulários

Todos os forms da plataforma seguem o padrão estabelecido a partir do commit `cbdc620`:

- **`react-hook-form`** + **`zodResolver`** para validação client.
- Schemas centralizados em [`src/lib/validations/`](src/lib/validations/) — schema único compartilhado entre client (resolver) e server (action via `safeParse`).
- Server actions retornam **`FormState`** ([`src/lib/validations/_action-result.ts`](src/lib/validations/_action-result.ts)) com `{ status, fieldErrors?, formError? }`.
- Hook **`useFormAction`** ([`src/lib/validations/use-form-action.ts`](src/lib/validations/use-form-action.ts)) integra `useActionState` (React 19) com RHF, mapeando `fieldErrors` do servidor pra `form.setError` automaticamente.
- Componentes do shadcn em [`src/components/ui/`](src/components/ui/) — usar `Form`/`FormField`/`FormItem`/`FormLabel`/`FormControl`/`FormMessage` em vez de `<label>` cru.
- Tipos vêm direto de `@/lib/validations/*` — **NUNCA** via `export type` re-export de um arquivo com `"use server"` (turbopack falha em runtime com `ReferenceError: TypeName is not defined`).

## Componentes compostos próprios

- **MultiSelect com badges removíveis individualmente** ([`src/components/ui/multi-select.tsx`](src/components/ui/multi-select.tsx)) — sempre usar para seleção múltipla. Não criar grids de checkbox ad-hoc.
- **Combobox searchable** ([`src/components/ui/combobox.tsx`](src/components/ui/combobox.tsx)) — sempre exibir label, não ID. Use para selects com 10+ opções ou que precisem de busca (cursos, pessoas, etc.).
- **DateTimePicker** ([`src/components/ui/datetime-picker.tsx`](src/components/ui/datetime-picker.tsx)) — Calendar + hora, locale `pt-BR`. Substitui `<input type="datetime-local">`.

## Quirks do base-ui (não é radix)

- **`Select.Root` precisa do prop `items={LABEL_MAP}`** para que o trigger mostre o label em vez do valor cru (ex: "Confirmado" em vez de "CONFIRMED").
- **`MenuItem` usa `onClick`**, não `onSelect` (diferença com radix; pega comum quando se copia código de outro projeto).
- **`SelectValue` aceita `children` como função** `(value) => ReactNode` para customizar o render do valor selecionado.

## Layout dos forms

- Em grids 2/3-col com Combobox/DateTimePicker/Select dentro, adicionar `className="min-w-0"` no `FormItem` pra evitar que o conteúdo do trigger empurre o gap da grid.
- Dialogs com `overflow-y-auto` no body precisam de `px-1 -mx-1` no container, senão o focus ring (3px) dos inputs é cortado na esquerda/direita.

# Domínio: status de evento

`EventStatus` no schema tem 3 valores: **`CONFIRMED`** (padrão), **`CANCELLED`**, **`POSTPONED`**.

Os estados "Em andamento" / "Finalizado" / "Possível" **não são persistidos** — são derivados via `deriveEventStatus()` em [`src/lib/format.ts`](src/lib/format.ts):

- `IN_PROGRESS` ← `status = CONFIRMED AND startTime <= now <= endTime`
- `FINISHED` ← `status = CONFIRMED AND endTime < now`
- `POSSIBLE` ← `status = CONFIRMED AND isConditional = true`

Quando for exibir badge na UI, use `deriveEventStatus(event)` em vez de `event.status` direto.
