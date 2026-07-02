// Escalação do usuário (Meu Time), persistida em AsyncStorage.
// Toda a lógica mora em squadLogic.ts (pura e testada); aqui só o wiring.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_TACTICS, type RoleId, type Tactics } from '@squad-dynasty/engine';
import {
  assignCard,
  changeFormation,
  clearSlot,
  emptyDraft,
  setBench,
  setRole,
  setTactics,
  type DraftSquad,
} from './squadLogic';

interface SquadState {
  draft: DraftSquad;
  setFormation: (formationId: string) => void;
  assign: (slotIndex: number, ownedCardId: string) => void;
  clear: (slotIndex: number) => void;
  changeRole: (slotIndex: number, role: RoleId) => void;
  updateTactics: (tactics: Partial<Tactics>) => void;
  updateBench: (bench: string[]) => void;
  resetDraft: () => void;
}

export const useSquadStore = create<SquadState>()(
  persist(
    (set) => ({
      draft: emptyDraft('4-3-3', { ...DEFAULT_TACTICS }),
      setFormation: (formationId) => set((s) => ({ draft: changeFormation(s.draft, formationId) })),
      assign: (slotIndex, ownedCardId) =>
        set((s) => ({ draft: assignCard(s.draft, slotIndex, ownedCardId) })),
      clear: (slotIndex) => set((s) => ({ draft: clearSlot(s.draft, slotIndex) })),
      changeRole: (slotIndex, role) => set((s) => ({ draft: setRole(s.draft, slotIndex, role) })),
      updateTactics: (tactics) => set((s) => ({ draft: setTactics(s.draft, tactics) })),
      updateBench: (bench) => set((s) => ({ draft: setBench(s.draft, bench) })),
      resetDraft: () => set({ draft: emptyDraft('4-3-3', { ...DEFAULT_TACTICS }) }),
    }),
    {
      name: 'squad-dynasty/squad',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
