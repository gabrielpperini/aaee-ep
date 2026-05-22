# App de Gestão da Delegação e Torcida — Engenharia UFRGS no EP

## 1. Objetivo geral

O aplicativo tem como objetivo organizar a disponibilidade, presença, alocação e movimentação das pessoas da delegação da Engenharia UFRGS durante o EP — Engenhariadas Paranaense.

O sistema deve permitir que cada pessoa informe sua própria disponibilidade, enquanto os diretores da torcida conseguem visualizar a situação geral da delegação, distribuir pessoas entre jogos e modalidades, acompanhar check-ins, definir capitães de torcida, priorizar modalidades e controlar materiais individuais.

O app deve funcionar bem durante os três dias de evento, inclusive em cenários de internet instável, com comportamento offline first e sincronização dos dados quando a conexão retornar.

---

## 2. Contexto de uso

A delegação será composta por atletas e torcida. Os atletas também podem atuar como torcida quando não estiverem competindo.

O evento terá duração de três dias, com diversas modalidades esportivas acontecendo em horários e locais diferentes.

Exemplo: uma pessoa pode lutar judô no primeiro dia pela manhã e, após sua competição, ficar disponível para torcer em outras modalidades.

O sistema deve permitir esse controle dinâmico de disponibilidade.

---

## 3. Tipos de usuário

### 3.1 Pessoa da delegação

Usuário comum do app.

Pode:

- visualizar a agenda do evento;
- visualizar jogos e modalidades;
- informar sua própria disponibilidade;
- ver onde foi alocado;
- fazer check-in em jogos/modalidades;
- ver informações gerais da delegação;
- consultar a programação dos três dias.

Esse usuário pode ser:

- torcida;
- atleta;
- atleta e torcida;
- membro de apoio;
- diretor, caso também tenha permissão elevada.

---

### 3.2 Atleta

É uma pessoa da delegação que participa de uma ou mais modalidades.

O atleta também pode torcer quando não estiver competindo.

Exemplo:

> Gabriel é atleta do judô no primeiro dia pela manhã. Durante esse período, ele deve aparecer como ocupado/competindo. Depois disso, ele volta a ficar disponível para torcida.

---

### 3.3 Diretor da torcida

Usuário com permissão de organização.

Pode:

- visualizar todas as disponibilidades;
- criar e editar jogos/modalidades;
- alocar pessoas para torcida;
- definir capitães;
- controlar materiais;
- ver check-ins;
- definir prioridades;
- alterar status de eventos;
- resolver conflitos de horário;
- acompanhar o dashboard geral.

---

### 3.4 Administrador

Usuário com acesso total.

Pode fazer tudo que o diretor faz e também:

- gerenciar permissões;
- cadastrar ou remover usuários;
- editar configurações gerais do evento;
- importar tabela oficial;
- alterar dados estruturais do sistema.

---

## 4. Funcionalidades principais

### 4.1 Cadastro de pessoas

O sistema deve permitir cadastrar todas as pessoas da delegação.

Cada pessoa deve ter:

- nome;
- apelido;
- telefone;
- tipo de participação;
- modalidades em que compete;
- permissão no sistema;
- observações.

A pessoa pode ser marcada como:

- torcida;
- atleta;
- diretor;
- capitão;
- apoio.

Essas categorias não são excludentes. Uma pessoa pode ser atleta, torcida e diretora ao mesmo tempo.

---

### 4.2 Preenchimento da própria disponibilidade

Cada pessoa da delegação poderá acessar o app e preencher sua disponibilidade nos três dias do evento.

A disponibilidade será organizada em slots de 30 minutos.

Exemplo:

| Dia | Horário | Status |
|---|---:|---|
| Dia 1 | 08h00 | Disponível |
| Dia 1 | 08h30 | Disponível |
| Dia 1 | 09h00 | Competindo |
| Dia 1 | 09h30 | Competindo |
| Dia 1 | 10h00 | Competindo |
| Dia 1 | 10h30 | Indisponível |
| Dia 1 | 11h00 | Disponível |

A pessoa poderá marcar os horários como:

