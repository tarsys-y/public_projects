# SQUAD DYNASTY — Especificação Técnica para Implementação
> **Instruções para o Claude Code:** este documento é a fonte de verdade do projeto. Leia tudo antes de começar. Implemente **milestone por milestone** (seção 9), na ordem. Não avance de milestone sem os critérios de aceite passando. Mantenha o motor de simulação como módulo puro e testado.

---

## 1. O que é o jogo

Jogo mobile de **gestão de futebol** (o usuário NÃO controla jogadores em campo) que mistura:
- **Ultimate Team:** abrir pacotes de cartas de jogadores reais, com versões especiais e raridades
- **Brasfoot:** partidas simuladas rápidas (3–6 min), nomes reais, base de dados editável por patch
- **Football Manager:** profundidade tática (funções, instruções, decisões durante o jogo)

**Escopo:** projeto para um grupo de amigos (dezenas de usuários). Sem dinheiro real, economia 100% interna. Prioridade: diversão e competição entre amigos, não escala comercial.

**Loop central:** jogar partidas → ganhar moedas/pacotes → abrir pacotes → melhorar elenco/tática → jogar de novo.

---

## 2. Stack Técnica

| Camada | Tecnologia | Observação |
|---|---|---|
| App | **React Native + Expo + TypeScript** | Um código para iOS/Android |
| Estado | **Zustand** | Simples e suficiente |
| Navegação | expo-router | |
| Backend | **Firebase** (Auth anônimo/e-mail, Firestore, Cloud Functions) | Plano gratuito atende dezenas de usuários |
| Motor de simulação | **Pacote TypeScript puro** (`packages/engine`) | Zero dependência de React/Firebase. Determinístico com seed. Roda no cliente e em Cloud Function |
| Gráficos (campo 2D, radar) | react-native-svg + reanimated | Sem engine de jogo; é UI, não física |
| Testes | Jest (engine com alta cobertura) | |

**Arquitetura em monorepo:**
```
squad-dynasty/
├── apps/mobile/            # App Expo
│   ├── app/                # Rotas (expo-router)
│   ├── components/         # UI (CardView, PitchView, RadarChart...)
│   ├── stores/             # Zustand
│   └── services/           # Firebase, wrappers do engine
├── packages/engine/        # Motor de simulação e regras (TS puro)
│   ├── src/
│   │   ├── models/         # Tipos e schemas
│   │   ├── sim/            # Simulador de partida
│   │   ├── ratings/        # Notas ao vivo + snowflake
│   │   ├── chemistry/      # Química
│   │   ├── packs/          # Gacha + pity
│   │   ├── aging/          # Envelhecimento
│   │   └── economy/        # Moedas, mercado, evolução
│   └── __tests__/
├── packages/data/          # Base de dados de jogadores (JSON) + scripts de patch
│   ├── players.json
│   ├── clubs.json
│   └── scripts/validate.ts
└── docs/SPEC.md            # Este documento
```

---

## 3. Modelos de Dados (TypeScript)

```ts
// packages/engine/src/models/player.ts
export type Position = 'GK'|'CB'|'LB'|'RB'|'CDM'|'CM'|'CAM'|'LM'|'RM'|'LW'|'RW'|'ST';

export interface OutfieldAttributes {
  // Ritmo
  acceleration: number; sprintSpeed: number;
  // Finalização
  finishing: number; shotPower: number; heading: number; offPositioning: number;
  // Passe
  shortPass: number; longPass: number; crossing: number; vision: number;
  // Drible
  dribbling: number; ballControl: number; agility: number;
  // Defesa
  marking: number; tackling: number; interceptions: number; defPositioning: number;
  // Físico
  strength: number; stamina: number; jumping: number;
  // Mental (TODOS visíveis — não há atributos ocultos)
  composure: number; consistency: number; bigGame: number;
}

export interface GkAttributes {
  reflexes: number; handling: number; rushingOut: number;
  kicking: number; gkPositioning: number;
  composure: number; consistency: number; bigGame: number;
}

// Jogador do mundo real (base de dados editável — packages/data/players.json)
export interface BasePlayer {
  id: string;               // slug estável, ex: "vinicius-junior"
  name: string;
  nationality: string;      // código ISO, ex: "BR"
  clubId: string;           // ref a clubs.json
  leagueId: string;
  birthYear: number;
  positions: Position[];    // primeira é a principal
  attributes: OutfieldAttributes | GkAttributes;
}

export type CardVersion = 'base' | 'inform' | 'epic_moment' | 'icon';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'icon';

// Definição de uma carta (catálogo — o que pode vir em pacote)
export interface CardDefinition {
  id: string;                     // ex: "mbappe-wc2018"
  basePlayerId: string;
  version: CardVersion;
  rarity: Rarity;
  label?: string;                 // ex: "Copa 2018", "Champions 2015"
  attributes: OutfieldAttributes | GkAttributes; // snapshot (versões especiais congelam o auge)
  frozen: boolean;                // true para epic_moment e icon (não envelhecem nem recebem patch)
}

// Carta que um usuário possui (instância)
export interface OwnedCard {
  id: string;                     // uuid
  ownerId: string;
  cardDefId: string;
  age: number;                    // avança com as temporadas do jogo (se !frozen)
  attributeDeltas: Partial<OutfieldAttributes>; // acumulado de evolução + envelhecimento
  evolutionLevel: number;         // 0–6
  starterStreak: number;          // partidas consecutivas como titular (entrosamento)
  acquiredAt: number;
}

// Overall: calculado, nunca armazenado como fonte de verdade.
// Média ponderada dos atributos pela posição principal (pesos em models/overallWeights.ts)
```

