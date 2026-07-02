// Catálogo estático embarcado no app (offline-first): base de jogadores,
// clubes e cartas de packages/data. No M7 isso passa a sincronizar com o
// Firestore (Cartas Vivas).
import {
  buildCatalog,
  computeOverall,
  type BasePlayer,
  type CardDefinition,
  type Catalog,
  type Club,
} from '@squad-dynasty/engine';
import clubsJson from '../../../../packages/data/clubs.json';
import playersJson from '../../../../packages/data/players.json';
import fillersJson from '../../../../packages/data/players-filler.json';
import cardsJson from '../../../../packages/data/cards.json';

export const CLUBS = clubsJson as Club[];
export const PLAYERS = [...(playersJson as BasePlayer[]), ...(fillersJson as BasePlayer[])];
export const CARDS = cardsJson as CardDefinition[];

export const CATALOG: Catalog = buildCatalog(PLAYERS, CARDS);

export const clubById = new Map(CLUBS.map((c) => [c.id, c]));
export const playerById = new Map(PLAYERS.map((p) => [p.id, p]));
export const cardById = new Map(CARDS.map((c) => [c.id, c]));

/** Overall derivado de uma CardDefinition (nunca persistido — SPEC 10.3). */
export function cardOverall(card: CardDefinition): number {
  const player = playerById.get(card.basePlayerId);
  return computeOverall(card.attributes, player?.positions[0] ?? 'ST');
}