- disponível;
- indisponível;
- competindo;
- em deslocamento;
- descanso;
- outro.

O sistema também poderá bloquear automaticamente horários em que a pessoa estiver vinculada como atleta em uma modalidade ou jogo.

---

### 4.3 Agenda de modalidades e jogos

O sistema deve permitir cadastrar a programação do EP antes do evento.

A agenda será formada por eventos em slots de 30 minutos, podendo representar:

- jogos;
- lutas;
- provas;
- baterias;
- finais;
- semifinais;
- atividades da torcida;
- deslocamentos importantes;
- eventos gerais da delegação.

Cada evento deve ter:

- modalidade;
- nome do evento;
- dia;
- horário de início;
- horário de fim;
- local;
- adversário, quando houver;
- fase da competição;
- prioridade;
- status;
- quantidade desejada de torcida;
- atletas envolvidos;
- capitão de torcida;
- materiais vinculados.

---

### 4.4 Avanço de fase e jogos condicionais

Como a tabela pode mudar dependendo do avanço dos atletas ou times, o sistema deve permitir criar eventos condicionais.

Exemplo:

> Futsal masculino — semifinal  
> Status: condicionado à classificação

Esses eventos podem ter status como:

- confirmado;
- possível;
- cancelado;
- em andamento;
- finalizado;
- adiado.

Se uma equipe avançar, o diretor poderá confirmar o próximo jogo.

Se for eliminada, poderá cancelar os eventos futuros daquela modalidade.

Isso evita precisar recriar toda a agenda durante o evento.

---

### 4.5 Prioridade das modalidades

Cada modalidade ou evento poderá ter um nível de prioridade.

Sugestão de níveis:

- baixa;
- normal;
- alta;
- crítica.

A prioridade serve para ajudar os diretores a decidir onde mandar mais torcida.

Exemplos:

- final de futsal: prioridade crítica;
- jogo classificatório de uma modalidade com pouca torcida: prioridade alta;
- treino ou jogo menos relevante: prioridade baixa.

O dashboard deve destacar eventos prioritários, principalmente quando houver pouca torcida alocada.

---

### 4.6 Alocação de pessoas para torcida

Os diretores poderão selecionar um evento e alocar pessoas disponíveis para ele.

O sistema deve mostrar automaticamente quem está livre naquele horário, considerando:

- disponibilidade informada pela pessoa;
- horários em que ela compete;
- eventos em que já foi alocada;
- check-ins já realizados;
- status manual;
- eventuais conflitos.

Cada alocação deve registrar:

- pessoa;
- evento;
- horário;
- função;
- status da alocação.

Funções possíveis:

- torcedor;
- capitão de torcida;
- responsável por material;
- apoio;
- diretor acompanhando;
- atleta torcendo.

O sistema deve alertar se o diretor tentar colocar uma pessoa em dois eventos ao mesmo tempo.

---

### 4.7 Check-in

O sistema pode ter check-in para confirmar presença real da pessoa em determinado evento ou local.

A pessoa poderá fazer check-in em:

- jogo;
- modalidade;
- local;
- atividade da torcida.

O check-in pode registrar:

- pessoa;
- evento;
- horário;
- local;
- status;
- observação.

Status possíveis:

- presente;
- ausente;
- a caminho;
- saiu do local.

No MVP, o check-in pode ser simples: a pessoa abre o evento e clica em **Estou aqui**.

Para evitar bagunça, o sistema pode permitir que apenas pessoas alocadas façam check-in naquele evento, ou permitir check-in livre com validação posterior dos diretores.

---

### 4.8 Gestão de capitães de torcida

Os diretores poderão definir capitães para cada evento.

O capitão será uma pessoa responsável por coordenar a torcida naquele local.

Cada evento pode ter:

- nenhum capitão;
- um capitão;
- mais de um capitão.

O sistema deve mostrar:

- quem é o capitão;
- em qual local ele está;
- qual evento ele está coordenando;
- quantas pessoas estão alocadas com ele;
- quais materiais estão sob sua responsabilidade.

---

### 4.9 Gestão de materiais

Os materiais serão cadastrados individualmente, mesmo quando existirem vários do mesmo tipo.

