// Modo Draft (UT): pague a entrada, monte um XI escolhendo 1 de 5 cartas por
// posição (emprestadas — não entram na coleção) e encare uma série de 4
// partidas contra adversários cada vez mais fortes. Prêmio cresce por vitória.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  buildAutoSquad,
  buildCatalog,
  computeRoleFit,
  FORMATIONS,
  isGkAttributes,
  mulberry32,
  pickWeighted,
  resolveSquad,
  rolesForPosition,
  simulateMatch,
  type CardDefinition,
  type OwnedCard,
  type Rarity,
  type ResolvedSquad,
  type Rng,
} from '@squad-dynasty/engine';
import { CARDS, cardOverall, getAllCards, PLAYERS, playerById } from '../services/catalog';
import { useEconomyStore } from './economyStore';
import { useProfileStore } from './profileStore';

export const DRAFT_ENTRY_COINS = 1500;
export const DRAFT_REWARDS_BY_WINS = [500, 1500, 2800, 4500, 6500];
export const DRAFT_PERFECT_GEMS = 40;
const DRAFT_FORMATION = '4-3-3';
const GAUNTLET = 4;
/** Overall alvo dos adversários por partida. */
const OPPONENT_TIERS = [75, 79, 83, 87];

const RARITY_DRAFT_WEIGHT: Record<Rarity, number> = {
  common: 1,
  rare: 3,
  epic: 6,
  legendary: 9,
  icon: 9,
};

export type DraftPhase = 'idle' | 'picking' | 'gauntlet' | 'done';

export interface GauntletResult {
  opponentLabel: string;
  score: [number, number];
  won: boolean;
}

interface DraftState {
  phase: DraftPhase;
  seed: number;
  slotIndex: number; // 0..10
  choices: string[]; // cardDefIds das 5 opções do slot atual
  picks: string[]; // cardDefIds escolhidos (por slot)
  results: GauntletResult[];
  claimed: boolean;
  startDraft: (seed?: number) => boolean;
  choose: (cardDefId: string) => void;
  playNextMatch: () => GauntletResult | null;
  claimRewards: () => { coins: number; gems: number } | null;
  reset: () => void;
}

function choicesForSlot(slotIndex: number, seed: number, picked: string[]): string[] {
  const formation = FORMATIONS[DRAFT_FORMATION]!;
  const position = formation.slots[slotIndex]!.position;
  const rng = mulberry32(seed + slotIndex * 97);
  const pickedSet = new Set(picked);
  const candidates = getAllCards().filter((card) => {
    if (pickedSet.has(card.id)) return false;
    const player = playerById.get(card.basePlayerId);
    if (!player) return false;
    const gkCard = isGkAttributes(card.attributes);
    if (position === 'GK') return gkCard;
    return !gkCard && player.positions.includes(position);
  });
  const choices: string[] = [];
  const used = new Set<string>();
  let guard = 0;
  while (choices.length < 5 && guard++ < 200 && candidates.length > 0) {
    const idx = pickWeighted(
      rng,
      candidates.map((c) => (used.has(c.id) ? 0 : RARITY_DRAFT_WEIGHT[c.rarity])),
    );
    const card = candidates[idx]!;
    if (used.has(card.id)) continue;
    used.add(card.id);
    choices.push(card.id);
  }
  return choices;
}

/** Monta o ResolvedSquad do draft (cartas emprestadas, ownedIds sintéticos). */
function draftSquad(picks: string[]): ResolvedSquad {
  const formation = FORMATIONS[DRAFT_FORMATION]!;
  const allCards = getAllCards();
  const cardMap = new Map(allCards.map((c) => [c.id, c]));
  const owned: OwnedCard[] = picks.map((cardDefId, i) => ({
    id: `draft-${i}`,
    ownerId: 'draft',
    cardDefId,
    age: 26,
    attributeDeltas: {},
    evolutionLevel: 0,
    starterStreak: 0,
    acquiredAt: 0,
  }));
  const starters = picks.map((cardDefId, i) => {
    const slot = formation.slots[i]!;
    const card = cardMap.get(cardDefId)!;
    const best = rolesForPosition(slot.position)
      .map((r) => ({ id: r.id, fit: computeRoleFit(card.attributes, r.id) }))
      .sort((a, b) => b.fit - a.fit)[0]!;
    return { position: slot.position, role: best.id, ownedCardId: `draft-${i}` };
  });
  const squad = {
    formation: DRAFT_FORMATION,
    starters,
    bench: [],
    tactics: { mentality: 3, width: 2, defensiveLine: 2, pressing: 2, passStyle: 'short', attackFocus: 'center' } as const,
  };
  return resolveSquad(
    squad,
    new Map(owned.map((o) => [o.id, o])),
    buildCatalog(PLAYERS, allCards),
  );
}

