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

  /** Pacotes (SPEC 4.5) — usado a partir do M5, definido junto por coesão. */
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

  /** Simulação de partida (SPEC 5.2) — consumido pelo sim/ no M2. */
  sim: {
    regularMinutes: 90,
    /** Expoente da disputa de meio para a posse do tick. */
    possessionExponent: 1.3,
    /** Prob. base de criar chance num tick para quem tem a posse. */
    baseChanceProb: 0.075,
    /** Ajuste máximo de mentalidade na criação de chances (±30%). */
    mentalityChanceSwing: 0.3,
    /** xG: sigmoide clampada. */
    xgMin: 0.02,
    xgMax: 0.65,
    /** Fadiga: 1 − (minuto/90) × (fadigaMax × (1 − stamina/99)). */
    fatigueMaxLoss: 0.25,
    /** Pressing alto acelera a fadiga do próprio time. */
    highPressingFatigueBoost: 0.15,
    /** bigGame conta a partir deste minuto com placar empatado. */
    bigGameFromMinute: 75,
    substitutionWindows: 3,
    substitutionsMax: 5,
    /** Minutos mínimos em campo para o titular incrementar starterStreak. */
    starterStreakMinutes: 60,
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

  /** Economia (SPEC 6) — usada a partir do M5. */
  economy: {
    matchCoins: { win: 400, draw: 200, loss: 100 },
    dailyObjectivesCoins: 500,
    leagueChampionGems: 200,
    basicPackCoins: 1500,
    premiumPackGems: 50,
    marketFeeRate: 0.05,
  },
} as const;

export type GameConfig = typeof CONFIG;
