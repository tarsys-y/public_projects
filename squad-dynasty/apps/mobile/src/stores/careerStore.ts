// Carreira PvE (M6 + profundidade FM): liga + copa mata-mata intercalada,
// forma/moral por desempenho recente, treino de jovens, clássicos com bônus e
// TOTW ("Em Alta") gerado a cada rodada. Persistido em AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  buildAutoSquad,
  chance,
  computeStandings,
  CONFIG,
  CUP_STAGES,
  drawCupPairs,
  drawCupParticipants,
  evolutionKeyAttributes,
  generateFixtures,
  isGkAttributes,
  isRivalry,
  mulberry32,
  randInt,
  resolvePenalties,
  resolveSquad,
  rivalryName,
  simulateMatch,
  type AttributeCategory,
  type CardDefinition,
  type CupTie,
  type Fixture,
  type LeagueMatchResult,
  type MatchResult,
  type Rarity,
  type ResolvedSquad,
  type StandingRow,
} from '@squad-dynasty/engine';
import { CARDS, CATALOG, clubById, getCardById, getCatalog, PLAYERS, playerById } from '../services/catalog';
import { ownedCardsMap, useCollectionStore, type AgingSummaryEntry } from './collectionStore';
import { useDynamicCardsStore } from './dynamicCardsStore';
import { useEconomyStore } from './economyStore';
import { useMatchStore } from './matchStore';
import { useProfileStore } from './profileStore';
import { toSquad, type DraftSquad } from './squadLogic';
import { useSquadStore } from './squadStore';

/** Rodadas da liga após as quais acontece uma fase da copa. */
const CUP_AFTER_ROUNDS = [8, 16, 24, 32];
const CUP_STAGE_PRIZE_COINS = [400, 800, 1600, 3000]; // por AVANÇAR na fase i
const CUP_CHAMPION_GEMS = 100;
const DERBY_WIN_BONUS = 250;
const FORM_WINDOW = 5;
const TRAINING_CHANCE = 0.15;
const TRAINING_MAX_AGE = 23;

export interface SeasonSummary {
  season: number;
  placement: number; // 1-based
  champion: string; // clubId
  cupChampion: string | null;
  userWonCup: boolean;
  prizeCoins: number;
  prizeGems: number;
  aging: AgingSummaryEntry[];
}

export interface CupState {
  alive: string[];
  stage: number; // 0..3 (índice em CUP_STAGES)
  /** fase aguardando ser jogada (setada ao cruzar um checkpoint da liga) */
  pending: boolean;
  userAlive: boolean;
  champion: string | null;
}

export interface CurrentMatch {
  type: 'league' | 'cup';
  fixture: Fixture | CupTie & { round?: number };
  opponentClubId: string;
  isDerby: boolean;
  derbyName: string | null;
  stageName?: string;
}

interface CareerState {
  active: boolean;
  userClubId: string | null;
  leagueId: string | null;
  season: number;
  round: number;
  fixtures: Fixture[];
  results: LeagueMatchResult[];
  seasonSeed: number;
  cup: CupState | null;
  /** últimas notas por carta (forma/moral). */
  recentRatings: Record<string, number[]>;
  /** foco de treino por carta (jovens ≤23 evoluem no ritmo das rodadas). */
  trainingFocus: Record<string, AttributeCategory>;
  lastSummary: SeasonSummary | null;
  history: SeasonSummary[];

  startCareer: (userClubId: string, seed?: number) => void;
  /** Próximo compromisso do usuário: jogo de liga ou de copa. */
  currentMatch: () => CurrentMatch | null;
  playUserMatch: () => boolean;
  consumeUserResult: () => void;
  simulateUserMatch: () => void;
  standings: () => StandingRow[];
  setTrainingFocus: (ownedId: string, category: AttributeCategory | null) => void;
  formOf: (ownedId: string) => number;
  abandonCareer: () => void;
}

const opponentCache = new Map<string, ResolvedSquad>();

