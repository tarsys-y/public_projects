// Notas ao vivo + snowflake (SPEC 5.3): todo participante começa em 6.0; cada
// MatchEvent aplica ratingImpacts (clamp 0–10). O snowflake é o acumulado dos
// impactos por categoria — verde (positivo) e vermelho (negativo) na UI.
// Tudo derivado da lista de eventos: a UI reproduz com timing, o resultado já existe.
import { CONFIG } from '../config';
import type {
  MatchEvent,
  PlayerMatchRating,
  PlayerParticipation,
  Snowflake,
} from '../models/match';

export function emptySnowflake(): Snowflake {
  return {
    pace: 0,
    finishing: 0,
    passing: 0,
    dribbling: 0,
    defense: 0,
    physical: 0,
    mental: 0,
  };
}

const clampRating = (r: number) => Math.max(CONFIG.ratings.min, Math.min(CONFIG.ratings.max, r));

/**
 * Notas e snowflakes de todos os participantes considerando eventos até o
 * minuto dado (inclusive). Use minute = Infinity para o resultado final.
 */
export function computeRatingsAt(
  events: MatchEvent[],
  participations: PlayerParticipation[],
  minute: number,
): PlayerMatchRating[] {
  const byPlayer = new Map<string, PlayerMatchRating>();
  for (const p of participations) {
    if (p.enteredMinute > minute) continue;
    byPlayer.set(p.playerId, {
      playerId: p.playerId,
      name: p.name,
      side: p.side,
      rating: CONFIG.ratings.start,
      snowflake: emptySnowflake(),
    });
  }
  for (const event of events) {
    if (event.minute > minute) break; // eventos são ordenados por minuto
    for (const impact of event.ratingImpacts) {
      const entry = byPlayer.get(impact.playerId);
      if (!entry) continue;
      entry.rating = clampRating(entry.rating + impact.delta);
      entry.snowflake[impact.category] += impact.delta;
    }
  }
  return [...byPlayer.values()];
}

/** Nota ao vivo de um jogador no minuto (SPEC 5.3: getLiveRating). */
export function getLiveRating(
  events: MatchEvent[],
  participations: PlayerParticipation[],
  playerId: string,
  minute: number,
): number {
  const all = computeRatingsAt(events, participations, minute);
  return all.find((r) => r.playerId === playerId)?.rating ?? CONFIG.ratings.start;
}

/** Snowflake ao vivo de um jogador no minuto (SPEC 5.3: getSnowflake). */
export function getSnowflake(
  events: MatchEvent[],
  participations: PlayerParticipation[],
  playerId: string,
  minute: number,
): Snowflake {
  const all = computeRatingsAt(events, participations, minute);
  return all.find((r) => r.playerId === playerId)?.snowflake ?? emptySnowflake();
}
