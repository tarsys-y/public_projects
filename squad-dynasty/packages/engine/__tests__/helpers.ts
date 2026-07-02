import type {
  AnyAttributes,
  BasePlayer,
  CardDefinition,
  GkAttributes,
  OutfieldAttributes,
  OwnedCard,
  Position,
} from '../src/models/player';
import { GK_ATTRIBUTE_KEYS, OUTFIELD_ATTRIBUTE_KEYS } from '../src/models/player';

/** Atributos de linha uniformes com overrides pontuais. */
export function outfield(base: number, overrides: Partial<OutfieldAttributes> = {}): OutfieldAttributes {
  const attrs = Object.fromEntries(OUTFIELD_ATTRIBUTE_KEYS.map((k) => [k, base]));
  return { ...attrs, ...overrides } as OutfieldAttributes;
}

/** Atributos de goleiro uniformes com overrides pontuais. */
export function gk(base: number, overrides: Partial<GkAttributes> = {}): GkAttributes {
  const attrs = Object.fromEntries(GK_ATTRIBUTE_KEYS.map((k) => [k, base]));
  return { ...attrs, ...overrides } as GkAttributes;
}

let idCounter = 0;

export function basePlayer(overrides: Partial<BasePlayer> = {}): BasePlayer {
  idCounter++;
  return {
    id: `player-${idCounter}`,
    name: `Jogador ${idCounter}`,
    nationality: 'BR',
    clubId: 'flamengo',
    leagueId: 'brasileirao',
    birthYear: 1998,
    positions: ['ST' as Position],
    attributes: outfield(75),
    ...overrides,
  };
}

export function cardDef(player: BasePlayer, overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    id: `${player.id}-base`,
    basePlayerId: player.id,
    version: 'base',
    rarity: 'common',
    attributes: player.attributes,
    frozen: false,
    ...overrides,
  };
}

export function ownedCard(card: CardDefinition, overrides: Partial<OwnedCard> = {}): OwnedCard {
  idCounter++;
  return {
    id: `owned-${idCounter}`,
    ownerId: 'user-1',
    cardDefId: card.id,
    age: 25,
    attributeDeltas: {},
    evolutionLevel: 0,
    starterStreak: 0,
    acquiredAt: 0,
    ...overrides,
  };
}