function buildClubSquad(clubId: string): ResolvedSquad {
  const cached = opponentCache.get(clubId);
  if (cached) return cached;
  const clubPlayers = PLAYERS.filter((p) => p.clubId === clubId);
  const ids = new Set(clubPlayers.map((p) => p.id));
  const baseCards = CARDS.filter((c) => c.version === 'base' && ids.has(c.basePlayerId));
  const { squad, ownedCards } = buildAutoSquad(clubPlayers, baseCards, '4-3-3', {
    ownerId: `ai-${clubId}`,
  });
  const resolved = resolveSquad(squad, new Map(ownedCards.map((o) => [o.id, o])), CATALOG);
  opponentCache.set(clubId, resolved);
  return resolved;
}

function userDraftSquad(): DraftSquad {
  return useSquadStore.getState().draft;
}

function formMultiplierFrom(ratings: number[] | undefined): number {
  if (!ratings || ratings.length === 0) return 1;
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  return Math.max(0.95, Math.min(1.05, 1 + (avg - 6.5) * 0.02));
}

function formMapFor(state: CareerState): Map<string, number> {
  return new Map(
    Object.entries(state.recentRatings).map(([id, ratings]) => [id, formMultiplierFrom(ratings)]),
  );
}

/** Resolve o elenco atual do usuário com forma aplicada. */
function resolveUserSquad(state: CareerState): ResolvedSquad {
  const owned = ownedCardsMap(useCollectionStore.getState());
  return resolveSquad(toSquad(userDraftSquad()), owned, getCatalog(), {
    formById: formMapFor(state),
  });
}

const RARITY_BUMP: Record<Rarity, Rarity> = {
  common: 'rare',
  rare: 'epic',
  epic: 'legendary',
  legendary: 'legendary',
  icon: 'icon',
};

