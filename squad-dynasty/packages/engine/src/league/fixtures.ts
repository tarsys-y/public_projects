// Calendário de liga (M6): round-robin duplo determinístico (método do
// círculo). 20 clubes → 38 rodadas × 10 jogos, todos contra todos em ida e
// volta com mando invertido.
import type { Rng } from '../rng';
import { shuffle } from '../rng';

export interface Fixture {
  round: number; // 1-based
  homeClubId: string;
  awayClubId: string;
}

export function generateFixtures(clubIds: string[], rng: Rng): Fixture[] {
  if (clubIds.length < 2 || clubIds.length % 2 !== 0) {
    throw new Error('Número de clubes deve ser par e ≥2');
  }
  const order = shuffle(rng, clubIds);
  const n = order.length;
  const rounds = n - 1;
  const fixtures: Fixture[] = [];

  // método do círculo: fixa o primeiro, gira os demais
  const rotating = order.slice(1);
  for (let round = 0; round < rounds; round++) {
    const lineup = [order[0]!, ...rotating];
    for (let i = 0; i < n / 2; i++) {
      const a = lineup[i]!;
      const b = lineup[n - 1 - i]!;
      // alterna mando por rodada para equilibrar casa/fora
      const [home, away] = round % 2 === 0 ? [a, b] : [b, a];
      fixtures.push({ round: round + 1, homeClubId: home, awayClubId: away });
    }
    rotating.unshift(rotating.pop()!);
  }

  // returno: mando invertido
  const firstHalf = [...fixtures];
  for (const f of firstHalf) {
    fixtures.push({ round: f.round + rounds, homeClubId: f.awayClubId, awayClubId: f.homeClubId });
  }
  return fixtures;
}
