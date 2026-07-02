// Química por titular (SPEC 4.2), 0–100, sempre derivada:
//   +25 mesmo clube que ≥1 vizinho tático
//   +25 mesma nacionalidade que ≥2 outros titulares
//   +15 mesma liga que ≥5 outros titulares
//   +15 conexão de estilos com um vizinho (synergies.ts)
//   +0..20 entrosamento: min(20, starterStreak × 1)
//   multiplicadorQuimica = 0.90 + 0.15 × (quimica/100)
import { CONFIG } from '../config';
import { FORMATIONS, getNeighborMap } from '../models/formations';
import type { ResolvedSquad } from '../resolve';
import { areRolesSynergistic } from './synergies';

export interface ChemistryBreakdown {
  club: number;
  nationality: number;
  league: number;
  synergy: number;
  streak: number;
  total: number; // 0–100
  multiplier: number; // 0.90–1.05
}

export function chemistryMultiplier(total: number): number {
  const c = CONFIG.chemistry;
  return c.multiplierBase + c.multiplierSpan * (Math.max(0, Math.min(100, total)) / 100);
}

/** Química de um titular (índice do slot) dentro do elenco resolvido. */
export function computePlayerChemistry(squad: ResolvedSquad, slotIndex: number): ChemistryBreakdown {
  const c = CONFIG.chemistry;
  const formation = FORMATIONS[squad.formation];
  if (!formation) throw new Error(`Formação desconhecida: ${squad.formation}`);
  const neighborMap = getNeighborMap(formation);
  const slot = squad.slots[slotIndex];
  if (!slot) throw new Error(`Slot inválido: ${slotIndex}`);

  const me = slot.player.basePlayer;
  const neighbors = (neighborMap[slotIndex] ?? [])
    .map((i) => squad.slots[i])
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const clubNeighbors = neighbors.filter((n) => n.player.basePlayer.clubId === me.clubId).length;
  const club = clubNeighbors >= c.clubMinNeighbors ? c.clubBonus : 0;

  const others = squad.slots.filter((_, i) => i !== slotIndex);
  const sameNationality = others.filter(
    (s) => s.player.basePlayer.nationality === me.nationality,
  ).length;
  const nationality = sameNationality >= c.nationalityMinStarters ? c.nationalityBonus : 0;

  const sameLeague = others.filter((s) => s.player.basePlayer.leagueId === me.leagueId).length;
  const league = sameLeague >= c.leagueMinStarters ? c.leagueBonus : 0;

  const synergy = neighbors.some((n) => areRolesSynergistic(slot.role, n.role))
    ? c.synergyBonus
    : 0;

  const streak = Math.min(c.streakCap, slot.player.starterStreak * c.streakPerMatch);

  const total = Math.max(0, Math.min(100, club + nationality + league + synergy + streak));
  return { club, nationality, league, synergy, streak, total, multiplier: chemistryMultiplier(total) };
}

/** Química de todos os titulares + média do time (para a UI). */
export function computeSquadChemistry(squad: ResolvedSquad): {
  perSlot: ChemistryBreakdown[];
  teamAverage: number;
} {
  const perSlot = squad.slots.map((_, i) => computePlayerChemistry(squad, i));
  const teamAverage =
    perSlot.length === 0
      ? 0
      : Math.round(perSlot.reduce((sum, b) => sum + b.total, 0) / perSlot.length);
  return { perSlot, teamAverage };
}
