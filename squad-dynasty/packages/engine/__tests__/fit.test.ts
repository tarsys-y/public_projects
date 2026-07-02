import { computeRoleFit, fitMultiplier } from '../src/fit';
import { CONFIG } from '../src/config';
import { gk, outfield } from './helpers';

describe('computeRoleFit', () => {
  it('retorna 0..1 e cresce com os atributos-chave', () => {
    const weak = computeRoleFit(outfield(40), 'st_poacher');
    const strong = computeRoleFit(
      outfield(40, { finishing: 95, offPositioning: 95, acceleration: 90, composure: 90 }),
      'st_poacher',
    );
    expect(weak).toBeGreaterThanOrEqual(0);
    expect(strong).toBeLessThanOrEqual(1);
    expect(strong).toBeGreaterThan(weak);
  });

  it('oportunista encaixa melhor em st_poacher que em cb_stopper', () => {
    const poacher = outfield(50, { finishing: 93, offPositioning: 92, acceleration: 88 });
    expect(computeRoleFit(poacher, 'st_poacher')).toBeGreaterThan(
      computeRoleFit(poacher, 'cb_stopper'),
    );
  });

  it('funções de goleiro leem atributos de goleiro', () => {
    const classic = computeRoleFit(gk(50, { reflexes: 95, handling: 92, gkPositioning: 93 }), 'gk_classic');
    const sweeper = computeRoleFit(gk(50, { reflexes: 95, handling: 92, gkPositioning: 93 }), 'gk_sweeper');
    expect(classic).toBeGreaterThan(sweeper);
  });
});

describe('fitMultiplier', () => {
  it('fica na faixa 0.85–1.00 dentro da posição', () => {
    const min = fitMultiplier(outfield(0), 'st_poacher', 'ST');
    const max = fitMultiplier(outfield(99), 'st_poacher', 'ST');
    expect(min).toBeCloseTo(CONFIG.fit.base, 5);
    expect(max).toBeCloseTo(CONFIG.fit.base + CONFIG.fit.span, 5);
  });

  it('aplica 0.80 extra fora das validPositions da função', () => {
    const attrs = outfield(80);
    const inPosition = fitMultiplier(attrs, 'st_poacher', 'ST');
    const outOfPosition = fitMultiplier(attrs, 'st_poacher', 'CB');
    expect(outOfPosition).toBeCloseTo(inPosition * CONFIG.fit.outOfPositionMultiplier, 5);
  });
});
