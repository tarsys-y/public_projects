# PROGRESS

Acompanhamento dos milestones da SPEC.md (seção 9).

| Milestone | Status | Observações |
|---|---|---|
| M0 — Fundação | ✅ | Monorepo npm workspaces, Expo SDK 57 + expo-router (placeholder), engine com Jest + PRNG mulberry32. `npm test` e `npm run typecheck` verdes; `expo export` ok |
| M1 — Modelos + Dados | ✅ | Tipos da SPEC §3, pesos de overall por posição, 8 formações (vizinhos por distância), 20 funções, fit e química testados. Seed: 64 jogadores curados + 270 fillers determinísticos + 349 cartas no catálogo; `data:validate` verde |
| M2 — Motor de Simulação | ✅ | Tick a tick com PRNG seedado, notas ao vivo + snowflake, momentos de decisão, substituições, intervenções (re-sim com prefixo idêntico), CLI `npm run sim`. Aceite: mesma seed = idêntico; 1.000 sims iguais → 34,7/30,0/35,3; 85 vence 75 em 76,5%; cobertura 95% em `sim/` |
| M3 — Meu Time + Cartas | ✅ | Abas Início/Meu Time/Coleção/Partida; campo 2D com slots (tap-to-select), formação, função com % fit, painel de tática, química por jogador/time em tempo real; Detalhe da Carta com radar e projeção de envelhecimento; Coleção com filtros e duplicatas. Persistência AsyncStorage (zustand persist); coleção demo Flamengo+Palmeiras. Aceite via 8 testes da lógica de escalação + typecheck + expo export |
| M4 — Partida ao Vivo | ✅ | Amistoso vs IA (adversário automático por clube): playback dos eventos com timing (90'→~4min) e modo rápido (~30s só texto), placar/tempo, campo com nota do momento por jogador, bottom sheet com snowflake ao vivo (verde/vermelho), ajustes táticos e substituições ao vivo, modal de Momento de Decisão com re-sim de mesma seed. Aceite via 7 testes de integração do fluxo + typecheck + expo export |
| M5 — Pacotes + Evolução | ✅ | Loja com pacotes básico/premium, abertura com suspense por raridade, pity visível (40 lendária / 400 ícone), evolução por duplicatas+coins nos atributos-chave, objetivos diários, recompensas de partida. Engine packs/economy com 13 testes; loop completo coberto por teste de integração |
| M6 — Carreira PvE | ✅ | Aba Liga: carreira em qualquer uma das 10 ligas reais (clube com escudo), calendário round-robin duplo determinístico, tabela com critérios do Brasileirão, jogar rodada ao vivo (tela de Partida) ou simular; demais jogos simulados pela IA. Virada de temporada: premiação por colocação (campeão +200 gems), envelhecimento SPEC 4.4 com aposentadorias (cartas viram colecionáveis não-escaláveis). Aceite: teste de integração completa uma temporada de 38 rodadas |
| M7 — Online (Firebase) | 🔶 pronto p/ ativar | Código completo atrás de EXPO_PUBLIC_FIREBASE_*: auth anônimo, Liga de Amigos (código de convite, calendário derivado determinístico, partidas assíncronas por seed compartilhada), mercado (leilão com lance mínimo/compre-já, liquidação no refresh, taxa 5%), firestore.rules e Cloud Functions prontas p/ Blaze. Falta: usuário criar o projeto e colar a config (docs/SETUP-FIREBASE.md) + teste em 2 aparelhos |
| M8 — Cartas Vivas + Polish | 🔶 quase completo | TOTW/"Em Alta" dinâmico, eventos semanais, sons+haptics (WAVs sintetizados substituíveis), animação de gol, onboarding e Perfil do Técnico com conquistas. Falta: publish de patch via Firestore (depende do M7 ativado) |

## Extras além dos milestones (jul/2026)

- Base 2026: transferências reais jan–jun/26 via patch pesquisado na web; Série A 2026 real (Chapecoense/Remo).
- 41 Ícones lendários + 25 Momentos Épicos.
- Eventos semanais rotativos com pacote temático e objetivos que pagam cartas exclusivas.
- FM: forma/moral, copa mata-mata de 16 na carreira, treino de jovens, clássicos com bônus.
- UT: SBCs (8 desafios) e Modo Draft com gauntlet de 4 partidas.
- Artes das cartas: avatar cartunesco SVG determinístico por jogador (feições por hash do id, camisa nas cores reais do clube, ícones com kit dourado).
