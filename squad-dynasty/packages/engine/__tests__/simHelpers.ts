import { FORMATIONS } from '../src/models/formations';
import type { Position } from '../src/models/player';
import { GK_ATTRIBUTE_KEYS, OUTFIELD_ATTRIBUTE_KEYS } from '../src/models/player';
import type { RoleId, Tactics } from '../src/models/squad';
import { DEFAULT_TACTICS } from '../src/models/squad';
import { computeOverall } from '../src/overall';
import type { ResolvedPlayer, ResolvedSquad } from '../src/resolve';

export const ROLES_433: RoleId[] = [
  'gk_classic',
  'fb_defensive',
  'cb_stopper',
  'cb_ball_playing',
  'fb_defensive',
  'cm_box_to_box',
  'dm_anchor',
  'cm_playmaker',
  'w_inverted',
  'st_poacher',
  'w_touchline',
];

export function uniformPlayer(
  level: number,
  position: Position,
  i: number,
  tag: string,
): ResolvedPlayer {
  const isGk = position === 'GK';
  const keys = isGk ? GK_ATTRIBUTE_KEYS : OUTFIELD_ATTRIBUTE_KEYS;
  const attributes = Object.fromEntries(
    keys.map((k) => [k, level]),
  ) as unknown as ResolvedPlayer['attributes'];
  const basePlayer = {
    id: `${tag}-p${i}`,
    name: `${tag} P${i}`,
    nationality: 'BR',
    clubId: `${tag}-club`,
    leagueId: 'liga',
    birthYear: 1998,
    positions: [position],
    attributes,
  };
  return {
    ownedCardId: `${tag}-o${i}`,
    cardDefId: `${tag}-c${i}`,
    basePlayer,
    card: {
      id: `${tag}-c${i}`,
      basePlayerId: basePlayer.id,
      version: 'base',
      rarity: 'common',
      attributes,
      frozen: false,
    },
    attributes,
    age: 27,
    starterStreak: 0,
    overall: computeOverall(attributes, position),
    isGk,
  };
}

/** Elenco 4-3-3 com todos os atributos = level (banco: 1 GK + 6 CM). */
export function uniformSquad(
  level: number,
  tag: string,
  tactics: Tactics = { ...DEFAULT_TACTICS },
): ResolvedSquad {
  const formation = FORMATIONS['4-3-3']!;
  const slots = formation.slots.map((slot, i) => ({
    position: slot.position,
    role: ROLES_433[i]!,
    player: uniformPlayer(level, slot.position, i, tag),
  }));
  const bench = Array.from({ length: 7 }, (_, i) =>
    uniformPlayer(level, i === 0 ? 'GK' : 'CM', 20 + i, tag),
  );
  return { formation: '4-3-3', slots, bench, tactics };
}
