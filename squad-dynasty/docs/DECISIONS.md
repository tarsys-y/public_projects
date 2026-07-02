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
## 2026-07-02 — Carreira PvE (M6)

- **Sem vantagem de mando no engine**: a partida do usuário sempre simula com
  ele como 'home' (a tela de Partida assume isso); o placar é gravado na
  orientação do fixture para a tabela. Vantagem de mando real fica para um
  passe de balanceamento futuro.
- **Rodada fecha junto com o jogo do usuário**: os outros 9 jogos são
  simulados na hora (IA×IA, seeds derivadas da temporada — determinístico).
  Elencos da IA são cacheados por temporada em memória.
- **Envelhecimento roda no cliente** na virada (determinístico por seed);
  aposentados ficam em 'retired' no collectionStore e somem dos candidatos
  de escalação.
- **Carreira em qualquer liga**: fixtures genéricos por nº par de clubes
  (MLS com 30 clubes → 58 rodadas).

## 2026-07-02 — Cartas premium + abertura cinematográfica

- **Gradientes 100% via react-native-svg** (`Defs`/`LinearGradient`): nada de
  expo-linear-gradient — zero dependência nova, e o mesmo SVG desenha textura,
  moldura metálica e sheen.
- **Tema visual centralizado em `services/cardTheme.ts` (puro)**: mapa
  (version, rarity) → gradientes/moldura/textura/tipografia. Versão especial
  (inform/epic_moment/icon) vence a raridade. UI só consome.
- **Sweep foil animado é opt-in** (`animateSheen`) e nunca liga em listas —
  só no detalhe da carta (lg), no reveal do pacote e na cinemática. Coleção
  usa o sheen estático (barato).
- **Reveal "melhores por último"** (packSequence puro): build-up estilo
  Pokémon TCG Pocket; o backdrop da abertura é SEMPRE neutro — a cor da
  melhor carta não vaza antes do flip (o modal antigo vazava).
- **Cinemática restrita a legendary/icon/epic_moment**: inform (TOTW) fica no
  tier "big" (flash+confete) para a cinemática continuar especial.
- **Campo `moment` opcional** na carta (flavor text): curado nas 25 epic
  moments (referência ao feito real) e `bio` nos 41 ícones; TOTW dinâmicas
  usam fallback de `momentText()`. Válido no zod, repassado por
  generate-cards — nunca obrigatório.

## 2026-07-02 — Artes das cartas (avatares cartunescos)

- **Avatar SVG procedural em vez de fotos**: não há fonte de retratos
  licenciável/acessível e 4.700+ imagens inflariam o bundle. As feições
  (tom de pele, cabelo, barba) derivam de hashes independentes do id do
  jogador (`services/avatar.ts` puro + `PlayerAvatar.tsx`) — a mesma cara em
  qualquer aparelho, sem rede. Feições NÃO tentam imitar o jogador real.
- **Camisa nas cores reais do clube** (primária/secundária de `clubs.json`);
  cartas ícone vestem kit dourado próprio das lendas.
- **Hash por feição com salt** (`id:skin`, `id:hair-style`, ...): adicionar ou
  remover uma feição no futuro não muda as demais caras já conhecidas.

## 2026-07-02 — M8 polish + M7 preparado

- **Sons sintetizados por script** (WAVs de apito/gol/flip/sting/vitória):
  sem fonte externa acessível; qualidade básica, substituível por patch de
  assets. Sempre atrás do serviço feedback com toggles persistidos.
- **Online 100% opcional**: firebase.ts só inicializa com
  EXPO_PUBLIC_FIREBASE_* no .env; sem config o app é idêntico ao offline.
- **M7 "lite" sem Blaze**: sorteios/liquidações no cliente com regras de
  segurança e confiança entre amigos (desvio consciente da SPEC 10.4); as
  Cloud Functions anti-fraude estão prontas em functions/ para quando o
  usuário ativar o Blaze (EXPO_PUBLIC_USE_FUNCTIONS=1).
- **Liga de amigos determinística**: calendário derivado de membros+seed
  (nunca persistido) e seed de confronto por hash — quem joga primeiro grava
  o resultado imutável; o outro reproduz a mesma partida.
- **Mercado com liquidação no refresh**: moedas são locais por aparelho, então
  créditos/reembolsos/resgates acontecem quando cada um abre o mercado.

## 2026-07-02 — Lendas, Eventos, FM e SBC/Draft

- **Eventos semanais offline**: a semana ISO do relógio escolhe o evento do
  catálogo (engine/events) — determinístico em qualquer aparelho, sem servidor.
  Pacote do evento = pool do tema + cartas "Em Alta" da rodada, com odds epic+
  multiplicadas.
- **TOTW/"Em Alta" antecipado do M8**: o XI da rodada da carreira vira cartas
  "inform" dinâmicas (+2 nos atributos-chave, raridade +1 tier, frozen: true —
  desvio consciente da SPEC, que congela só epic_moment/icon: inform é snapshot).
  Cartas dinâmicas ficam num store persistido e entram no catálogo via
  getCatalog()/getAllCards() — os fluxos de coleção usam SEMPRE os getters.
- **Elencos 2026 por pesquisa web com fontes**: patch só com transferências
  oficializadas; rumores ficam fora. Série A 2026 corrigida (Chapecoense/Remo).
- **Forma/moral**: multiplicador 0.95–1.05 derivado das últimas 5 notas do
  jogador nas partidas jogadas pelo usuário; aplicado via resolveSquad(options).