/** Adversário do gauntlet: XI automático com overall próximo do alvo. */
function gauntletOpponent(tier: number, rng: Rng): { squad: ResolvedSquad; label: string } {
  const pool = CARDS.filter((c) => {
    if (c.version !== 'base') return false;
    const overall = cardOverall(c);
    return overall >= tier - 3 && overall <= tier + 3;
  });
  const players = PLAYERS.filter((p) => pool.some((c) => c.basePlayerId === p.id));
  const { squad, ownedCards } = buildAutoSquad(players, pool, DRAFT_FORMATION, {
    ownerId: `gauntlet-${tier}`,
  });
  void rng;
  return {
    squad: resolveSquad(squad, new Map(ownedCards.map((o) => [o.id, o])), buildCatalog(PLAYERS, CARDS)),
    label: `Seleção ~${tier}`,
  };
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      phase: 'idle',
      seed: 0,
      slotIndex: 0,
      choices: [],
      picks: [],
      results: [],
      claimed: false,

      startDraft: (seed) => {
        if (get().phase === 'picking' || get().phase === 'gauntlet') return true; // draft em andamento
        if (!useEconomyStore.getState().spend({ coins: DRAFT_ENTRY_COINS })) return false;
        const finalSeed = seed ?? Math.floor(Date.now() % 2147483647);
        set({
          phase: 'picking',
          seed: finalSeed,
          slotIndex: 0,
          picks: [],
          results: [],
          claimed: false,
          choices: choicesForSlot(0, finalSeed, []),
        });
        return true;
      },

      choose: (cardDefId) => {
        const s = get();
        if (s.phase !== 'picking' || !s.choices.includes(cardDefId)) return;
        const picks = [...s.picks, cardDefId];
        if (picks.length === 11) {
          set({ picks, phase: 'gauntlet', choices: [], slotIndex: 11 });
          return;
        }
        set({
          picks,
          slotIndex: s.slotIndex + 1,
          choices: choicesForSlot(s.slotIndex + 1, s.seed, picks),
        });
      },

      playNextMatch: () => {
        const s = get();
        if (s.phase !== 'gauntlet' || s.results.length >= GAUNTLET) return null;
        const matchIndex = s.results.length;
        const rng = mulberry32(s.seed + 5000 + matchIndex);
        const { squad: opponent, label } = gauntletOpponent(OPPONENT_TIERS[matchIndex]!, rng);
        const result = simulateMatch({
          home: draftSquad(s.picks),
          away: opponent,
          seed: s.seed + 6000 + matchIndex,
          homeController: 'ai',
          awayController: 'ai',
        });
        const [h, a] = result.score;
        const entry: GauntletResult = { opponentLabel: label, score: [h, a], won: h > a };
        const results = [...s.results, entry];
        const lost = !entry.won; // derrota (ou empate) encerra a série, estilo UT
        set({ results, phase: results.length >= GAUNTLET || lost ? 'done' : 'gauntlet' });
        return entry;
      },

      claimRewards: () => {
        const s = get();
        if (s.phase !== 'done' || s.claimed) return null;
        const wins = s.results.filter((r) => r.won).length;
        const coins = DRAFT_REWARDS_BY_WINS[wins] ?? 0;
        const gems = wins === GAUNTLET ? DRAFT_PERFECT_GEMS : 0;
        useEconomyStore.getState().earn({ coins, gems });
        if (wins === GAUNTLET) useProfileStore.getState().recordPerfectDraft();
        set({ claimed: true, phase: 'idle', picks: [], results: s.results });
        return { coins, gems };
      },

      reset: () =>
        set({ phase: 'idle', seed: 0, slotIndex: 0, choices: [], picks: [], results: [], claimed: false }),
    }),
    { name: 'squad-dynasty/draft', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
