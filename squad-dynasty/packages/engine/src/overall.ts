// Overall é SEMPRE derivado (SPEC 10.3): média ponderada dos atributos pela
// posição principal. Nunca persistir como fonte de verdade.
import type { AnyAttributes, Position, Rarity } from './models/player';
import { isGkAttributes } from './models/player';
import { GK_OVERALL_WEIGHTS, OUTFIELD_OVERALL_WEIGHTS } from './models/overallWeights';
import { CONFIG } from './config';

export function computeOverall(attributes: AnyAttributes, mainPosition: Position): number {
  if (isGkAttributes(attributes)) {
    return weightedMean(attributes as unknown as Record<string, number>, GK_OVERALL_WEIGHTS);
  }
  const position = mainPosition === 'GK' ? 'ST' : mainPosition; // dado inconsistente: trata como linha
  const weights = OUTFIELD_OVERALL_WEIGHTS[position];
  return weightedMean(attributes as unknown as Record<string, number>, weights);
}

function weightedMean(values: Record<string, number>, weights: Record<string, number | undefined>): number {
  let sum = 0;
  let total = 0;
  for (const [key, weight] of Object.entries(weights)) {
    if (!weight || weight <= 0) continue;
    sum += (values[key] ?? 0) * weight;
    total += weight;
  }
  if (total === 0) return 0;
  return Math.round(sum / total);
}

/** Raridade da carta base derivada do overall (thresholds em config.ts). */
export function baseRarityForOverall(overall: number): Exclude<Rarity, 'icon'> {
  const t = CONFIG.baseCardRarity;
  if (overall >= t.legendary) return 'legendary';
  if (overall >= t.epic) return 'epic';
  if (overall >= t.rare) return 'rare';
  return 'common';
}
