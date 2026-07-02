// Cartas criadas em runtime (TOTW/"Em Alta" da carreira — SPEC M8 antecipado):
// definições persistidas localmente e mescladas ao catálogo via getCatalog().
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CardDefinition } from '@squad-dynasty/engine';

interface DynamicCardsState {
  cards: Record<string, CardDefinition>;
  /** ids das cartas TOTW da rodada mais recente (destaque do evento). */
  latestTotwIds: string[];
  addCards: (defs: CardDefinition[], asLatestTotw?: boolean) => void;
  list: () => CardDefinition[];
  reset: () => void;
}

export const useDynamicCardsStore = create<DynamicCardsState>()(
  persist(
    (set, get) => ({
      cards: {},
      latestTotwIds: [],
      addCards: (defs, asLatestTotw = false) => {
        const cards = { ...get().cards };
        for (const def of defs) cards[def.id] = def;
        set({ cards, ...(asLatestTotw ? { latestTotwIds: defs.map((d) => d.id) } : {}) });
      },
      list: () => Object.values(get().cards),
      reset: () => set({ cards: {}, latestTotwIds: [] }),
    }),
    { name: 'squad-dynasty/dynamic-cards', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
