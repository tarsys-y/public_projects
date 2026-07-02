// Coleção do usuário (offline-first, AsyncStorage). No M7 sincroniza com o
// Firestore. A coleção inicial de demonstração dá os elencos do Flamengo e
// do Palmeiras + um Momento Épico, o suficiente para montar vários 11.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  applyAging,
  applyEvolution,
  evolutionCost,
  isGkAttributes,
  mulberry32,
  type OwnedCard,
} from '@squad-dynasty/engine';
import { CARDS, getCardById, playerById } from '../services/catalog';
import { useEconomyStore } from './economyStore';

const CURRENT_YEAR = 2026;
const OWNER_ID = 'local-user';

export type EvolveOutcome = 'ok' | 'max' | 'no-duplicates' | 'no-coins';

export interface AgingSummaryEntry {
  ownedId: string;
  name: string;
  newAge: number;
  changes: Record<string, number>;
  retired: boolean;
}

interface CollectionState {
  ownedCards: Record<string, OwnedCard>;
  /** Cartas aposentadas (SPEC 4.4): viram item de coleção, não escaláveis. */
  retired: Record<string, boolean>;
  nextId: number;
  seeded: boolean;
  grantCard: (cardDefId: string) => OwnedCard | null;
  /**
   * Virada de temporada (SPEC 4.4): +1 ano nas cartas não-congeladas,
   * aplica envelhecimento e sorteia aposentadorias. Determinístico por seed.
   */
  applySeasonAging: (seed: number) => AgingSummaryEntry[];
  /**
   * Evolui a carta (SPEC 4.6): consome N duplicatas da mesma definição
   * (as mais recentes) + coins, aplica os deltas nos atributos-chave.
   */
  evolveCard: (ownedId: string) => EvolveOutcome;
  /** SBC: consome (remove) cartas entregues num desafio. */
  consumeCards: (ownedIds: string[]) => void;
  /** Treino (carreira): +1 num atributo específico via attributeDeltas. */
  applyTrainingGain: (ownedId: string, attribute: string) => void;
  seedDemoCollection: () => void;
  reset: () => void;
}

function makeOwned(cardDefId: string, id: string): OwnedCard | null {
  const card = getCardById(cardDefId);
  if (!card) return null;
  const player = playerById.get(card.basePlayerId);
  if (!player) return null;
  return {
    id,
    ownerId: OWNER_ID,
    cardDefId,
    age: Math.max(16, CURRENT_YEAR - player.birthYear),
    attributeDeltas: {},
    evolutionLevel: 0,
    starterStreak: 0,
    acquiredAt: Date.now(),
  };
}

const DEMO_CLUBS = ['flamengo', 'palmeiras'];
const DEMO_EXTRAS = ['vinicius-junior-ucl2024'];

export const useCollectionStore = create<CollectionState>()(
  persist(
    (set, get) => ({
      ownedCards: {},
      retired: {},
      nextId: 1,
      seeded: false,

      grantCard: (cardDefId) => {
        const state = get();
        const owned = makeOwned(cardDefId, `owned-${state.nextId}`);
        if (!owned) return null;
        set({
          ownedCards: { ...state.ownedCards, [owned.id]: owned },
          nextId: state.nextId + 1,
        });
        return owned;
      },

      applySeasonAging: (seed) => {
        const rng = mulberry32(seed);
        const state = get();
        const summary: AgingSummaryEntry[] = [];
        const ownedCards: Record<string, OwnedCard> = {};
        const retired = { ...state.retired };
        // ordem estável para determinismo
        const entries = Object.values(state.ownedCards).sort((a, b) => a.id.localeCompare(b.id));
        for (const owned of entries) {
          const card = getCardById(owned.cardDefId);
          const player = card ? playerById.get(card.basePlayerId) : undefined;
          if (!card || !player || card.frozen || retired[owned.id]) {
            ownedCards[owned.id] = owned;
            continue;
          }
          const aged: OwnedCard = { ...owned, age: owned.age + 1 };
          const outcome = applyAging(aged, card, player, rng);
          ownedCards[owned.id] = outcome.card;
          if (outcome.retired) retired[owned.id] = true;
          if (outcome.retired || Object.keys(outcome.changes).length > 0) {
            summary.push({
              ownedId: owned.id,
              name: player.name,
              newAge: aged.age,
              changes: outcome.changes as Record<string, number>,
              retired: outcome.retired,
            });
          }
        }
        set({ ownedCards, retired });
        return summary;
      },

      evolveCard: (ownedId) => {
        const state = get();
        const owned = state.ownedCards[ownedId];
        if (!owned) return 'max';
        const cost = evolutionCost(owned.evolutionLevel);
        if (!cost) return 'max';
        const duplicates = Object.values(state.ownedCards)
          .filter((o) => o.cardDefId === owned.cardDefId && o.id !== ownedId)
          .sort((a, b) => b.acquiredAt - a.acquiredAt)
          .slice(0, cost.duplicates);
        if (duplicates.length < cost.duplicates) return 'no-duplicates';
        if (!useEconomyStore.getState().spend({ coins: cost.coins })) return 'no-coins';

        const card = getCardById(owned.cardDefId);
        const player = card ? playerById.get(card.basePlayerId) : undefined;
        const evolved = applyEvolution(
          owned,
          player?.positions[0] ?? 'ST',
          card ? isGkAttributes(card.attributes) : false,
        );
        const ownedCards = { ...state.ownedCards, [ownedId]: evolved };
        for (const dup of duplicates) delete ownedCards[dup.id];
        set({ ownedCards });
        return 'ok';
      },

      consumeCards: (ownedIds) => {
        const ownedCards = { ...get().ownedCards };
        for (const id of ownedIds) delete ownedCards[id];
        set({ ownedCards });
      },

      applyTrainingGain: (ownedId, attribute) => {
        const state = get();
        const owned = state.ownedCards[ownedId];
        if (!owned) return;
        const deltas = { ...(owned.attributeDeltas as Record<string, number>) };
        deltas[attribute] = (deltas[attribute] ?? 0) + 1;
        set({
          ownedCards: {
            ...state.ownedCards,
            [ownedId]: { ...owned, attributeDeltas: deltas as OwnedCard['attributeDeltas'] },
          },
        });
      },

      seedDemoCollection: () => {
        if (get().seeded) return;
        const starters = CARDS.filter(
          (c) =>
            (c.version === 'base' && DEMO_CLUBS.includes(playerById.get(c.basePlayerId)?.clubId ?? '')) ||
            DEMO_EXTRAS.includes(c.id),
        );
        let nextId = get().nextId;
        const ownedCards = { ...get().ownedCards };
        for (const card of starters) {
          const owned = makeOwned(card.id, `owned-${nextId}`);
          if (owned) {
            ownedCards[owned.id] = owned;
            nextId++;
          }
        }
        set({ ownedCards, nextId, seeded: true });
      },

      reset: () => set({ ownedCards: {}, retired: {}, nextId: 1, seeded: false }),
    }),
    {
      name: 'squad-dynasty/collection',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export const ownedCardsMap = (state: CollectionState): Map<string, OwnedCard> =>
  new Map(Object.entries(state.ownedCards));
