// Tabela de classificação (M6): pontos corridos, critérios do Brasileirão
// (pontos > vitórias > saldo > gols pró > confronto simplificado por ordem alfabética estável).
export interface LeagueMatchResult {
  homeClubId: string;
  awayClubId: string;
  homeGoals: number;
  awayGoals: number;
}

export interface StandingRow {
  clubId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export function computeStandings(
  clubIds: string[],
  results: LeagueMatchResult[],
): StandingRow[] {
  const rows = new Map<string, StandingRow>(
    clubIds.map((clubId) => [
      clubId,
      {
        clubId,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
      },
    ]),
  );

  for (const r of results) {
    const home = rows.get(r.homeClubId);
    const away = rows.get(r.awayClubId);
    if (!home || !away) continue;
    home.played++;
    away.played++;
    home.goalsFor += r.homeGoals;
    home.goalsAgainst += r.awayGoals;
    away.goalsFor += r.awayGoals;
    away.goalsAgainst += r.homeGoals;
    if (r.homeGoals > r.awayGoals) {
      home.wins++;
      home.points += 3;
      away.losses++;
    } else if (r.homeGoals < r.awayGoals) {
      away.wins++;
      away.points += 3;
      home.losses++;
    } else {
      home.draws++;
      away.draws++;
      home.points++;
      away.points++;
    }
  }

  const list = [...rows.values()];
  for (const row of list) row.goalDiff = row.goalsFor - row.goalsAgainst;
  return list.sort(
    (a, b) =>
      b.points - a.points ||
      b.wins - a.wins ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor ||
      a.clubId.localeCompare(b.clubId),
  );
}
