// Tipos de partida (SPEC seção 5). O playerId usado em eventos/notas é o
// ownedCardId — único dentro da partida mesmo com duas cartas do mesmo jogador.
import type { AttributeCategory, Position } from './player';
import type { RoleId, Tactics } from './squad';
import type { ResolvedSquad } from '../resolve';

export type Side = 'home' | 'away';

export type MatchEventType =
  | 'kickoff'
  | 'halftime'
  | 'fulltime'
  | 'goal'
  | 'save'
  | 'block'
  | 'miss'
  | 'tackle'
  | 'interception'
  | 'dribble'
  | 'foul'
  | 'yellow_card'
  | 'red_card'
  | 'injury'
  | 'substitution';

export interface RatingImpact {
  playerId: string; // ownedCardId
  delta: number;
  category: AttributeCategory;
}

export interface MatchEvent {
  minute: number;
  side: Side; // time protagonista do lance
  type: MatchEventType;
  playerId?: string;
  assistId?: string;
  detail: string; // narração pt-BR
  ratingImpacts: RatingImpact[];
}

export type DecisionKind =
  | 'dribbled_repeatedly' // mesmo atacante driblou seu defensor 3×
  | 'no_shots_20min' // seu time está há 20+ min sem finalizar
  | 'red_card' // seu time levou vermelho
  | 'losing_late' // perdendo aos 75'
  | 'winning_late'; // vencendo aos 80'

export interface DecisionOption {
  id: string;
  label: string;
  /** Ajuste tático temporário aplicado do minuto da decisão em diante. */
  tactics?: Partial<Tactics>;
}

export interface DecisionPoint {
  id: string;
  minute: number;
  side: Side;
  kind: DecisionKind;
  description: string;
  options: DecisionOption[]; // 2–3 opções
  /** Escolha da heurística quando o lado é controlado por IA (já aplicada). */
  aiChoiceId?: string;
}

export interface Substitution {
  outOwnedCardId: string;
  inOwnedCardId: string; // deve estar no banco
}

/** Intervenção do usuário num re-sim: tática e/ou substituições a partir do minuto. */
export interface Intervention {
  minute: number;
  side: Side;
  tactics?: Partial<Tactics>;
  substitutions?: Substitution[];
}

export type Controller = 'user' | 'ai';

export interface MatchInput {
  home: ResolvedSquad;
  away: ResolvedSquad;
  seed: number;
  /** Quem decide os DecisionPoints de cada lado (default: user/ai). */
  homeController?: Controller;
  awayController?: Controller;
}

export interface SimOptions {
  /** Decisões/substituições do usuário; com a mesma seed, os eventos anteriores
   * ao minuto da intervenção são idênticos aos da simulação original. */
  interventions?: Intervention[];
}

export interface TeamStats {
  possession: number; // %
  shots: number;
  shotsOnTarget: number;
  goals: number;
  xg: number;
  tackles: number;
  interceptions: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
}

export type Snowflake = Record<AttributeCategory, number>;

export interface PlayerMatchRating {
  playerId: string; // ownedCardId
  name: string;
  side: Side;
  rating: number; // 0–10
  snowflake: Snowflake;
}

/** Participação para o app atualizar starterStreak/fadiga fora do engine. */
export interface PlayerParticipation {
  playerId: string; // ownedCardId
  name: string;
  side: Side;
  slotIndex: number; // slot da formação ocupado (sub herda o slot de quem saiu)
  position: Position;
  role: RoleId;
  started: boolean;
  enteredMinute: number;
  leftMinute?: number; // undefined = terminou em campo
  sentOff: boolean;
}

export interface MatchResult {
  score: [number, number];
  events: MatchEvent[];
  ratings: PlayerMatchRating[];
  stats: { home: TeamStats; away: TeamStats };
  decisions: DecisionPoint[];
  participations: PlayerParticipation[];
  totalMinutes: number; // 90 + acréscimos
  seed: number;
}
