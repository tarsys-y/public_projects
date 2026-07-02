import type { MatchInput } from '../src/models/match';
import { simulateMatch, starterStreakUpdates } from '../src/sim/simulate';
import { getLiveRating, getSnowflake } from '../src/ratings/ratings';
import { CONFIG } from '../src/config';
import { uniformSquad } from './simHelpers';

function input(seed: number, levelHome = 80, levelAway = 80): MatchInput {
  return {
    home: uniformSquad(levelHome, 'h'),
    away: uniformSquad(levelAway, 'a'),
    seed,
    homeController: 'ai',
    awayController: 'ai',
  };
}

describe('determinismo (SPEC 10.2)', () => {
  it('mesma seed ⇒ resultado idêntico (eventos, notas, stats, decisões)', () => {
    const a = simulateMatch(input(42));
    const b = simulateMatch(input(42));
    expect(b).toEqual(a);
  });

  it('seeds diferentes ⇒ partidas diferentes', () => {
    const a = simulateMatch(input(1));
    const b = simulateMatch(input(2));
    expect(JSON.stringify(a.events)).not.toEqual(JSON.stringify(b.events));
  });
});

describe('consistência interna', () => {
  const result = simulateMatch(input(7));

  it('placar bate com eventos de gol e com stats', () => {
    const goalsHome = result.events.filter((e) => e.type === 'goal' && e.side === 'home').length;
    const goalsAway = result.events.filter((e) => e.type === 'goal' && e.side === 'away').length;
    expect(result.score).toEqual([goalsHome, goalsAway]);
    expect(result.stats.home.goals).toBe(goalsHome);
    expect(result.stats.away.goals).toBe(goalsAway);
  });

  it('chutes ≥ chutes no gol ≥ gols; posse soma 100', () => {
    for (const side of ['home', 'away'] as const) {
      const s = result.stats[side];
      expect(s.shots).toBeGreaterThanOrEqual(s.shotsOnTarget);
      expect(s.shotsOnTarget).toBeGreaterThanOrEqual(s.goals);
    }
    expect(result.stats.home.possession + result.stats.away.possession).toBe(100);
  });

  it('notas clampadas em 0–10 e todos os 22 titulares avaliados', () => {
    expect(result.ratings.length).toBeGreaterThanOrEqual(22);
    for (const r of result.ratings) {
      expect(r.rating).toBeGreaterThanOrEqual(0);
      expect(r.rating).toBeLessThanOrEqual(10);
    }
  });

  it('eventos ordenados por minuto, terminando em fulltime', () => {
    for (let i = 1; i < result.events.length; i++) {
      expect(result.events[i]!.minute).toBeGreaterThanOrEqual(result.events[i - 1]!.minute);
    }
    expect(result.events[result.events.length - 1]!.type).toBe('fulltime');
    expect(result.totalMinutes).toBeGreaterThanOrEqual(91);
    expect(result.totalMinutes).toBeLessThanOrEqual(95);
  });
});

describe('aceite M2: equilíbrio e sensibilidade a overall', () => {
  it('1.000 partidas entre times iguais ⇒ ~33/33/33 (±5pp)', () => {
    let w = 0;
    let d = 0;
    let l = 0;
    for (let seed = 1; seed <= 1000; seed++) {
      const [h, a] = simulateMatch(input(seed)).score;
      if (h > a) w++;
      else if (h === a) d++;
      else l++;
    }
    for (const share of [w, d, l]) {
      expect(share / 1000).toBeGreaterThanOrEqual(0.28);
      expect(share / 1000).toBeLessThanOrEqual(0.38);
    }
  }, 120_000);

  it('time overall 85 vence 75 em ≥70% das partidas', () => {
    let wins = 0;
    const n = 400;
    for (let seed = 1; seed <= n; seed++) {
      const [h, a] = simulateMatch(input(seed, 85, 75)).score;
      if (h > a) wins++;
    }
    expect(wins / n).toBeGreaterThanOrEqual(0.7);
  }, 120_000);
});

describe('momentos de decisão (SPEC 5.4)', () => {
  it('gera no máximo 4 por partida, com espaçamento mínimo', () => {
    for (let seed = 100; seed < 140; seed++) {
      const result = simulateMatch(input(seed));
      expect(result.decisions.length).toBeLessThanOrEqual(CONFIG.sim.decisionsMax);
      const minutes = result.decisions.map((d) => d.minute).sort((x, y) => x - y);
      for (let i = 1; i < minutes.length; i++) {
        expect(minutes[i]! - minutes[i - 1]!).toBeGreaterThanOrEqual(CONFIG.sim.decisionsMinGap);
      }
    }
  });

  it('lado IA decide na hora (aiChoiceId preenchido) e tem 2–3 opções', () => {
    let found = 0;
    for (let seed = 1; seed < 60 && found < 5; seed++) {
      for (const d of simulateMatch(input(seed)).decisions) {
        found++;
        expect(d.aiChoiceId).toBeDefined();
        expect(d.options.length).toBeGreaterThanOrEqual(2);
        expect(d.options.length).toBeLessThanOrEqual(3);
        expect(d.options.some((o) => o.id === d.aiChoiceId)).toBe(true);
      }
    }
    expect(found).toBeGreaterThan(0);
  });

  it('lado do usuário NÃO aplica automaticamente (aiChoiceId ausente)', () => {
    let found = false;
    for (let seed = 1; seed < 80 && !found; seed++) {
      const result = simulateMatch({ ...input(seed), homeController: 'user' });
      for (const d of result.decisions.filter((d) => d.side === 'home')) {
        expect(d.aiChoiceId).toBeUndefined();
        found = true;
      }
    }
    expect(found).toBe(true);
  });
});

