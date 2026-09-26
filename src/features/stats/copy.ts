/**
 * Pure copy builders for the leaderboard screen (§11). Turns a core `LeaderRow` into the name
 * heading and the sub line under it: the declaration/belot/win counts, prefixed with the team
 * name for pairs.
 */
import type { LeaderRow } from '../../core/leaderboard';
import { STRINGS } from '../../core/strings';

const S = STRINGS.stats;

/** The row's display name: the player's own name, or both pair names joined with "и". */
export function statsName(row: LeaderRow, kind: 'players' | 'pairs'): string {
  return kind === 'pairs'
    ? STRINGS.end.names(row.names[0] ?? '?', row.names[1] ?? '?')
    : (row.names[0] ?? '?');
}

/** The row's sub line, e.g. "N обяви · N белота · W/M победи", team-name prefixed for pairs. */
export function statsSub(row: LeaderRow, kind: 'players' | 'pairs'): string {
  const sub = S.sub(row.count, row.belots, row.wins, row.matches);
  return kind === 'pairs' && row.teamName ? `${row.teamName} · ${sub}` : sub;
}
