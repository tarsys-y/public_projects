// Pesos do overall por posição principal (SPEC 3: "média ponderada dos
// atributos pela posição principal"). Atributos ausentes têm peso 0.
import type { GkAttributes, OutfieldAttributes, Position } from './player';

export type OutfieldWeights = Partial<Record<keyof OutfieldAttributes, number>>;
export type GkWeights = Partial<Record<keyof GkAttributes, number>>;

const CB: OutfieldWeights = {
  marking: 3,
  defPositioning: 3,
  tackling: 2.5,
  interceptions: 2.5,
  strength: 2,
  heading: 2,
  jumping: 1.5,
  shortPass: 1,
  sprintSpeed: 1,
  composure: 1,
  consistency: 1,
};

const FULLBACK: OutfieldWeights = {
  tackling: 2.5,
  marking: 2,
  interceptions: 2,
  defPositioning: 2,
  sprintSpeed: 2,
  acceleration: 2,
  stamina: 2,
  crossing: 1.5,
  shortPass: 1,
  dribbling: 1,
  consistency: 1,
};

const CDM: OutfieldWeights = {
  interceptions: 2.5,
  tackling: 2.5,
  defPositioning: 2.5,
  shortPass: 2,
  marking: 1.5,
  strength: 1.5,
  stamina: 1.5,
  vision: 1.5,
  longPass: 1,
  composure: 1,
  consistency: 1,
};

const CM: OutfieldWeights = {
  shortPass: 2.5,
  vision: 2,
  stamina: 2,
  ballControl: 2,
  longPass: 1.5,
  dribbling: 1.5,
  interceptions: 1.5,
  tackling: 1,
  finishing: 1,
  composure: 1,
  consistency: 1,
};

const CAM: OutfieldWeights = {
  vision: 2.5,
  shortPass: 2.5,
  dribbling: 2,
  ballControl: 2,
  finishing: 1.5,
  longPass: 1.5,
  agility: 1.5,
  composure: 1.5,
  offPositioning: 1,
  consistency: 1,
};

const WIDE_MID: OutfieldWeights = {
  crossing: 2.5,
  dribbling: 2,
  sprintSpeed: 2,
  acceleration: 2,
  stamina: 2,
  shortPass: 1.5,
  ballControl: 1.5,
  agility: 1.5,
  vision: 1,
  consistency: 1,
};

const WINGER: OutfieldWeights = {
  dribbling: 2.5,
  acceleration: 2.5,
  sprintSpeed: 2,
  agility: 2,
  ballControl: 2,
  finishing: 2,
  crossing: 1.5,
  offPositioning: 1.5,
  vision: 1,
  composure: 1,
};

const ST: OutfieldWeights = {
  finishing: 3,
  offPositioning: 2.5,
  shotPower: 2,
  heading: 1.5,
  acceleration: 1.5,
  sprintSpeed: 1.5,
  strength: 1.5,
  ballControl: 1.5,
  composure: 1.5,
  dribbling: 1,
};

export const GK_OVERALL_WEIGHTS: GkWeights = {
  reflexes: 3,
  gkPositioning: 2.5,
  handling: 2.5,
  rushingOut: 1.5,
  kicking: 1,
  composure: 1,
  consistency: 1,
};

export const OUTFIELD_OVERALL_WEIGHTS: Record<Exclude<Position, 'GK'>, OutfieldWeights> = {
  CB,
  LB: FULLBACK,
  RB: FULLBACK,
  CDM,
  CM,
  CAM,
  LM: WIDE_MID,
  RM: WIDE_MID,
  LW: WINGER,
  RW: WINGER,
  ST,
};
