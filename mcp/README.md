# MCP da plataforma AAEE-EP

Servidor [MCP](https://modelcontextprotocol.io) que expõe os dados e operações
da plataforma como ferramentas, em dois transportes que **compartilham as mesmas
26 tools** ([tools.ts](tools.ts)):

- **stdio** ([server.ts](server.ts)) — uso local no **Claude Desktop**.
- **HTTP remoto** ([../src/app/api/[transport]/route.ts](../src/app/api/%5Btransport%5D/route.ts)) —
  conector no **app do Claude no celular** / Claude.ai, deployado junto do app na Vercel.

Fala direto com o banco usando o mesmo Prisma client do app e reaproveita a
lógica de negócio das server actions (validação Zod, escalação automática,
conversão de fuso, status derivado).

## Tools

| Área | Tools |
|------|-------|
São **47 tools** cobrindo todos os CRUDs e features da plataforma:

| **Modalidades** | `list_modalities`, `get_modality`, `create_modality`, `update_modality`, `delete_modality` |
| **Locais** | `list_locations`, `get_location`, `create_location`, `update_location`, `delete_location` |
| **Pessoas** | `list_people`, `get_person`, `create_person`, `update_person`, `delete_person` |
| **Eventos** | `list_events`, `get_event`, `create_event`, `update_event`, `delete_event`, `set_event_status`, `get_agenda` |
| **Escalação (modalidade)** | `list_modality_athletes`, `set_modality_athletes` |
| **Torcida** | `allocate_supporter`, `remove_assignment`, `list_assignments`, `available_supporters_for_event` |
| **Check-in** | `check_in`, `undo_check_in`, `list_check_ins` |
| **Usuários** | `list_users`, `get_user`, `set_user_role`, `link_person_to_user`, `create_person_from_user` |
| **Notificações** | `preview_broadcast_recipients`, `send_broadcast`, `list_broadcasts`, `call_supporters`, `list_push_subscriptions`, `list_notification_preferences` |
| **EP / visão geral** | `get_ep_edition`, `set_ep_edition`, `dashboard_summary`, `dashboard_detail`, `list_sync_operations` |

### Regras de negócio preservadas
- **Escalação automática:** ao salvar evento/pessoa, o `EventAthlete` é
  re-sincronizado a partir das modalidades. Sem seleção manual de atletas.
- **Fuso:** eventos usam `startTime`/`endTime` em SP (`YYYY-MM-DDTHH:mm`); `set_ep_edition`
  usa datas `YYYY-MM-DD` ancoradas às 12:00 SP. Tudo gravado em UTC; leitura devolve ISO +
  `when` (SP) + `derivedStatus`.
- **Conflitos de torcida** (`available_supporters_for_event` sinaliza), **janela de check-in**
  (30min antes / 60min depois) e **throttle de 5min** no `call_supporters`.

### Leitura completa dos dados
`get_*` retorna o registro completo + relações; `list_*` campos principais + filtros. Toda
tabela é legível. Dados de usuário expõem **app instalado** (`appInstalled`), **push ativo**
(`pushActive`/`deviceCount`) e **preferências de notificação** — com filtros `appInstalled`
e `hasPush` em `list_users`. Chaves de push (`p256dh`/`auth`/`endpoint`) são **mascaradas**.

### Diferenças vs. o app
- **Sem requireRole/requireUser** — o caller é tratado como **admin** (a proteção é a
  URL-capacidade). `check_in` recebe `personId` explícito; `set_user_role` **não** tem guarda
  de auto-rebaixamento; `send_broadcast` grava `Broadcast.sentById = null`.
- **Push/WhatsApp:** `send_broadcast` e `call_supporters` carregam `@/lib/push` via `import()`
  dinâmico. Funcionam **pleno só no transporte HTTP** (Vercel tem VAPID/WhatsApp). No **stdio**
  o envio **degrada** (`delivered:false`) porque `server-only` é irresolvível fora do Next — o
  registro do `Broadcast` ainda é gravado.

---

## A) Local — Claude Desktop (stdio)

```bash
pnpm mcp   # tsx mcp/server.ts
```

Lê `DATABASE_URL` do `.env` da raiz ([load-env.ts](load-env.ts)).

Config em `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "aaee-ep": {
      "command": "/Users/gabrielperini/.nvm/versions/node/v24.13.1/bin/node",
      "args": [
        "/Users/gabrielperini/Desktop/projects/aaee-ep/node_modules/tsx/dist/cli.mjs",
        "/Users/gabrielperini/Desktop/projects/aaee-ep/mcp/server.ts"
      ]
    }
  }
}
```

Caminhos absolutos porque o app GUI sobe com PATH mínimo (sem o node do nvm).
Confira com `which node`. Reinicie o Claude Desktop depois.

---

## B) Remoto — app do Claude no celular (HTTP na Vercel)

A rota já sobe junto do deploy do app. Endpoint: **`POST /api/mcp`**.

### Proteção: URL-capacidade
Não há login por usuário — o acesso é um **segredo na URL** (`?key=…`). É a
escolha consciente pra uma ferramenta **temporária de evento (4 dias)**:

- ✅ Só quem tem a URL conecta (e só você tem).
- ✅ Pra **revogar**: troque/remova `MCP_SHARED_SECRET` na Vercel → o conector morre.
- ⚠️ O segredo vive na URL do conector (pode vazar em log). Aceitável pra algo
  descartável; **não** use esse padrão pra um serviço permanente.
- Chave errada/ausente → **404** (não dispara fluxo de OAuth do Claude).

> O app do Claude (celular/claude.ai) só aceita conector remoto **com OAuth
> completo** ou **sem auth**. Não dá pra mandar só um `Authorization: Bearer`
> ([issue da Anthropic](https://github.com/anthropics/claude-ai-mcp/issues/112)).
> A URL-capacidade é a forma simples de proteger um servidor "sem auth".

### Passos

1. **Gere o segredo** (já feito uma vez; pra rotacionar):
   ```bash
   openssl rand -hex 24
   ```

2. **Vercel → Project → Settings → Environment Variables:** adicione
   `MCP_SHARED_SECRET` = (o segredo) em *Production*. Redeploy.

   > O mesmo valor já está no `.env` local pra testar. **Nunca** comite o `.env`.

3. **No app do Claude (celular):** Configurações → Conectores →
   *Adicionar conector personalizado* → cole a URL:
   ```
   https://ep.aaee.com.br/api/mcp?key=SEU_SEGREDO
   ```
   (troque `ep.aaee.com.br` pelo seu domínio e `SEU_SEGREDO` pelo valor real)

4. Pronto — as tools aparecem na conversa. Conectores remotos exigem plano
   pago (Pro/Max/Team).

### Testar a rota localmente (sem subir o Claude)

```bash
tsx mcp/test-http.ts
```

Valida a guarda (chave errada → 404), `initialize`, `tools/list` e um
`tools/call` de leitura contra o banco do `.env`.

---

## ⚠️ Qual banco?

Ambos os transportes usam o `DATABASE_URL` do ambiente. No deploy da Vercel é o
**banco de produção** — as escritas valem. Pra testar local sem risco:
`dotenv -e .env.test -- pnpm mcp`.

## Estender

Adicione um `add(name, descrição, shapeZod, handler)` em
[tools.ts](tools.ts), reaproveitando o schema Zod correspondente em
[../src/lib/validations/](../src/lib/validations/). Os dois transportes pegam
a tool nova automaticamente.
