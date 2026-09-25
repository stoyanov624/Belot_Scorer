import type { Player, Seat, Seats } from './model';

export type NameError = 'empty' | 'duplicate';

const norm = (s: string) => s.trim().toLocaleLowerCase('bg');

export function validatePlayerName(
  name: string,
  roster: readonly Player[],
  exceptId: string | null,
): NameError | null {
  const n = norm(name);
  if (!n) return 'empty';
  return roster.some((p) => p.id !== exceptId && norm(p.name) === n) ? 'duplicate' : null;
}

export function upsertPlayer(roster: readonly Player[], player: Player): Player[] {
  return roster.some((p) => p.id === player.id)
    ? roster.map((p) => (p.id === player.id ? player : p))
    : [...roster, player];
}

export function removePlayer(roster: readonly Player[], id: string): Player[] {
  return roster.filter((p) => p.id !== id);
}

export type SeatDraft = [string | null, string | null, string | null, string | null];

export const EMPTY_DRAFT: SeatDraft = [null, null, null, null];

export function assignSeat(draft: SeatDraft, seat: Seat, playerId: string): SeatDraft {
  const next: SeatDraft = [...draft];
  const from = draft.indexOf(playerId);
  if (from >= 0) next[from] = draft[seat] ?? null;
  next[seat] = playerId;
  return next;
}

export function vacatePlayer(draft: SeatDraft, playerId: string): SeatDraft {
  return draft.map((id) => (id === playerId ? null : id)) as SeatDraft;
}

export function isDraftComplete(draft: SeatDraft): draft is Seats {
  return draft.every((id) => id !== null);
}

/** Setup's starting seats: the last match's players, minus anyone no longer in the roster. */
export function draftFromSeats(seats: Seats | null, known: (id: string) => boolean): SeatDraft {
  if (!seats) return EMPTY_DRAFT;
  const keep = (id: string) => (known(id) ? id : null);
  return [keep(seats[0]), keep(seats[1]), keep(seats[2]), keep(seats[3])];
}
