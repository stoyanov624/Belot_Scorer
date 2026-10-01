import { describe, expect, it } from 'vitest';
import { leaderboard } from '../../core/leaderboard';
import {
  addDeclaration,
  createMatch,
  saveDeal,
  setContract,
  toMatchRecord,
} from '../../core/match';
import type { Match } from '../../core/model';
import { DEFAULT_RULES } from '../../core/rules';
import { statsName, statsSub } from './copy';

const NAMES = ['Иван', 'Петър', 'Мария', 'Гошо'] as const;

/** A single hearts deal with a belot for seat 0 (team A, pair Иван/Мария), a=10, b=6. */
function buildMatch(): Match {
  let m = createMatch({
    seats: ['p0', 'p1', 'p2', 'p3'],
    teamA: 'Шефовете',
    teamB: 'Вие',
    bestOf: 1,
    rules: DEFAULT_RULES,
  });
  m = setContract(m, 'hearts', 0);
  m = addDeclaration(m, { id: 'd1', seat: 0, key: 'belot' });
  const r = saveDeal(m, { cardPointsA: 100, capo: null });
  if (!r.ok) throw new Error(r.error);
  return r.match;
}

describe('statsSub', () => {
  const match = buildMatch();
  const record = toMatchRecord(match, [...NAMES], { id: 'm1', date: 1 });
  const { players, pairs } = leaderboard([record], []);

  it('formats the players line with no team-name prefix', () => {
    const row = players.find((p) => p.key === 'p0');
    if (!row) throw new Error('missing row');

    expect(statsSub(row, 'players')).toBe('1 мач · 1 победа · 1 обяви · 1 белота');
  });

  it('formats the pairs line prefixed with the team name', () => {
    const row = pairs.find((p) => p.key === 'p0|p2');
    if (!row) throw new Error('missing row');

    expect(row.teamName).toBe('Шефовете');
    expect(statsSub(row, 'pairs')).toBe('Шефовете · 1 мач · 1 победа · 1 обяви · 1 белота');
  });

  it('omits the prefix for a pair with no team name', () => {
    const row = pairs.find((p) => p.key === 'p0|p2');
    if (!row) throw new Error('missing row');

    expect(statsSub({ ...row, teamName: null }, 'pairs')).toBe(
      '1 мач · 1 победа · 1 обяви · 1 белота',
    );
  });
});

describe('statsName', () => {
  const match = buildMatch();
  const record = toMatchRecord(match, [...NAMES], { id: 'm1', date: 1 });
  const { players, pairs } = leaderboard([record], []);
  const row = players.find((p) => p.key === 'p0');
  if (!row) throw new Error('missing row');

  it("shows a player's own name for a players row", () => {
    expect(statsName(row, 'players')).toBe('Иван');
  });

  it('joins both names with "и" for a pairs row', () => {
    const pair = pairs.find((p) => p.key === 'p0|p2');
    if (!pair) throw new Error('missing row');

    expect(statsName(pair, 'pairs')).toBe('Иван и Мария');
  });

  it('falls back to "?" for a missing name', () => {
    expect(statsName({ ...row, names: [] }, 'players')).toBe('?');
    expect(statsName({ ...row, names: [] }, 'pairs')).toBe('? и ?');
  });
});
