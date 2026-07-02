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
