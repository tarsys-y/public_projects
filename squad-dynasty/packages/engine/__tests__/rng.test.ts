import { chance, mulberry32, pickWeighted, randInt, shuffle } from '../src/rng';

describe('mulberry32', () => {
  it('mesma seed produz a mesma sequência', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 100 }, () => a());
    const seqB = Array.from({ length: 100 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('seeds diferentes produzem sequências diferentes', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it('gera valores em [0, 1) com média ~0.5', () => {
    const rng = mulberry32(7);
    let sum = 0;
    for (let i = 0; i < 10_000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      sum += v;
    }
    expect(sum / 10_000).toBeCloseTo(0.5, 1);
  });
});

describe('randInt', () => {
  it('respeita os limites inclusivos e cobre toda a faixa', () => {
    const rng = mulberry32(3);
    const seen = new Set<number>();
    for (let i = 0; i < 1_000; i++) {
      const v = randInt(rng, 1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect(seen.size).toBe(6);
  });
});

describe('chance', () => {
  it('aproxima a probabilidade pedida', () => {
    const rng = mulberry32(11);
    let hits = 0;
    for (let i = 0; i < 10_000; i++) if (chance(rng, 0.3)) hits++;
    expect(hits / 10_000).toBeCloseTo(0.3, 1);
  });
});

describe('pickWeighted', () => {
  it('nunca sorteia peso zero e respeita proporções', () => {
    const rng = mulberry32(5);
    const counts = [0, 0, 0];
    for (let i = 0; i < 10_000; i++) {
      const idx = pickWeighted(rng, [0, 1, 3]);
      counts[idx] = (counts[idx] ?? 0) + 1;
    }
    expect(counts[0]).toBe(0);
    expect((counts[2] ?? 0) / (counts[1] ?? 1)).toBeCloseTo(3, 0);
  });

  it('cai em uniforme quando todos os pesos são zero', () => {
    const rng = mulberry32(9);
    const seen = new Set<number>();
    for (let i = 0; i < 100; i++) seen.add(pickWeighted(rng, [0, 0, 0]));
    expect(seen.size).toBe(3);
  });
});

describe('shuffle', () => {
  it('é determinístico e preserva os elementos', () => {
    const items = [1, 2, 3, 4, 5];
    const a = shuffle(mulberry32(42), items);
    const b = shuffle(mulberry32(42), items);
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5]);
  });
});