```ts
// packages/engine/src/models/squad.ts
export type RoleId =
  | 'gk_classic' | 'gk_sweeper'
  | 'cb_stopper' | 'cb_ball_playing' | 'libero'
  | 'fb_defensive' | 'fb_wingback'
  | 'dm_anchor' | 'dm_deep_playmaker'
  | 'cm_box_to_box' | 'cm_playmaker' | 'cm_destroyer'
  | 'am_classic_10' | 'am_shadow_striker'
  | 'w_inverted' | 'w_touchline'
  | 'st_target_man' | 'st_poacher' | 'st_false9' | 'st_pressing_forward';

export interface RoleDefinition {
  id: RoleId;
  validPositions: Position[];
  keyAttributes: Partial<Record<keyof OutfieldAttributes, number>>; // pesos p/ fit 0–1
}

export interface SquadSlot { position: Position; role: RoleId; ownedCardId: string; }

export interface Tactics {
  mentality: 1|2|3|4|5;          // 1=ultra-defensivo ... 5=ultra-ofensivo
  width: 1|2|3;
  defensiveLine: 1|2|3;
  pressing: 1|2|3;
  passStyle: 'short'|'direct';
  attackFocus: 'center'|'flanks';
}

export interface Squad {
  formation: string;             // ex: "4-3-3", de formations.ts
  starters: SquadSlot[];         // 11
  bench: string[];               // até 7 ownedCardIds
  tactics: Tactics;
}
```

**Firestore (coleções):** `users`, `ownedCards`, `squads`, `leagues` (ligas de amigos: membros, calendário, tabela), `matches` (resultado + seed + eventos para replay), `marketListings`, `packOpenings` (auditoria + contador de pity por usuário).

**Base de dados de jogadores:** `packages/data/players.json` é editável pelo grupo (patch estilo Brasfoot). Um script `validate.ts` valida schema e faixas (0–99). Atualizar o JSON e publicar = "Cartas Vivas" (cartas base não-frozen recebem os novos atributos; deltas de evolução são preservados por cima).

---

## 4. Regras de Cálculo

### 4.1 Fit de função (role fit)
```
fit = Σ(atributo_normalizado × peso) / Σ(pesos)        // 0..1
multiplicadorFit = 0.85 + 0.15 × fit                    // 0.85 a 1.00
```
Jogar fora das `validPositions` da função: multiplicador extra de 0.80.

### 4.2 Química (por titular, 0–100)
- Mesmo clube que ≥1 vizinho tático*: +25 | Mesma nacionalidade que ≥2 titulares: +25
- Mesma liga que ≥5 titulares: +15 | Conexão de estilos (pares de funções sinérgicas, tabela em `chemistry/synergies.ts`): +15
- Entrosamento: `min(20, starterStreak × 1)` → +0 a +20
- `multiplicadorQuimica = 0.90 + 0.15 × (quimica/100)` → 0.90 a 1.05

*Vizinhos táticos = slots adjacentes na formação (mapa em `formations.ts`).

