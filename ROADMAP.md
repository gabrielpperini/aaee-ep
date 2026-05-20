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
- [ ] Autenticação via Supabase Auth (magic link / OTP por email)
- [ ] Modelo de permissões: `user`, `director`, `admin`
- [ ] CRUD de Pessoas (atletas, torcida, apoio, diretores)
- [ ] CRUD de Modalidades
- [ ] CRUD de Locais
- [ ] CRUD de Eventos (jogos, lutas, provas, atividades)
- [ ] Visualização da agenda dos 3 dias (lista + filtros básicos)
- [ ] Layout do app com sidebar e gating por role
- [ ] README com instruções de setup

### Entidades cobertas

`User`, `Person`, `Modality`, `Event`, `Location`. As demais (`AvailabilitySlot`, `Assignment`, `CheckIn`, `Material`, `SyncOperation`) ficam para as próximas fases.

---

## MVP 2 — Operação da torcida

**Objetivo:** Habilitar o uso real durante o evento: cada pessoa informa disponibilidade, diretores alocam torcida, check-ins acontecem.

### Entregas

- [ ] Tela "Minha disponibilidade" com slots de 30min em 3 dias
- [ ] Bloqueio automático de slots em que a pessoa compete (cruza `Event.athletes`)
- [ ] Tela de alocação de torcida para diretores
  - Filtro de pessoas disponíveis no horário
  - Alerta de conflito (mesma pessoa em dois eventos)
  - Definição de função (torcedor, capitão, responsável material, apoio)
- [ ] Definição de capitães por evento
- [ ] Prioridade por evento (baixa/normal/alta/crítica)
- [ ] Avanço/cancelamento de eventos condicionais (semifinais, finais)
- [ ] Check-in (botão "Estou aqui" no detalhe do evento)
- [ ] Dashboard da diretoria
  - Eventos agora / próximos
  - Pessoas disponíveis / ocupadas
  - Alocados x desejado por evento
  - Eventos prioritários com pouca torcida

### Entidades adicionadas

`AvailabilitySlot`, `Assignment`, `CheckIn`.

### Regras-chave a implementar

- Uma pessoa não pode estar alocada em dois eventos no mesmo horário (alerta)
- Atleta competindo aparece como indisponível para torcida no mesmo slot
- Disponibilidade pode ser sobrescrita pela própria pessoa

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
