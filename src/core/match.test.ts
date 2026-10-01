import { describe, expect, it } from 'vitest';
import {
  addDeclaration,
  clearCurrentDeal,
  createMatch,
  currentDeclarationSum,
  dealer,
  endMatch,
  endsMatch,
  isSeriesOver,
  matchNumber,
  maxCardPointsFor,
  nextMatch,
  rematch,
  removeDeclaration,
  saveDeal,
  setContract,
  toMatchRecord,
  totals,
  undoLastDeal,
  updateDeclaration,
  validDeclarationTotals,
} from './match';
import type { Deal, Match, RecordedDeclaration } from './model';
import { MatchSchema } from './model';
import { DEFAULT_RULES, type RulesConfig } from './rules';

const fresh = (bestOf: 1 | 3 | 5 | 7 = 1, rules: RulesConfig = DEFAULT_RULES) =>
  createMatch({ seats: ['p0', 'p1', 'p2', 'p3'], teamA: 'Ние', teamB: 'Вие', bestOf, rules });

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

/** Saves a hearts deal called by North with `rounded` card points for team A (exact = ×10). */
const save = (m: Match, rounded: number, capo: 'A' | 'B' | null = null) => {
  const r = saveDeal(setContract(m, 'hearts', 0), { cardPointsA: rounded * 10, capo });
  if (!r.ok) throw new Error(r.error);
  return r;
};

describe('createMatch', () => {
  it('keeps the rules it was given', () => {
    const rules = { ...DEFAULT_RULES, targetScore: 201 };
    expect(fresh(1, rules).rules).toEqual(rules);
  });
});

