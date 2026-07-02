// Onboarding (M8): tutorial paginado no primeiro launch, reabrível pela Home.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface OnboardingState {
  done: boolean;
  markDone: () => void;
  reopen: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      done: false,
      markDone: () => set({ done: true }),
      reopen: () => set({ done: false }),
    }),
    { name: 'squad-dynasty/onboarding', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export const ONBOARDING_STEPS = [
  {
    emoji: '🧩',
    title: 'Monte seu time',
    text: 'Na aba Meu Time, escale seu 11 tocando nos slots do campo. Fique de olho na química: clube, nação, liga e funções sinérgicas entre vizinhos deixam o time mais forte.',
  },
  {
    emoji: '⚽',
    title: 'Jogue partidas',
    text: 'Amistosos contra qualquer clube das 10 ligas reais, com narração ao vivo, notas por jogador e Momentos de Decisão. Vitórias pagam coins e completam objetivos.',
  },
  {
    emoji: '📦',
    title: 'Abra pacotes e colecione',
    text: 'Na Loja, abra pacotes (com garantia de lendária a cada 40) e o pacote temático do evento da semana. Duplicatas evoluem suas cartas ou viram prêmios nos Desafios de Montagem.',
  },
  {
    emoji: '🏆',
    title: 'Domine a carreira',
    text: 'Na aba Liga, assuma um clube e dispute campeonato e copa contra a IA. Seus melhores da rodada viram cartas "Em Alta", os jovens treinam e o elenco envelhece a cada temporada.',
  },
] as const;