Exemplos:

- Bumbo 01;
- Bumbo 02;
- Megafone 01;
- Bandeira 01;
- Bandeirão;
- Faixa Engenharia;
- Caixa de água 01.

Cada material deve ter:

- nome;
- tipo;
- código ou identificação;
- status;
- responsável atual;
- local atual;
- evento vinculado;
- observações.

Status possíveis:

- disponível;
- em uso;
- com responsável;
- em transporte;
- guardado;
- perdido;
- danificado.

Como os materiais são individuais, o sistema deve evitar que o mesmo material seja vinculado a dois eventos ao mesmo tempo.

---

## 5. Funcionamento offline first

Como talvez não haja internet boa durante o evento, o app deve ser pensado como offline first.

Isso significa que o usuário deve conseguir:

- abrir dados já carregados anteriormente;
- ver agenda salva no aparelho;
- alterar disponibilidade;
- fazer check-in;
- registrar movimentação de material;
- fazer alocações, no caso dos diretores;
- salvar alterações localmente mesmo sem internet.

Quando a internet voltar, o app deve sincronizar os dados com o servidor.

---

### 5.1 Sincronização

O sistema deve manter uma fila local de alterações pendentes.

Exemplos de ações pendentes:

- Gabriel marcou disponibilidade às 10h;
- Pedro fez check-in no futsal;
- Diretor alocou Maria no vôlei;
- Bumbo 01 foi movido para o ginásio principal.

Se estiver offline, essas ações ficam salvas no dispositivo.

Quando a conexão retornar, o sistema envia as alterações para o backend.

---

### 5.2 Conflitos de sincronização

Como várias pessoas podem editar dados, podem ocorrer conflitos.

Exemplo:

> Diretor A aloca João no futsal às 10h.  
> Diretor B, offline, aloca João no vôlei às 10h.

Quando sincronizar, o sistema deve detectar conflito.

Para o MVP, a resolução pode seguir esta lógica:

- dados pessoais, como disponibilidade, podem ser sobrescritos pela última alteração da própria pessoa;
- alocações conflitantes devem gerar alerta para diretores;
- materiais duplicados em locais diferentes devem gerar alerta;
- check-ins podem ser mantidos como histórico, sem sobrescrever.

---

## 6. Dashboard dos diretores

A tela mais importante para os diretores será o dashboard.

Ela deve mostrar a situação operacional do evento.

Informações principais:

- eventos acontecendo agora;
- próximos eventos;
- pessoas disponíveis agora;
- pessoas ocupadas;
- pessoas alocadas por evento;
- pessoas com check-in confirmado;
- eventos prioritários;
- eventos com pouca torcida;
- capitães ativos;
- materiais em uso;
- conflitos de horário;
- alterações pendentes de sincronização.

Exemplo:

```txt
Dia 2 — 14h30

Futsal masculino — semifinal
Prioridade: crítica
Torcida desejada: 80
Alocados: 54
Check-in: 37
Status: precisa de mais torcida

Vôlei feminino
Prioridade: alta
Torcida desejada: 40
Alocados: 42
Check-in: 30
Status: ok

Judô
Prioridade: normal
Atletas competindo: 3
Torcida: 12
Status: ok
```

---

## 7. Telas do app

### 7.1 Tela inicial da delegação

Para usuários comuns.

Mostra:

- agenda do dia;
- eventos acontecendo agora;
- próximos jogos;
- onde a pessoa foi alocada;
- botão para preencher disponibilidade;
- botão para fazer check-in;
- avisos gerais.

---

### 7.2 Minha disponibilidade

Tela onde cada pessoa informa quando está disponível.

Organização por:

- Dia 1;
- Dia 2;
- Dia 3.

Com slots de 30 em 30 minutos.

A pessoa pode marcar rapidamente vários horários como disponível ou indisponível.

---

### 7.3 Agenda geral

Tela com todos os eventos.

Filtros:

- dia;
- horário;
- modalidade;
- local;
- prioridade;
- status.

---

### 7.4 Detalhe do evento

Tela de um jogo ou modalidade.

Mostra:

