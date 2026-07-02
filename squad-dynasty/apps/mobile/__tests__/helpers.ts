import {
  DEFAULT_TACTICS,
  FORMATIONS,
  isGkAttributes,
  type OwnedCard,
  type Position,
} from '@squad-dynasty/engine';
import { CARDS, CATALOG, playerById } from '../src/services/catalog';
import { assignCard, emptyDraft, type DraftSquad } from '../src/stores/squadLogic';

let nextId = 1;

export function own(cardDefId: string): OwnedCard {
  return {
    id: `owned-${nextId++}`,
    ownerId: 'test',
    cardDefId,
    age: 25,
    attributeDeltas: {},
    evolutionLevel: 0,
    starterStreak: 0,
    acquiredAt: 0,
  };
}

/** Coleção demo: cartas base do Flamengo + Palmeiras (como no app). */
export function demoCollection(): Map<string, OwnedCard> {
  const cards = CARDS.filter((c) => {
    const player = playerById.get(c.basePlayerId);
    return c.version === 'base' && ['flamengo', 'palmeiras'].includes(player?.clubId ?? '');
  });
  const map = new Map<string, OwnedCard>();
  for (const card of cards) {
    const owned = own(card.id);
    map.set(owned.id, owned);
  }
  return map;
}

export function pickForPosition(
  collection: Map<string, OwnedCard>,
  position: Position,
  used: Set<string>,
): string {
  for (const [id, owned] of collection) {
    if (used.has(id)) continue;
    const card = CATALOG.cards.get(owned.cardDefId)!;
    const player = CATALOG.players.get(card.basePlayerId)!;
    const gkCard = isGkAttributes(card.attributes);
    if (position === 'GK' ? gkCard : !gkCard && player.positions.includes(position)) return id;
  }
  for (const [id, owned] of collection) {
    if (used.has(id)) continue;
    const card = CATALOG.cards.get(owned.cardDefId)!;
    if (position === 'GK' ? isGkAttributes(card.attributes) : !isGkAttributes(card.attributes)) {
      return id;
    }
  }
  throw new Error(`sem carta para ${position}`);
}

export function fillDraft(collection: Map<string, OwnedCard>, formationId = '4-3-3'): DraftSquad {
  const formation = FORMATIONS[formationId]!;
  const used = new Set<string>();
  let draft = emptyDraft(formationId, { ...DEFAULT_TACTICS });
  formation.slots.forEach((slot, i) => {
    const id = pickForPosition(collection, slot.position, used);
    used.add(id);
    draft = assignCard(draft, i, id);
  });
  return draft;
}