/** TOTW "Em Alta": melhores da rodada viram cartas inform dinâmicas. */
function buildTotwCards(
  allResults: MatchResult[],
  season: number,
  round: number,
): CardDefinition[] {
  interface Candidate {
    cardDefId: string;
    rating: number;
  }
  const owned = useCollectionStore.getState().ownedCards;
  const candidates: Candidate[] = [];
  for (const result of allResults) {
    for (const r of result.ratings) {
      const cardDefId = r.playerId.startsWith('auto-')
        ? r.playerId.slice(5)
        : owned[r.playerId]?.cardDefId;
      if (!cardDefId) continue;
      candidates.push({ cardDefId, rating: r.rating });
    }
  }
  // melhor nota por carta base (evita duplicar o mesmo jogador)
  const best = new Map<string, Candidate>();
  for (const c of candidates) {
    const current = best.get(c.cardDefId);
    if (!current || c.rating > current.rating) best.set(c.cardDefId, c);
  }
  const enriched = [...best.values()]
    .map((c) => {
      const card = getCardById(c.cardDefId);
      const player = card ? playerById.get(card.basePlayerId) : undefined;
      if (!card || !player || card.version !== 'base') return null;
      const group =
        player.positions[0] === 'GK'
          ? 'GK'
          : ['CB', 'LB', 'RB'].includes(player.positions[0] ?? '')
            ? 'DEF'
            : ['LW', 'RW', 'ST'].includes(player.positions[0] ?? '')
              ? 'ATT'
              : 'MID';
      return { ...c, card, player, group };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => b.rating - a.rating);

  const quota: Record<string, number> = { GK: 1, DEF: 4, MID: 3, ATT: 3 };
  const picked: typeof enriched = [];
  for (const c of enriched) {
    if ((quota[c.group] ?? 0) <= 0) continue;
    quota[c.group]!--;
    picked.push(c);
    if (picked.length === 11) break;
  }

  return picked.map(({ card, player }) => {
    const attrs = { ...(card.attributes as unknown as Record<string, number>) };
    const keys = evolutionKeyAttributes(player.positions[0] ?? 'ST', isGkAttributes(card.attributes));
    for (const key of keys) attrs[key] = Math.min(99, (attrs[key] ?? 0) + 2);
    return {
      id: `totw-s${season}r${round}-${player.id}`,
      basePlayerId: player.id,
      version: 'inform' as const,
      rarity: RARITY_BUMP[card.rarity],
      label: `Em Alta R${round}`,
      attributes: attrs as unknown as CardDefinition['attributes'],
      frozen: true,
    };
  });
}

export const useCareerStore = create<CareerState>()(
  persist(
    (set, get) => ({
      active: false,
      userClubId: null,
      leagueId: null,
      season: 1,
      round: 1,
      fixtures: [],
      results: [],
      seasonSeed: 0,
      cup: null,
      recentRatings: {},
      trainingFocus: {},
      lastSummary: null,
      history: [],

      startCareer: (userClubId, seed) => {
        const club = clubById.get(userClubId);
        if (!club) return;
        const leagueClubs = [...clubById.values()]
          .filter((c) => c.leagueId === club.leagueId)
          .map((c) => c.id);
        const seasonSeed = seed ?? Math.floor(Date.now() % 2147483647);
        opponentCache.clear();
        set({
          active: true,
          userClubId,
          leagueId: club.leagueId,
          season: 1,
          round: 1,
          fixtures: generateFixtures(leagueClubs, mulberry32(seasonSeed)),
          results: [],
          seasonSeed,
          cup: newCup(leagueClubs, userClubId, seasonSeed),
          recentRatings: {},
          lastSummary: null,
          history: [],
        });
      },

      currentMatch: () => {
        const s = get();
        if (!s.active || !s.userClubId) return null;
        // fase de copa pendente com o usuário vivo tem prioridade
        if (s.cup?.pending && s.cup.userAlive && !s.cup.champion) {
          const ties = cupTiesFor(s);
          const tie = ties.find(
            (t) => t.homeClubId === s.userClubId || t.awayClubId === s.userClubId,
          );
          if (tie) {
            const opponent = tie.homeClubId === s.userClubId ? tie.awayClubId : tie.homeClubId;
            return {
              type: 'cup',
              fixture: tie,
              opponentClubId: opponent,
              isDerby: isRivalry(s.userClubId, opponent),
              derbyName: rivalryName(s.userClubId, opponent),
              stageName: CUP_STAGES[s.cup.stage],
            };
          }
        }
        const fixture = s.fixtures.find(
          (f) =>
            f.round === s.round && (f.homeClubId === s.userClubId || f.awayClubId === s.userClubId),
        );
        if (!fixture) return null;
        const opponent =
          fixture.homeClubId === s.userClubId ? fixture.awayClubId : fixture.homeClubId;
        return {
          type: 'league',
          fixture,
          opponentClubId: opponent,
          isDerby: isRivalry(s.userClubId, opponent),
          derbyName: rivalryName(s.userClubId, opponent),
        };
      },

      playUserMatch: () => {
        const s = get();
        const match = s.currentMatch();
        if (!match) return false;
        const owned = ownedCardsMap(useCollectionStore.getState());
        try {
          const squad = toSquad(userDraftSquad());
          useMatchStore.getState().startCareerMatch(squad, owned, match.opponentClubId, {
            seed: s.seasonSeed + s.round * 1000 + (match.type === 'cup' ? 500 : 0),
            isDerby: match.isDerby,
            derbyName: match.derbyName ?? undefined,
            formById: formMapFor(s),
          });
          return true;
        } catch {
          return false; // escalação incompleta
        }
      },

      consumeUserResult: () => {
        const match = useMatchStore.getState();
        if (match.mode !== 'career' || match.phase !== 'finished' || match.careerConsumed) return;
        const result = match.result;
        if (!result) return;
        match.markCareerConsumed();
        advanceAfterUserMatch(set, get, result);
      },

      simulateUserMatch: () => {
        const s = get();
        const match = s.currentMatch();
        if (!match) return;
        let userSquad: ResolvedSquad;
        try {
          userSquad = resolveUserSquad(s);
        } catch {
          userSquad = buildClubSquad(s.userClubId!);
        }
        const result = simulateMatch({
          home: userSquad,
          away: buildClubSquad(match.opponentClubId),
          seed: s.seasonSeed + s.round * 1000 + (match.type === 'cup' ? 500 : 0),
          homeController: 'ai',
          awayController: 'ai',
          isDerby: match.isDerby,
          derbyName: match.derbyName ?? undefined,
        });
        advanceAfterUserMatch(set, get, result);
      },

      standings: () => {
        const s = get();
        const leagueClubs = [...clubById.values()]
          .filter((c) => c.leagueId === s.leagueId)
          .map((c) => c.id);
        return computeStandings(leagueClubs, s.results);
      },

      setTrainingFocus: (ownedId, category) =>
        set((s) => {
          const trainingFocus = { ...s.trainingFocus };
          if (category === null) delete trainingFocus[ownedId];
          else trainingFocus[ownedId] = category;
          return { trainingFocus };
        }),

      formOf: (ownedId) => formMultiplierFrom(get().recentRatings[ownedId]),

      abandonCareer: () =>
        set({
          active: false,
          userClubId: null,
          leagueId: null,
          season: 1,
          round: 1,
          fixtures: [],
          results: [],
          cup: null,
          recentRatings: {},
          lastSummary: null,
        }),
    }),
    {
      name: 'squad-dynasty/career',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        active: s.active,
        userClubId: s.userClubId,
        leagueId: s.leagueId,
        season: s.season,
        round: s.round,
        fixtures: s.fixtures,
        results: s.results,
        seasonSeed: s.seasonSeed,
        cup: s.cup,
        recentRatings: s.recentRatings,
        trainingFocus: s.trainingFocus,
        lastSummary: s.lastSummary,
        history: s.history,
      }),
    },
  ),
);

