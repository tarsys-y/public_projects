// Progresso do evento semanal (rotação determinística no engine — events.ts):
// objetivos por semana ISO, pacote temático e resgates. Persistido.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  eventForDate,
  eventWeekKey,
  matchesTheme,
  mulberry32,
  openPack,
  type GameEvent,
  type MatchResult,
  type Side,
} from '@squad-dynasty/engine';
import { getAllCards, getCardById, playerById } from '../services/catalog';
import { useCollectionStore } from './collectionStore';
import { useDynamicCardsStore } from './dynamicCardsStore';
import { useEconomyStore } from './economyStore';
import { usePacksStore } from './packsStore';
import type { OpeningResult } from './packsStore';

interface EventsState {
  weekKey: string;
  progress: Record<string, number>;
  claimed: Record<string, boolean>;
  currentEvent: () => GameEvent;
  ensureWeek: () => void;
  /** Registrar partida do usuário (themeCount = titulares do tema). */
  recordMatch: (result: MatchResult, side: Side, themeStarters: number) => void;
  claim: (objectiveId: string) => boolean;
  /** Compra e abre o pacote temático do evento. */
  buyEventPack: (seed?: number) => OpeningResult | null;
}

/** Pool do pacote de evento: cartas do tema + informs TOTW mais recentes. */
function eventPool(event: GameEvent) {
  const latestTotw = new Set(useDynamicCardsStore.getState().latestTotwIds);
  return getAllCards().filter((card) => {
    if (latestTotw.has(card.id)) return true;
    const player = playerById.get(card.basePlayerId);
    return player ? matchesTheme(event.theme, player) : false;
  });
}

export const useEventsStore = create<EventsState>()(
  persist(
    (set, get) => ({
      weekKey: eventWeekKey(new Date()),
      progress: {},
      claimed: {},

      currentEvent: () => eventForDate(new Date()),

      ensureWeek: () => {
        const key = eventWeekKey(new Date());
        if (get().weekKey !== key) set({ weekKey: key, progress: {}, claimed: {} });
      },

      recordMatch: (result, side, themeStarters) => {
        get().ensureWeek();
        const event = get().currentEvent();
        const [home, away] = result.score;
        const mine = side === 'home' ? home : away;
        const theirs = side === 'home' ? away : home;
        const won = mine > theirs;
        const progress = { ...get().progress };
        for (const objective of event.objectives) {
          switch (objective.kind) {
            case 'play':
              progress[objective.id] = (progress[objective.id] ?? 0) + 1;
              break;
            case 'win':
              if (won) progress[objective.id] = (progress[objective.id] ?? 0) + 1;
              break;
            case 'goals':
              progress[objective.id] = (progress[objective.id] ?? 0) + mine;
              break;
            case 'win_theme':
              if (won && themeStarters >= (objective.minThemePlayers ?? 11)) {
                progress[objective.id] = (progress[objective.id] ?? 0) + 1;
              }
              break;
          }
        }
        set({ progress });
      },

      claim: (objectiveId) => {
        get().ensureWeek();
        const event = get().currentEvent();
        const objective = event.objectives.find((o) => o.id === objectiveId);
        const s = get();
        if (!objective || s.claimed[objectiveId] || (s.progress[objectiveId] ?? 0) < objective.target) {
          return false;
        }
        set({ claimed: { ...s.claimed, [objectiveId]: true } });
        if (objective.rewardCoins || objective.rewardGems) {
          useEconomyStore.getState().earn({
            coins: objective.rewardCoins ?? 0,
            gems: objective.rewardGems ?? 0,
          });
        }
        if (objective.rewardCardId && getCardById(objective.rewardCardId)) {
          useCollectionStore.getState().grantCard(objective.rewardCardId);
        }
        return true;
      },

      buyEventPack: (seed) => {
        get().ensureWeek();
        const event = get().currentEvent();
        const paid = useEconomyStore
          .getState()
          .spend({ coins: event.pack.costCoins, gems: event.pack.costGems });
        if (!paid) return null;
        const pool = eventPool(event);
        if (pool.length === 0) {
          useEconomyStore.getState().earn({ coins: event.pack.costCoins, gems: event.pack.costGems });
          return null;
        }
        const rng = mulberry32(seed ?? Math.floor(Date.now() % 2147483647));
        const packs = usePacksStore.getState();
        const opening = openPack(
          rng,
          pool,
          {
            cards: event.pack.cards,
            guaranteedRarity: event.pack.guaranteedRarity,
            epicPlusBoost: event.pack.epicPlusBoost,
          },
          packs.pity,
        );
        const grant = useCollectionStore.getState().grantCard;
        const ownedIds: string[] = [];
        for (const card of opening.cards) {
          const granted = grant(card.id);
          if (granted) ownedIds.push(granted.id);
        }
        usePacksStore.setState((s) => ({ pity: opening.pity, totalOpened: s.totalOpened + 1 }));
        return { cards: opening.cards, ownedIds, pityTriggered: opening.pityTriggered };
      },
    }),
    { name: 'squad-dynasty/events', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** Conta titulares do elenco do usuário que pertencem ao tema do evento. */
export function countThemeStarters(
  event: GameEvent,
  starters: Array<{ basePlayerId: string }>,
): number {
  return starters.filter((s) => {
    const player = playerById.get(s.basePlayerId);
    return player ? matchesTheme(event.theme, player) : false;
  }).length;
}
