// Moedas do jogador (SPEC 6): coins (soft) e gems (premium interna).
// Sem dinheiro real em NENHUMA hipótese. Persistido em AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface EconomyState {
  coins: number;
  gems: number;
  earn: (amount: { coins?: number; gems?: number }) => void;
  /** Debita se houver saldo; retorna false sem alterar nada se não houver. */
  spend: (amount: { coins?: number; gems?: number }) => boolean;
  reset: () => void;
}

/** Saldo inicial: dá para abrir os primeiros pacotes e sentir o loop. */
const INITIAL = { coins: 99999, gems: 9999 };

export const useEconomyStore = create<EconomyState>()(
  persist(
    (set, get) => ({
      ...INITIAL,
      earn: ({ coins = 0, gems = 0 }) =>
        set((s) => ({ coins: s.coins + Math.max(0, coins), gems: s.gems + Math.max(0, gems) })),
      spend: ({ coins = 0, gems = 0 }) => {
        const s = get();
        if (s.coins < coins || s.gems < gems) return false;
        set({ coins: s.coins - coins, gems: s.gems - gems });
        return true;
      },
      reset: () => set(INITIAL),
    }),
    { name: 'squad-dynasty/economy', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
