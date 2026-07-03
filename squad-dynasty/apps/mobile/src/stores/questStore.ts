// Missões de Primeiro Uso (4.2): 5 missões one-time que guiam o jogador.
// A condição de cada missão é derivada de contadores que já existem em outros
// stores (profileStore, careerStore) — só a química (efêmera, nunca
// persistida) precisa de uma flag própria, marcada oportunisticamente.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useCareerStore } from './careerStore';
import { useEconomyStore } from './economyStore';
import { usePacksStore } from './packsStore';
import { useProfileStore } from './profileStore';

export interface Quest {
  id: string;
  label: string;
  rewardLabel: string;
}

export const QUESTS: Quest[] = [
  { id: 'first-match', label: 'Jogue sua 1ª partida', rewardLabel: '🪙 500' },
  { id: 'first-pack', label: 'Abra seu 1º pacote', rewardLabel: '📦 Pacote Básico' },
  { id: 'first-win', label: 'Vença uma partida', rewardLabel: '🪙 500' },
  { id: 'chemistry40', label: 'Monte um time com química ≥40', rewardLabel: '🪙 1000' },
  { id: 'first-career', label: 'Inicie uma carreira', rewardLabel: '📦 Pacote Premium' },
];

interface QuestState {
  claimed: Record<string, boolean>;
  chemistryAchieved: boolean;
  markChemistryAchieved: () => void;
  isDone: (id: string) => boolean;
  claim: (id: string) => boolean;
  reset: () => void;
}

export const useQuestStore = create<QuestState>()(
  persist(
    (set, get) => ({
      claimed: {},
      chemistryAchieved: false,

      markChemistryAchieved: () => {
        if (!get().chemistryAchieved) set({ chemistryAchieved: true });
      },

      isDone: (id) => {
        const profile = useProfileStore.getState();
        const career = useCareerStore.getState();
        switch (id) {
          case 'first-match':
            return profile.matches >= 1;
          case 'first-pack':
            return profile.packsOpened >= 1;
          case 'first-win':
            return profile.wins >= 1;
          case 'chemistry40':
            return get().chemistryAchieved;
          case 'first-career':
            return career.active || career.history.length > 0;
          default:
            return false;
        }
      },

      claim: (id) => {
        const s = get();
        if (s.claimed[id] || !s.isDone(id)) return false;
        set({ claimed: { ...s.claimed, [id]: true } });
        switch (id) {
          case 'first-match':
          case 'first-win':
            useEconomyStore.getState().earn({ coins: 500 });
            break;
          case 'chemistry40':
            useEconomyStore.getState().earn({ coins: 1000 });
            break;
          case 'first-pack':
            usePacksStore.getState().buyAndOpen('basic');
            break;
          case 'first-career':
            usePacksStore.getState().buyAndOpen('premium');
            break;
        }
        return true;
      },

      reset: () => set({ claimed: {}, chemistryAchieved: false }),
    }),
    { name: 'squad-dynasty/quests', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
