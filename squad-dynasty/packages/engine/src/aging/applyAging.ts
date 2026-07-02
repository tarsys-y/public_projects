// Aplicação do envelhecimento na virada de temporada (SPEC 4.4), sobre
// OwnedCards não-congeladas. Determinístico via Rng injetado.
import { CONFIG } from '../config';
import type {
  AttributeCategory,
  BasePlayer,
  CardDefinition,
  OutfieldAttributes,
  OwnedCard,
} from '../models/player';
import { isGkAttributes, OUTFIELD_ATTRIBUTE_KEYS, OUTFIELD_CATEGORY } from '../models/player';
import { OUTFIELD_OVERALL_WEIGHTS } from '../models/overallWeights';
import type { Rng } from '../rng';
import { chance, randInt, shuffle } from '../rng';
import { retirementChance } from './aging';

export interface AgingOutcome {
  card: OwnedCard;
  changes: Partial<Record<string, number>>;
  retired: boolean;
}

const PHYSICAL_PACE: AttributeCategory[] = ['pace', 'physical'];

function keysOfCategories(categories: AttributeCategory[]): Array<keyof OutfieldAttributes> {
  return OUTFIELD_ATTRIBUTE_KEYS.filter((k) => categories.includes(OUTFIELD_CATEGORY[k]));
}

function keyAttributesOf(player: BasePlayer): Array<keyof OutfieldAttributes> {
  const main = player.positions[0] ?? 'ST';
  if (main === 'GK') return [];
  const weights = OUTFIELD_OVERALL_WEIGHTS[main];
  return OUTFIELD_ATTRIBUTE_KEYS.filter((k) => (weights[k] ?? 0) >= 2);
}

/**
 * Envelhece uma carta (não-congelada) em uma temporada. A idade da carta já
 * deve ter sido incrementada pelo chamador ANTES de aplicar (idade nova).
 */
export function applyAging(
  owned: OwnedCard,
  card: CardDefinition,
  player: BasePlayer,
  rng: Rng,
): AgingOutcome {
  if (card.frozen) return { card: owned, changes: {}, retired: false };

  const age = owned.age;
  const changes: Record<string, number> = {};
  const gk = isGkAttributes(card.attributes);

  // Aposentadoria (36+): a carta vira item de coleção (o app marca não-escalável).
  if (age >= CONFIG.aging.retirementBaseAge && chance(rng, retirementChance(age))) {
    return { card: owned, changes: {}, retired: true };
  }

  if (!gk) {
    if (age <= 21) {
      // +1 a +3 em 2–4 atributos, viés nos atributos-chave da posição
      const key = keyAttributesOf(player);
      const pool = [...key, ...key, ...OUTFIELD_ATTRIBUTE_KEYS]; // chave em dobro = viés
      const targets = shuffle(rng, pool).slice(0, randInt(rng, 2, 4));
      for (const attr of new Set(targets)) changes[attr] = randInt(rng, 1, 3);
    } else if (age <= 24) {
      const key = keyAttributesOf(player);
      const targets = shuffle(rng, key).slice(0, randInt(rng, 1, 3));
      for (const attr of targets) {
        const gain = randInt(rng, 0, 2);
        if (gain > 0) changes[attr] = gain;
      }
    } else if (age <= 29) {
      // auge: sem mudanças
    } else if (age <= 32) {
      const targets = shuffle(rng, keysOfCategories(PHYSICAL_PACE)).slice(0, randInt(rng, 2, 3));
      for (const attr of targets) changes[attr] = -randInt(rng, 1, 2);
    } else {
      // 33+: −2 a −4 em Ritmo/Físico, −1 técnico; mentais intactos
      const physical = shuffle(rng, keysOfCategories(PHYSICAL_PACE)).slice(0, randInt(rng, 2, 4));
      for (const attr of physical) changes[attr] = -randInt(rng, 2, 4);
      const technical = shuffle(
        rng,
        keysOfCategories(['finishing', 'passing', 'dribbling', 'defense']),
      ).slice(0, randInt(rng, 1, 2));
      for (const attr of technical) changes[attr] = -1;
    }
  } else {
    // Goleiros declinam mais tarde e mais devagar (reflexos) — decisão simples.
    if (age >= 35) {
      changes.reflexes = -randInt(rng, 1, 2);
      changes.rushingOut = -randInt(rng, 0, 2);
    } else if (age <= 22) {
      changes.reflexes = randInt(rng, 0, 2);
      changes.gkPositioning = randInt(rng, 0, 2);
    }
  }

  const deltas: Record<string, number> = { ...(owned.attributeDeltas as Record<string, number>) };
  for (const [attr, delta] of Object.entries(changes)) {
    if (delta === 0) continue;
    deltas[attr] = (deltas[attr] ?? 0) + delta;
  }

  return {
    card: { ...owned, attributeDeltas: deltas as OwnedCard['attributeDeltas'] },
    changes,
    retired: false,
  };
}
