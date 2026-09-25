import { describe, expect, it } from 'vitest';
import { MatchSchema, PlayerSchema } from './model';

describe('model schemas', () => {
  it('accepts a valid player and trims the name', () => {
    expect(PlayerSchema.parse({ id: 'abc', name: '  Иван ', emoji: '🍺', photo: null }).name).toBe(
      'Иван',
    );
  });
  it('rejects an empty player name', () => {
    expect(
      PlayerSchema.safeParse({ id: 'abc', name: '   ', emoji: null, photo: null }).success,
    ).toBe(false);
  });
  it('rejects a seat outside 0–3 and a bestOf outside 1/3/5/7', () => {
    const base = {
      seats: ['a', 'b', 'c', 'd'],
      teamA: 'Ние',
      teamB: 'Вие',
      games: [],
      current: [],
      contract: null,
      caller: null,
      hang: 0,
      bestOf: 3,
      series: { A: 0, B: 0 },
      status: 'playing',
    };
    expect(MatchSchema.safeParse(base).success).toBe(true);
    expect(MatchSchema.safeParse({ ...base, caller: 4 }).success).toBe(false);
    expect(MatchSchema.safeParse({ ...base, bestOf: 2 }).success).toBe(false);
  });
});
