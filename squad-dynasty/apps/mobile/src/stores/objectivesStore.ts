// Objetivos diários (SPEC 6): dão coins/pacotes e resetam por data local.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { MatchResult, Side } from '@squad-dynasty/engine';
import { useEconomyStore } from './economyStore';

export interface DailyObjective {
  id: string;
  label: string;
  target: number;
  rewardCoins: number;
}

export const DAILY_OBJECTIVES: DailyObjective[] = [
  { id: 'play1', label: 'Jogar 1 partida', target: 1, rewardCoins: 200 },
  { id: 'win1', label: 'Vencer 1 partida', target: 1, rewardCoins: 300 },
  { id: 'goals3', label: 'Marcar 3 gols', target: 3, rewardCoins: 250 },
];

interface ObjectivesState {
  date: string; // YYYY-MM-DD local
  progress: Record<string, number>;
  claimed: Record<string, boolean>;
  /** Chamar ao fim de cada partida do usuário. */
  recordMatch: (result: MatchResult, side: Side) => void;
  claim: (id: string) => boolean;
  /** Garante que o dia atual está ativo (reseta se virou a data). */
  ensureToday: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export const useObjectivesStore = create<ObjectivesState>()(
  persist(
    (set, get) => ({
      date: today(),
      progress: {},
      claimed: {},

      ensureToday: () => {
        if (get().date !== today()) set({ date: today(), progress: {}, claimed: {} });
      },

      recordMatch: (result, side) => {
        get().ensureToday();
        const [home, away] = result.score;
        const mine = side === 'home' ? home : away;
        const theirs = side === 'home' ? away : home;
        set((s) => ({
          progress: {
            ...s.progress,
            play1: (s.progress.play1 ?? 0) + 1,
            win1: (s.progress.win1 ?? 0) + (mine > theirs ? 1 : 0),
            goals3: (s.progress.goals3 ?? 0) + mine,
          },
        }));
      },

      claim: (id) => {
        get().ensureToday();
        const objective = DAILY_OBJECTIVES.find((o) => o.id === id);
        const s = get();
        if (!objective || s.claimed[id] || (s.progress[id] ?? 0) < objective.target) return false;
        set({ claimed: { ...s.claimed, [id]: true } });
        useEconomyStore.getState().earn({ coins: objective.rewardCoins });
        return true;
      },
    }),
    { name: 'squad-dynasty/objectives', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
