// Partida ao Vivo (SPEC tela 4 + 5.4/5.5): o engine calcula o resultado
// completo; a UI reproduz os eventos com timing. Decisões e substituições do
// usuário viram `interventions` e re-simulam com a MESMA seed — o prefixo de
// eventos é idêntico, então o playback simplesmente continua.
// Estado efêmero (sem persistência): um amistoso por vez.
import { create } from 'zustand';
import {
  buildAutoSquad,
  buildCatalog,
  matchReward,
  resolveSquad,
  simulateMatch,
  type DecisionPoint,
  type Intervention,
  type MatchResult,
  type MatchReward,
  type OwnedCard,
  type ResolvedSquad,
  type Squad,
  type Substitution,
  type Tactics,
} from '@squad-dynasty/engine';
import { CARDS, CATALOG, PLAYERS } from '../services/catalog';
import { useEconomyStore } from './economyStore';
import { useObjectivesStore } from './objectivesStore';

export type MatchPhase = 'idle' | 'playing' | 'decision' | 'finished';
export type MatchSpeed = 'normal' | 'fast';

/** minutos de jogo por segundo real: 90' → ~4min (normal) ou ~30s (rápido). */
export const SPEED_FACTOR: Record<MatchSpeed, number> = { normal: 0.375, fast: 3 };

interface MatchState {
  phase: MatchPhase;
  speed: MatchSpeed;
  result: MatchResult | null;
  playbackMinute: number;
  pendingDecision: DecisionPoint | null;
  answeredDecisionIds: string[];
  opponentClubId: string | null;
  interventions: Intervention[];
  home: ResolvedSquad | null;
  seed: number;
  /** Recompensa concedida no fim da partida (uma única vez). */
  reward: MatchReward | null;

  startFriendly: (
    userSquad: Squad,
    owned: Map<string, OwnedCard>,
    opponentClubId: string,
    seed?: number,
  ) => void;
  setSpeed: (speed: MatchSpeed) => void;
  /** Avança o relógio do playback; pausa em decisões do usuário. */
  advance: (minutes: number) => void;
  /** Responde o DecisionPoint pendente (re-simula com a mesma seed). */
  decide: (optionId: string) => void;
  /** Ajuste tático/substituições do usuário a partir do próximo minuto. */
  intervene: (tactics?: Partial<Tactics>, substitutions?: Substitution[]) => void;
  reset: () => void;
}

function buildOpponent(clubId: string): ResolvedSquad {
  const clubPlayers = PLAYERS.filter((p) => p.clubId === clubId);
  const ids = new Set(clubPlayers.map((p) => p.id));
  const baseCards = CARDS.filter((c) => c.version === 'base' && ids.has(c.basePlayerId));
  const { squad, ownedCards } = buildAutoSquad(clubPlayers, baseCards, '4-3-3', {
    ownerId: `ai-${clubId}`,
  });
  return resolveSquad(squad, new Map(ownedCards.map((o) => [o.id, o])), CATALOG);
}

