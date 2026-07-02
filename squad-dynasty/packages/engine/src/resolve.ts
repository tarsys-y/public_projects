// Resolução de elenco: junta OwnedCard + CardDefinition + BasePlayer num
// jogador pronto para cálculo (atributos com deltas aplicados). É a ponte
// entre os dados persistidos e o motor — overall/química saem daqui, derivados.
import type {
  AnyAttributes,
  BasePlayer,
  CardDefinition,
  OutfieldAttributes,
  OwnedCard,
  Position,
} from './models/player';
import { isGkAttributes } from './models/player';
import type { RoleId, Squad, Tactics } from './models/squad';
import { computeOverall } from './overall';

export interface ResolvedPlayer {
  ownedCardId: string;
  cardDefId: string;
  basePlayer: BasePlayer;
  card: CardDefinition;
  /** Atributos da carta com attributeDeltas aplicados (clamp 0–99). */
  attributes: AnyAttributes;
  age: number;
  starterStreak: number;
  overall: number;
  isGk: boolean;
  /** Forma/moral (FM): multiplicador 0.95–1.05 aplicado em partida (default 1). */
  formMultiplier?: number;
}

export interface ResolvedSlot {
  position: Position;
  role: RoleId;
  player: ResolvedPlayer;
}

export interface ResolvedSquad {
  formation: string;
  slots: ResolvedSlot[]; // 11, mesmo índice dos slots da formação
  bench: ResolvedPlayer[];
  tactics: Tactics;
}

export interface Catalog {
  players: Map<string, BasePlayer>;
  cards: Map<string, CardDefinition>;
}

export function buildCatalog(players: BasePlayer[], cards: CardDefinition[]): Catalog {
  return {
    players: new Map(players.map((p) => [p.id, p])),
    cards: new Map(cards.map((c) => [c.id, c])),
  };
}

const clamp99 = (v: number) => Math.max(0, Math.min(99, Math.round(v)));

export function applyDeltas(
  attributes: AnyAttributes,
  deltas: Partial<OutfieldAttributes>,
): AnyAttributes {
  const out: Record<string, number> = { ...(attributes as unknown as Record<string, number>) };
  for (const [key, delta] of Object.entries(deltas)) {
    if (typeof delta !== 'number' || !(key in out)) continue;
    out[key] = clamp99((out[key] ?? 0) + delta);
  }
  return out as unknown as AnyAttributes;
}

export function resolveOwnedCard(owned: OwnedCard, catalog: Catalog): ResolvedPlayer {
  const card = catalog.cards.get(owned.cardDefId);
  if (!card) throw new Error(`CardDefinition não encontrada: ${owned.cardDefId}`);
  const basePlayer = catalog.players.get(card.basePlayerId);
  if (!basePlayer) throw new Error(`BasePlayer não encontrado: ${card.basePlayerId}`);
  const attributes = applyDeltas(card.attributes, owned.attributeDeltas);
  return {
    ownedCardId: owned.id,
    cardDefId: card.id,
    basePlayer,
    card,
    attributes,
    age: owned.age,
    starterStreak: owned.starterStreak,
    overall: computeOverall(attributes, basePlayer.positions[0] ?? 'ST'),
    isGk: isGkAttributes(attributes),
  };
}

const FORM_MIN = 0.95;
const FORM_MAX = 1.05;

/** Resolve um Squad persistido num ResolvedSquad pronto para simulação.
 *  `options.formById` aplica forma/moral (clamp 0.95–1.05) por ownedCardId. */
export function resolveSquad(
  squad: Squad,
  ownedById: Map<string, OwnedCard>,
  catalog: Catalog,
  options: { formById?: Map<string, number> } = {},
): ResolvedSquad {
  const resolveId = (ownedCardId: string): ResolvedPlayer => {
    const owned = ownedById.get(ownedCardId);
    if (!owned) throw new Error(`OwnedCard não encontrada: ${ownedCardId}`);
    const player = resolveOwnedCard(owned, catalog);
    const form = options.formById?.get(ownedCardId);
    if (form !== undefined) {
      player.formMultiplier = Math.max(FORM_MIN, Math.min(FORM_MAX, form));
    }
    return player;
  };
  return {
    formation: squad.formation,
    slots: squad.starters.map((s) => ({
      position: s.position,
      role: s.role,
      player: resolveId(s.ownedCardId),
    })),
    bench: squad.bench.map(resolveId),
    tactics: squad.tactics,
  };
}