type Set = (partial: Partial<CareerState> | ((s: CareerState) => Partial<CareerState>)) => void;
type Get = () => CareerState;

function newCup(leagueClubs: string[], userClubId: string, seed: number): CupState {
  const participants = drawCupParticipants(leagueClubs, userClubId, mulberry32(seed + 31337));
  return { alive: participants, stage: 0, pending: false, userAlive: true, champion: null };
}

/** Pareamento determinístico da fase atual da copa. */
function cupTiesFor(s: CareerState): CupTie[] {
  if (!s.cup) return [];
  return drawCupPairs(s.cup.alive, mulberry32(s.seasonSeed + 41000 + s.cup.stage));
}

/** Vencedor de um confronto de copa (pênaltis em caso de empate). */
function cupWinner(tie: CupTie, result: MatchResult, rng: () => number): string {
  const [h, a] = result.score;
  if (h > a) return tie.homeClubId;
  if (a > h) return tie.awayClubId;
  return resolvePenalties(buildClubSquad(tie.homeClubId), buildClubSquad(tie.awayClubId), rng)
    ? tie.homeClubId
    : tie.awayClubId;
}

/** Registra o compromisso jogado (liga OU copa) e avança o calendário. */
function advanceAfterUserMatch(set: Set, get: Get, userResult: MatchResult): void {
  const s = get();
  const match = s.currentMatch();
  if (!match || !s.userClubId) return;

  // forma: guarda as notas do 11 do usuário
  const recentRatings = { ...s.recentRatings };
  const ownedIds = new Set(Object.keys(useCollectionStore.getState().ownedCards));
  for (const r of userResult.ratings) {
    if (r.side !== 'home' || !ownedIds.has(r.playerId)) continue;
    recentRatings[r.playerId] = [...(recentRatings[r.playerId] ?? []), r.rating].slice(-FORM_WINDOW);
  }

  // bônus de clássico
  const [ug, og] = userResult.score;
  if (match.isDerby && ug > og) {
    useEconomyStore.getState().earn({ coins: DERBY_WIN_BONUS });
  }

  if (match.type === 'cup') {
    resolveCupStage(set, { ...s, recentRatings }, userResult);
    return;
  }
  finishLeagueRound(set, get, { ...s, recentRatings }, userResult);
}

