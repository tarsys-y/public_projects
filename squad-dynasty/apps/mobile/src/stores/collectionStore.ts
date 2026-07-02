// Coleção do usuário (offline-first, AsyncStorage). No M7 sincroniza com o
// Firestore. A coleção inicial de demonstração dá os elencos do Flamengo e
// do Palmeiras + um Momento Épico, o suficiente para montar vários 11.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { OwnedCard } from '@squad-dynasty/engine';
import { CARDS, playerById } from '../services/catalog';

const CURRENT_YEAR = 2026;
const OWNER_ID = 'local-user';

interface CollectionState {
  ownedCards: Record<string, OwnedCard>;
  nextId: number;
  seeded: boolean;
  grantCard: (cardDefId: string) => OwnedCard | null;
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
