# DECISIONS

Decisões de design tomadas quando a SPEC.md deixou margem, sempre pela opção
mais simples que preserva a diversão (SPEC seção 10.8).

## 2026-07-02 — Fundação

- **Expo SDK 57 (template `default`)** em vez de fixar versões à mão: o template
  oficial garante versões compatíveis de react-native/reanimated/router.
  Rotas ficam em `apps/mobile/src/app` (padrão do template), não em
  `apps/mobile/app` como o rascunho da SPEC — mesma semântica, só o prefixo `src/`.
- **`react-compiler` desativado** no `app.json`: experimento do template que não
  agrega ao projeto agora e adiciona risco de build.
## 2026-07-02 — Motor de Simulação (M2)

- **`baseChanceProb` calibrado em 0.15** (o rascunho da SPEC sugeria 0.075):
  com 0.075 a média era ~0,5 gol/time e ~48% de empates, violando o aceite
  33/33/33 (±5pp). Todas as constantes ficaram em `config.ts`.
- **Sorteio do finalizador com peso quadrático + fator por grupo posicional**
  (ATT 2.5 / MID 1.1 / DEF 0.35): sem isso, volantes e zagueiros finalizavam
  mais da metade das chances e partidas com elencos reais morriam em 0 a 0.
  Invariante para os testes de times uniformes.
- **Re-simulação como mecanismo de interatividade**: decisões/substituições do
  usuário são `interventions` passadas a um novo `simulateMatch` com a mesma
  seed — os eventos anteriores ao minuto da intervenção são provadamente
  idênticos (teste), então a UI só "continua" a partida.
- **IA decide na hora** (`aiChoiceId`) e faz trocas de ofício aos 60'/75';
  o lado do usuário nunca tem decisão automática.
- **Lesão leve** tenta substituição automática; sem janela/banco, o jogador
  segue em campo com penalidade de 15% nos multiplicadores.

## 2026-07-02 — Modelos + Dados (M1)

- **Vizinhos táticos derivados por distância** entre coordenadas dos slots
  (threshold único em `formations.ts`), em vez de tabelas manuais por formação:
  uma regra só, consistente nas 8 formações, coberta por teste de simetria.
- **Fillers em `players-filler.json`** separado do `players.json` curado: o
  patch do grupo edita só o curado; regenerar fillers nunca sobrescreve curadoria.
- **Ícones vivem em `players.json`** num pseudo-clube `icons` (liga `legends`)
  e só existem no catálogo como carta `icon` congelada — não geram carta base.
- **Funções de GK** usam pesos sobre `GkAttributes` (o tipo `RoleAttributeWeights`
  aceita chaves de linha e de goleiro); a SPEC tipava só linha, mas gk_classic e
  gk_sweeper precisam ler reflexes/rushingOut etc.
- **Raridade da carta base por overall:** ≥88 legendary, ≥83 epic, ≥77 rare,
  senão common (`config.baseCardRarity`) → distribuição saudável no catálogo
  (168 common / 115 rare / 40 epic / 16 legendary / 10 icon).

- **Engine consumido como fonte TS** (`main: src/index.ts`): o Metro transpila o
  workspace direto, sem passo de build; Jest usa ts-jest. Se um dia for publicado,
  adiciona-se `tsc` build — desnecessário para um grupo de amigos.