### 4.3 Atributo efetivo em partida
```
efetivo = base+deltas × multiplicadorFit × multiplicadorQuimica × fadiga(stamina, minuto)
```

### 4.4 Envelhecimento (rodado ao virar cada temporada do jogo, só cartas !frozen)
| Idade | Efeito por temporada |
|---|---|
| ≤ 21 | +1 a +3 em 2–4 atributos aleatórios (viés p/ atributos-chave da posição) |
| 22–24 | +0 a +2 |
| 25–29 | sem mudança |
| 30–32 | −1 a −2 em Ritmo/Físico |
| 33–35 | −2 a −4 em Ritmo/Físico, −1 técnico; mentais intactos |
| 36+ | chance de aposentadoria: 25% aos 36, +15%/ano. Ao aposentar, carta vira item de coleção "Aposentado" (não escalável) e o jogador pode ganhar CardDefinition `icon` futura |

### 4.5 Pacotes (gacha)
| Raridade | Prob. |
|---|---|
| common 70% | rare 22% | epic 6.5% | legendary 1.4% | icon 0.1% |

- **Pity:** contador por usuário; a cada 40 pacotes sem legendary+, o 40º garante legendary (contador visível na UI). Icon tem pity próprio de 400.
- Versões `epic_moment` só aparecem em raridades epic+ e em pacotes de evento.
- Sorteio SEMPRE em Cloud Function (anti-fraude), gravado em `packOpenings`.

### 4.6 Evolução
Evoluir +1 overall custa: N duplicatas da mesma carta (1,1,2,2,3,3 por nível) + itens de treino + moedas. Deltas aplicados nos atributos-chave da posição.

---

## 5. Motor de Simulação de Partida (`packages/engine/src/sim`)

**Requisitos:** determinístico (PRNG com seed — usar mulberry32), puro, síncrono, e emite **eventos minuto a minuto** para a UI reproduzir como "ao vivo".

### 5.1 Estrutura
```ts
export interface MatchInput { home: ResolvedSquad; away: ResolvedSquad; seed: number; }
export interface MatchEvent { minute: number; type: MatchEventType; playerId?: string; assistId?: string; detail: string; ratingImpacts: RatingImpact[]; }
export interface MatchResult { score: [number, number]; events: MatchEvent[]; ratings: PlayerMatchRating[]; stats: TeamStats; decisions: DecisionPoint[]; }
```

### 5.2 Algoritmo (tick de 1 minuto, 90 ticks + acréscimos)
1. **Forças de time por setor** a partir dos atributos efetivos: `defesa`, `meio`, `ataque` (agregações ponderadas por função).
2. **Posse do tick:** `pPosseHome = meioH^1.3 / (meioH^1.3 + meioA^1.3)`, ajustada por mentalidade e pressing.
3. **Chance criada?** prob. base 0.075/tick para quem tem posse, modificada por mentalidade (±30%), passStyle vs pressing adversário, attackFocus vs largura adversária.
4. **Resolução da chance:**
   - Sorteia criador (peso: vision/passe da função) e finalizador (peso: offPositioning/finishing).
   - Duelo com defensor mais próximo do setor: `qualidade = finalizador.ataque_efetivo − defensor.defesa_efetiva` (+bigGame se placar empatado após o minuto 75; +composure em pênaltis).
   - Converte em xG (sigmoide, clamp 0.02–0.65); goleiro reduz xG por `reflexes/gkPositioning`.
   - Sorteio: gol, defesa do goleiro, bloqueio, ou pra fora. Gera `MatchEvent` com `ratingImpacts` para todos os envolvidos.
5. **Eventos secundários por tick:** desarmes, dribles sofridos, interceptações, faltas, cartões, lesão leve (raro) — todos alimentam as notas.
6. **Fadiga:** `fadiga = 1 − (minuto/90) × (0.25 × (1 − stamina/99))`. Pressing alto acelera fadiga do próprio time em 15%.

### 5.3 Notas ao vivo + Snowflake
- Todo jogador inicia com **6.0**. Cada `MatchEvent` aplica `ratingImpacts` (ex: gol +0.9, assistência +0.6, desarme +0.12, drible sofrido −0.15, erro que gera chance −0.4, gol sofrido −0.2 para defensores/goleiro). Clamp 0–10.
- **Acumuladores por categoria** (Ritmo/Finalização/Passe/Drible/Defesa/Físico/Mental): cada impacto também soma no acumulador da categoria de origem. O snowflake da UI é o radar desses acumuladores — **verde** (positivo) e **vermelho** (negativo). Ex: zagueiro com Defesa +0.8 e Passe −0.5 = "bem na marcação, mal na saída de bola".
- API: `getLiveRating(playerId, minute)` e `getSnowflake(playerId, minute)` derivadas da lista de eventos (a UI reproduz os eventos com timing, o resultado já está calculado).

