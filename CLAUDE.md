@AGENTS.md

# Screenshots e artefatos de teste

Toda imagem gerada durante testes (Playwright MCP `browser_take_screenshot`,
debug visual, antes/depois de fix de UI, etc.) deve ser salva em
`screenshots/` na raiz do projeto.

A pasta `screenshots/` está no `.gitignore` — não comitar.

Também ignorados:
- `.playwright-mcp/` — runtime do Playwright MCP (snapshots YAML + logs de console)
- `/*.png` — segurança extra caso algo escape pro root

**NÃO** ignorados (são versionados):
- `.claude/` — config local do projeto (slash commands, hooks, settings)
- `.agents/` — skills baixadas do projeto

# Padrão de formulários

Todos os forms seguem o padrão estabelecido no commit `cbdc620`:

- **`react-hook-form`** + **`zodResolver`** para validação client
- Schemas centralizados em `src/lib/validations/` — schema único compartilhado
  entre client (resolver) e server (action via `safeParse`)
- Server actions retornam `FormState` (`src/lib/validations/_action-result.ts`)
  com `{ status, fieldErrors?, formError? }`
- Hook **`useFormAction`** integra `useActionState` (React 19) com RHF, mapeando
  `fieldErrors` do servidor pra `form.setError` automaticamente
- Componentes UI do shadcn em `src/components/ui/` — usar `Form`/`FormField`/
  `FormItem`/`FormLabel`/`FormControl`/`FormMessage` em vez de `<label>` cru
- **Selects do base-ui**: passar prop `items={LABEL_MAP}` no `<Select>` para
  que o trigger mostre o label (e não o valor cru tipo "CONFIRMED")
- **MultiSelect com badges** ([`src/components/ui/multi-select.tsx`](src/components/ui/multi-select.tsx))
  para qualquer seleção múltipla — não usar grids de checkbox ad-hoc
- **Combobox** ([`src/components/ui/combobox.tsx`](src/components/ui/combobox.tsx))
  para selects com busca (cursos, pessoas, etc.) — sempre exibir label, não ID
- **Tipos importam de `src/lib/validations/*`** diretamente, NUNCA via
  `export type` re-export de um arquivo com `"use server"` (turbopack falha
  em runtime com `ReferenceError: TypeName is not defined`)
- **Base-ui MenuItem usa `onClick`**, não `onSelect` (não é radix)
- Em grids 2/3-col com Combobox/DateTimePicker/Select dentro, adicionar
  `className="min-w-0"` no `FormItem` pra evitar que o conteúdo do trigger
  empurre o gap da grid
- Dialogs com `overflow-y-auto` no body devem ter `px-1 -mx-1` no container
  pra que o focus ring (3px) dos inputs não seja cortado
