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
- `.agents/` — skills baixadas do projeto (referência pro time todo)
