import { describe, expect, it } from 'vitest';
import {
  addDeclaration,
  createMatch,
  endMatch,
  nextMatch,
  saveDeal,
  setContract,
  validDeclarationTotals,
} from '../../core/match';
import type { BestOf, Match, Seat, Team } from '../../core/model';
import { DEFAULT_RULES } from '../../core/rules';
import { endSummary } from './copy';

const NAMES = ['Иван', 'Петър', 'Мария', 'Георги'] as const;
const playerName = (seat: Seat) => NAMES[seat];
const teamName = (t: Team) => (t === 'A' ? 'Ние' : 'Вие');

const fresh = (bestOf: BestOf) =>
  createMatch({
    seats: ['p0', 'p1', 'p2', 'p3'],
    teamA: 'Ние',
    teamB: 'Вие',
    bestOf,
    rules: DEFAULT_RULES,
  });

const save = (m: Match, cardPointsA: number) => {
  // Rounded points in, exact out (ADR 0020).
  const r = saveDeal(m, { cardPointsA: cardPointsA * 10, capo: null });
  if (!r.ok) throw new Error(r.error);
  return r.match;
};

/** Two deals that leave team A ahead 22:12, with one valid declaration for team A. */
function playAWinningDeals(m: Match): Match {
  m = save(setContract(m, 'clubs', 0), 10); // a=10, b=6
  m = setContract(m, 'clubs', 0);
  m = addDeclaration(m, { id: `belot-${m.games.length}`, seat: 0, key: 'belot' });
  m = save(m, 10); // a=12, b=6
  return m;
}

describe('endSummary', () => {
  // The verb agrees with the team name: «Ние» speaks in first person, «Вие» in second,
  // and any custom name keeps the handoff's third person (product owner, 2026-09-28).
  it('conjugates for the winner «Вие» and custom team names', () => {
    let m = fresh(1);
    m = playAWinningDeals(m);
    m = endMatch(m);

    const flipped = (t: Team) => (t === 'A' ? 'Вие' : 'Ние');
    expect(endSummary(m, playerName, flipped).title).toBe('Вие печелите');
    expect(endSummary(m, playerName, flipped).pays).toBe('🍻 Ние черпим следващия рунд');

    const custom = (t: Team) => (t === 'A' ? 'Столетниците' : 'миЕ');
    expect(endSummary(m, playerName, custom).title).toBe('Столетниците печелят');
    // Case-insensitive: a lowercase «ние» still conjugates.
    const lower = (t: Team) => (t === 'A' ? ' ние ' : 'Вие');
    expect(endSummary(m, playerName, lower).title).toBe(' ние  печелим');
  });

  it('reports a single match won by team A', () => {
    let m = fresh(1);
    m = playAWinningDeals(m);
    m = endMatch(m);
    const s = endSummary(m, playerName, teamName);

    expect(s.line).toBe('Край на мача · 2 раздавания');
    expect(s.winner).toBe('A');
    expect(s.title).toBe('Ние печелим');
    expect(s.winnerNames).toBe('Иван и Мария');
    expect(s.pays).toBe('🍻 Вие черпите следващия рунд');
    expect(s.isSeries).toBe(false);
    expect(s.totals).toEqual({ A: 22, B: 12 });
    expect(s.decls).toEqual({ A: 2, B: 0 });
    expect(s.decls).toEqual(validDeclarationTotals(m.games, m.rules));
  });

  it('reports one match won within a series that is not yet decided', () => {
    let m = fresh(3);
    m = playAWinningDeals(m);
    m = endMatch(m);
    const s = endSummary(m, playerName, teamName);

    expect(s.line).toBe('Край на мач 1 · 2 раздавания');
    expect(s.title).toBe('Ние печелим мача');
    expect(s.isSeries).toBe(true);
    expect(s.seriesOver).toBe(false);
    expect(s.nextNo).toBe(2);
  });

  it('reports a series-deciding win', () => {
    let m1 = fresh(3);
    m1 = playAWinningDeals(m1);
    m1 = endMatch(m1); // series becomes A:1, B:0

    let m2 = nextMatch(m1);
    m2 = playAWinningDeals(m2);
    m2 = endMatch(m2); // series becomes A:2, B:0 — decided

    const s = endSummary(m2, playerName, teamName);
    expect(s.title).toBe('Ние печелим серията');
    expect(s.seriesOver).toBe(true);
    expect(s.series).toEqual({ A: 2, B: 0 });
    expect(s.line).toBe('Край на мач 2 · 2 раздавания');
    expect(s.seriesLabel).toBe('Серия · 2 от 3');
    expect(s.nextNo).toBe(3);
  });

  it('reports a tie with no winner, the tie title from core strings', () => {
    let m = fresh(1);
    m = save(setContract(m, 'clubs', 0), 16); // a=16, b=0
    m = save(setContract(m, 'clubs', 1), 0); // a=0, b=16
    m = endMatch(m);
    const s = endSummary(m, playerName, teamName);

    expect(s.winner).toBeNull();
    expect(s.title).toBe('Равенство');
    expect(s.winnerNames).toBeNull();
    expect(s.pays).toBeNull();
    expect(s.totals).toEqual({ A: 16, B: 16 });
  });

  it('keeps the previous match number after a tie mid-series (ties do not advance the count)', () => {
    let m1 = fresh(3);
    m1 = playAWinningDeals(m1);
    m1 = endMatch(m1); // series becomes A:1, B:0

    let m2 = nextMatch(m1);
    m2 = save(setContract(m2, 'clubs', 0), 16); // a=16, b=0
    m2 = save(setContract(m2, 'clubs', 1), 0); // a=0, b=16 — tie
    m2 = endMatch(m2); // tie: series stays A:1, B:0

    const s = endSummary(m2, playerName, teamName);
    expect(s.line).toBe('Край на мач 2 · 2 раздавания');
    expect(s.title).toBe('Равенство');
  });
});
