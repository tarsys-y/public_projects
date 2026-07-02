// Carreira PvE (M6): o usuário assume um clube numa liga real; as demais
// partidas de cada rodada são simuladas pelo engine. Ao fim da temporada:
// premiação por colocação, envelhecimento das cartas (SPEC 4.4) e novo
// calendário. Persistido em AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  buildAutoSquad,
  buildCatalog,
  computeStandings,
  CONFIG,
  generateFixtures,
  mulberry32,
  resolveSquad,
  simulateMatch,
  type Fixture,
  type LeagueMatchResult,
  type MatchResult,
  type ResolvedSquad,
  type StandingRow,
} from '@squad-dynasty/engine';
import { CARDS, CATALOG, clubById, PLAYERS } from '../services/catalog';
import { ownedCardsMap, useCollectionStore, type AgingSummaryEntry } from './collectionStore';
import { useEconomyStore } from './economyStore';
import { useMatchStore } from './matchStore';
import { toSquad, type DraftSquad } from './squadLogic';
import { useSquadStore } from './squadStore';

export interface SeasonSummary {
  season: number;
  placement: number; // 1-based
  champion: string; // clubId
  prizeCoins: number;
  prizeGems: number;
  aging: AgingSummaryEntry[];
}

interface CareerState {
  active: boolean;
  userClubId: string | null;
  leagueId: string | null;
  season: number;
  round: number; // próxima rodada (1-based)
  fixtures: Fixture[];
  results: LeagueMatchResult[];
  seasonSeed: number;
  lastSummary: SeasonSummary | null;
  history: SeasonSummary[];

  startCareer: (userClubId: string, seed?: number) => void;
  /** Fixture do usuário na rodada atual (null = temporada encerrada). */
  userFixture: () => Fixture | null;
  /** Abre a partida da rodada na tela de Partida (modo carreira). */
  playUserMatch: () => boolean;
  /** Consome o resultado da partida de carreira concluída no matchStore. */
  consumeUserResult: () => void;
  /** Simula a partida do usuário sem jogar (IA nos dois lados). */
  simulateUserMatch: () => void;
  standings: () => StandingRow[];
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
          lastSummary: null,
          history: [],
        });
      },

      userFixture: () => {
        const s = get();
        if (!s.active) return null;
        return (
          s.fixtures.find(
            (f) =>
              f.round === s.round &&
              (f.homeClubId === s.userClubId || f.awayClubId === s.userClubId),
          ) ?? null
        );
      },

      playUserMatch: () => {
        const s = get();
        const fixture = s.userFixture();
        if (!fixture) return false;
        const owned = ownedCardsMap(useCollectionStore.getState());
        const opponentId =
          fixture.homeClubId === s.userClubId ? fixture.awayClubId : fixture.homeClubId;
        try {
          const squad = toSquad(userDraftSquad());
          // Sem vantagem de mando no engine: o usuário sempre simula como
          // "home"; o placar é gravado na orientação do fixture.
          useMatchStore
            .getState()
            .startCareerMatch(squad, owned, opponentId, s.seasonSeed + s.round * 1000);
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
        finishRound(set, get, result);
      },

      simulateUserMatch: () => {
        const s = get();
        const fixture = s.userFixture();
        if (!fixture) return;
        const opponentId =
          fixture.homeClubId === s.userClubId ? fixture.awayClubId : fixture.homeClubId;
        let userSquad: ResolvedSquad;
        try {
          const owned = ownedCardsMap(useCollectionStore.getState());
          userSquad = resolveSquad(toSquad(userDraftSquad()), owned, buildCatalog(PLAYERS, CARDS));
        } catch {
          userSquad = buildClubSquad(s.userClubId!); // fallback: XI automático do clube
        }
        const result = simulateMatch({
          home: userSquad,
          away: buildClubSquad(opponentId),
          seed: s.seasonSeed + s.round * 1000,
          homeController: 'ai',
          awayController: 'ai',
        });
        finishRound(set, get, result);
      },

      standings: () => {
        const s = get();
        const leagueClubs = [...clubById.values()]
          .filter((c) => c.leagueId === s.leagueId)
          .map((c) => c.id);
        return computeStandings(leagueClubs, s.results);
      },

      abandonCareer: () =>
        set({
          active: false,
          userClubId: null,
          leagueId: null,
          season: 1,
          round: 1,
          fixtures: [],
          results: [],
          lastSummary: null,
        }),
    }),
    {
      name: 'squad-dynasty/career',
      storage: createJSONStorage(() => AsyncStorage),
      // funções não são persistidas; cache de adversários é recriado
      partialize: (s) => ({
        active: s.active,
        userClubId: s.userClubId,
        leagueId: s.leagueId,
        season: s.season,
        round: s.round,
        fixtures: s.fixtures,
        results: s.results,
        seasonSeed: s.seasonSeed,
        lastSummary: s.lastSummary,
        history: s.history,
      }),
    },
  ),
);

type Set = (partial: Partial<CareerState>) => void;
type Get = () => CareerState;

/** Registra o jogo do usuário, simula o resto da rodada e avança/encerra. */
function finishRound(set: Set, get: Get, userResult: MatchResult): void {
  const s = get();
  const fixture = s.userFixture();
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

  // Simula as demais partidas da rodada (IA × IA), determinístico.
  const others = s.fixtures.filter(
    (f) =>
      f.round === s.round && f.homeClubId !== s.userClubId && f.awayClubId !== s.userClubId,
  );
  others.forEach((f, i) => {
    const result = simulateMatch({
      home: buildClubSquad(f.homeClubId),
      away: buildClubSquad(f.awayClubId),
      seed: s.seasonSeed + s.round * 1000 + (i + 1),
      homeController: 'ai',
      awayController: 'ai',
    });
    results.push({
      homeClubId: f.homeClubId,
      awayClubId: f.awayClubId,
      homeGoals: result.score[0],
      awayGoals: result.score[1],
    });
  });

  const totalRounds = Math.max(...s.fixtures.map((f) => f.round));
  if (s.round < totalRounds) {
    set({ results, round: s.round + 1 });
    return;
  }

  // --- fim de temporada -------------------------------------------------
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

  // Envelhecimento (SPEC 4.4) — determinístico pela seed da temporada.
  const aging = useCollectionStore.getState().applySeasonAging(s.seasonSeed + 777);

  const summary: SeasonSummary = {
    season: s.season,
    placement,
    champion: standings[0]?.clubId ?? '',
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
    lastSummary: summary,
    history: [...s.history, summary],
  });
}
