// Sequência de reveal da abertura de pacotes (estilo Pokémon TCG Pocket):
// ordena as cartas com as melhores POR ÚLTIMO (build-up) e classifica o tier
// de teatralidade de cada uma. Puro e testável — a UI só reproduz.
import type { CardDefinition, Rarity } from '@squad-dynasty/engine';
import { cardTheme } from './cardTheme';
import type { OpeningResult } from '../stores/packsStore';

export type RevealTier = 'normal' | 'rare' | 'big' | 'cinematic';

export interface RevealStep {
  card: CardDefinition;
  tier: RevealTier;
  isNew: boolean; // primeira cópia na coleção (não duplicata)
}

export interface PackSequence {
  steps: RevealStep[];
  hasCinematic: boolean;
}

const RARITY_RANK: Record<Rarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
  icon: 4,
};

export function revealTier(card: CardDefinition): RevealTier {
  if (cardTheme(card.version, card.rarity).cinematic) return 'cinematic';
  if (card.version === 'inform' || card.rarity === 'epic') return 'big';
  if (card.rarity === 'rare') return 'rare';
  return 'normal';
}

/**
 * @param ownedCountByDefId cópias na coleção por definição de carta, JÁ
 *   incluindo as deste pacote (grantCard roda antes do reveal).
 */
export function buildRevealSequence(
  result: OpeningResult,
  ownedCountByDefId: (cardDefId: string) => number,
): PackSequence {
  const sorted = [...result.cards].sort(
    (a, b) => RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity],
  ); // sort estável: empates mantêm a ordem do sorteio
  const seenInPack = new Map<string, number>();
  const steps = sorted.map((card) => {
    const occurrence = (seenInPack.get(card.id) ?? 0) + 1;
    seenInPack.set(card.id, occurrence);
    const copiesInPack = result.cards.filter((c) => c.id === card.id).length;
    const ownedBefore = ownedCountByDefId(card.id) - copiesInPack;
    return {
      card,
      tier: revealTier(card),
      isNew: ownedBefore <= 0 && occurrence === 1,
    };
  });
  return { steps, hasCinematic: steps.some((s) => s.tier === 'cinematic') };
}
