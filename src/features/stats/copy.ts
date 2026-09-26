/**
 * Pure copy builder for the leaderboard screen (§11). Turns a core `LeaderRow` into the sub
 * line under a name: the declaration/belot/win counts, prefixed with the team name for pairs.
 */
import type { LeaderRow } from '../../core/leaderboard';
import { STRINGS } from '../../core/strings';

const S = STRINGS.stats;

/** The row's sub line, e.g. "N обяви · N белота · W/M победи", team-name prefixed for pairs. */
export function statsSub(row: LeaderRow, kind: 'players' | 'pairs'): string {
  const sub = S.sub(row.count, row.belots, row.wins, row.matches);
  return kind === 'pairs' && row.teamName ? `${row.teamName} · ${sub}` : sub;
}
