// Economia (SPEC 6) e evolução (SPEC 4.6). Moedas: coins (soft) e gems
// (premium interna). Sem dinheiro real em NENHUMA hipótese.
import { CONFIG } from '../config';
import type { MatchResult, Side } from '../models/match';
import type { GkAttributes, OutfieldAttributes, OwnedCard, Position } from '../models/player';
import { GK_OVERALL_WEIGHTS, OUTFIELD_OVERALL_WEIGHTS } from '../models/overallWeights';

export interface MatchReward {
  coins: number;
  outcome: 'win' | 'draw' | 'loss';
  base: number;
  performanceBonus: number;
}

/** Recompensa da partida: 400/200/100 + bônus pela nota média do time. */
export function matchReward(result: MatchResult, side: Side): MatchReward {
  const c = CONFIG.economy;
  const [home, away] = result.score;
  const mine = side === 'home' ? home : away;
  const theirs = side === 'home' ? away : home;
  const outcome = mine > theirs ? 'win' : mine === theirs ? 'draw' : 'loss';
  const base = c.matchCoins[outcome];

  const myRatings = result.ratings.filter((r) => r.side === side);
  const avg =
    myRatings.length === 0
      ? 6
      : myRatings.reduce((s, r) => s + r.rating, 0) / myRatings.length;
  const performanceBonus = Math.max(
    0,
    Math.min(c.performanceBonusMax, Math.round((avg - 6) * c.performanceBonusPerPoint)),
  );
  return { coins: base + performanceBonus, outcome, base, performanceBonus };
}

export interface EvolutionCost {
  duplicates: number;
  coins: number;
}

/** Custo para evoluir do nível atual para o próximo (SPEC 4.6). */
export function evolutionCost(currentLevel: number): EvolutionCost | null {
  const dup = CONFIG.evolution.duplicatesPerLevel[currentLevel];
  const coins = CONFIG.economy.evolutionCoinsPerLevel[currentLevel];
  if (dup === undefined || coins === undefined || currentLevel >= CONFIG.evolution.maxLevel) {
    return null; // nível máximo
  }
  return { duplicates: dup, coins };
}

/** Atributos-chave da posição (peso ≥2 no overall) que recebem os deltas. */
export function evolutionKeyAttributes(
  mainPosition: Position,
  isGk: boolean,
): string[] {
  const weights: Record<string, number | undefined> = isGk
    ? GK_OVERALL_WEIGHTS
    : OUTFIELD_OVERALL_WEIGHTS[mainPosition === 'GK' ? 'ST' : mainPosition];
  return Object.entries(weights)
    .filter(([, w]) => (w ?? 0) >= 2)
    .map(([k]) => k);
}

/**
 * Aplica um nível de evolução: +delta nos atributos-chave da posição,
 * acumulado em attributeDeltas (overall continua derivado — SPEC 10.3).
 */
export function applyEvolution(
  owned: OwnedCard,
  mainPosition: Position,
  isGk: boolean,
): OwnedCard {
  if (owned.evolutionLevel >= CONFIG.evolution.maxLevel) return owned;
  const delta = CONFIG.economy.evolutionDeltaPerLevel;
  const keys = evolutionKeyAttributes(mainPosition, isGk);
  const deltas: Record<string, number> = {
    ...(owned.attributeDeltas as Record<string, number>),
  };
  for (const key of keys) deltas[key] = (deltas[key] ?? 0) + delta;
  return {
    ...owned,
    evolutionLevel: owned.evolutionLevel + 1,
    attributeDeltas: deltas as Partial<OutfieldAttributes> &
      Partial<GkAttributes> as OwnedCard['attributeDeltas'],
  };
}
