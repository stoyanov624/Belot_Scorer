import type { MatchRecord, Player, Seat, Team } from './model';
import { DEFAULT_RULES, declPoints, type RulesConfig, teamOf } from './rules';

export interface LeaderRow {
  key: string;
  playerIds: string[];
  names: string[];
  teamName: string | null;
  pts: number;
  count: number;
  belots: number;
  deals: number;
  matches: number;
  wins: number;
}

const SEATS_OF: Record<Team, [Seat, Seat]> = { A: [0, 2], B: [1, 3] };

const newRow = (key: string, playerIds: string[]): LeaderRow => ({
  key,
  playerIds,
  names: [],
  teamName: null,
  pts: 0,
  count: 0,
  belots: 0,
  deals: 0,
  matches: 0,
  wins: 0,
});

const byRank = (a: LeaderRow, b: LeaderRow) =>
  b.pts - a.pts || b.count - a.count || b.wins - a.wins;

export function leaderboard(
  stats: readonly MatchRecord[],
  roster: readonly Player[],
  rules: RulesConfig = DEFAULT_RULES,
): { players: LeaderRow[]; pairs: LeaderRow[] } {
  const players = new Map<string, LeaderRow>();
  const pairs = new Map<string, LeaderRow>();
  const lastName = new Map<string, string>();

  const pairKey = (m: MatchRecord, team: Team) =>
    SEATS_OF[team]
      .map((s) => m.seats[s])
      .toSorted()
      .join('|');

  for (const m of stats.toSorted((a, b) => a.date - b.date)) {
    const w: Team | null = m.totalA > m.totalB ? 'A' : m.totalB > m.totalA ? 'B' : null;

    m.seats.forEach((id, seat) => {
      lastName.set(id, m.names[seat] ?? id);
      const row = players.get(id) ?? newRow(id, [id]);
      row.matches++;
      row.deals += m.games.length;
      if (w === teamOf(seat as Seat)) row.wins++;
      players.set(id, row);
    });

    for (const team of ['A', 'B'] as const) {
      const key = pairKey(m, team);
      const row = pairs.get(key) ?? newRow(key, key.split('|'));
      row.teamName = team === 'A' ? m.teamA : m.teamB;
      row.matches++;
      row.deals += m.games.length;
      if (w === team) row.wins++;
      pairs.set(key, row);
    }

    for (const g of m.games) {
      for (const d of g.decls) {
        if (!d.valid) continue;
        const pts = declPoints(d, rules);
        const targets = [players.get(m.seats[d.seat]), pairs.get(pairKey(m, teamOf(d.seat)))];
        for (const row of targets) {
          if (!row) continue;
          row.pts += pts;
          row.count++;
          if (d.key === 'belot') row.belots++;
        }
      }
    }
  }

  const live = new Map(roster.map((p) => [p.id, p.name]));
  const nameOf = (id: string) => live.get(id) ?? lastName.get(id) ?? '?';
  const finish = (rows: Iterable<LeaderRow>) =>
    [...rows].map((r) => ({ ...r, names: r.playerIds.map(nameOf) })).sort(byRank);

  return { players: finish(players.values()), pairs: finish(pairs.values()) };
}
