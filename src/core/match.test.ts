import { describe, expect, it } from 'vitest';
import {
  addDeclaration,
  clearCurrentDeal,
  createMatch,
  currentDeclarationSum,
  dealer,
  endMatch,
  isSeriesOver,
  matchNumber,
  nextMatch,
  rematch,
  removeDeclaration,
  saveDeal,
  setContract,
  toMatchRecord,
  totals,
  undoLastDeal,
  updateDeclaration,
} from './match';
import type { Deal, Match } from './model';
import { DEFAULT_RULES } from './rules';

const fresh = (bestOf: 1 | 3 | 5 | 7 = 1) =>
  createMatch({ seats: ['p0', 'p1', 'p2', 'p3'], teamA: 'Ние', teamB: 'Вие', bestOf });

const fakeDeal = (a: number, b: number): Deal => ({
  a,
  b,
  contract: 'hearts',
  caller: 0,
  verdict: 'ok',
  capo: null,
  raw: [a, b],
  hangTo: null,
  prevHang: 0,
  decls: [],
});

const withGames = (m: Match, ...scores: [number, number][]): Match => ({
  ...m,
  games: scores.map(([a, b]) => fakeDeal(a, b)),
});

const save = (m: Match, cardPointsA: number, capo: 'A' | 'B' | null = null) => {
  const r = saveDeal(setContract(m, 'hearts', 0), { cardPointsA, capo });
  if (!r.ok) throw new Error(r.error);
  return r;
};

describe('current deal', () => {
  it('adds, patches and removes declarations', () => {
    let m = setContract(fresh(), 'hearts', 0);
    m = addDeclaration(m, { id: 'x', seat: 0, key: 'terca' });
    m = updateDeclaration(m, 'x', { top: 'K' });
    expect(m.current).toEqual([{ id: 'x', seat: 0, key: 'terca', top: 'K', rank: null }]);
    expect(removeDeclaration(m, 'x').current).toEqual([]);
  });

  it('ignores a declaration that is not allowed', () => {
    const m = fresh(); // no contract yet
    expect(addDeclaration(m, { id: 'x', seat: 0, key: 'belot' })).toBe(m);
  });

  it('clears declarations when switching to no trumps', () => {
    let m = setContract(fresh(), 'hearts', 0);
    m = addDeclaration(m, { id: 'x', seat: 0, key: 'belot' });
    expect(setContract(m, 'nt', 1).current).toEqual([]);
    expect(setContract(m, 'at', 1).current).toHaveLength(1);
  });

  it('clearCurrentDeal resets declarations, contract and caller', () => {
    let m = setContract(fresh(), 'hearts', 0);
    m = addDeclaration(m, { id: 'x', seat: 0, key: 'belot' });
    expect(clearCurrentDeal(m)).toMatchObject({ current: [], contract: null, caller: null });
  });

  it('sums current declarations naively for the coaster', () => {
    let m = setContract(fresh(), 'at', 0);
    m = addDeclaration(m, { id: 'a', seat: 0, key: 'belot' });
    m = addDeclaration(m, { id: 'b', seat: 1, key: 'kvarta' });
    expect(currentDeclarationSum(m)).toEqual({ A: 2, B: 5 });
  });
});