### 5.4 Momentos de Decisão (2–4 por partida)
O engine detecta padrões e insere `DecisionPoint` (ex: mesmo atacante dribla seu lateral 3×; seu time sem finalizar por 20 min; expulsão). A UI pausa e oferece 2–3 opções, cada uma mapeando para ajustes táticos temporários (`TacticsOverride`) que entram nos ticks seguintes. Em partidas assíncronas (vs elenco de outro usuário offline), só o usuário presente decide; a IA decide pelo ausente com heurística simples.

### 5.5 Substituições
Até 3 janelas / 5 trocas. Recalculam atributos efetivos e química a partir do tick seguinte. `starterStreak` zera para quem começou no banco e incrementa para titulares que completaram ≥60 min.

---

## 6. Economia (sem dinheiro real)

**Moedas:** `coins` (soft: partidas, objetivos, vendas) e `gems` (premium interna: conquistas, títulos da liga, ranking semanal, streak de login). **Sem IAP em nenhuma hipótese.**

**Ganhos de referência:** vitória 400 coins / empate 200 / derrota 100 (+bônus de desempenho). Objetivos diários ~500. Campeão da liga de amigos: 200 gems. Pacote básico: 1.500 coins. Pacote premium: 50 gems.

**Sumidouros:** taxa de 5% no mercado, contratos das cartas (custo leve por partida, recuperável com o tempo), reroll de função, evolução.

**Mercado entre amigos:** leilão assíncrono (lance mínimo, buy-now, 6/12/24h), tudo em coins, via Cloud Functions com transação atômica.

---

## 7. Telas (apps/mobile)

1. **Home:** próximo jogo da liga, objetivos, atalhos.
2. **Meu Time:** campo 2D com as cartas nos slots; drag & drop; seletor de formação, função por slot (com % de fit), painel de tática; indicador de química por jogador e total.
3. **Detalhe da Carta:** arte da carta (raridade/versão), todos os atributos por categoria, radar snowflake estático dos atributos, idade e projeção de envelhecimento, histórico de evolução.
4. **Partida ao Vivo:** campo 2D top-down (pontos/camisas), narração por texto dos lances, placar/tempo, **nota do momento sobre cada jogador**, tocar no jogador → bottom sheet com **snowflake ao vivo** (verde/vermelho por categoria); botões de substituição/tática; modal de Momento de Decisão; modo rápido (só texto, 30s).
5. **Pacotes:** loja, animação de abertura (suspense por raridade — cor/brilho antes de revelar), contador de pity visível.
6. **Coleção/Clube:** grid de cartas com filtros (posição, raridade, versão, clube, nação), duplicatas, evolução.
7. **Mercado:** buscar, dar lance, vender.
8. **Liga de Amigos:** tabela, calendário, resultados com replay, ranking histórico.
9. **Perfil de Técnico:** XP, nível, formações/funções desbloqueadas, conquistas.

**Direção de arte:** dark mode, cartas com cores de raridade (cinza/azul/roxo/dourado/prisma), tipografia esportiva condensada. Sem 3D.

---

## 8. Base de Dados de Jogadores (packages/data)

- `players.json` começa com **seed de ~60 jogadores reais conhecidos** (atributos estimados à mão, plausíveis) + `scripts/generate-filler.ts` que gera ~300 jogadores de preenchimento com nomes plausíveis por nacionalidade para completar elencos.
- **IMPORTANTE (Claude Code):** não invente atributos para centenas de jogadores reais um a um. Crie o seed pequeno e curado + o gerador. O grupo mantém o resto via patch.
- `cards.json` do catálogo: gerar automaticamente 1 carta `base` por jogador (rarity derivada do overall) + ~15 `epic_moment` curadas à mão (ex: `mbappe-wc2018`, `mbappe-wc2022`, `messi-wc2022`, `neymar-ucl2015`, `ronaldinho-2005`) + ~10 `icon` (Pelé, Maradona, Zidane, Ronaldo Fenômeno, Romário, Cruyff, Zico, R9...).
- Comando `npm run data:publish` valida e sobe o catálogo para o Firestore (Cartas Vivas: cartas não-frozen são atualizadas preservando `attributeDeltas`).

