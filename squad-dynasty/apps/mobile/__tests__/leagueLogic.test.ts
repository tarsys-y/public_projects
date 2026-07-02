// M7: lógica pura da Liga de Amigos — dois aparelhos calculam o mesmo mundo.
import { mulberry32, CONFIG } from '@squad-dynasty/engine';
import {
  BYE,
  friendFixtures,
  generateInviteCode,
  hashString,
  matchSeed,
  sellerNet,
} from '../src/services/leagueLogic';

describe('leagueLogic (M7)', () => {
  it('código de convite: 6 chars sem ambíguos, determinístico por seed', () => {
    const a = generateInviteCode(mulberry32(42));
    const b = generateInviteCode(mulberry32(42));
    expect(a).toBe(b);
    expect(a).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(generateInviteCode(mulberry32(43))).not.toBe(a);
  });

  it('hash é estável e distribui', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).not.toBe(hashString('abd'));
  });

  it('fixtures de amigos: mesma lista de membros ⇒ mesmo calendário em qualquer ordem', () => {
    const a = friendFixtures(['uid-c', 'uid-a', 'uid-b', 'uid-d'], 999);
    const b = friendFixtures(['uid-a', 'uid-b', 'uid-c', 'uid-d'], 999);
    expect(a).toEqual(b);
    expect(a).toHaveLength(12); // 4 membros → 3+3 rodadas × 2 jogos
  });

  it('nº ímpar de membros ganha bye (folga) sem jogos fantasma', () => {
    const fixtures = friendFixtures(['u1', 'u2', 'u3'], 7);
    expect(fixtures.every((f) => f.homeClubId !== BYE && f.awayClubId !== BYE)).toBe(true);
    // 3 membros → todos contra todos ida e volta = 6 jogos
    expect(fixtures).toHaveLength(6);
  });

  it('seed do confronto é idêntica para os dois lados e única por confronto', () => {
    const s1 = matchSeed('liga1', 1, 3, 'uidA', 'uidB');
    expect(matchSeed('liga1', 1, 3, 'uidA', 'uidB')).toBe(s1);
    expect(matchSeed('liga1', 1, 4, 'uidA', 'uidB')).not.toBe(s1);
    expect(matchSeed('liga1', 2, 3, 'uidA', 'uidB')).not.toBe(s1);
    expect(matchSeed('liga2', 1, 3, 'uidA', 'uidB')).not.toBe(s1);
  });

  it('taxa do mercado: vendedor recebe 95%', () => {
    expect(sellerNet(1000, CONFIG.economy.marketFeeRate)).toBe(950);
    expect(sellerNet(333, CONFIG.economy.marketFeeRate)).toBe(316);
  });
});