describe('current deal', () => {
  it('adds, patches and removes declarations', () => {
    let m = setContract(fresh(), 'hearts', 0);
    m = addDeclaration(m, { id: 'x', seat: 0, key: 'terca' });
    m = updateDeclaration(m, 'x', { top: 'K' });
    expect(m.current).toEqual([{ id: 'x', seat: 0, key: 'terca', top: 'K', rank: null }]);
    expect(removeDeclaration(m, 'x').current).toEqual([]);
  });

  it('updateDeclaration: undefined top leaves it intact and stays schema-valid', () => {
    let m = setContract(fresh(), 'hearts', 0);
    m = addDeclaration(m, { id: 'x', seat: 0, key: 'terca' });
    m = updateDeclaration(m, 'x', { top: 'K' });
    const result = updateDeclaration(m, 'x', { top: undefined });
    expect(result.current[0]?.top).toBe('K');
    expect(MatchSchema.safeParse(result).success).toBe(true);
  });

  it('updateDeclaration: rejects a top that is not a valid top for the sequence', () => {
    let m = setContract(fresh(), 'hearts', 0);
    m = addDeclaration(m, { id: 'x', seat: 0, key: 'terca' });
    m = updateDeclaration(m, 'x', { top: '7' });
    expect(m.current[0]?.top).toBeNull();
  });

  it('updateDeclaration: ignores rank on a non-kare declaration', () => {
    let m = setContract(fresh(), 'hearts', 0);
    m = addDeclaration(m, { id: 'x', seat: 0, key: 'terca' });
    m = updateDeclaration(m, 'x', { rank: 'J' });
    expect(m.current[0]?.rank).toBeNull();
  });

  it('updateDeclaration: top null clears an existing top', () => {
    let m = setContract(fresh(), 'hearts', 0);
    m = addDeclaration(m, { id: 'x', seat: 0, key: 'terca' });
    m = updateDeclaration(m, 'x', { top: 'K' });
    m = updateDeclaration(m, 'x', { top: null });
    expect(m.current[0]?.top).toBeNull();
  });

  it('updateDeclaration: applies a valid top and a valid kare rank', () => {
    let m = setContract(fresh(), 'hearts', 0);
    m = addDeclaration(m, { id: 'x', seat: 0, key: 'terca' });
    m = addDeclaration(m, { id: 'k', seat: 0, key: 'kare' });
    m = updateDeclaration(m, 'x', { top: 'A' });
    m = updateDeclaration(m, 'k', { rank: 'J' });
    expect(m.current[0]?.top).toBe('A');
    expect(m.current[1]?.rank).toBe('J');
  });

  it('updateDeclaration: returns the same reference when nothing applies', () => {
    let m = setContract(fresh(), 'hearts', 0);
    m = addDeclaration(m, { id: 'x', seat: 0, key: 'terca' });
    expect(updateDeclaration(m, 'x', {})).toBe(m);
    expect(updateDeclaration(m, 'x', { top: '7' })).toBe(m);
    expect(updateDeclaration(m, 'missing', { top: 'A' })).toBe(m);
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

  it("sums current declarations with the match's own rules", () => {
    const rules = { ...DEFAULT_RULES, declPoints: { ...DEFAULT_RULES.declPoints, belot: 3 } };
    let m = setContract(fresh(1, rules), 'at', 0);
    m = addDeclaration(m, { id: 'a', seat: 0, key: 'belot' });
    expect(currentDeclarationSum(m)).toEqual({ A: 3, B: 0 });
  });

  it("maxCardPointsFor reads the match's own rules, null without a contract", () => {
    const rules = { ...DEFAULT_RULES, maxCardPoints: { color: 17, at: 27, nt: 14 } };
    const m = fresh(1, rules);
    expect(maxCardPointsFor(m)).toBeNull();
    expect(maxCardPointsFor(setContract(m, 'nt', 0))).toBe(14);
    expect(maxCardPointsFor(setContract(m, 'at', 0))).toBe(27);
    expect(maxCardPointsFor(setContract(m, 'hearts', 0))).toBe(17);
  });
});

describe('saveDeal', () => {
  it('needs a contract', () => {
    expect(saveDeal(fresh(), { cardPointsA: 100, capo: null })).toEqual({
      ok: false,
      error: 'no-contract',
    });
  });

  it('refuses to save with unresolved declarations', () => {
    let m = setContract(fresh(), 'hearts', 0);
    m = addDeclaration(m, { id: 'k', seat: 0, key: 'kare' });
    expect(saveDeal(m, { cardPointsA: 100, capo: null })).toEqual({
      ok: false,
      error: 'kare-rank-missing',
    });
  });

  it('records the deal and resets the current one', () => {
    let m = setContract(fresh(), 'hearts', 0);
    m = addDeclaration(m, { id: 'b', seat: 0, key: 'belot' });
    const r = saveDeal(m, { cardPointsA: 100, capo: null });
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
    for (let i = 0; i < 10; i++) {
      const r = save(m, 15);
      expect(r.ended).toBe(false);
      m = r.match;
    }
    const last = save(m, 15);
    expect(totals(last.match)).toEqual({ A: 165, B: 11 });
    expect(last.ended).toBe(true);
    expect(last.match.status).toBe('ended');
    expect(last.match.series).toEqual({ A: 1, B: 0 });
  });

  it('does not end on a tie', () => {
    const r = save(withGames(fresh(), [145, 149]), 10);
    expect(totals(r.match)).toEqual({ A: 155, B: 155 });
    expect(r.ended).toBe(false);
  });

  // ADR 0018: the match loser must have taken card points in the deal that would end it.
  it('does not end when the losing team took no card points (capot by the leaders)', () => {
    const r = save(withGames(fresh(), [145, 100]), 0, 'A');
    expect(totals(r.match)).toEqual({ A: 170, B: 100 });
    expect(r.ended).toBe(false);
  });

  it('does not end when a capot against the leaders makes them the losers', () => {
    const r = saveDeal(setContract(withGames(fresh(), [145, 135]), 'hearts', 1), {
      cardPointsA: null,
      capo: 'B',
    });
    if (!r.ok) throw new Error(r.error);
    expect(totals(r.match)).toEqual({ A: 145, B: 160 });
    expect(r.ended).toBe(false);
  });

  it('does not end on 0 typed card points for the losers, whatever their declarations', () => {
    let m = setContract(withGames(fresh(), [140, 100]), 'hearts', 0);
    m = addDeclaration(m, { id: 't', seat: 1, key: 'terca' });
    // 162: the losers took not a single card point (160 would leave them 2).
    const r = saveDeal(m, { cardPointsA: 162, capo: null });
    if (!r.ok) throw new Error(r.error);
    expect(totals(r.match)).toEqual({ A: 156, B: 102 });
    expect(r.ended).toBe(false);
  });

  it('ends when the losing team took some card points', () => {
    const r = save(withGames(fresh(), [140, 100]), 14);
    expect(totals(r.match)).toEqual({ A: 154, B: 102 });
    expect(r.ended).toBe(true);
  });

  it('ends when the winners took no card points but the losers did', () => {
    const r = saveDeal(setContract(withGames(fresh(), [170, 100]), 'hearts', 1), {
      cardPointsA: null,
      capo: 'B',
    });
    if (!r.ok) throw new Error(r.error);
    expect(totals(r.match)).toEqual({ A: 170, B: 125 });
    expect(r.ended).toBe(true);
  });

  it('respects the target score snapshotted onto the match', () => {
    const rules = { ...DEFAULT_RULES, targetScore: 101 };
    const r = saveDeal(setContract(withGames(fresh(1, rules), [95, 0]), 'hearts', 0), {
      cardPointsA: 100,
      capo: null,
    });
    expect(r.ok && r.ended).toBe(true);
  });

  it('scores with match.rules: a belot is worth the snapshotted declPoints.belot', () => {
    const rules = { ...DEFAULT_RULES, declPoints: { ...DEFAULT_RULES.declPoints, belot: 3 } };
    let m = setContract(fresh(1, rules), 'hearts', 0);
    m = addDeclaration(m, { id: 'b', seat: 0, key: 'belot' });
    const r = saveDeal(m, { cardPointsA: 100, capo: null });
    if (!r.ok) throw new Error(r.error);
    expect(r.match.games[0]?.decls).toEqual([
      { seat: 0, key: 'belot', top: null, rank: null, valid: true },
    ]);
    expect(r.match.games[0]?.a).toBe(13);
  });
});

describe('undoLastDeal', () => {
  it('removes the last deal and restores hanging points', () => {
    const hung = saveDeal(setContract(fresh(), 'clubs', 1), {
      cardPointsA: 81,
      capo: null,
    });
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

describe('ended match', () => {
  const ended = (): Match => endMatch(withGames(fresh(), [160, 0]));

  it('setContract is a no-op', () => {
    const m = ended();
    expect(setContract(m, 'hearts', 0)).toBe(m);
  });

  it('addDeclaration is a no-op', () => {
    const m = { ...ended(), contract: 'hearts', caller: 0 } as Match;
    expect(addDeclaration(m, { id: 'x', seat: 0, key: 'belot' })).toBe(m);
  });

  it('removeDeclaration is a no-op', () => {
    const m = ended();
    expect(removeDeclaration(m, 'x')).toBe(m);
  });

  it('updateDeclaration is a no-op', () => {
    const m = ended();
    expect(updateDeclaration(m, 'x', { top: '7' })).toBe(m);
  });

  it('clearCurrentDeal is a no-op', () => {
    const m = ended();
    expect(clearCurrentDeal(m)).toBe(m);
  });

  it('undoLastDeal is a no-op: same reference, series unchanged', () => {
    const m = ended();
    const result = undoLastDeal(m);
    expect(result).toBe(m);
    expect(result.series).toEqual(m.series);
  });

  it('saveDeal returns match-ended even with a contract on the match object', () => {
    const m: Match = { ...ended(), contract: 'hearts', caller: 0 };
    expect(saveDeal(m, { cardPointsA: 100, capo: null })).toEqual({
      ok: false,
      error: 'match-ended',
    });
  });

  it('saveDeal on an ended match refuses even with a contract already set', () => {
    let m = setContract(fresh(), 'hearts', 0);
    m = endMatch(m);
    expect(saveDeal(m, { cardPointsA: 100, capo: null })).toEqual({
      ok: false,
      error: 'match-ended',
    });
  });

  it('nextMatch and rematch stay callable on an ended match', () => {
    const m = ended();
    expect(nextMatch(m).status).toBe('playing');
    expect(rematch(m).status).toBe('playing');
  });

  it('nextMatch and rematch leave a match that is still playing unchanged', () => {
    const m = withGames(fresh(3), [160, 40]);
    expect(nextMatch(m)).toBe(m);
    expect(rematch(m)).toBe(m);
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

describe('validDeclarationTotals', () => {
  const decl = (
    seat: RecordedDeclaration['seat'],
    key: RecordedDeclaration['key'],
    valid: boolean,
  ): RecordedDeclaration => ({ seat, key, top: null, rank: null, valid });

  it('sums only the valid declarations, per team', () => {
    const games: Deal[] = [
      {
        ...fakeDeal(10, 5),
        decls: [decl(0, 'belot', true), decl(1, 'terca', false), decl(3, 'kvarta', true)],
      },
    ];
    expect(validDeclarationTotals(games, DEFAULT_RULES)).toEqual({ A: 2, B: 5 });
  });

  it("respects the match's own rules", () => {
    const rules = { ...DEFAULT_RULES, declPoints: { ...DEFAULT_RULES.declPoints, belot: 3 } };
    const games: Deal[] = [{ ...fakeDeal(10, 5), decls: [decl(0, 'belot', true)] }];
    expect(validDeclarationTotals(games, rules)).toEqual({ A: 3, B: 0 });
  });

  it('is zero for both teams with no games', () => {
    expect(validDeclarationTotals([], DEFAULT_RULES)).toEqual({ A: 0, B: 0 });
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

describe('endsMatch', () => {
  it('continues below the target or on equal totals', () => {
    expect(endsMatch({ A: 150, B: 10 }, { A: 10, B: 6 }, 151)).toBe('continues');
    expect(endsMatch({ A: 160, B: 160 }, { A: 10, B: 6 }, 151)).toBe('continues');
  });

  it('blocks when the losing team took no card points', () => {
    expect(endsMatch({ A: 160, B: 10 }, { A: 16, B: 0 }, 151)).toBe('blocked');
    expect(endsMatch({ A: 10, B: 160 }, { A: 0, B: 16 }, 151)).toBe('blocked');
  });

  it('ends otherwise, even when the winners took no card points', () => {
    expect(endsMatch({ A: 160, B: 10 }, { A: 0, B: 16 }, 151)).toBe('ends');
  });
});
