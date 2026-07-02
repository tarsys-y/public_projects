import { baseRarityForOverall, computeOverall } from '../src/overall';
import { OUTFIELD_OVERALL_WEIGHTS, GK_OVERALL_WEIGHTS } from '../src/models/overallWeights';
import { gk, outfield } from './helpers';

describe('computeOverall', () => {
  it('atributos uniformes → overall igual ao valor', () => {
    expect(computeOverall(outfield(80), 'ST')).toBe(80);
    expect(computeOverall(gk(85), 'GK')).toBe(85);
  });

  it('pondera pelos atributos-chave da posição principal', () => {
    const shooter = outfield(60, { finishing: 95, offPositioning: 95, shotPower: 95 });
    const asStriker = computeOverall(shooter, 'ST');
    const asCb = computeOverall(shooter, 'CB');
    expect(asStriker).toBeGreaterThan(asCb);
    expect(asStriker).toBeGreaterThan(60);
  });

  it('zagueiro forte na defesa vale mais como CB do que como ST', () => {
    const defender = outfield(55, {
      marking: 92,
      tackling: 92,
      interceptions: 90,
      defPositioning: 92,
      strength: 88,
      heading: 85,
    });
    expect(computeOverall(defender, 'CB')).toBeGreaterThan(computeOverall(defender, 'ST'));
  });

  it('todas as posições de linha têm pesos definidos e positivos', () => {
    for (const [position, weights] of Object.entries(OUTFIELD_OVERALL_WEIGHTS)) {
      const total = Object.values(weights).reduce((s, w) => s + (w ?? 0), 0);
      expect(total).toBeGreaterThan(0);
      expect(position).not.toBe('GK');
    }
    expect(Object.values(GK_OVERALL_WEIGHTS).reduce((s, w) => s + (w ?? 0), 0)).toBeGreaterThan(0);
  });

  it('atributos de GK usam pesos de GK mesmo com posição inconsistente', () => {
    expect(computeOverall(gk(80), 'ST')).toBe(80);
  });
});

describe('baseRarityForOverall', () => {
  it('mapeia thresholds do config', () => {
    expect(baseRarityForOverall(90)).toBe('legendary');
    expect(baseRarityForOverall(88)).toBe('legendary');
    expect(baseRarityForOverall(85)).toBe('epic');
    expect(baseRarityForOverall(78)).toBe('rare');
    expect(baseRarityForOverall(70)).toBe('common');
  });
});
