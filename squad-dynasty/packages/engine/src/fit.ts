// Fit de função (SPEC 4.1):
//   fit = Σ(atributo_normalizado × peso) / Σ(pesos)          → 0..1
//   multiplicadorFit = 0.85 + 0.15 × fit                     → 0.85 a 1.00
//   fora das validPositions da função: multiplicador extra de 0.80
import type { AnyAttributes, Position } from './models/player';
import type { RoleId } from './models/squad';
import { ROLES } from './models/roles';
import { CONFIG } from './config';

const MAX_ATTRIBUTE = 99;

/** Fit 0..1 do jogador na função (independente da posição do slot). */
export function computeRoleFit(attributes: AnyAttributes, roleId: RoleId): number {
  const role = ROLES[roleId];
  const values = attributes as unknown as Record<string, number>;
  let sum = 0;
  let total = 0;
  for (const [key, weight] of Object.entries(role.keyAttributes)) {
    if (!weight || weight <= 0) continue;
    sum += ((values[key] ?? 0) / MAX_ATTRIBUTE) * weight;
    total += weight;
  }
  if (total === 0) return 0;
  return sum / total;
}

/** Multiplicador de fit aplicado aos atributos efetivos em partida. */
export function fitMultiplier(
  attributes: AnyAttributes,
  roleId: RoleId,
  slotPosition: Position,
): number {
  const fit = computeRoleFit(attributes, roleId);
  let multiplier = CONFIG.fit.base + CONFIG.fit.span * fit;
  const role = ROLES[roleId];
  if (!role.validPositions.includes(slotPosition)) {
    multiplier *= CONFIG.fit.outOfPositionMultiplier;
  }
  return multiplier;
}
