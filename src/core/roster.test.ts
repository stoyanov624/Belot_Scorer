import { describe, expect, it } from 'vitest';
import type { Player } from './model';
import {
  assignSeat,
  draftFromSeats,
  EMPTY_DRAFT,
  isDraftComplete,
  removePlayer,
  type SeatDraft,
  upsertPlayer,
  vacatePlayer,
  validatePlayerName,
} from './roster';

const p = (id: string, name: string): Player => ({ id, name, emoji: '🍺', photo: null });
const roster = [p('a', 'Иван'), p('b', 'Петър')];

describe('validatePlayerName', () => {
  it('rejects empty names', () => {
    expect(validatePlayerName('   ', roster, null)).toBe('empty');
  });
  it('rejects duplicates case-insensitively, ignoring surrounding spaces', () => {
    expect(validatePlayerName(' иВАН ', roster, null)).toBe('duplicate');
  });
  it('lets a player keep their own name when editing', () => {
    expect(validatePlayerName('Иван', roster, 'a')).toBeNull();
  });
  it('accepts a new name', () => {
    expect(validatePlayerName('Мария', roster, null)).toBeNull();
  });
});

describe('roster ops', () => {
  it('adds a new player and replaces an existing one by id', () => {
    expect(upsertPlayer(roster, p('c', 'Мария'))).toHaveLength(3);
    expect(upsertPlayer(roster, p('a', 'Ванката'))[0]?.name).toBe('Ванката');
  });
  it('removes a player', () => {
    expect(removePlayer(roster, 'a').map((x) => x.id)).toEqual(['b']);
  });
});

describe('seat draft', () => {
  it('seats a player', () => {
    expect(assignSeat(EMPTY_DRAFT, 2, 'a')).toEqual([null, null, 'a', null]);
  });
  it('swaps when the player already sits elsewhere', () => {
    const draft: SeatDraft = ['a', 'b', null, null];
    expect(assignSeat(draft, 1, 'a')).toEqual(['b', 'a', null, null]);
  });
  it('moves to an empty seat, leaving the old one empty', () => {
    expect(assignSeat(['a', null, null, null], 3, 'a')).toEqual([null, null, null, 'a']);
  });
  it('vacates a deleted player', () => {
    expect(vacatePlayer(['a', 'b', 'a', null], 'a')).toEqual([null, 'b', null, null]);
  });
  it('is complete only with four players', () => {
    expect(isDraftComplete(['a', 'b', 'c', null])).toBe(false);
    expect(isDraftComplete(['a', 'b', 'c', 'd'])).toBe(true);
  });
});

describe('draftFromSeats', () => {
  it('starts empty without seats', () => {
    expect(draftFromSeats(null, () => true)).toEqual([null, null, null, null]);
  });

  it('keeps known players and empties unknown ones', () => {
    const known = (id: string) => id !== 'gone';
    expect(draftFromSeats(['a', 'gone', 'c', 'd'], known)).toEqual(['a', null, 'c', 'd']);
  });
});
