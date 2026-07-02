// Coleção do usuário (offline-first, AsyncStorage). No M7 sincroniza com o
// Firestore. A coleção inicial de demonstração dá os elencos do Flamengo e
// do Palmeiras + um Momento Épico, o suficiente para montar vários 11.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { applyEvolution, evolutionCost, isGkAttributes, type OwnedCard } from '@squad-dynasty/engine';
import { CARDS, cardById, playerById } from '../services/catalog';
import { useEconomyStore } from './economyStore';

const CURRENT_YEAR = 2026;
const OWNER_ID = 'local-user';

export type EvolveOutcome = 'ok' | 'max' | 'no-duplicates' | 'no-coins';

interface CollectionState {
  ownedCards: Record<string, OwnedCard>;
  nextId: number;
  seeded: boolean;
  grantCard: (cardDefId: string) => OwnedCard | null;
  /**
   * Evolui a carta (SPEC 4.6): consome N duplicatas da mesma definição
   * (as mais recentes) + coins, aplica os deltas nos atributos-chave.
   */
  evolveCard: (ownedId: string) => EvolveOutcome;
  seedDemoCollection: () => void;
  reset: () => void;
}

function makeOwned(cardDefId: string, id: string): OwnedCard | null {
  const card = CARDS.find((c) => c.id === cardDefId);
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

        const card = cardById.get(owned.cardDefId);
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

      reset: () => set({ ownedCards: {}, nextId: 1, seeded: false }),
    }),
    {
      name: 'squad-dynasty/collection',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export const ownedCardsMap = (state: CollectionState): Map<string, OwnedCard> =>
  new Map(Object.entries(state.ownedCards));