describe('intervenções e re-simulação (SPEC 5.4/5.5)', () => {
  it('eventos anteriores ao minuto da intervenção são idênticos (mesma seed)', () => {
    const base = simulateMatch(input(42));
    const intervened = simulateMatch(input(42), {
      interventions: [{ minute: 60, side: 'home', tactics: { mentality: 5, pressing: 3 } }],
    });
    const before = (events: typeof base.events) => events.filter((e) => e.minute < 60);
    expect(before(intervened.events)).toEqual(before(base.events));
  });

  it('substituição via intervenção entra em campo e respeita limites', () => {
    const squad = uniformSquad(80, 'h');
    const outId = squad.slots[9]!.player.ownedCardId;
    const inId = squad.bench[1]!.ownedCardId;
    const result = simulateMatch(
      { ...input(5), home: squad, homeController: 'user' },
      { interventions: [{ minute: 46, side: 'home', substitutions: [{ outOwnedCardId: outId, inOwnedCardId: inId }] }] },
    );
    const entered = result.participations.find((p) => p.playerId === inId);
    const left = result.participations.find((p) => p.playerId === outId);
    expect(entered?.enteredMinute).toBe(46);
    expect(entered?.started).toBe(false);
    expect(left?.leftMinute).toBe(46);
    const subEvents = result.events.filter((e) => e.type === 'substitution' && e.side === 'home');
    expect(subEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('não permite mais que 5 trocas / 3 janelas por time', () => {
    const squad = uniformSquad(80, 'h');
    const interventions = [46, 55, 60, 70, 80].map((minute, i) => ({
      minute,
      side: 'home' as const,
      substitutions: [
        {
          outOwnedCardId: squad.slots[i + 5]!.player.ownedCardId,
          inOwnedCardId: squad.bench[i + 1]!.ownedCardId,
        },
      ],
    }));
    const result = simulateMatch(
      { ...input(5), home: squad, homeController: 'user' },
      { interventions },
    );
    const subs = result.events.filter((e) => e.type === 'substitution' && e.side === 'home');
    expect(subs.length).toBeLessThanOrEqual(CONFIG.sim.substitutionWindows);
  });
});

describe('starterStreakUpdates (SPEC 5.5)', () => {
  it('titular que completa ≥60min incrementa; quem sai do banco zera', () => {
    const squad = uniformSquad(80, 'h');
    const outId = squad.slots[9]!.player.ownedCardId;
    const inId = squad.bench[1]!.ownedCardId;
    const result = simulateMatch(
      { ...input(5), home: squad, homeController: 'user' },
      { interventions: [{ minute: 70, side: 'home', substitutions: [{ outOwnedCardId: outId, inOwnedCardId: inId }] }] },
    );
    const updates = new Map(starterStreakUpdates(result).map((u) => [u.playerId, u.update]));
    expect(updates.get(outId)).toBe('increment'); // saiu aos 70' (≥60)
    expect(updates.get(inId)).toBe('reset'); // começou no banco
    expect(updates.get(squad.slots[1]!.player.ownedCardId)).toBe('increment');
  });
});

describe('notas ao vivo e snowflake (SPEC 5.3)', () => {
  it('nota do goleador sobe após o gol; snowflake acumula na categoria', () => {
    let checked = false;
    for (let seed = 1; seed < 30 && !checked; seed++) {
      const result = simulateMatch(input(seed));
      const goal = result.events.find((e) => e.type === 'goal' && e.playerId);
      if (!goal) continue;
      const before = getLiveRating(result.events, result.participations, goal.playerId!, goal.minute - 1);
      const after = getLiveRating(result.events, result.participations, goal.playerId!, goal.minute);
      expect(after).toBeGreaterThan(before);
      const flake = getSnowflake(result.events, result.participations, goal.playerId!, result.totalMinutes);
      expect(flake.finishing).toBeGreaterThan(0);
      checked = true;
    }
    expect(checked).toBe(true);
  });
});

describe('cartão vermelho', () => {
  it('expulso sai de campo, vira decisão do lado punido e conta nas stats', () => {
    let found = false;
    for (let seed = 1; seed < 400 && !found; seed++) {
      const result = simulateMatch(input(seed));
      const red = result.events.find((e) => e.type === 'red_card');
      if (!red) continue;
      found = true;
      const participation = result.participations.find((p) => p.playerId === red.playerId);
      expect(participation?.sentOff).toBe(true);
      expect(participation?.leftMinute).toBe(red.minute);
      expect(result.stats[red.side].redCards).toBeGreaterThanOrEqual(1);
    }
    expect(found).toBe(true);
  });
});
