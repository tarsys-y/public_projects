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
- **Engine consumido como fonte TS** (`main: src/index.ts`): o Metro transpila o
  workspace direto, sem passo de build; Jest usa ts-jest. Se um dia for publicado,
  adiciona-se `tsc` build — desnecessário para um grupo de amigos.
