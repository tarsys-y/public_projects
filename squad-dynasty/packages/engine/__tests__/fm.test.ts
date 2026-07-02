// Fase FM: forma/moral, copa mata-mata, rivalidades/derby e SBC.
import { CUP_SIZE, drawCupPairs, drawCupParticipants, resolvePenalties } from '../src/league/cup';
import { isRivalry, rivalryName } from '../src/data/rivalries';
import { validateSbc, SBC_CHALLENGES } from '../src/sbc/requirements';
import { simulateMatch } from '../src/sim/simulate';
import { mulberry32 } from '../src/rng';
import type { ResolvedSlot } from '../src/resolve';
import { uniformSquad } from './simHelpers';
import { basePlayer, cardDef, outfield, gk, ownedCard } from './helpers';
import { resolveOwnedCard, buildCatalog } from '../src/resolve';
import { FORMATIONS } from '../src/models/formations';
import type { RoleId } from '../src/models/squad';

describe('forma/moral (formMultiplier)', () => {
  it('time em alta (1.05) vence o mesmo time em baixa (0.95) na maioria', () => {
    let wins = 0;
    const n = 200;
    for (let seed = 1; seed <= n; seed++) {
      const hot = uniformSquad(80, 'h');
      const cold = uniformSquad(80, 'a');
      for (const slot of hot.slots) slot.player.formMultiplier = 1.05;
      for (const slot of cold.slots) slot.player.formMultiplier = 0.95;
      const [h, a] = simulateMatch({
        home: hot,
        away: cold,
        seed,
        homeController: 'ai',
        awayController: 'ai',
      }).score;
      if (h > a) wins++;
    }
    expect(wins / n).toBeGreaterThan(0.5);
  });
});

describe('copa mata-mata', () => {
  const clubs = Array.from({ length: 20 }, (_, i) => `club-${i}`);

  it('sorteia 16 participantes incluindo o obrigatório, determinístico', () => {
    const a = drawCupParticipants(clubs, 'club-7', mulberry32(5));
    const b = drawCupParticipants(clubs, 'club-7', mulberry32(5));
    expect(a).toEqual(b);
    expect(a).toHaveLength(CUP_SIZE);
    expect(a).toContain('club-7');
    expect(new Set(a).size).toBe(CUP_SIZE);
  });

  it('pareia sem repetição e exige nº par', () => {
    const participants = drawCupParticipants(clubs, 'club-0', mulberry32(1));
    const ties = drawCupPairs(participants, mulberry32(2));
    expect(ties).toHaveLength(8);
    const seen = new Set(ties.flatMap((t) => [t.homeClubId, t.awayClubId]));
    expect(seen.size).toBe(16);
    expect(() => drawCupPairs(['a', 'b', 'c'], mulberry32(1))).toThrow();
  });

  it('pênaltis: time de nervos de aço avança mais vezes', () => {
    const iceCold = uniformSquad(80, 'h');
    const shaky = uniformSquad(80, 'a');
    for (const s of iceCold.slots) {
      (s.player.attributes as { bigGame: number; composure: number }).bigGame = 95;
      (s.player.attributes as { bigGame: number; composure: number }).composure = 95;
    }
    for (const s of shaky.slots) {
      (s.player.attributes as { bigGame: number; composure: number }).bigGame = 45;
      (s.player.attributes as { bigGame: number; composure: number }).composure = 45;
    }
    let homeWins = 0;
    for (let seed = 1; seed <= 300; seed++) {
      if (resolvePenalties(iceCold, shaky, mulberry32(seed))) homeWins++;
    }
    expect(homeWins / 300).toBeGreaterThan(0.55);
  });
});

describe('rivalidades e derby', () => {
  it('clássicos conhecidos são reconhecidos (simétricos)', () => {
    expect(isRivalry('flamengo', 'fluminense')).toBe(true);
    expect(isRivalry('fluminense', 'flamengo')).toBe(true);
    expect(rivalryName('gremio', 'internacional')).toBe('Grenal');
    expect(rivalryName('real-madrid', 'fc-barcelona')).toBe('El Clásico');
    expect(isRivalry('flamengo', 'palmeiras')).toBe(false);
  });

  it('derby: kickoff especial e mesmo determinismo', () => {
    const result = simulateMatch({
      home: uniformSquad(80, 'h'),
      away: uniformSquad(80, 'a'),
      seed: 42,
      homeController: 'ai',
      awayController: 'ai',
      isDerby: true,
      derbyName: 'Grenal',
    });
    expect(result.events[0]!.detail).toContain('CLÁSSICO');
    expect(result.events[0]!.detail).toContain('Grenal');
    const again = simulateMatch({
      home: uniformSquad(80, 'h'),
      away: uniformSquad(80, 'a'),
      seed: 42,
      homeController: 'ai',
      awayController: 'ai',
      isDerby: true,
      derbyName: 'Grenal',
    });
    expect(again).toEqual(result);
  });
});

describe('SBC validateSbc', () => {
  const ROLES_433: RoleId[] = [
    'gk_classic', 'fb_defensive', 'cb_stopper', 'cb_ball_playing', 'fb_defensive',
    'cm_box_to_box', 'dm_anchor', 'cm_playmaker', 'w_inverted', 'st_poacher', 'w_touchline',
  ];

  function make11(level: number, leagueId: string, nationality: string): ResolvedSlot[] {
    const formation = FORMATIONS['4-3-3']!;
    return formation.slots.map((slot, i) => {
      const player = basePlayer({
        positions: [slot.position],
        attributes: slot.position === 'GK' ? gk(level) : outfield(level),
        leagueId,
        nationality,
        clubId: `club-${i % 4}`,
      });
      const card = cardDef(player, { rarity: level >= 83 ? 'epic' : 'rare' });
      const owned = ownedCard(card);
      return {
        position: slot.position,
        role: ROLES_433[i]!,
        player: resolveOwnedCard(owned, buildCatalog([player], [card])),
      };
    });
  }

  it('aprova elenco que cumpre as restrições e detalha falhas quando não', () => {
    const goodSquad = make11(80, 'brasileirao', 'BR');
    const ok = validateSbc('4-3-3', goodSquad, {
      leagueId: 'brasileirao',
      minTeamOverall: 75,
      minSameNation: 5,
      maxSameClub: 4,
    });
    expect(ok.ok).toBe(true);
    expect(ok.teamOverall).toBe(80);

    const bad = validateSbc('4-3-3', goodSquad, {
      leagueId: 'premier-league',
      minTeamOverall: 90,
      minRarity: { rarity: 'legendary', count: 2 },
    });
    expect(bad.ok).toBe(false);
    expect(bad.failures.length).toBe(3);
  });

  it('catálogo inicial é consistente', () => {
    expect(SBC_CHALLENGES.length).toBeGreaterThanOrEqual(8);
    for (const challenge of SBC_CHALLENGES) {
      expect(FORMATIONS[challenge.formation]).toBeDefined();
      const hasReward =
        challenge.reward.coins || challenge.reward.gems || challenge.reward.pack || challenge.reward.cardId;
      expect(hasReward).toBeTruthy();
    }
  });
});
