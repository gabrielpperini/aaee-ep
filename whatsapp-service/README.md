# whatsapp-service

Microserviço **always-on** que envia mensagens WhatsApp via [baileys](https://github.com/WhiskeySockets/Baileys)
para a plataforma AAEE EP. O app (Next.js na Vercel) **não** consegue rodar baileys
(serverless, sem processo persistente nem disco), então ele chama este serviço por HTTP.

## Como funciona

- Mantém **uma** conexão WhatsApp Web (1 número dedicado) e a sessão em disco
  (`WA_AUTH_DIR`) — não repareia em restart.
- Expõe `POST /send`; o app manda `{ to, message }` e o serviço enfileira e envia com
  **pacing** (delay aleatório de 1–3s entre mensagens) pra reduzir risco de ban.
- `onWhatsApp()` resolve o JID real → corrige o nono dígito BR e descarta quem não tem WhatsApp.

## Endpoints

| Método | Rota | Auth | Body | Resposta |
|---|---|---|---|---|
| GET | `/health` | — | — | `{ ok, ready, queued }` |
| POST | `/send` | `Bearer <WA_SERVICE_TOKEN>` | `{ to: string \| string[], message: string }` | `202 { accepted }` (ou `503 not_ready`) |

`accepted` = quantos números válidos entraram na fila (não é confirmação de entrega).

## Rodar local

```bash
cp .env.example .env      # defina WA_SERVICE_TOKEN
npm install
npm run dev               # escaneie o QR que aparece no log
curl localhost:9173/health
curl -X POST localhost:9173/send \
  -H "Authorization: Bearer $WA_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to":"5554999997720","message":"teste"}'
```

## Deploy na OCI (VM Ampere always-free)

1. Provisione uma VM **Ampere A1** (Ubuntu). Abra a porta do serviço na **security
   list/NSG** e no firewall da VM (`ufw allow <porta>`).
2. Instale Docker.
3. Build + run com volume persistente pra sessão:
   ```bash
   docker build -t whatsapp-service .
   docker run -d --name wa --restart unless-stopped \
     -p 9173:9173 \
     -e WA_SERVICE_TOKEN=<token> \
     -v /data/wa-auth:/data/auth \
     whatsapp-service
   docker logs -f wa            # escaneie o QR aqui
   ```
4. **TLS**: o token viaja no header — ponha um **Caddy** na frente com um subdomínio
   pra ter HTTPS automático. `WHATSAPP_SERVICE_URL` no app aponta pro `https://...`.
5. Faça backup do volume `/data/wa-auth` (a sessão).

> Use um **número dedicado** (não pessoal). baileys é não-oficial — há risco de ban.