/** Resolve a fase da copa inteira (jogo do usuário + demais confrontos). */
function resolveCupStage(set: Set, s: CareerState, userResult: MatchResult): void {
  const cup = s.cup!;
  const ties = cupTiesFor(s);
  const rng = mulberry32(s.seasonSeed + 43000 + cup.stage);
  const winners: string[] = [];
  for (const tie of ties) {
    const isUserTie = tie.homeClubId === s.userClubId || tie.awayClubId === s.userClubId;
    if (isUserTie) {
      // o resultado do usuário está na orientação usuário-como-home
      const userIsHome = tie.homeClubId === s.userClubId;
      const oriented: MatchResult = userIsHome
        ? userResult
        : { ...userResult, score: [userResult.score[1], userResult.score[0]] };
      winners.push(cupWinner(tie, oriented, rng));
    } else {
      const result = simulateMatch({
        home: buildClubSquad(tie.homeClubId),
        away: buildClubSquad(tie.awayClubId),
        seed: s.seasonSeed + 44000 + cup.stage * 100 + winners.length,
        homeController: 'ai',
        awayController: 'ai',
      });
      winners.push(cupWinner(tie, result, rng));
    }
  }

  const userAlive = winners.includes(s.userClubId!);
  if (userAlive) {
    useEconomyStore.getState().earn({ coins: CUP_STAGE_PRIZE_COINS[cup.stage] ?? 500 });
  }
  const champion = winners.length === 1 ? winners[0]! : null;
  if (champion === s.userClubId) {
    useEconomyStore.getState().earn({ gems: CUP_CHAMPION_GEMS });
  }
  set({
    recentRatings: s.recentRatings,
    cup: { alive: winners, stage: cup.stage + 1, pending: false, userAlive, champion },
  });
}

/** Fase de copa sem o usuário: resolve tudo automaticamente. */
function autoResolveCupStage(s: CareerState): CupState {
  const cup = s.cup!;
  if (cup.champion || cup.alive.length <= 1) return cup;
  const ties = drawCupPairs(cup.alive, mulberry32(s.seasonSeed + 41000 + cup.stage));
  const rng = mulberry32(s.seasonSeed + 43000 + cup.stage);
  const winners = ties.map((tie, i) => {
    const result = simulateMatch({
      home: buildClubSquad(tie.homeClubId),
      away: buildClubSquad(tie.awayClubId),
      seed: s.seasonSeed + 44000 + cup.stage * 100 + i,
      homeController: 'ai',
      awayController: 'ai',
    });
    return cupWinner(tie, result, rng);
  });
  return {
    alive: winners,
    stage: cup.stage + 1,
    pending: false,
    userAlive: false,
    champion: winners.length === 1 ? winners[0]! : null,
  };
}

