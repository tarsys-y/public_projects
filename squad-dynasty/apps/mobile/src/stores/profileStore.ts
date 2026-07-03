// Perfil de Técnico (SPEC tela 9): XP, nível e contadores persistidos;
// conquistas são DERIVADAS (nunca persistidas) dos contadores + coleção.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { MatchResult, Side } from '@squad-dynasty/engine';
import { DEFAULT_CREST_ID } from '../constants/crestPalettes';

const XP = { match: 10, win: 15, goal: 2, title: 200, cup: 150, perfectDraft: 100, sbc: 30 };

export interface ProfileCounters {
  matches: number;
  wins: number;
  goals: number;
  leagueTitles: number;
  cupTitles: number;
  perfectDrafts: number;
  sbcsCompleted: number;
  packsOpened: number;
  seasonsPlayed: number;
}

interface ProfileState extends ProfileCounters {
  coachName: string;
  xp: number;
  teamName: string;
  teamCrestId: string;
  setupDone: boolean;
  setCoachName: (name: string) => void;
  setTeamName: (name: string) => void;
  setTeamCrestId: (id: string) => void;
  markSetupDone: () => void;
  recordMatch: (result: MatchResult, side: Side) => void;
  recordSeason: (wonLeague: boolean, wonCup: boolean) => void;
  recordPack: () => void;
  recordPerfectDraft: () => void;
  recordSbc: () => void;
  reset: () => void;
}

const ZERO: ProfileCounters = {
  matches: 0,
  wins: 0,
  goals: 0,
  leagueTitles: 0,
  cupTitles: 0,
  perfectDrafts: 0,
  sbcsCompleted: 0,
  packsOpened: 0,
  seasonsPlayed: 0,
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      coachName: 'Técnico',
      xp: 0,
      teamName: '',
      teamCrestId: DEFAULT_CREST_ID,
      setupDone: false,
      ...ZERO,

      setCoachName: (coachName) => set({ coachName: coachName.slice(0, 20) || 'Técnico' }),
      setTeamName: (teamName) => set({ teamName: teamName.slice(0, 25) }),
      setTeamCrestId: (teamCrestId) => set({ teamCrestId }),
      markSetupDone: () => set({ setupDone: true }),

      recordMatch: (result, side) => {
        const [h, a] = result.score;
        const mine = side === 'home' ? h : a;
        const theirs = side === 'home' ? a : h;
        const won = mine > theirs;
        set((s) => ({
          matches: s.matches + 1,
          wins: s.wins + (won ? 1 : 0),
          goals: s.goals + mine,
          xp: s.xp + XP.match + (won ? XP.win : 0) + mine * XP.goal,
        }));
      },

      recordSeason: (wonLeague, wonCup) =>
        set((s) => ({
          seasonsPlayed: s.seasonsPlayed + 1,
          leagueTitles: s.leagueTitles + (wonLeague ? 1 : 0),
          cupTitles: s.cupTitles + (wonCup ? 1 : 0),
          xp: s.xp + (wonLeague ? XP.title : 0) + (wonCup ? XP.cup : 0),
        })),

      recordPack: () => set((s) => ({ packsOpened: s.packsOpened + 1 })),
      recordPerfectDraft: () =>
        set((s) => ({ perfectDrafts: s.perfectDrafts + 1, xp: s.xp + XP.perfectDraft })),
      recordSbc: () => set((s) => ({ sbcsCompleted: s.sbcsCompleted + 1, xp: s.xp + XP.sbc })),

      reset: () =>
        set({
          coachName: 'Técnico',
          xp: 0,
          teamName: '',
          teamCrestId: DEFAULT_CREST_ID,
          setupDone: false,
          ...ZERO,
        }),
    }),
    { name: 'squad-dynasty/profile', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** Nível cresce com a raiz do XP: 0→1, 100→2, 400→3, 900→4… */
export function levelForXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
}

export function xpForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 100;
}

export interface Achievement {
  id: string;
  label: string;
  emoji: string;
  unlocked: boolean;
}

/** Conquistas derivadas dos contadores + coleção (nunca persistidas). */
export function deriveAchievements(
  counters: ProfileCounters,
  collectionExtras: { totalCards: number; hasLegendary: boolean; hasIcon: boolean },
): Achievement[] {
  return [
    { id: 'first-win', label: 'Primeira vitória', emoji: '🎉', unlocked: counters.wins >= 1 },
    { id: 'ten-wins', label: '10 vitórias', emoji: '💪', unlocked: counters.wins >= 10 },
    { id: 'fifty-wins', label: '50 vitórias', emoji: '🦾', unlocked: counters.wins >= 50 },
    { id: 'goleador', label: '50 gols marcados', emoji: '⚽', unlocked: counters.goals >= 50 },
    { id: 'campeao', label: 'Campeão da liga', emoji: '🏆', unlocked: counters.leagueTitles >= 1 },
    { id: 'copa', label: 'Campeão da copa', emoji: '🏅', unlocked: counters.cupTitles >= 1 },
    { id: 'dinastia', label: '3 títulos de liga', emoji: '👑', unlocked: counters.leagueTitles >= 3 },
    { id: 'veterano', label: '3 temporadas jogadas', emoji: '📅', unlocked: counters.seasonsPlayed >= 3 },
    { id: 'colecionador', label: '100 cartas na coleção', emoji: '🃏', unlocked: collectionExtras.totalCards >= 100 },
    { id: 'lendaria', label: 'Uma carta Lendária', emoji: '✨', unlocked: collectionExtras.hasLegendary },
    { id: 'icone', label: 'Um Ícone na coleção', emoji: '🗿', unlocked: collectionExtras.hasIcon },
    { id: 'draft-perfeito', label: 'Draft perfeito (4/4)', emoji: '🎲', unlocked: counters.perfectDrafts >= 1 },
    { id: 'engenheiro', label: '5 SBCs completos', emoji: '🧩', unlocked: counters.sbcsCompleted >= 5 },
    { id: 'viciado', label: '50 pacotes abertos', emoji: '📦', unlocked: counters.packsOpened >= 50 },
  ];
}
