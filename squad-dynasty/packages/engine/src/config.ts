/**
 * TODAS as constantes de tuning do jogo (SPEC seção 10.7).
 * Balanceamento se faz aqui, nunca com números espalhados pelo código.
 */
export const CONFIG = {
  /** Fit de função (SPEC 4.1). */
  fit: {
    /** multiplicadorFit = base + span × fit(0..1) → 0.85 a 1.00 */
    base: 0.85,
    span: 0.15,
    /** Jogar fora das validPositions da função. */
    outOfPositionMultiplier: 0.8,
  },

  /** Química por titular (SPEC 4.2), pontos somados e clampados em 0–100. */
  chemistry: {
    clubBonus: 25, // mesmo clube que ≥1 vizinho tático
    clubMinNeighbors: 1,
    nationalityBonus: 25, // mesma nacionalidade que ≥2 outros titulares
    nationalityMinStarters: 2,
    leagueBonus: 15, // mesma liga que ≥5 outros titulares
    leagueMinStarters: 5,
    synergyBonus: 15, // par de funções sinérgicas com um vizinho
    streakPerMatch: 1, // entrosamento: min(cap, streak × perMatch)
    streakCap: 20,
    /** multiplicadorQuimica = base + span × (quimica/100) → 0.90 a 1.05 */
    multiplierBase: 0.9,
    multiplierSpan: 0.15,
  },

  /** Raridade da carta base derivada do overall do jogador. */
  baseCardRarity: {
    legendary: 88,
    epic: 83,
    rare: 77,
    // abaixo de rare → common
  },

  /** Pacotes (SPEC 4.5). Pity é POR PACOTE (contador visível na UI). */
  packs: {
    rarityWeights: {
      common: 0.7,
      rare: 0.22,
      epic: 0.065,
      legendary: 0.014,
      icon: 0.001,
    },
    legendaryPity: 40,
    iconPity: 400,
    types: {
      basic: { cards: 3, costCoins: 0, costGems: 0, guaranteedRarity: 'rare' },
      premium: { cards: 5, costCoins: 0, costGems: 0, guaranteedRarity: 'epic' },
    },
  },

  /** Envelhecimento por temporada (SPEC 4.4) — regras aplicadas em aging/. */
  aging: {
    retirementBaseAge: 36,
    retirementBaseChance: 0.25,
    retirementChancePerYear: 0.15,
  },

  /** Evolução (SPEC 4.6): duplicatas por nível 0→1, 1→2, ... */
  evolution: {
    duplicatesPerLevel: [1, 1, 2, 2, 3, 3],
    maxLevel: 6,
  },

  /** Simulação de partida (SPEC 5.2). */
  sim: {
    regularMinutes: 90,
    /** Acréscimos: randInt(min, max). */
    stoppageMin: 1,
    stoppageMax: 5,
    /** Expoente da disputa de meio para a posse do tick. */
    possessionExponent: 1.3,
    /** Ajuste de posse por diferença de pressing e de mentalidade. */
    possessionPressingShift: 0.04,
    possessionMentalityShift: 0.02,
    possessionClamp: 0.22,
    /**
     * Prob. base de criar chance num tick para quem tem a posse.
     * O rascunho da SPEC sugeria 0.075, mas com ~0.14 de xG médio por chance
     * isso dá ~0.5 gol/time e ~48% de empates — calibrado para ~0.9 gol/time
     * e o aceite 33/33/33 do M2 (ver DECISIONS.md).
     */
    baseChanceProb: 0.15,
    /** Ajuste de mentalidade na criação de chances (±30% nos extremos). */
    mentalityChanceSwing: 0.3,
    /** passStyle vs pressing adversário e attackFocus vs largura adversária. */
    directVsHighPressBonus: 1.1,
    shortVsHighPressPenalty: 0.92,
    shortVsLowPressBonus: 1.05,
    focusMismatchBonus: 1.08,
    /** Razão ataque/defesa modula a criação: (atk/def)^expoente, clampado. */
    strengthRatioExponent: 1.2,
    strengthRatioMin: 0.6,
    strengthRatioMax: 1.6,
    /** xG: xgScale × sigmoide(qualidade/xgSlope), clampado. */
    xgMin: 0.02,
    xgMax: 0.65,
    xgScale: 0.36,
    xgSlope: 12,
    /** Viés pró-ataque na qualidade da chance (elencos reais têm defesa
     * estruturalmente mais alta que ataque; sem isso o jogo vira 0 a 0). */
    chanceQualityBias: 2,
    /** Fator do grupo posicional no sorteio do finalizador (atacantes chutam mais). */
    finisherGroupFactor: { ATT: 2.5, MID: 1.1, DEF: 0.35 },
    /** Goleiro reduz a qualidade: (composto GK − ref) / divisor. */
    gkQualityRef: 78,
    gkQualityDiv: 3,
    /** bigGame conta a partir deste minuto com placar empatado. */
    bigGameFromMinute: 75,
    bigGameQualityDiv: 4,
    /** Chance de o lance ter assistência (passe-chave) e não jogada individual. */
    assistProb: 0.72,
    /** Resolução de chance sem gol: pesos relativos de defesa/bloqueio/fora. */
    missSplitSave: 0.45,
    missSplitBlock: 0.2,
    /** Fadiga: 1 − (minutosEmCampo/90) × (fadigaMax × (1 − stamina/99)). */
    fatigueMaxLoss: 0.25,
    /** Pressing alto acelera a fadiga do próprio time. */
    highPressingFatigueBoost: 0.15,
    /** Eventos secundários por tick (para quem NÃO tem a posse: desarme etc.). */
    tackleEventProb: 0.16,
    interceptionEventProb: 0.12,
    dribbleEventProb: 0.1,
    foulEventProb: 0.1,
    yellowOnFoulProb: 0.18,
    straightRedOnFoulProb: 0.012,
    injuryEventProb: 0.004,
    /** Vermelho reduz o time: jogador sai das agregações e das escolhas. */
    substitutionWindows: 3,
    substitutionsMax: 5,
    /** IA: minutos em que considera substituições de ofício. */
    aiSubMinutes: [60, 75],
    /** Minutos mínimos em campo para o titular incrementar starterStreak. */
    starterStreakMinutes: 60,
    /** Momentos de decisão: máximo por partida e espaçamento mínimo. */
    decisionsMax: 4,
    decisionsMinGap: 12,
    noShotsWindow: 20,
    dribbledRepeatedlyCount: 3,
  },

  /** Notas ao vivo (SPEC 5.3). */
  ratings: {
    start: 6.0,
    min: 0,
    max: 10,
    impacts: {
      goal: 0.9,
      assist: 0.6,
      shotOnTarget: 0.15,
      shotOff: -0.05,
      shotBlockedDefender: 0.15,
      gkSave: 0.25,
      tackle: 0.12,
      interception: 0.1,
      dribbleWon: 0.12,
      dribbledPast: -0.15,
      foul: -0.08,
      yellowCard: -0.2,
      redCard: -1.0,
      errorLeadingToChance: -0.4,
      goalConcededDefGk: -0.2,
      keyPass: 0.3,
    },
  },

  /** Economia (SPEC 6). */
  economy: {
    matchCoins: { win: 400, draw: 200, loss: 100 },
    /** Bônus por desempenho: (nota média do time − 6) × fator, clampado. */
    performanceBonusPerPoint: 60,
    performanceBonusMax: 150,
    dailyObjectivesCoins: 500,
    leagueChampionGems: 200,
    /** Premiação de fim de temporada por colocação (M6). */
    seasonPrizeCoinsByPlacement: [5000, 3500, 2500, 2000, 1500, 1200, 1000, 900, 800, 700, 600, 550, 500, 450, 400, 350, 300, 250, 200, 150],
    marketFeeRate: 0,
    /** Evolução (SPEC 4.6): coins por nível, além das duplicatas. */
    evolutionCoinsPerLevel: [0, 0, 0, 0, 0, 0],
    /** Delta aplicado nos atributos-chave da posição a cada nível. */
    evolutionDeltaPerLevel: 2,
  },
} as const;

export type GameConfig = typeof CONFIG;