/** Completa o banco com as melhores cartas não escaladas (1 GK + até 6 linha). */
function autoBench(userSquad: Squad, owned: Map<string, OwnedCard>): Squad {
  if (userSquad.bench.length >= 7) return userSquad;
  const used = new Set([...userSquad.starters.map((s) => s.ownedCardId), ...userSquad.bench]);
  const candidates = [...owned.values()]
    .filter((o) => !used.has(o.id))
    .map((o) => {
      const card = CATALOG.cards.get(o.cardDefId);
      if (!card) return null;
      const player = CATALOG.players.get(card.basePlayerId);
      if (!player) return null;
      const gk = 'reflexes' in card.attributes;
      return { id: o.id, gk };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);
  const bench = [...userSquad.bench];
  const hasGkOnBench = bench.some((id) => {
    const o = owned.get(id);
    const card = o && CATALOG.cards.get(o.cardDefId);
    return card ? 'reflexes' in card.attributes : false;
  });
  if (!hasGkOnBench) {
    const gk = candidates.find((c) => c.gk);
    if (gk) bench.push(gk.id);
  }
  for (const c of candidates) {
    if (bench.length >= 7) break;
    if (!c.gk && !bench.includes(c.id)) bench.push(c.id);
  }
  return { ...userSquad, bench };
}

function runSim(state: Pick<MatchState, 'home' | 'opponentClubId' | 'seed' | 'interventions'>): MatchResult {
  if (!state.home || !state.opponentClubId) throw new Error('Partida não iniciada');
  return simulateMatch(
    {
      home: state.home,
      away: buildOpponent(state.opponentClubId),
      seed: state.seed,
      homeController: 'user',
      awayController: 'ai',
    },
    { interventions: state.interventions },
  );
}

export const useMatchStore = create<MatchState>()((set, get) => ({
  phase: 'idle',
  speed: 'normal',
  result: null,
  playbackMinute: 0,
  pendingDecision: null,
  answeredDecisionIds: [],
  opponentClubId: null,
  interventions: [],
  home: null,
  seed: 0,
  reward: null,

  startFriendly: (userSquad, owned, opponentClubId, seed) => {
    const withBench = autoBench(userSquad, owned);
    const ownedWithAuto = new Map(owned);
    const home = resolveSquad(withBench, ownedWithAuto, buildCatalog(PLAYERS, CARDS));
    const finalSeed = seed ?? Math.floor(Date.now() % 2147483647);
    const base = { home, opponentClubId, seed: finalSeed, interventions: [] as Intervention[] };
    const result = runSim(base);
    set({
      ...base,
      result,
      phase: 'playing',
      playbackMinute: 0,
      pendingDecision: null,
      answeredDecisionIds: [],
      reward: null,
    });
  },

  setSpeed: (speed) => set({ speed }),

  advance: (minutes) => {
    const state = get();
    if (state.phase !== 'playing' || !state.result) return;
    let next = state.playbackMinute + minutes;

    // Decisão do usuário no caminho? Pausa exatamente no minuto dela.
    const decision = state.result.decisions.find(
      (d) =>
        d.side === 'home' &&
        !d.aiChoiceId &&
        !state.answeredDecisionIds.includes(d.id) &&
        d.minute > state.playbackMinute &&
        d.minute <= next,
    );
    if (decision) {
      set({ playbackMinute: decision.minute, phase: 'decision', pendingDecision: decision });
      return;
    }
    if (next >= state.result.totalMinutes) {
      // Fim de jogo: concede recompensa e registra objetivos (uma vez).
      const reward = matchReward(state.result, 'home');
      useEconomyStore.getState().earn({ coins: reward.coins });
      useObjectivesStore.getState().recordMatch(state.result, 'home');
      set({ playbackMinute: state.result.totalMinutes, phase: 'finished', reward });
      return;
    }
    set({ playbackMinute: next });
  },

  decide: (optionId) => {
    const state = get();
    const decision = state.pendingDecision;
    if (!decision || !state.result) return;
    const option = decision.options.find((o) => o.id === optionId);
    const answered = [...state.answeredDecisionIds, decision.id];
    if (!option?.tactics) {
      // "manter": nada muda, segue o jogo.
      set({ phase: 'playing', pendingDecision: null, answeredDecisionIds: answered });
      return;
    }
    const interventions = [
      ...state.interventions,
      { minute: decision.minute, side: 'home' as const, tactics: option.tactics },
    ];
    const result = runSim({ ...state, interventions });
    set({
      result,
      interventions,
      phase: 'playing',
      pendingDecision: null,
      answeredDecisionIds: answered,
    });
  },

  intervene: (tactics, substitutions) => {
    const state = get();
    if (!state.result || (state.phase !== 'playing' && state.phase !== 'decision')) return;
    if (!tactics && !substitutions?.length) return;
    const minute = Math.min(Math.floor(state.playbackMinute) + 1, state.result.totalMinutes - 1);
    const interventions = [
      ...state.interventions,
      { minute, side: 'home' as const, tactics, substitutions },
    ];
    const result = runSim({ ...state, interventions });
    set({ result, interventions });
  },

  reset: () =>
    set({
      phase: 'idle',
      result: null,
      playbackMinute: 0,
      pendingDecision: null,
      answeredDecisionIds: [],
      opponentClubId: null,
      interventions: [],
      home: null,
      seed: 0,
      reward: null,
    }),
}));
