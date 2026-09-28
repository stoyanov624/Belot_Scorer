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

/**
 * DATA_MODEL §4 import, with the 2026-09-27 decisions and the 2026-09-28 photo contract
 * (ADR 0013).
 *
 * Photo contract: any non-null `photo` id on an incoming player is ALREADY valid on this
 * device — Task 3's store layer resolves embedded photos (from a `.belot` file) to new local
 * ids and strips any id that can't be resolved, before calling `applyImport`. Core therefore
 * trusts a non-null incoming photo: it wins over the local photo and the emoji is dropped. A
 * null incoming photo keeps the local photo (6a behaviour) — link and QR payloads always carry
 * `photo: null`, so those imports never touch a local photo.
 */
export function applyImport(
  local: { roster: readonly Player[]; stats: readonly MatchRecord[]; match: Match | null },
  data: SharePayload,
  mode: ImportMode,
): ImportResult {
  if (mode === 'replace') {
    const localById = new Map(local.roster.map((p) => [p.id, p]));
    // A non-null imported photo wins; otherwise a player kept by id keeps its local photo. The
    // emoji is dropped whenever a photo is actually kept.
    const roster = data.roster.map((p) => {
      const photo = p.photo ?? localById.get(p.id)?.photo ?? null;
      return { ...p, photo, emoji: photo ? null : p.emoji };
    });
    return {
      roster,
      stats: [...data.stats],
      match: data.match,
      players: data.roster.length,
      addedMatches: data.stats.length,
      tookMatch: data.match !== null,
    };
  }

  const roster = [...local.roster];
  const idMap = new Map<string, string>();
  const importedIds = new Set(data.roster.map((p) => p.id));

  // Pass 1: every by-id update, before any by-name linking. Otherwise an imported player earlier
  // in the payload could link by name to a local player that a later by-id entry renames,
  // seating one local player twice and losing the other import (F1).
  for (const p of data.roster) {
    const byId = roster.findIndex((r) => r.id === p.id);
    if (byId < 0) continue;
    const current = roster[byId] as Player;
    const clash = roster.some((r) => r.id !== p.id && norm(r.name) === norm(p.name));
    // A non-null imported photo wins over the local one; a null one keeps it. The emoji is
    // dropped only when a photo is actually kept.
    const photo = p.photo ?? current.photo;
    roster[byId] = {
      ...p,
      name: clash ? current.name : p.name,
      photo,
      emoji: photo ? null : p.emoji,
    };
    idMap.set(p.id, p.id);
  }

  // Pass 2: by-name linking (the local player stays unchanged; only its id is remapped) and
  // appending. A local player already claimed by a by-id update above is not a name-link target,
  // even under a different imported id.
  for (const p of data.roster) {
    if (idMap.has(p.id)) continue;
    const byName = roster.findIndex((r) => norm(r.name) === norm(p.name) && !importedIds.has(r.id));
    if (byName >= 0) {
      const current = roster[byName] as Player;
      // A non-null imported photo is taken (dropping the emoji); a null one leaves the local
      // player untouched.
      if (p.photo) roster[byName] = { ...current, photo: p.photo, emoji: null };
      idMap.set(p.id, current.id);
      continue;
    }
    // A brand-new player keeps its non-null photo, dropping the emoji; a null photo keeps the
    // imported emoji.
    roster.push({ ...p, emoji: p.photo ? null : p.emoji });
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
