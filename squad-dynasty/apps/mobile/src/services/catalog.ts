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
import iconsJson from '../../../../packages/data/players.json';
import brJson from '../../../../packages/data/players-br.json';
import realJson from '../../../../packages/data/players-real.json';
import fillersJson from '../../../../packages/data/players-filler.json';
import cardsJson from '../../../../packages/data/cards.json';

export const CLUBS = clubsJson as Club[];
export const PLAYERS = [
  ...(iconsJson as BasePlayer[]),
  ...(brJson as BasePlayer[]),
  ...(realJson as BasePlayer[]),
  ...(fillersJson as BasePlayer[]),
];
export const CARDS = cardsJson as CardDefinition[];

/** As 10 ligas jogáveis + Lendas, para filtros e telas. */
export const LEAGUES: Array<{ id: string; name: string }> = [
  { id: 'brasileirao', name: 'Brasileirão' },
  { id: 'premier-league', name: 'Premier League' },
  { id: 'la-liga', name: 'La Liga' },
  { id: 'serie-a-it', name: 'Serie A' },
  { id: 'bundesliga', name: 'Bundesliga' },
  { id: 'ligue-1', name: 'Ligue 1' },
  { id: 'primeira-liga', name: 'Primeira Liga' },
  { id: 'eredivisie', name: 'Eredivisie' },
  { id: 'saudi-pro-league', name: 'Saudi Pro League' },
  { id: 'mls', name: 'MLS' },
  { id: 'legends', name: 'Lendas' },
];

export const CATALOG: Catalog = buildCatalog(PLAYERS, CARDS);

export const clubById = new Map(CLUBS.map((c) => [c.id, c]));
export const playerById = new Map(PLAYERS.map((p) => [p.id, p]));
export const cardById = new Map(CARDS.map((c) => [c.id, c]));

// --- catálogo em runtime (estático + cartas dinâmicas TOTW/"Em Alta") -------
import { useDynamicCardsStore } from '../stores/dynamicCardsStore';

let cachedCatalog: Catalog = CATALOG;
let cachedDynamicCount = 0;

/** Catálogo mesclado — use SEMPRE este nos fluxos que tocam a coleção. */
export function getCatalog(): Catalog {
  const dynamic = useDynamicCardsStore.getState().list();
  if (dynamic.length !== cachedDynamicCount) {
    cachedCatalog = buildCatalog(PLAYERS, [...CARDS, ...dynamic]);
    cachedDynamicCount = dynamic.length;
  }
  return cachedCatalog;
}

export function getAllCards(): CardDefinition[] {
  return [...CARDS, ...useDynamicCardsStore.getState().list()];
}

export function getCardById(id: string): CardDefinition | undefined {
  return cardById.get(id) ?? useDynamicCardsStore.getState().cards[id];
}

/** Overall derivado de uma CardDefinition (nunca persistido — SPEC 10.3). */
export function cardOverall(card: CardDefinition): number {
  const player = playerById.get(card.basePlayerId);
  return computeOverall(card.attributes, player?.positions[0] ?? 'ST');
}
