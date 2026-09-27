import type { Match, MatchRecord, Player, Seats } from './model';
import type { SharePayload } from './share';

export type ImportMode = 'merge' | 'take' | 'replace';

export interface ImportResult {
  roster: Player[];
  stats: MatchRecord[];
  match: Match | null;
  /** How many players the data carried. */
  players: number;
  /** How many leaderboard records were new. */
  addedMatches: number;
  tookMatch: boolean;
}

const norm = (s: string) => s.trim().toLocaleLowerCase('bg');

/** A playing match with saved deals is only replaced after the user confirms (ADR 0011, 0013). */
export function needsTakeConfirm(local: Match | null): boolean {
  return local !== null && local.status === 'playing' && local.games.length > 0;
}

/** DATA_MODEL §4 import, with the 2026-09-27 decisions (ADR 0013). */
export function applyImport(
  local: { roster: readonly Player[]; stats: readonly MatchRecord[]; match: Match | null },
  data: SharePayload,
  mode: ImportMode,
): ImportResult {
  if (mode === 'replace') {
    return {
      roster: [...data.roster],
      stats: [...data.stats],
      match: data.match,
      players: data.roster.length,
      addedMatches: data.stats.length,
      tookMatch: data.match !== null,
    };
  }

  const roster = [...local.roster];
  const idMap = new Map<string, string>();
  for (const p of data.roster) {
    const byId = roster.findIndex((r) => r.id === p.id);
    if (byId >= 0) {
      const current = roster[byId] as Player;
      const clash = roster.some((r) => r.id !== p.id && norm(r.name) === norm(p.name));
      roster[byId] = { ...p, name: clash ? current.name : p.name, photo: p.photo ?? current.photo };
      idMap.set(p.id, p.id);
      continue;
    }
    const byName = roster.findIndex((r) => norm(r.name) === norm(p.name));
    if (byName >= 0) {
      const current = roster[byName] as Player;
      idMap.set(p.id, current.id);
      if (p.photo) roster[byName] = { ...current, photo: p.photo, emoji: null };
      continue;
    }
    roster.push(p);
    idMap.set(p.id, p.id);
  }

  const remap = (seats: Seats): Seats => seats.map((id) => idMap.get(id) ?? id) as unknown as Seats;

  const known = new Set(local.stats.map((r) => r.id));
  const added = data.stats
    .filter((r) => !known.has(r.id))
    .map((r) => ({ ...r, seats: remap(r.seats) }));

  const take = mode === 'take' && data.match !== null;
  return {
    roster,
    stats: [...local.stats, ...added],
    match: take && data.match ? { ...data.match, seats: remap(data.match.seats) } : local.match,
    players: data.roster.length,
    addedMatches: added.length,
    tookMatch: take,
  };
}
