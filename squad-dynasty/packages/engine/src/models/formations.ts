// As 8 formações do jogo, com coordenadas para o campo 2D da UI e o mapa de
// vizinhos táticos usado pela química (SPEC 4.2).
//
// Coordenadas: x = 0 (esquerda) a 1 (direita), y = 0 (própria meta) a 1 (ataque).
// Vizinhos táticos são derivados da distância entre slots — uma única regra
// para todas as formações evita tabelas manuais inconsistentes.
import type { Position } from './player';

export interface FormationSlot {
  position: Position;
  x: number;
  y: number;
}

export interface Formation {
  id: string; // ex: "4-3-3"
  name: string;
  slots: FormationSlot[]; // 11, índice 0 = GK
}

/** Distância máxima (euclidiana) para dois slots serem vizinhos táticos. */
const NEIGHBOR_DISTANCE = 0.34;

const GK: FormationSlot = { position: 'GK', x: 0.5, y: 0.04 };

function back4(): FormationSlot[] {
  return [
    { position: 'LB', x: 0.14, y: 0.22 },
    { position: 'CB', x: 0.38, y: 0.18 },
    { position: 'CB', x: 0.62, y: 0.18 },
    { position: 'RB', x: 0.86, y: 0.22 },
  ];
}

function back3(): FormationSlot[] {
  return [
    { position: 'CB', x: 0.26, y: 0.19 },
    { position: 'CB', x: 0.5, y: 0.16 },
    { position: 'CB', x: 0.74, y: 0.19 },
  ];
}

export const FORMATIONS: Record<string, Formation> = {
  '4-3-3': {
    id: '4-3-3',
    name: '4-3-3',
    slots: [
      GK,
      ...back4(),
      { position: 'CM', x: 0.3, y: 0.48 },
      { position: 'CDM', x: 0.5, y: 0.38 },
      { position: 'CM', x: 0.7, y: 0.48 },
      { position: 'LW', x: 0.16, y: 0.74 },
      { position: 'ST', x: 0.5, y: 0.86 },
      { position: 'RW', x: 0.84, y: 0.74 },
    ],
  },
  '4-4-2': {
    id: '4-4-2',
    name: '4-4-2',
    slots: [
      GK,
      ...back4(),
      { position: 'LM', x: 0.14, y: 0.52 },
      { position: 'CM', x: 0.38, y: 0.46 },
      { position: 'CM', x: 0.62, y: 0.46 },
      { position: 'RM', x: 0.86, y: 0.52 },
      { position: 'ST', x: 0.38, y: 0.84 },
      { position: 'ST', x: 0.62, y: 0.84 },
    ],
  },
  '4-2-3-1': {
    id: '4-2-3-1',
    name: '4-2-3-1',
    slots: [
      GK,
      ...back4(),
      { position: 'CDM', x: 0.38, y: 0.38 },
      { position: 'CDM', x: 0.62, y: 0.38 },
      { position: 'LM', x: 0.16, y: 0.62 },
      { position: 'CAM', x: 0.5, y: 0.6 },
      { position: 'RM', x: 0.84, y: 0.62 },
      { position: 'ST', x: 0.5, y: 0.86 },
    ],
  },
  '4-1-4-1': {
    id: '4-1-4-1',
    name: '4-1-4-1',
    slots: [
      GK,
      ...back4(),
      { position: 'CDM', x: 0.5, y: 0.36 },
      { position: 'LM', x: 0.14, y: 0.56 },
      { position: 'CM', x: 0.38, y: 0.52 },
      { position: 'CM', x: 0.62, y: 0.52 },
      { position: 'RM', x: 0.86, y: 0.56 },
      { position: 'ST', x: 0.5, y: 0.86 },
    ],
  },
  '4-1-2-1-2': {
    id: '4-1-2-1-2',
    name: '4-4-2 Losango',
    slots: [
      GK,
      ...back4(),
      { position: 'CDM', x: 0.5, y: 0.36 },
      { position: 'CM', x: 0.32, y: 0.5 },
      { position: 'CM', x: 0.68, y: 0.5 },
      { position: 'CAM', x: 0.5, y: 0.64 },
      { position: 'ST', x: 0.38, y: 0.85 },
      { position: 'ST', x: 0.62, y: 0.85 },
    ],
  },
  '3-5-2': {
    id: '3-5-2',
    name: '3-5-2',
    slots: [
      GK,
      ...back3(),
      { position: 'LM', x: 0.1, y: 0.5 },
      { position: 'CDM', x: 0.5, y: 0.38 },
      { position: 'CM', x: 0.32, y: 0.52 },
      { position: 'CM', x: 0.68, y: 0.52 },
      { position: 'RM', x: 0.9, y: 0.5 },
      { position: 'ST', x: 0.38, y: 0.84 },
      { position: 'ST', x: 0.62, y: 0.84 },
    ],
  },
  '3-4-3': {
    id: '3-4-3',
    name: '3-4-3',
    slots: [
      GK,
      ...back3(),
      { position: 'LM', x: 0.12, y: 0.52 },
      { position: 'CM', x: 0.38, y: 0.46 },
      { position: 'CM', x: 0.62, y: 0.46 },
      { position: 'RM', x: 0.88, y: 0.52 },
      { position: 'LW', x: 0.2, y: 0.76 },
      { position: 'ST', x: 0.5, y: 0.86 },
      { position: 'RW', x: 0.8, y: 0.76 },
    ],
  },
  '5-3-2': {
    id: '5-3-2',
    name: '5-3-2',
    slots: [
      GK,
      { position: 'LB', x: 0.1, y: 0.28 },
      { position: 'CB', x: 0.3, y: 0.18 },
      { position: 'CB', x: 0.5, y: 0.16 },
      { position: 'CB', x: 0.7, y: 0.18 },
      { position: 'RB', x: 0.9, y: 0.28 },
      { position: 'CM', x: 0.32, y: 0.5 },
      { position: 'CDM', x: 0.5, y: 0.4 },
      { position: 'CM', x: 0.68, y: 0.5 },
      { position: 'ST', x: 0.38, y: 0.82 },
      { position: 'ST', x: 0.62, y: 0.82 },
    ],
  },
};

export const FORMATION_IDS = Object.keys(FORMATIONS);

/**
 * Vizinhos táticos de cada slot (índices), simétrico. Derivado por distância
 * entre coordenadas; garante ≥1 vizinho por slot (cai no mais próximo).
 */
export function getNeighborMap(formation: Formation): number[][] {
  const n = formation.slots.length;
  const neighbors: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = formation.slots[i]!;
      const b = formation.slots[j]!;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist <= NEIGHBOR_DISTANCE) {
        neighbors[i]!.push(j);
        neighbors[j]!.push(i);
      }
    }
  }
  // Slot isolado (não deve acontecer com as formações atuais): liga ao mais próximo.
  for (let i = 0; i < n; i++) {
    if (neighbors[i]!.length > 0) continue;
    let best = -1;
    let bestDist = Infinity;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const a = formation.slots[i]!;
      const b = formation.slots[j]!;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = j;
      }
    }
    neighbors[i]!.push(best);
    neighbors[best]!.push(i);
  }
  return neighbors;
}
