# Planilha × sistema — quem joga algo na planilha mas falta no sistema

> Revisado comparando contra **todos os 80 cadastros** (`Person`), não só os que já têm
> modalidade. Considera apenas pessoas **confirmadas** (PACOTE OK / FORMS RESPONDIDO / AINDA VAI)
> com modalidade marcada (TRUE) na planilha.

## A) Já cadastrados — falta só VINCULAR a modalidade (20 pessoas, 44 vínculos)

Existem no `Person`, mas sem (ou com menos) modalidade do que a planilha diz. Mesma operação
aditiva do sync anterior — é só adicionar.

| Pessoa (planilha) | Nome no sistema (se difere) | Já tem | ➕ Falta vincular |
|---|---|---|---|
| Julia Kelin Dentee | Julia Dentee | — | Basquete Feminino |
| Júlia Lovato Roehe | — | — | Atletismo, Handebol Feminino |
| Júlia Vebber dos Santos da Silva | — | — | Atletismo |
| Junior Matté | JUNIOR MATTE | — | Basquete Masculino |
| Kauã Gustavo Spironello | — | — | Futebol de Campo, Futsal Masculino, Handebol Masculino |
| Laís Lima Silveira | — | — | Futsal Feminino |
| Luiz Gustavo Santos Andrade | — | — | Atletismo, Futebol de Campo, Handebol Masculino, Judô, Voleibol Masculino |
| Luiza Magnus Vieira | — | — | Atletismo, Basquete Feminino |
| Mariana Machry Jacintho | — | — | Atletismo, Basquete Feminino, Futsal Feminino, Handebol Feminino |
| Matheus Jaskulski Silva | — | — | Atletismo, Futebol de Campo, Voleibol Masculino |
| Pedro Brun Tondo | — | Basquete Masculino | Handebol Masculino |
| Pedro Henrique Pires Pereira | — | — | Handebol Masculino, Tênis de Mesa Masculino, Xadrez |
| Pietro Bellagamba Rossato | Pietro Rossato | — | Atletismo |
| Rafael Kraether Genehr | — | — | Tênis de Campo Masculino, Tênis de Mesa Masculino |
| Renato Longo Makariewicz | — | — | Basquete Masculino, Handebol Masculino |
| Roberto Medeiros Dall'Agnol | Roberto Medeiros DallAgnol | — | Futebol de Campo, Futsal Masculino, Voleibol Masculino |
| Rodrigo Pires Vanzelotti | Rodrigo Vanzelotti | — | Futebol de Campo, Futsal Masculino |
| Talles de Oliveira Rodrigues | — | — | Futebol de Campo, Futsal Masculino |
| Thiago Dalla Rosa Brasil | — | — | Futebol de Campo |
| Vinicius de Oliveira Jaskulski | — | — | Basquete Masculino, Handebol Masculino, Voleibol Masculino, Vôlei de Areia Masculino |

## B) Realmente SEM cadastro (9 pessoas) — precisariam criar `Person`

Nenhum `Person` casou (nem por nome aproximado).

| Pessoa | Situação | Modalidades (planilha) |
|---|---|---|
| Ana Helena Farinha Bortolini | FORMS RESPONDIDO | Handebol Feminino, Voleibol Feminino, Vôlei de Areia Feminino |
| Emilli Behling da Silva | PACOTE OK | Atletismo, Basquete Feminino, Futsal Feminino |
| Guilherme Livi | FORMS RESPONDIDO | Basquete Masculino |
| Laura Fabrício Moojen | PACOTE OK | Atletismo, Futsal Feminino, Handebol Feminino, Voleibol Feminino |
| Luan Costa da Costa | PACOTE OK | Handebol Masculino |
| Matheus dos Reis da Silveira | AINDA VAI | Atletismo, Futebol de Campo, Futsal Masculino |
| Pedro Henrique Kumpel | PACOTE OK | Futebol de Campo, Futsal Masculino |
| Vitória Cordeiro Ramos | FORMS RESPONDIDO | Atletismo, Basquete Feminino |
| Yuri Morales Janke | PACOTE OK | Atletismo, Futebol de Campo, Futsal Masculino, Voleibol Masculino |

## C) Match a confirmar (1) — possivelmente a mesma pessoa

| Pessoa (planilha) | Possível no sistema | Modalidade | Obs |
|---|---|---|---|
| Gabriel Castelo Branco Gomes [NÃO VAI] | Gabriel Gomes | Judô | Sobrenome comum; confirmar se é a mesma pessoa antes de vincular |
