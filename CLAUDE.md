# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Este repositório contém dois projetos independentes:

1. **Raiz** — B3 Investment Dashboard (Next.js 14): screener/valuation de ações brasileiras.
2. **`squad-dynasty/`** — Squad Dynasty (Expo/React Native): jogo mobile de gestão de futebol. Fonte de verdade: `squad-dynasty/docs/SPEC.md`.

Há também `Kaggle/` (notebook isolado, sem build) e `public/dashboard-mobile.html` (artefato standalone).

---

## Projeto 1: B3 Investment Dashboard (raiz)

### Comandos

```bash
npm run dev      # Next.js em localhost:3000
npm run build    # build de produção
npm run lint     # eslint (next lint)
npm run seed     # atualiza lib/data/seeded-fundamentals.ts via brapi.dev (precisa de BRAPI_TOKEN)

# Serviço Python opcional (cálculos pesados: backtest, DCF, fatores)
cd services/quant && pip install -r requirements.txt && uvicorn main:app --reload --port 8000
```

Não há testes configurados neste projeto. Ambiente: copie `.env.example` para `.env.local`; `BRAPI_TOKEN` (grátis em brapi.dev) é a única variável obrigatória.

### Arquitetura

- **Fluxo de dados:** as rotas em `app/api/{macro,screener,stock/[ticker]}` combinam APIs externas (`lib/api/brapi.ts` para cotações B3, `lib/api/bcb.ts` para SELIC/IPCA/câmbio, `lib/api/fundamentus.ts`) com a base local `lib/data/seeded-fundamentals.ts` (fundamentals congelados do top ~100 da B3, atualizados por `npm run seed`). O screener calcula tudo **no servidor** sobre os dados seeded + preços live; cache via `export const revalidate` nas rotas (5–15 min) e `next.revalidate` nos fetches.
- **Cálculos financeiros** ficam em `lib/calculations/` — um arquivo por framework (graham, greenblatt, damodaran, quant, fusion). O Fusion Score é o composto ponderado dos demais. Cada fórmula tem fonte documentada em `docs/methodology.md`; ajustes Brasil-específicos (SELIC como risk-free, EMBI+ no CAPM, IRPJ+CSLL 34%, JCP) estão descritos no README.
- **Cliente:** telas em `app/(dashboard)/*` consomem as rotas via SWR; portfólio/watchlist vivem em localStorage (sem backend persistente).
- **`services/quant/`** (FastAPI + yfinance) é opcional e degradável: o front funciona sem ele, mas backtests e métricas de risco completas exigem o serviço (`QUANT_SERVICE_URL`).
- Path alias TypeScript: `@/*` → raiz do projeto.

---

## Projeto 2: Squad Dynasty (`squad-dynasty/`)

Jogo de gestão de futebol (Ultimate Team + Brasfoot + Football Manager) para um grupo de amigos. **Leia `docs/SPEC.md` antes de mexer** — é a fonte de verdade (modelos, fórmulas, milestones M0–M8 com critérios de aceite). Progresso por milestone em `docs/PROGRESS.md`; decisões de design em `docs/DECISIONS.md` (registre novas decisões lá).

### Comandos (rodar de `squad-dynasty/`)

```bash
npm test                 # Jest: engine (packages/engine) + lógica do app (apps/mobile)
npm run test:coverage    # cobertura do engine (aceite M2: ≥85% em src/sim/)
npm run typecheck        # tsc --noEmit em todos os workspaces
npm run start            # expo start (app mobile)
npm run data:validate    # valida os 4 arquivos de jogadores + clubs/cards (zod + refs)
npm run data:generate    # import-fc26 (CSV commitado) + fillers BR + cards.json
npm run data:crests      # baixa escudos reais (rede) + regenera src/services/crests.ts

# Simulador standalone (aceite M2)
npm run sim -- --home packages/engine/cli/fixtures/squadA.json \
               --away packages/engine/cli/fixtures/squadB.json --seed 42
# arquivos de elenco aceitam {"club": "flamengo"} (XI automático) ou 11 players explícitos;
# --runs N roda em lote e imprime distribuição V/E/D

# teste único (workspace engine)
cd packages/engine && npx jest simulate -t "mesma seed"
```

