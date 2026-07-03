// Recompensa de login diário (4.4): popup 1x/dia com streak de 7 dias que
// reseta se o jogador perder um dia. Persistido em AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useEconomyStore } from './economyStore';
import { usePacksStore } from './packsStore';

export interface DailyRewardSpec {
  day: number;
  coins?: number;
  pack?: 'basic' | 'premium';
  label: string;
}

export const DAILY_REWARDS: DailyRewardSpec[] = [
  { day: 1, coins: 300, label: '🪙 300' },
  { day: 2, coins: 500, label: '🪙 500' },
  { day: 3, coins: 800, label: '🪙 800' },
  { day: 4, pack: 'basic', label: '📦 Pacote Básico' },
  { day: 5, coins: 1500, label: '🪙 1500' },
  { day: 6, coins: 2000, label: '🪙 2000' },
  { day: 7, pack: 'premium', label: '📦 Pacote Premium' },
];

interface LoginRewardState {
  lastClaimDate: string | null;
  currentStreak: number; // 0 = nunca resgatado; 1-7 = dia do ciclo
  claimedToday: boolean;
  /** Garante que `claimedToday` reflita o dia local atual (chamar ao montar). */
  ensureToday: () => void;
  claim: () => DailyRewardSpec | null;
}

const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

export const useLoginRewardStore = create<LoginRewardState>()(
  persist(
    (set, get) => ({
      lastClaimDate: null,
      currentStreak: 0,
      claimedToday: false,

      ensureToday: () => {
        const claimedToday = get().lastClaimDate === today();
        if (claimedToday !== get().claimedToday) set({ claimedToday });
      },

      claim: () => {
        const s = get();
        if (s.lastClaimDate === today()) return null; // já resgatado hoje
        const nextStreak = s.lastClaimDate === yesterday() ? (s.currentStreak % 7) + 1 : 1;
        const reward = DAILY_REWARDS.find((r) => r.day === nextStreak) ?? DAILY_REWARDS[0]!;
        set({ lastClaimDate: today(), currentStreak: nextStreak, claimedToday: true });
        if (reward.coins) useEconomyStore.getState().earn({ coins: reward.coins });
        if (reward.pack) usePacksStore.getState().buyAndOpen(reward.pack);
        return reward;
      },
    }),
    { name: 'squad-dynasty/login-reward', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
