/**
 * PRNG determinístico do engine. Regra do projeto: NUNCA usar Math.random()
 * dentro de packages/engine — toda aleatoriedade passa por um Rng seedado
 * injetado por quem chama, para que a mesma seed sempre reproduza a mesma
 * partida/sorteio.
 */
export type Rng = () => number;

/** mulberry32: rápido, 32 bits de estado, suficiente para simulação de jogo. */
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Inteiro uniforme em [min, max] (inclusivo nas duas pontas). */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** true com probabilidade p (0..1). */
export function chance(rng: Rng, p: number): boolean {
  return rng() < p;
}

/**
 * Sorteia um índice proporcional aos pesos (pesos <= 0 nunca são sorteados).
 * Se todos os pesos forem <= 0, cai em sorteio uniforme.
 */
export function pickWeighted(rng: Rng, weights: number[]): number {
  let total = 0;
  for (const w of weights) total += Math.max(0, w);
  if (total <= 0) return Math.floor(rng() * weights.length);
  let roll = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= Math.max(0, weights[i] ?? 0);
    if (roll < 0) return i;
  }
  return weights.length - 1;
}

/** Embaralhamento Fisher–Yates determinístico (retorna cópia). */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return out;
}