/** Registra a rodada de liga, TOTW, treino e vira a temporada se for a última. */
function finishLeagueRound(set: Set, get: Get, s: CareerState, userResult: MatchResult): void {
  const fixture = s.fixtures.find(
    (f) => f.round === s.round && (f.homeClubId === s.userClubId || f.awayClubId === s.userClubId),
  );
  if (!fixture) return;

  const [userGoals, oppGoals] = userResult.score;
  const userIsHome = fixture.homeClubId === s.userClubId;
  const results: LeagueMatchResult[] = [
    ...s.results,
    {
      homeClubId: fixture.homeClubId,
      awayClubId: fixture.awayClubId,
      homeGoals: userIsHome ? userGoals : oppGoals,
      awayGoals: userIsHome ? oppGoals : userGoals,
    },
  ];

  const others = s.fixtures.filter(
    (f) => f.round === s.round && f.homeClubId !== s.userClubId && f.awayClubId !== s.userClubId,
  );
  const roundResults: MatchResult[] = [userResult];
  others.forEach((f, i) => {
    const result = simulateMatch({
      home: buildClubSquad(f.homeClubId),
      away: buildClubSquad(f.awayClubId),
      seed: s.seasonSeed + s.round * 1000 + (i + 1),
      homeController: 'ai',
      awayController: 'ai',
    });
    roundResults.push(result);
    results.push({
      homeClubId: f.homeClubId,
      awayClubId: f.awayClubId,
      homeGoals: result.score[0],
      awayGoals: result.score[1],
    });
  });

  // TOTW "Em Alta" da rodada → cartas dinâmicas (destaque no evento da semana)
  const totw = buildTotwCards(roundResults, s.season, s.round);
  if (totw.length > 0) useDynamicCardsStore.getState().addCards(totw, true);

  // treino dos jovens (determinístico por rodada)
  applyTraining(s);

  // copa: cruzou um checkpoint?
  let cup = s.cup;
  if (cup && !cup.champion && CUP_AFTER_ROUNDS.includes(s.round)) {
    cup = cup.userAlive ? { ...cup, pending: true } : autoResolveCupStage({ ...s, cup });
  }

  const totalRounds = Math.max(...s.fixtures.map((f) => f.round));
  if (s.round < totalRounds) {
    set({ results, round: s.round + 1, cup, recentRatings: s.recentRatings });
    return;
  }

  // --- fim de temporada ---------------------------------------------------
  // copa inacabada resolve sozinha antes da virada
  while (cup && !cup.champion) cup = autoResolveCupStage({ ...s, cup });

  const leagueClubs = [...clubById.values()]
    .filter((c) => c.leagueId === s.leagueId)
    .map((c) => c.id);
  const standings = computeStandings(leagueClubs, results);
  const placement = standings.findIndex((row) => row.clubId === s.userClubId) + 1;
  const prizeCoins =
    CONFIG.economy.seasonPrizeCoinsByPlacement[placement - 1] ??
    CONFIG.economy.seasonPrizeCoinsByPlacement[CONFIG.economy.seasonPrizeCoinsByPlacement.length - 1] ??
    100;
  const prizeGems = placement === 1 ? CONFIG.economy.leagueChampionGems : 0;
  useEconomyStore.getState().earn({ coins: prizeCoins, gems: prizeGems });

  const aging = useCollectionStore.getState().applySeasonAging(s.seasonSeed + 777);
  useProfileStore.getState().recordSeason(placement === 1, cup?.champion === s.userClubId);

  const summary: SeasonSummary = {
    season: s.season,
    placement,
    champion: standings[0]?.clubId ?? '',
    cupChampion: cup?.champion ?? null,
    userWonCup: cup?.champion === s.userClubId,
    prizeCoins,
    prizeGems,
    aging,
  };

  const nextSeed = s.seasonSeed + 1;
  opponentCache.clear();
  set({
    season: s.season + 1,
    round: 1,
    fixtures: generateFixtures(leagueClubs, mulberry32(nextSeed)),
    results: [],
    seasonSeed: nextSeed,
    cup: newCup(leagueClubs, s.userClubId!, nextSeed),
    recentRatings: {},
    lastSummary: summary,
    history: [...get().history, summary],
  });
}

/** Treino semanal: jovens (≤23) com foco podem ganhar +1 na categoria. */
function applyTraining(s: CareerState): void {
  const entries = Object.entries(s.trainingFocus);
  if (entries.length === 0) return;
  const rng = mulberry32(s.seasonSeed + 90000 + s.round);
  const collection = useCollectionStore.getState();
  for (const [ownedId, category] of entries.sort()) {
    const owned = collection.ownedCards[ownedId];
    if (!owned || owned.age > TRAINING_MAX_AGE) continue;
    const card = getCardById(owned.cardDefId);
    if (!card || card.frozen) continue;
    if (!chance(rng, TRAINING_CHANCE)) continue;
    const keys = trainingKeys(category, isGkAttributes(card.attributes));
    if (keys.length === 0) continue;
    const attr = keys[randInt(rng, 0, keys.length - 1)]!;
    collection.applyTrainingGain(ownedId, attr);
  }
}

function trainingKeys(category: AttributeCategory, gk: boolean): string[] {
  if (gk) return ['reflexes', 'handling', 'rushingOut', 'kicking', 'gkPositioning'];
  const byCategory: Record<AttributeCategory, string[]> = {
    pace: ['acceleration', 'sprintSpeed'],
    finishing: ['finishing', 'shotPower', 'heading', 'offPositioning'],
    passing: ['shortPass', 'longPass', 'crossing', 'vision'],
    dribbling: ['dribbling', 'ballControl', 'agility'],
    defense: ['marking', 'tackling', 'interceptions', 'defPositioning'],
    physical: ['strength', 'stamina', 'jumping'],
    mental: ['composure', 'consistency', 'bigGame'],
  };
  return byCategory[category] ?? [];
}