Para validar a UI sem emulador: `cd apps/mobile && npx expo export --platform web` (o bundle precisa compilar; não commitar `dist/`).

### Arquitetura (monorepo npm workspaces)

- **`packages/engine`** — TypeScript puro, zero dependência de React/Firebase. Todas as regras de jogo moram aqui, com testes em `__tests__/`. Consumido como fonte (`main: src/index.ts`): o Metro e o ts-jest transpilam direto, não há passo de build.
  - `src/config.ts` — TODAS as constantes de tuning (probabilidades, impactos de nota, custos). Balanceamento se faz aqui, nunca com números espalhados.
  - `src/models/` — tipos da SPEC §3 + formações (vizinhos táticos derivados por distância) + 20 funções.
  - `src/sim/` — simulador tick-a-tick determinístico; `src/ratings/` notas ao vivo + snowflake; `src/chemistry/` química (aceita elenco parcial para a UI); `src/rng.ts` mulberry32.
  - Interatividade por **re-simulação**: decisões/substituições do usuário viram `interventions` de `simulateMatch(input, {interventions})` com a mesma seed — eventos anteriores ao minuto da intervenção são idênticos (coberto por teste).
- **`packages/data`** — base em 4 arquivos de jogadores: `players.json` (ícones curados), `players-br.json` (Brasileirão real curado — editável, estilo patch), `players-real.json` (GERADO do dataset EA FC 26 em `sources/fc26-trimmed.csv` — nunca editar), `players-filler.json` (gerado, só completa clubes BR). `clubs.json` cobre as 10 ligas (201 clubes com cores reais); escudos reais em `assets/crests/` (135 PNG Europa + SVG BR; MLS/Saudita usam monograma via `ClubCrest`). Scripts com zod em `scripts/`.
- **`apps/mobile`** — Expo SDK 57 + expo-router (rotas em `src/app/`), Zustand + AsyncStorage. Lógica de estado testável fica pura em `src/stores/squadLogic.ts` / `matchStore.ts` (Jest em Node via `tsconfig.jest.json`); componentes SVG em `src/components/`.

### Regras invioláveis (SPEC §10)

1. Nada de React/Firebase dentro de `packages/engine`; toda regra de jogo entra lá **com teste antes da UI**.
2. Determinismo é sagrado: nunca `Math.random()` no engine — só o PRNG seedado injetado (`rng.ts`).
3. Overall e química são **sempre derivados**, nunca persistidos como fonte de verdade.
4. Sorteios sensíveis (pacotes, resultado oficial de liga, mercado) rodarão em Cloud Functions (M7) — o cliente nunca decide.
5. Commits por milestone; atualizar `docs/PROGRESS.md` ao concluir cada um; em ambiguidade, escolher a opção mais simples que preserva a diversão e registrar em `docs/DECISIONS.md`.

### Estado atual

M0–M6 concluídos + extras, tudo offline-first: base real de 10 ligas atualizada para jun/2026 (dataset EA FC 26 + patch de transferências pesquisado na web + Série A 2026 real com Chapecoense/Remo; 41 ícones lendários e 25 Momentos Épicos), Loja com gacha/pity, eventos semanais rotativos com pacote temático e TOTW "Em Alta" dinâmico (cartas inform geradas da rodada da carreira — usar SEMPRE `getCatalog()`/`getAllCards()`/`getCardById()` em vez das constantes estáticas nos fluxos de coleção), carreira PvE com copa mata-mata intercalada, forma/moral, treino de jovens e clássicos com bônus, SBCs (consomem cartas) e Modo Draft. Próximos: M7 (Firebase: auth, liga de amigos, mercado, sorteios em Cloud Functions — precisa de credenciais do usuário) e o restante do M8 (publish de patch via Firestore, sons, onboarding).
