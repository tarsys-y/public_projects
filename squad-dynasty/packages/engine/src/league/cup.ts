// Copa mata-mata (M6+/FM): chaveamento de 16 com sorteio seedado, jogo único
// por fase; empate decide nos pênaltis (sorteio ponderado por bigGame+composure).
import type { ResolvedSquad } from '../resolve';
import type { Rng } from '../rng';
import { shuffle } from '../rng';

export interface CupTie {
  homeClubId: string;
  awayClubId: string;
}

export const CUP_STAGES = ['Oitavas de final', 'Quartas de final', 'Semifinal', 'Final'] as const;
export const CUP_SIZE = 16;

/**
 * Sorteia os 16 participantes (garante `mustInclude`) e o pareamento da
 * primeira fase. Clubes além de 16 ficam de fora nesta edição.
 */
export function drawCupParticipants(
  clubIds: string[],
  mustInclude: string,
  rng: Rng,
): string[] {
  const others = shuffle(rng, clubIds.filter((id) => id !== mustInclude));
  return shuffle(rng, [mustInclude, ...others.slice(0, CUP_SIZE - 1)]);
}

/** Pareia os sobreviventes de uma fase (nº par). */
export function drawCupPairs(aliveClubIds: string[], rng: Rng): CupTie[] {
  if (aliveClubIds.length % 2 !== 0) throw new Error('Copa exige nº par de clubes');
  const order = shuffle(rng, aliveClubIds);
  const ties: CupTie[] = [];
  for (let i = 0; i < order.length; i += 2) {
    ties.push({ homeClubId: order[i]!, awayClubId: order[i + 1]! });
  }
  return ties;
}

/** Média de bigGame+composure dos titulares — peso do sorteio de pênaltis. */
function nerveScore(squad: ResolvedSquad): number {
  const values = squad.slots.map(
    (s) => (s.player.attributes.bigGame + s.player.attributes.composure) / 2,
  );
  return values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
}

/** Decide um empate de copa nos pênaltis. Retorna true se o mandante avança. */
export function resolvePenalties(home: ResolvedSquad, away: ResolvedSquad, rng: Rng): boolean {
  const h = nerveScore(home);
  const a = nerveScore(away);
  const pHome = h / Math.max(1, h + a);
  return rng() < pHome;
}