---

## 9. Milestones (implementar NESTA ordem)

### M0 — Fundação
Monorepo (npm workspaces), Expo + TS + expo-router, Zustand, Jest, ESLint/Prettier, CI local (`npm test`).
✅ *Aceite:* app abre com tela placeholder; `npm test` roda no engine.

### M1 — Modelos + Dados
Tipos da seção 3, pesos de overall por posição, formações (8) e funções (20) com pesos, seed de dados + gerador de filler + validador.
✅ *Aceite:* testes de overall e fit; `players.json` valida; catálogo de cartas gerado.

### M2 — Motor de Simulação
Simulador completo (seção 5) com PRNG seedado, notas ao vivo, snowflake, momentos de decisão. CLI: `npm run sim -- --home squadA.json --away squadB.json --seed 42`.
✅ *Aceite:* mesma seed ⇒ mesmo resultado; 1.000 sims entre times iguais ⇒ ~33/33/33 (±5pp) V/E/D; time overall 85 vence 75 em ~70%+; cobertura ≥85% no `sim/`.

### M3 — Meu Time + Cartas (UI, offline-first)
Telas 2, 3 e 6 com dados locais (AsyncStorage). Drag & drop de escalação, radar de atributos, química visível.
✅ *Aceite:* montar um 4-3-3 completo e ver overall/química do time atualizando em tempo real.

### M4 — Partida ao Vivo
Tela 4 completa consumindo eventos do engine com timing acelerado (90' → ~4 min), notas ao vivo, snowflake ao vivo, substituições, momentos de decisão, modo rápido. Modo amistoso vs IA.
✅ *Aceite:* jogar uma partida inteira contra IA com todas as interações funcionando.

### M5 — Pacotes + Evolução
Loja, abertura com animação e pity, coleção com duplicatas, sistema de evolução, objetivos diários dando coins/pacotes.
✅ *Aceite:* loop completo offline: jogar → ganhar → abrir → evoluir → escalar.

### M6 — Carreira PvE
Liga de 20 clubes controlados por IA, calendário, tabela, temporada completa; ao virar a temporada roda **envelhecimento** e distribui premiação.
✅ *Aceite:* completar uma temporada e ver cartas envelhecendo/jovens crescendo.

### M7 — Online (Firebase)
Auth, sync de coleção/elenco, **Liga de Amigos** (criar/entrar por código, calendário automático, partidas assíncronas: engine roda em Cloud Function com seed salva; usuário presente joga "ao vivo" contra o elenco+tática do adversário), mercado de transferências, pacotes server-side.
✅ *Aceite:* dois usuários em dispositivos diferentes disputam uma liga com mercado ativo.

### M8 — Cartas Vivas + Polish
Pipeline de patch (`data:publish`), cartas Em Alta semanais (manual pelo admin da liga), animações, sons, onboarding/tutorial, notificações de calendário.
✅ *Aceite:* publicar um patch alterando atributos e ver cartas base atualizadas nos clientes.

---

## 10. Convenções e Regras para o Claude Code

1. **Engine puro:** nada de React/Firebase dentro de `packages/engine`. Toda regra de jogo mora lá, com testes.
2. **Determinismo é sagrado:** qualquer aleatoriedade usa o PRNG seedado injetado. Nunca `Math.random()` no engine.
3. **Overall e química são sempre derivados**, nunca persistidos como fonte de verdade.
4. **Segurança básica:** abertura de pacote, resultado oficial de partida de liga e mercado rodam em Cloud Functions; o cliente nunca decide sorteios.
5. **Testes antes de UI:** cada regra da seção 4 e 5 tem teste unitário antes de aparecer em tela.
6. **Commits por milestone**, mensagens descritivas; atualizar `docs/PROGRESS.md` ao concluir cada um.
7. **Balanceamento:** constantes de tuning (probabilidades, impactos de nota, custos) centralizadas em `packages/engine/src/config.ts` — nunca espalhadas pelo código.
8. Em dúvida de design, escolher a opção **mais simples que preserva a diversão** e registrar a decisão em `docs/DECISIONS.md`.
