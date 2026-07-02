# PROGRESS

Acompanhamento dos milestones da SPEC.md (seção 9).

| Milestone | Status | Observações |
|---|---|---|
| M0 — Fundação | ✅ | Monorepo npm workspaces, Expo SDK 57 + expo-router (placeholder), engine com Jest + PRNG mulberry32. `npm test` e `npm run typecheck` verdes; `expo export` ok |
| M1 — Modelos + Dados | ✅ | Tipos da SPEC §3, pesos de overall por posição, 8 formações (vizinhos por distância), 20 funções, fit e química testados. Seed: 64 jogadores curados + 270 fillers determinísticos + 349 cartas no catálogo; `data:validate` verde |
| M2 — Motor de Simulação | ✅ | Tick a tick com PRNG seedado, notas ao vivo + snowflake, momentos de decisão, substituições, intervenções (re-sim com prefixo idêntico), CLI `npm run sim`. Aceite: mesma seed = idêntico; 1.000 sims iguais → 34,7/30,0/35,3; 85 vence 75 em 76,5%; cobertura 95% em `sim/` |
| M3 — Meu Time + Cartas | ✅ | Abas Início/Meu Time/Coleção/Partida; campo 2D com slots (tap-to-select), formação, função com % fit, painel de tática, química por jogador/time em tempo real; Detalhe da Carta com radar e projeção de envelhecimento; Coleção com filtros e duplicatas. Persistência AsyncStorage (zustand persist); coleção demo Flamengo+Palmeiras. Aceite via 8 testes da lógica de escalação + typecheck + expo export |
| M4 — Partida ao Vivo | ✅ | Amistoso vs IA (adversário automático por clube): playback dos eventos com timing (90'→~4min) e modo rápido (~30s só texto), placar/tempo, campo com nota do momento por jogador, bottom sheet com snowflake ao vivo (verde/vermelho), ajustes táticos e substituições ao vivo, modal de Momento de Decisão com re-sim de mesma seed. Aceite via 7 testes de integração do fluxo + typecheck + expo export |
| M5 — Pacotes + Evolução | ⬜ | |
| M6 — Carreira PvE | ⬜ | |
| M7 — Online (Firebase) | ⬜ | |
| M8 — Cartas Vivas + Polish | ⬜ | |