describe('saveDeal', () => {
  it('needs a contract', () => {
    expect(saveDeal(fresh(), { cardPointsA: 10, capo: null })).toEqual({
      ok: false,
      error: 'no-contract',
    });
  });

  it('refuses to save with unresolved declarations', () => {
    let m = setContract(fresh(), 'hearts', 0);
    m = addDeclaration(m, { id: 'k', seat: 0, key: 'kare' });
    expect(saveDeal(m, { cardPointsA: 10, capo: null })).toEqual({
      ok: false,
      error: 'kare-rank-missing',
    });
  });

  it('records the deal and resets the current one', () => {
    let m = setContract(fresh(), 'hearts', 0);
    m = addDeclaration(m, { id: 'b', seat: 0, key: 'belot' });
    const r = saveDeal(m, { cardPointsA: 10, capo: null });
    if (!r.ok) throw new Error(r.error);
    expect(r.ended).toBe(false);
    expect(r.match.games[0]).toMatchObject({
      a: 12,
      b: 6,
      contract: 'hearts',
      caller: 0,
      verdict: 'ok',
      prevHang: 0,
      decls: [{ seat: 0, key: 'belot', top: null, rank: null, valid: true }],
    });
    expect(r.match).toMatchObject({ current: [], contract: null, caller: null });
  });

  it('ends the match at 151 and credits the series', () => {
    let m = fresh(3);
    for (let i = 0; i < 9; i++) {
      const r = save(m, 16);
      expect(r.ended).toBe(false);
      m = r.match;
    }
    const last = save(m, 16);
    expect(totals(last.match)).toEqual({ A: 160, B: 0 });
    expect(last.ended).toBe(true);
    expect(last.match.status).toBe('ended');
    expect(last.match.series).toEqual({ A: 1, B: 0 });
  });

  it('does not end on a tie', () => {
    const r = save(withGames(fresh(), [145, 149]), 10);
    expect(totals(r.match)).toEqual({ A: 155, B: 155 });
    expect(r.ended).toBe(false);
  });

  it('does not end on a capot deal', () => {
    const r = save(withGames(fresh(), [150, 0]), 0, 'A');
    expect(totals(r.match).A).toBe(175);
    expect(r.ended).toBe(false);
  });

  it('respects a custom target score', () => {
    const rules = { ...DEFAULT_RULES, targetScore: 101 };
    const r = saveDeal(
      setContract(withGames(fresh(), [95, 0]), 'hearts', 0),
      { cardPointsA: 10, capo: null },
      rules,
    );
    expect(r.ok && r.ended).toBe(true);
  });
});

describe('undoLastDeal', () => {
  it('removes the last deal and restores hanging points', () => {
    const hung = saveDeal(setContract(fresh(), 'clubs', 1), { cardPointsA: 8, capo: null });
    if (!hung.ok) throw new Error(hung.error);
    expect(hung.match.hang).toBe(8);
    const undone = undoLastDeal(hung.match);
    expect(undone.games).toEqual([]);
    expect(undone.hang).toBe(0);
  });

  it('is a no-op without deals', () => {
    const m = fresh();
    expect(undoLastDeal(m)).toBe(m);
  });
});

describe('dealer', () => {
  it('rotates N → W → S → E', () => {
    const seq = [0, 1, 2, 3, 4].map((n) =>
      dealer({ games: Array.from({ length: n }, () => fakeDeal(0, 0)) }),
    );
    expect(seq).toEqual([0, 3, 2, 1, 0]);
  });
});

describe('series', () => {
  it('ends a best-of-3 at two wins and keeps the series between matches', () => {
    let m = endMatch(withGames(fresh(3), [160, 40]));
    expect(m.series).toEqual({ A: 1, B: 0 });
    expect(isSeriesOver(m)).toBe(false);
    expect(matchNumber(m)).toBe(1);
    m = nextMatch(m);
    expect(m).toMatchObject({
      games: [],
      current: [],
      hang: 0,
      status: 'playing',
      series: { A: 1, B: 0 },
    });
    expect(matchNumber(m)).toBe(2);
    m = endMatch(withGames(m, [155, 90]));
    expect(isSeriesOver(m)).toBe(true);
  });

  it('a single match is always a finished series once ended', () => {
    expect(isSeriesOver(endMatch(withGames(fresh(1), [10, 0])))).toBe(true);
  });

  it('endMatch is idempotent and a tie credits nobody', () => {
    const once = endMatch(withGames(fresh(3), [100, 100]));
    expect(once.series).toEqual({ A: 0, B: 0 });
    expect(endMatch(once)).toBe(once);
  });

  it('rematch resets the series', () => {
    expect(rematch(endMatch(withGames(fresh(3), [160, 0]))).series).toEqual({ A: 0, B: 0 });
  });
});

describe('toMatchRecord', () => {
  it('snapshots totals, names and recorded declarations', () => {
    const r = save(fresh(), 10);
    const rec = toMatchRecord(r.match, ['Иван', 'Петър', 'Мария', 'Жоро'], { id: 'm1', date: 1 });
    expect(rec).toEqual({
      id: 'm1',
      date: 1,
      seats: ['p0', 'p1', 'p2', 'p3'],
      names: ['Иван', 'Петър', 'Мария', 'Жоро'],
      teamA: 'Ние',
      teamB: 'Вие',
      totalA: 10,
      totalB: 6,
      games: [{ decls: [] }],
    });
  });
});
