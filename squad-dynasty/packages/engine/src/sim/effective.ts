// Atributo efetivo em partida (SPEC 4.3):
//   efetivo = (base+deltas) × multiplicadorFit × multiplicadorQuimica × fadiga
// Este módulo calcula fadiga e os compostos por setor usados pelo simulador.
import { CONFIG } from '../config';
import type { GkAttributes, OutfieldAttributes, Position } from '../models/player';
import { isGkAttributes } from '../models/player';
import type { ResolvedPlayer } from '../resolve';

export type PositionGroup = 'GK' | 'DEF' | 'MID' | 'ATT';

export function positionGroup(position: Position): PositionGroup {
  if (position === 'GK') return 'GK';
  if (position === 'CB' || position === 'LB' || position === 'RB') return 'DEF';
  if (position === 'LW' || position === 'RW' || position === 'ST') return 'ATT';
  return 'MID';
}

/** Fadiga (SPEC 5.2.6): 1 − (min/90) × (0.25 × (1 − stamina/99)); pressing alto +15%. */
export function fatigueFactor(
  stamina: number,
  minutesOnPitch: number,
  highPressing: boolean,
): number {
  const c = CONFIG.sim;
  const loss =
    (Math.max(0, minutesOnPitch) / c.regularMinutes) *
    (c.fatigueMaxLoss * (1 - stamina / 99)) *
    (highPressing ? 1 + c.highPressingFatigueBoost : 1);
  return Math.max(0, 1 - loss);
}

/** Stamina usada na fadiga (goleiro não tem o atributo; considera 90). */
export function staminaOf(player: ResolvedPlayer): number {
  return isGkAttributes(player.attributes) ? 90 : (player.attributes as OutfieldAttributes).stamina;
}

/** Composto defensivo bruto (0–99): defesa de linha ou qualidade do goleiro. */
export function defComposite(player: ResolvedPlayer): number {
  if (isGkAttributes(player.attributes)) {
    const a = player.attributes as GkAttributes;
    return (a.reflexes + a.gkPositioning + a.handling) / 3;
  }
  const a = player.attributes as OutfieldAttributes;
  return (a.marking + a.tackling + a.interceptions + a.defPositioning) / 4;
}

/** Composto de meio bruto (posse/construção). */
export function midComposite(player: ResolvedPlayer): number {
  if (isGkAttributes(player.attributes)) {
    return (player.attributes as GkAttributes).kicking * 0.5;
  }
  const a = player.attributes as OutfieldAttributes;
  return (a.shortPass + a.longPass + a.vision + a.ballControl) / 4;
}

/** Composto de ataque bruto (definição de chances) — pesa mais a finalização. */
export function atkComposite(player: ResolvedPlayer): number {
  if (isGkAttributes(player.attributes)) return 0;
  const a = player.attributes as OutfieldAttributes;
  return (
    (a.finishing * 1.6 + a.offPositioning * 1.4 + a.dribbling * 0.5 + a.acceleration * 0.5) / 4
  );
}

/** Peso de criação (sorteio do criador da jogada — SPEC 5.2.4). */
export function creationWeight(player: ResolvedPlayer): number {
  if (isGkAttributes(player.attributes)) return 0;
  const a = player.attributes as OutfieldAttributes;
  return (a.vision * 2 + a.shortPass + a.longPass) / 4;
}

/** Peso de finalização (sorteio do finalizador — SPEC 5.2.4). */
export function finishWeight(player: ResolvedPlayer): number {
  if (isGkAttributes(player.attributes)) return 0;
  const a = player.attributes as OutfieldAttributes;
  return (a.offPositioning * 1.5 + a.finishing * 1.5) / 3;
}

/** Peso de drible (eventos secundários). */
export function dribbleWeight(player: ResolvedPlayer): number {
  if (isGkAttributes(player.attributes)) return 0;
  const a = player.attributes as OutfieldAttributes;
  return (a.dribbling + a.agility) / 2;
}

/** Contribuição de cada grupo posicional para cada setor do time. */
export const GROUP_SECTOR_WEIGHTS: Record<
  Exclude<PositionGroup, 'GK'>,
  { def: number; mid: number; atk: number }
> = {
  DEF: { def: 1, mid: 0.25, atk: 0 },
  MID: { def: 0.35, mid: 1, atk: 0.35 },
  ATT: { def: 0, mid: 0.25, atk: 1 },
};