- **Copa mata-mata de 16** intercalada após as rodadas 8/16/24/32; empate
  decide nos pênaltis (sorteio ponderado por bigGame+composure). Eliminado =
  copa segue sozinha; temporada nunca trava.
- **Clássicos**: tabela curada de rivalidades; derby liga o bigGame desde o
  1º minuto e paga bônus na vitória.
- **Treino**: foco por categoria só para jovens (≤23), chance determinística
  de +1 por rodada — complementa (não substitui) a evolução por duplicatas.
- **SBC consome cartas de verdade** (aviso destrutivo na UI); desafios não
  repetíveis ficam marcados. **Draft** usa cartas emprestadas; derrota encerra
  a série (estilo UT) e o prêmio escala por vitórias.

## 2026-07-02 — Pacotes + Evolução (M5)

- **Sorteio no cliente até o M7**: openPack roda no engine com seed do relógio;
  a migração para Cloud Function (SPEC 10.4) acontece no M7 sem mudar a API.
- **Pity por PACOTE** (não por carta), contadores persistidos e visíveis na
  Loja; garantia do pacote (básico ≥rare, premium ≥epic) trocando a última carta.
- **Evolução consome as duplicatas mais recentes**; se uma duplicata consumida
  estava escalada, o slot esvazia (a UI lida com slot vazio naturalmente).
- **Saldo inicial 3.000 coins + 50 gems** para o novo jogador sentir o loop
  de pacotes imediatamente.

## 2026-07-02 — Base real de 10 ligas

- **Fonte de stats: dataset EA FC 26** (update 4, set/2025 — temporada 25/26),
  importado por `import-fc26.ts` a partir de `sources/fc26-trimmed.csv`
  (commitado; o pipeline não depende de rede). 9 ligas licenciadas, cap de 24
  jogadores/clube. `consistency`←reactions e `bigGame`←f(composure, reactions,
  reputação) — o FC26 não tem esses atributos.
- **Brasileirão sem licença no FC26** (jogadores fictícios) → curadoria manual
  de 237 jogadores reais (elencos 2025/26 até jan/2026, ex.: Neymar no Santos,
  Memphis no Corinthians) + fillers completando até 18 por clube. Clubes da
  Série A 2026 com melhor conhecimento disponível (Coritiba/Athletico-PR no
  lugar de Sport/Juventude) — lista é patchável em `clubs.json`.
- **Base em 4 arquivos**: `players.json` (só ícones), `players-br.json`
  (curado editável), `players-real.json` (gerado — nunca editar),
  `players-filler.json` (gerado, só BR).
- **Escudos reais** de fontes públicas no GitHub: Europa em PNG
  (`luukhopman/football-logos`, 132/132) e Brasileirão em SVG
  (`williamorim/brasileirao`, 19/20 — Mirassol sem badge). MLS/Saudita sem
  fonte acessível → monograma SVG com as cores reais (`ClubCrest`). Marcas dos
  clubes: uso privado do grupo, sem distribuição comercial.
- **Home nations** usam códigos de jogo (EN/SC/WL/NI) na nacionalidade para a
  química diferenciá-las; demais países seguem ISO 3166-1 alpha-2.
- **Slugs famosos**: em colisão de short_name (irmãos Bellingham), o slug
  limpo vai para o maior overall; o resto ganha sufixo do player_id.

## 2026-07-02 — Partida ao Vivo (M4)

- **Playback sobre resultado pronto**: a partida inteira é simulada no início;
  a UI só reproduz eventos até `playbackMinute`. Decisões, tática ao vivo e
  substituições viram `interventions` e re-simulam com a MESMA seed — o
  prefixo idêntico (garantido por teste no engine e no app) faz a troca de
  resultado ser invisível para o jogador.
- **Banco automático no amistoso**: se o usuário não montou banco no Meu Time,
  o app completa com as melhores cartas não escaladas (1 GK + 6 linha).
- **Adversário da IA**: `buildAutoSquad` sobre as cartas base do clube
  escolhido (elencos completos graças aos fillers), sempre em 4-3-3.
- **Modo rápido** muda apenas a velocidade do relógio de playback (3 min de
  jogo/tick vs 0,375) e esconde o campo — o resultado é o mesmo.
- **matchStore sem persistência**: amistoso é efêmero; sair da tela descarta.

## 2026-07-02 — Meu Time + Cartas (M3)

- **Tap-to-select em vez de drag & drop** na escalação: tocar no slot abre a
  lista de candidatos ordenada por adequação; tocar numa carta escala (e troca,
  se já estava em outro slot). Mais confiável que drag em campo pequeno e
  não exige gesture-handler; drag pode ser adicionado depois sem mudar a lógica.
- **Lógica de escalação em `squadLogic.ts` puro** (sem React/AsyncStorage),
  testada em Node; os stores Zustand são só wiring + persistência. É assim que
  o aceite "overall/química em tempo real" é verificado sem emulador.
- **Química tolera elenco parcial**: `computeSquadChemistry` aceita slots null
  (vizinho vazio não conta) para a UI de montagem — o engine continua exigindo
  11 para simular.
- **Coleção demo**: cartas base de Flamengo + Palmeiras + 1 Momento Épico,
  semeada uma única vez no primeiro launch (flag `seeded` persistida).
- **Catálogo embarcado**: os JSONs de packages/data entram no bundle via
  import estático; no M7 passam a vir do Firestore (Cartas Vivas).

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
