import { describe, expect, it } from 'vitest';
import type { ImportResult } from '../../core/import';
import { createMatch, saveDeal, setContract } from '../../core/match';
import type { MatchRecord, Player } from '../../core/model';
import { DEFAULT_RULES } from '../../core/rules';
import { buildPayload } from '../../core/share';
import { importDone, importLines, shareSummary } from './copy';

const player = (id: string, name: string): Player => ({ id, name, emoji: null, photo: null });

const ROSTER: Player[] = [
  player('p0', 'Иван'),
  player('p1', 'Петър'),
  player('p2', 'Мария'),
  player('p3', 'Георги'),
];

const save = (m: ReturnType<typeof createMatch>, cardPointsA: number) => {
  // Rounded points in, exact out (ADR 0020).
  const r = saveDeal(m, { cardPointsA: cardPointsA * 10, capo: null });
  if (!r.ok) throw new Error(r.error);
  return r.match;
};

const freshMatch = () =>
  save(
    setContract(
      createMatch({
        seats: ['p0', 'p1', 'p2', 'p3'],
        teamA: 'Ние',
        teamB: 'Вие',
        bestOf: 1,
        rules: DEFAULT_RULES,
      }),
      'clubs',
      0,
    ),
    10,
  ); // A=10, B=6

describe('shareSummary', () => {
  it('returns the fixed sentence for scope "match"', () => {
    expect(shareSummary('match', 4, 0)).toBe('Другият телефон продължава мача от същото място.');
  });

  it('returns the players/matches sentence for scope "all"', () => {
    expect(shareSummary('all', 5, 2)).toBe('5 играчи и 2 мача от класацията.');
  });
});

describe('importLines', () => {
  it('joins player names with ", "', () => {
    const data = buildPayload({ roster: ROSTER, stats: [], match: null }, 'all', 0);
    expect(importLines(data)).toEqual(['4 играчи: Иван, Петър, Мария, Георги']);
  });

  it('shows the matches line only when there are stats', () => {
    const record: MatchRecord = {
      id: 'm1',
      date: 0,
      seats: ['p0', 'p1', 'p2', 'p3'],
      names: ['Иван', 'Петър', 'Мария', 'Георги'],
      teamA: 'Ние',
      teamB: 'Вие',
      totalA: 22,
      totalB: 12,
      games: [],
    };
    const data = buildPayload({ roster: ROSTER, stats: [record], match: null }, 'all', 0);
    expect(importLines(data)).toEqual([
      '4 играчи: Иван, Петър, Мария, Георги',
      '1 завършени мача за класацията',
    ]);
  });

  it('shows the current match line with totals from core totals(match)', () => {
    const match = freshMatch();
    const data = buildPayload({ roster: ROSTER, stats: [], match }, 'match', 0);
    expect(importLines(data)).toEqual([
      '4 играчи: Иван, Петър, Мария, Георги',
      'Текущ мач: Ние 10 : 6 Вие',
    ]);
  });
});

describe('importDone', () => {
  const result = (players: number, addedMatches: number, tookMatch: boolean): ImportResult => ({
    roster: [],
    stats: [],
    match: null,
    players,
    addedMatches,
    tookMatch,
  });

  it('reports players and a match taken, no matches count', () => {
    expect(importDone(result(4, 0, true))).toBe('Готово: 4 играчи, мачът продължава тук.');
  });

  it('reports players and matches added, no match taken', () => {
    expect(importDone(result(5, 2, false))).toBe('Готово: 5 играчи, 2 мача в класацията.');
  });
});
