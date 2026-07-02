import { computePlayerChemistry, computeSquadChemistry } from '../src/chemistry/chemistry';
import { CONFIG } from '../src/config';
import { FORMATIONS, getNeighborMap } from '../src/models/formations';
import type { RoleId } from '../src/models/squad';
import { DEFAULT_TACTICS } from '../src/models/squad';
import type { ResolvedSquad } from '../src/resolve';
import { resolveOwnedCard, buildCatalog } from '../src/resolve';
import type { BasePlayer } from '../src/models/player';
import { basePlayer, cardDef, gk, outfield, ownedCard } from './helpers';

/** Monta um ResolvedSquad 4-3-3 com um jogador gerado por slot. */
function squad433(
  playerAt: (slotIndex: number) => Partial<BasePlayer>,
  roleAt?: (slotIndex: number) => RoleId | undefined,
  streakAt?: (slotIndex: number) => number,
): ResolvedSquad {
  const formation = FORMATIONS['4-3-3']!;
  const defaultRoles: RoleId[] = [
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
  const slots = formation.slots.map((slot, i) => {
    const overrides = playerAt(i);
    const player = basePlayer({
      positions: [slot.position],
      attributes: slot.position === 'GK' ? gk(75) : outfield(75),
      ...overrides,
    });
    const card = cardDef(player);
    const owned = ownedCard(card, { starterStreak: streakAt?.(i) ?? 0 });
    const catalog = buildCatalog([player], [card]);
    return {
      position: slot.position,
      role: roleAt?.(i) ?? defaultRoles[i]!,
      player: resolveOwnedCard(owned, catalog),
    };
  });
  return { formation: '4-3-3', slots, bench: [], tactics: DEFAULT_TACTICS };
}

/** Time neutro: clubes, nacionalidades e ligas todos distintos, sem streak. */
const allDistinct = (i: number): Partial<BasePlayer> => ({
  clubId: `club-${i}`,
  nationality: `N${i}`,
  leagueId: `league-${i}`,
});

describe('química (SPEC 4.2)', () => {
  it('time totalmente desconexo → química 0 e multiplicador 0.90', () => {
    const squad = squad433(allDistinct);
    const chem = computePlayerChemistry(squad, 9);
    expect(chem.total).toBe(0);
    expect(chem.multiplier).toBeCloseTo(CONFIG.chemistry.multiplierBase, 5);
  });

  it('+25 por clube com ≥1 vizinho tático do mesmo clube', () => {
    const neighbors = getNeighborMap(FORMATIONS['4-3-3']!);
    const target = 9; // ST
    const aNeighbor = neighbors[target]![0]!;
    const squad = squad433((i) => ({
      ...allDistinct(i),
      clubId: i === target || i === aNeighbor ? 'mesmo-clube' : `club-${i}`,
    }));
    expect(computePlayerChemistry(squad, target).club).toBe(CONFIG.chemistry.clubBonus);
    // clube igual a um NÃO-vizinho não conta
    const nonNeighbor = squad.slots.findIndex((_, i) => i !== target && !neighbors[target]!.includes(i));
    const squad2 = squad433((i) => ({
      ...allDistinct(i),
      clubId: i === target || i === nonNeighbor ? 'mesmo-clube' : `club-${i}`,
    }));
    expect(computePlayerChemistry(squad2, target).club).toBe(0);
  });

  it('+25 por nacionalidade com ≥2 outros titulares; 1 só não basta', () => {
    const squadTwo = squad433((i) => ({
      ...allDistinct(i),
      nationality: [9, 2, 6].includes(i) ? 'BR' : `N${i}`,
    }));
    expect(computePlayerChemistry(squadTwo, 9).nationality).toBe(CONFIG.chemistry.nationalityBonus);

    const squadOne = squad433((i) => ({
      ...allDistinct(i),
      nationality: [9, 2].includes(i) ? 'BR' : `N${i}`,
    }));
    expect(computePlayerChemistry(squadOne, 9).nationality).toBe(0);
  });

  it('+15 por liga com ≥5 outros titulares', () => {
    const inLeague = [9, 1, 2, 3, 4, 5];
    const squad = squad433((i) => ({
      ...allDistinct(i),
      leagueId: inLeague.includes(i) ? 'brasileirao' : `league-${i}`,
    }));
    expect(computePlayerChemistry(squad, 9).league).toBe(CONFIG.chemistry.leagueBonus);

    const squadFour = squad433((i) => ({
      ...allDistinct(i),
      leagueId: [9, 1, 2, 3, 4].includes(i) ? 'brasileirao' : `league-${i}`,
    }));
    expect(computePlayerChemistry(squadFour, 9).league).toBe(0);
  });

  it('+15 por sinergia de funções com um vizinho (10 clássico + oportunista)', () => {
    const neighbors = getNeighborMap(FORMATIONS['4-3-3']!);
    const target = 9; // ST st_poacher
    const aNeighbor = neighbors[target]![0]!;
    const squad = squad433(
      allDistinct,
      (i) => (i === aNeighbor ? 'am_classic_10' : i === target ? 'st_poacher' : undefined),
    );
    expect(computePlayerChemistry(squad, target).synergy).toBe(CONFIG.chemistry.synergyBonus);
  });

  it('entrosamento: min(20, streak × 1)', () => {
    const squad = squad433(allDistinct, undefined, (i) => (i === 9 ? 35 : 0));
    expect(computePlayerChemistry(squad, 9).streak).toBe(CONFIG.chemistry.streakCap);
    const squad2 = squad433(allDistinct, undefined, (i) => (i === 9 ? 7 : 0));
    expect(computePlayerChemistry(squad2, 9).streak).toBe(7);
  });

  it('total clampa em 100 e multiplicador chega a 1.05', () => {
    // Mesmo clube/nacionalidade/liga para todos + streak alto + sinergia
    const squad = squad433(
      () => ({ clubId: 'flamengo', nationality: 'BR', leagueId: 'brasileirao' }),
      undefined,
      () => 25,
    );
    const { perSlot, teamAverage } = computeSquadChemistry(squad);
    for (const chem of perSlot) {
      expect(chem.total).toBeLessThanOrEqual(100);
      expect(chem.multiplier).toBeLessThanOrEqual(
        CONFIG.chemistry.multiplierBase + CONFIG.chemistry.multiplierSpan + 1e-9,
      );
    }
    expect(teamAverage).toBeGreaterThan(80);
  });
});
