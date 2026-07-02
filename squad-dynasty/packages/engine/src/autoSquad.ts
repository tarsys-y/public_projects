// Monta um elenco válido automaticamente a partir de um pool de cartas:
// usado pelo CLI de simulação e pela IA (adversário de amistoso no app).
// Escolhe o melhor jogador disponível por slot (overall, com desconto fora de
// posição) e a função de melhor fit para a posição do slot.
import { computeRoleFit } from './fit';
import { FORMATIONS } from './models/formations';
import type { BasePlayer, CardDefinition, OwnedCard, Position } from './models/player';
import { isGkAttributes } from './models/player';
import type { RoleId, Squad, Tactics } from './models/squad';
import { DEFAULT_TACTICS } from './models/squad';
import { rolesForPosition } from './models/roles';
import { computeOverall } from './overall';
import { positionGroup } from './sim/effective';

export interface AutoSquadResult {
  squad: Squad;
  ownedCards: OwnedCard[]; // cartas sintéticas (ownerId 'auto')
}

const OUT_OF_POSITION_SCORE = 0.8;
const CROSS_GROUP_SCORE = 0.55;

function slotScore(player: BasePlayer, card: CardDefinition, position: Position): number {
  const overall = computeOverall(card.attributes, player.positions[0] ?? 'ST');
  const gkCard = isGkAttributes(card.attributes);
  if (gkCard !== (position === 'GK')) return 0; // GK só no gol e vice-versa
  if (player.positions.includes(position)) return overall;
  const sameGroup =
    positionGroup(player.positions[0] ?? 'ST') === positionGroup(position);
  return overall * (sameGroup ? OUT_OF_POSITION_SCORE : CROSS_GROUP_SCORE);
}

function bestRoleFor(card: CardDefinition, position: Position): RoleId {
  const roles = rolesForPosition(position);
  let best: RoleId = roles[0]!.id;
  let bestFit = -1;
  for (const role of roles) {
    const fit = computeRoleFit(card.attributes, role.id);
    if (fit > bestFit) {
      bestFit = fit;
      best = role.id;
    }
  }
  return best;
}

/**
 * Monta o melhor XI + banco (1 GK + 6 linha) do pool dado.
 * `cards` deve conter no máximo uma carta por jogador (ex.: cartas base).
 */
export function buildAutoSquad(
  players: BasePlayer[],
  cards: CardDefinition[],
  formationId: string,
  options: { tactics?: Tactics; ownerId?: string; baseYear?: number } = {},
): AutoSquadResult {
  const formation = FORMATIONS[formationId];
  if (!formation) throw new Error(`Formação desconhecida: ${formationId}`);
  const playerById = new Map(players.map((p) => [p.id, p]));
  const pool = cards
    .map((card) => ({ card, player: playerById.get(card.basePlayerId) }))
    .filter((e): e is { card: CardDefinition; player: BasePlayer } => Boolean(e.player));

  const used = new Set<string>();
  const ownedCards: OwnedCard[] = [];
  const baseYear = options.baseYear ?? 2026;
  const ownerId = options.ownerId ?? 'auto';

  const takeCard = (card: CardDefinition, player: BasePlayer): OwnedCard => {
    const owned: OwnedCard = {
      id: `auto-${card.id}`,
      ownerId,
      cardDefId: card.id,
      age: Math.max(16, baseYear - player.birthYear),
      attributeDeltas: {},
      evolutionLevel: 0,
      starterStreak: 0,
      acquiredAt: 0,
    };
    ownedCards.push(owned);
    used.add(card.id);
    return owned;
  };

  // Preenche o gol primeiro (pool de GK é raso), depois os demais slots.
  const slotOrder = formation.slots
    .map((slot, index) => ({ slot, index }))
    .sort((a, b) => (a.slot.position === 'GK' ? -1 : 0) - (b.slot.position === 'GK' ? -1 : 0));

  const starters: Squad['starters'] = new Array(formation.slots.length);
  for (const { slot, index } of slotOrder) {
    let best: { card: CardDefinition; player: BasePlayer; score: number } | undefined;
    for (const entry of pool) {
      if (used.has(entry.card.id)) continue;
      const score = slotScore(entry.player, entry.card, slot.position);
      if (score > 0 && (!best || score > best.score)) best = { ...entry, score };
    }
    if (!best) throw new Error(`Pool insuficiente para o slot ${slot.position} (${formationId})`);
    const owned = takeCard(best.card, best.player);
    starters[index] = {
      position: slot.position,
      role: bestRoleFor(best.card, slot.position),
      ownedCardId: owned.id,
    };
  }

  // Banco: melhor GK restante + 6 melhores de linha.
  const bench: string[] = [];
  const remaining = pool
    .filter((e) => !used.has(e.card.id))
    .map((e) => ({ ...e, overall: computeOverall(e.card.attributes, e.player.positions[0] ?? 'ST') }))
    .sort((a, b) => b.overall - a.overall);
  const benchGk = remaining.find((e) => isGkAttributes(e.card.attributes));
  if (benchGk) bench.push(takeCard(benchGk.card, benchGk.player).id);
  for (const entry of remaining) {
    if (bench.length >= 7) break;
    if (used.has(entry.card.id) || isGkAttributes(entry.card.attributes)) continue;
    bench.push(takeCard(entry.card, entry.player).id);
  }

  return {
    squad: {
      formation: formationId,
      starters,
      bench,
      tactics: options.tactics ?? { ...DEFAULT_TACTICS },
    },
    ownedCards,
  };
}