- nome;
- modalidade;
- horário;
- local;
- adversário;
- prioridade;
- status;
- capitão;
- atletas envolvidos;
- torcida alocada;
- pessoas com check-in;
- materiais vinculados.

Usuário comum pode ver o evento e fazer check-in.

Diretor pode editar, alocar pessoas e vincular materiais.

---

### 7.5 Dashboard da diretoria

Tela administrativa para tomada de decisão.

Mostra visão geral de pessoas, eventos, materiais e alertas.

---

### 7.6 Alocação de torcida

Tela para diretores.

Fluxo:

1. selecionar evento;
2. ver necessidade de torcida;
3. ver pessoas disponíveis;
4. selecionar pessoas;
5. definir funções;
6. salvar alocação.

---

### 7.7 Materiais

Tela para controle dos materiais individuais.

Permite:

- cadastrar material;
- editar status;
- vincular a evento;
- definir responsável;
- mudar local;
- marcar como perdido ou danificado.

---

### 7.8 Administração

Tela para administradores.

Permite:

- gerenciar usuários;
- gerenciar permissões;
- importar agenda;
- cadastrar modalidades;
- cadastrar locais;
- ajustar configurações gerais.

---

## 8. Regras de negócio

- Uma pessoa pode ser atleta e torcida ao mesmo tempo.
- Uma pessoa pode preencher sua própria disponibilidade.
- Diretores podem visualizar e organizar a disponibilidade geral.
- A agenda oficial pode ser cadastrada antes do evento.
- Eventos futuros podem ser condicionais ao avanço de fase.
- Os horários serão organizados em slots de 30 minutos.
- Modalidades e eventos podem ter prioridade.
- Uma pessoa não deve ser alocada em dois eventos no mesmo horário.
- Um atleta deve aparecer como indisponível enquanto estiver competindo.
- Após o fim da competição, o atleta pode voltar a aparecer como disponível.
- Uma pessoa pode fazer check-in em eventos.
- Diretores podem acompanhar presença real por check-in.
- Materiais são controlados individualmente.
- Um material não deve estar em dois lugares ao mesmo tempo.
- O app deve funcionar mesmo com internet instável.
- Alterações feitas offline devem ser sincronizadas quando a conexão voltar.
- Conflitos devem ser exibidos para a diretoria resolver.

---

## 9. Modelo inicial de permissões

### 9.1 Usuário comum

Pode:

- ver agenda;
- preencher própria disponibilidade;
- fazer check-in;
- ver sua própria alocação;
- ver informações gerais dos eventos.

---

### 9.2 Diretor

Pode fazer tudo que usuário comum faz.

Também pode:

- ver disponibilidade de todos;
- alocar pessoas;
- editar eventos;
- definir capitães;
- controlar materiais;
- ver dashboard operacional;
- resolver conflitos.

---

### 9.3 Admin

Pode fazer tudo que diretor faz.

Também pode:

- gerenciar usuários;
- importar dados;
- configurar o evento;
- definir permissões.

---

## 10. Stack técnica recomendada

Como o projeto será feito em TypeScript e rodará na Vercel, a stack recomendada é:

- **Next.js com App Router**, para frontend e backend no mesmo projeto;
- **TypeScript** em todo o projeto;
- **PostgreSQL** como banco principal;
- **Prisma** para ORM;
- **Supabase**, **Neon** ou **Vercel Postgres** para hospedar o banco;
- **Vercel** para deploy;
- **Tailwind CSS** para estilização;
- **shadcn/ui** para componentes;
- **Zod** para validação;
- **React Hook Form** para formulários;
- **TanStack Query** para cache e sincronização de dados;
- **IndexedDB** no navegador para modo offline;
- **Dexie.js** para facilitar o uso do IndexedDB;
- **Service Worker / PWA** para cache offline.

Para autenticação:

- **Auth.js**, se quiser algo mais robusto;
- ou login por telefone/e-mail com código simples no MVP.

---

## 11. Banco de dados — entidades principais

### 11.1 User

Representa o login no sistema.

Campos:

