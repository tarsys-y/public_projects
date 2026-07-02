import { FORMATIONS, FORMATION_IDS, getNeighborMap } from '../src/models/formations';
import { ROLES, ROLE_IDS, rolesForPosition } from '../src/models/roles';

describe('formações', () => {
  it('existem 8 formações', () => {
    expect(FORMATION_IDS.length).toBe(8);
  });

  it.each(FORMATION_IDS)('%s tem 11 slots, 1 GK e coordenadas válidas', (id) => {
    const formation = FORMATIONS[id]!;
    expect(formation.slots.length).toBe(11);
    expect(formation.slots.filter((s) => s.position === 'GK').length).toBe(1);
    expect(formation.slots[0]!.position).toBe('GK');
    for (const slot of formation.slots) {
      expect(slot.x).toBeGreaterThanOrEqual(0);
      expect(slot.x).toBeLessThanOrEqual(1);
      expect(slot.y).toBeGreaterThanOrEqual(0);
      expect(slot.y).toBeLessThanOrEqual(1);
    }
  });

  it.each(FORMATION_IDS)('%s: todo slot tem ≥1 vizinho tático e o mapa é simétrico', (id) => {
    const formation = FORMATIONS[id]!;
    const neighbors = getNeighborMap(formation);
    expect(neighbors.length).toBe(11);
    neighbors.forEach((list, i) => {
      expect(list.length).toBeGreaterThanOrEqual(1);
      expect(list).not.toContain(i);
      for (const j of list) expect(neighbors[j]).toContain(i);
    });
  });

  it.each(FORMATION_IDS)('%s: toda posição de slot tem pelo menos uma função elegível', (id) => {
    const formation = FORMATIONS[id]!;
    for (const slot of formation.slots) {
      expect(rolesForPosition(slot.position).length).toBeGreaterThan(0);
    }
  });
});

describe('funções', () => {
  it('existem 20 funções, todas com pesos e posições válidas', () => {
    expect(ROLE_IDS.length).toBe(20);
    for (const id of ROLE_IDS) {
      const role = ROLES[id];
      expect(role.id).toBe(id);
      expect(role.validPositions.length).toBeGreaterThan(0);
      const total = Object.values(role.keyAttributes).reduce((s, w) => s + (w ?? 0), 0);
      expect(total).toBeGreaterThan(0);
    }
  });
});
