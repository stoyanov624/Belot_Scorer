import { describe, expect, it } from 'vitest';
import { leaderboard } from './leaderboard';
import type { MatchRecord, Player } from './model';

const rec: MatchRecord = {
  id: 'm1',
  date: 1,
  seats: ['p1', 'p2', 'p3', 'p4'],
  names: ['Иван', 'Петър', 'Мария', 'Жоро'],
  teamA: 'Ние',
  teamB: 'Вие',
  totalA: 160,
  totalB: 100,
  games: [
    {
      decls: [
        { seat: 0, key: 'belot', top: null, rank: null, valid: true },
        { seat: 1, key: 'terca', top: null, rank: null, valid: false },
        { seat: 2, key: 'kvarta', top: null, rank: null, valid: true },
      ],
    },
    { decls: [] },
  ],
};

const roster: Player[] = [{ id: 'p1', name: 'Ванката', emoji: null, photo: null }];

describe('leaderboard', () => {
  it('ranks players by valid declaration points', () => {
    const { players } = leaderboard([rec], roster);
    expect(players.map((r) => r.key)).toEqual(['p3', 'p1', 'p2', 'p4']);
    expect(players[1]).toMatchObject({
      names: ['Ванката'],
      pts: 2,
      count: 1,
      belots: 1,
      wins: 1,
      matches: 1,
      deals: 2,
    });
    expect(players[2]).toMatchObject({ names: ['Петър'], pts: 0, count: 0, wins: 0 });
  });

  it('ranks pairs regardless of seats or team name', () => {
    const swapped: MatchRecord = {
      ...rec,
      id: 'm2',
      seats: ['p3', 'p4', 'p1', 'p2'],
      names: ['Мария', 'Жоро', 'Иван', 'Петър'],
      teamA: 'Шефовете',
      totalA: 10,
      totalB: 151,
      games: [{ decls: [] }],
    };
    const { pairs } = leaderboard([rec, swapped], roster);
    expect(pairs[0]).toMatchObject({
      key: 'p1|p3',
      playerIds: ['p1', 'p3'],
      names: ['Ванката', 'Мария'],
      teamName: 'Шефовете',
      pts: 7,
      count: 2,
      belots: 1,
      matches: 2,
      wins: 1,
      deals: 3,
    });
    expect(pairs[1]).toMatchObject({ key: 'p2|p4', pts: 0, wins: 1, matches: 2 });
  });

  it('ignores invalid declarations', () => {
    const { players } = leaderboard([rec], []);
    expect(players.find((r) => r.key === 'p2')?.pts).toBe(0);
  });

  it('resolves latest names and teamName by match date, not array order', () => {
    const earlier: MatchRecord = {
      ...rec,
      id: 'm3',
      date: 1,
      seats: ['p1', 'p2', 'p3', 'p4'],
      names: ['Иван', 'Петър', 'Мария', 'Жоро'],
      teamA: 'Стари',
      games: [{ decls: [] }],
    };
    const later: MatchRecord = {
      ...rec,
      id: 'm4',
      date: 2,
      seats: ['p1', 'p2', 'p3', 'p4'],
      names: ['Иванчо', 'Петро', 'Маро', 'Жорчо'],
      teamA: 'Нови',
      games: [{ decls: [] }],
    };
    // Later record first in array, earlier record second
    const { pairs, players } = leaderboard([later, earlier], roster);
    const p1p3 = pairs.find((p) => p.key === 'p1|p3');
    // Should use teamName from later-dated record (date: 2), not from array order
    expect(p1p3?.teamName).toBe('Нови');
    // p3 is not in roster, so should resolve to later name
    const p3 = players.find((p) => p.key === 'p3');
    expect(p3?.names).toEqual(['Маро']);
  });

  it('resolves missing player names from record', () => {
    const { players } = leaderboard([rec], roster);
    // p3 (Мария) is not in roster, should use record name
    const p3 = players.find((p) => p.key === 'p3');
    expect(p3?.names).toEqual(['Мария']);
  });
});