- `id`;
- `name`;
- `email`;
- `phone`;
- `role`;
- `createdAt`;
- `updatedAt`.

---

### 11.2 Person

Representa a pessoa na delegação.

Campos:

- `id`;
- `userId`;
- `name`;
- `nickname`;
- `phone`;
- `isAthlete`;
- `isSupporter`;
- `isDirector`;
- `notes`.

---

### 11.3 Modality

Representa uma modalidade.

Campos:

- `id`;
- `name`;
- `category`;
- `type`;
- `priority`;
- `notes`.

---

### 11.4 Event

Representa jogo, luta, prova ou atividade.

Campos:

- `id`;
- `modalityId`;
- `title`;
- `description`;
- `day`;
- `startTime`;
- `endTime`;
- `locationId`;
- `opponent`;
- `phase`;
- `priority`;
- `desiredSupportersCount`;
- `status`;
- `isConditional`;
- `createdAt`;
- `updatedAt`.

---

### 11.5 AvailabilitySlot

Representa a disponibilidade da pessoa em um slot de 30 minutos.

Campos:

- `id`;
- `personId`;
- `day`;
- `startTime`;
- `endTime`;
- `status`;
- `source`;
- `notes`.

O campo `source` pode indicar se a disponibilidade foi informada pela própria pessoa, pelo sistema ou por um diretor.

---

### 11.6 Assignment

Representa a alocação de uma pessoa para um evento.

Campos:

- `id`;
- `personId`;
- `eventId`;
- `role`;
- `status`;
- `assignedBy`;
- `createdAt`;
- `updatedAt`.

---

### 11.7 CheckIn

Representa presença confirmada.

Campos:

- `id`;
- `personId`;
- `eventId`;
- `checkedAt`;
- `status`;
- `notes`.

---

### 11.8 Material

Representa um material individual.

Campos:

- `id`;
- `name`;
- `type`;
- `code`;
- `status`;
- `currentLocationId`;
- `responsiblePersonId`;
- `currentEventId`;
- `notes`.

---

### 11.9 Location

Representa um local do evento.

Campos:

- `id`;
- `name`;
- `address`;
- `description`;
- `notes`.

---

### 11.10 SyncOperation

Representa alterações feitas offline e pendentes de sincronização.

Campos:

- `id`;
- `userId`;
- `entityType`;
- `entityId`;
- `operationType`;
- `payload`;
- `status`;
- `createdAt`;
- `syncedAt`.

---

## 12. MVP recomendado

Eu dividiria o MVP em três blocos.

### MVP 1 — Base do sistema

- Cadastro de pessoas;
- Cadastro de modalidades;
- Cadastro de locais;
- Cadastro de eventos;
- Agenda dos três dias;
- Login básico;
- Permissões de usuário comum, diretor e admin.

---

### MVP 2 — Operação da torcida

- Disponibilidade em slots de 30 minutos;
- Alocação de pessoas para eventos;
- Dashboard da diretoria;
- Prioridade por modalidade/evento;
- Capitães de torcida;
- Check-in em evento.

---

### MVP 3 — Offline e materiais

- Materiais individuais;
- Movimentação de materiais;
- Funcionamento offline;
- Fila de sincronização;
- Alertas de conflito.

---

## 13. Visão curta do produto

O app será uma plataforma interna da delegação da Engenharia UFRGS para organização da torcida durante o EP.

Todas as pessoas da delegação poderão acessar a agenda, preencher sua disponibilidade e realizar check-in nos eventos.

A diretoria da torcida terá acesso a um painel administrativo para visualizar a situação geral em tempo real, identificar pessoas disponíveis, alocar torcida para jogos e modalidades, definir capitães, controlar materiais e priorizar eventos importantes.

O sistema será estruturado em slots de 30 minutos, permitindo cruzar a programação oficial do campeonato com a disponibilidade individual das pessoas.

Como a tabela pode mudar conforme o avanço das equipes, o app também deverá permitir eventos condicionais e atualização rápida da agenda.

Considerando a possibilidade de internet instável durante o evento, o sistema deverá ter comportamento offline first, salvando alterações localmente e sincronizando os dados com o servidor quando houver conexão.
