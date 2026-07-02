import { generateFixtures } from '../src/league/fixtures';
import { computeStandings } from '../src/league/standings';
import { applyAging } from '../src/aging/applyAging';
import { mulberry32 } from '../src/rng';
import { basePlayer, cardDef, gk, outfield, ownedCard } from './helpers';

describe('generateFixtures (M6)', () => {
  const clubs = Array.from({ length: 20 }, (_, i) => `club-${String(i).padStart(2, '0')}`);

  it('20 clubes → 38 rodadas × 10 jogos, todos contra todos ida e volta', () => {
    const fixtures = generateFixtures(clubs, mulberry32(1));
    expect(fixtures).toHaveLength(380);
    const rounds = new Set(fixtures.map((f) => f.round));
    expect(rounds.size).toBe(38);
    for (let round = 1; round <= 38; round++) {
      const games = fixtures.filter((f) => f.round === round);
      expect(games).toHaveLength(10);
      const teams = games.flatMap((g) => [g.homeClubId, g.awayClubId]);
      expect(new Set(teams).size).toBe(20); // cada clube joga 1x por rodada
    }
    // confrontos: cada par aparece 2x, com mandos invertidos
    const pairKey = (a: string, b: string) => `${a}|${b}`;
    const seen = new Map<string, number>();
    for (const f of fixtures) {
      seen.set(pairKey(f.homeClubId, f.awayClubId), (seen.get(pairKey(f.homeClubId, f.awayClubId)) ?? 0) + 1);
    }
    expect(seen.size).toBe(380); // nenhum confronto repetido com mesmo mando
    for (const f of fixtures) {
      expect(seen.get(pairKey(f.awayClubId, f.homeClubId))).toBe(1);
    }
  });

  it('determinístico por seed', () => {
    expect(generateFixtures(clubs, mulberry32(9))).toEqual(generateFixtures(clubs, mulberry32(9)));
    expect(generateFixtures(clubs, mulberry32(9))).not.toEqual(generateFixtures(clubs, mulberry32(10)));
  });
});

describe('computeStandings (M6)', () => {
  it('pontos, saldo e ordenação corretos', () => {
    const standings = computeStandings(
      ['aaa', 'bbb', 'ccc'],
      [
        { homeClubId: 'aaa', awayClubId: 'bbb', homeGoals: 2, awayGoals: 0 },
        { homeClubId: 'ccc', awayClubId: 'aaa', homeGoals: 1, awayGoals: 1 },
        { homeClubId: 'bbb', awayClubId: 'ccc', homeGoals: 0, awayGoals: 3 },
      ],
    );
    expect(standings.map((s) => s.clubId)).toEqual(['ccc', 'aaa', 'bbb']);
    const ccc = standings[0]!;
    expect(ccc.points).toBe(4);
    expect(ccc.goalDiff).toBe(3);
    const aaa = standings[1]!;
    expect(aaa.points).toBe(4); // desempate: vitórias iguais → saldo (ccc 3 > aaa 2)
  });
});

describe('applyAging (SPEC 4.4)', () => {
  it('carta congelada não envelhece nunca', () => {
    const player = basePlayer({ positions: ['ST'] });
    const card = cardDef(player, { frozen: true, version: 'epic_moment', rarity: 'epic' });
    const owned = ownedCard(card, { age: 40 });
    const out = applyAging(owned, card, player, mulberry32(1));
    expect(out.retired).toBe(false);
    expect(out.changes).toEqual({});
  });

  it('jovem (≤21) ganha +1..+3 em 2–4 atributos', () => {
    const player = basePlayer({ positions: ['ST'], attributes: outfield(70) });
    const card = cardDef(player);
    const out = applyAging(ownedCard(card, { age: 19 }), card, player, mulberry32(5));
    const gains = Object.values(out.changes);
    expect(gains.length).toBeGreaterThanOrEqual(2);
    expect(gains.length).toBeLessThanOrEqual(4);
    for (const g of gains) {
      expect(g).toBeGreaterThanOrEqual(1);
      expect(g).toBeLessThanOrEqual(3);
    }
  });

  it('auge (25–29) não muda; 30–32 perde ritmo/físico', () => {
    const player = basePlayer({ positions: ['CM'], attributes: outfield(78) });
    const card = cardDef(player);
    expect(applyAging(ownedCard(card, { age: 27 }), card, player, mulberry32(3)).changes).toEqual({});
    const out = applyAging(ownedCard(card, { age: 31 }), card, player, mulberry32(3));
    for (const [attr, delta] of Object.entries(out.changes)) {
      expect(['acceleration', 'sprintSpeed', 'strength', 'stamina', 'jumping']).toContain(attr);
      expect(delta).toBeLessThan(0);
    }
  });

  it('36+ pode aposentar (25% aos 36, +15%/ano) — estatística em 400 rolls', () => {
    const player = basePlayer({ positions: ['ST'] });
    const card = cardDef(player);
    let retired36 = 0;
    let retired38 = 0;
    for (let seed = 1; seed <= 400; seed++) {
      if (applyAging(ownedCard(card, { age: 36 }), card, player, mulberry32(seed)).retired) retired36++;
      if (applyAging(ownedCard(card, { age: 38 }), card, player, mulberry32(seed + 1000)).retired) retired38++;
    }
    expect(retired36 / 400).toBeGreaterThan(0.15);
    expect(retired36 / 400).toBeLessThan(0.35);
    expect(retired38 / 400).toBeGreaterThan(0.42); // ~55%
  });

  it('goleiro veterano declina devagar e só nos atributos de GK', () => {
    const player = basePlayer({ positions: ['GK'], attributes: gk(80) });
    const card = cardDef(player);
    const out = applyAging(ownedCard(card, { age: 35 }), card, player, mulberry32(2));
    if (!out.retired) {
      for (const attr of Object.keys(out.changes)) {
        expect(['reflexes', 'rushingOut']).toContain(attr);
      }
    }
  });
});
