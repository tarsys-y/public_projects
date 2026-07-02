// Abertura de pacotes (SPEC 4.5): sorteio pelo engine (openPack) com pity
// persistido e visível. Até o M7 o sorteio roda no cliente com seed do
// relógio; depois migra para Cloud Function (SPEC 10.4, ver DECISIONS.md).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  CONFIG,
  EMPTY_PITY,
  mulberry32,
  openPack,
  type CardDefinition,
  type PackType,
  type PityState,
} from '@squad-dynasty/engine';
import { CARDS } from '../services/catalog';
import { useCollectionStore } from './collectionStore';
import { useEconomyStore } from './economyStore';

export interface OpeningResult {
  cards: CardDefinition[];
  ownedIds: string[];
  pityTriggered: 'legendary' | 'icon' | null;
}

interface PacksState {
  pity: PityState;
  totalOpened: number;
  /** Compra e abre um pacote; null se saldo insuficiente. */
  buyAndOpen: (packType: PackType, seed?: number) => OpeningResult | null;
  reset: () => void;
}

/** Pool sorteável: tudo que pode vir em pacote (cartas base + especiais). */
const PACK_POOL = CARDS;

export const usePacksStore = create<PacksState>()(
  persist(
    (set, get) => ({
      pity: { ...EMPTY_PITY },
      totalOpened: 0,

      buyAndOpen: (packType, seed) => {
        const spec = CONFIG.packs.types[packType];
        const paid = useEconomyStore
          .getState()
          .spend({ coins: spec.costCoins, gems: spec.costGems });
        if (!paid) return null;

        const rng = mulberry32(seed ?? Math.floor(Date.now() % 2147483647));
        const opening = openPack(rng, PACK_POOL, packType, get().pity);
        const grant = useCollectionStore.getState().grantCard;
        const ownedIds: string[] = [];
        for (const card of opening.cards) {
          const owned = grant(card.id);
          if (owned) ownedIds.push(owned.id);
        }
        set((s) => ({ pity: opening.pity, totalOpened: s.totalOpened + 1 }));
        return { cards: opening.cards, ownedIds, pityTriggered: opening.pityTriggered };
      },

      reset: () => set({ pity: { ...EMPTY_PITY }, totalOpened: 0 }),
    }),
    { name: 'squad-dynasty/packs', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
