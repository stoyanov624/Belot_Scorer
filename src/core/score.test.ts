import { describe, expect, it } from 'vitest';
import { scoreDeal } from './score';
import { GOLDEN_DEALS } from './testing/golden-deals';

describe('scoreDeal: golden cases', () => {
  it.each(GOLDEN_DEALS)('$name', ({ input, expect: want }) => {
    const s = scoreDeal(input);
    expect(s.error).toBeNull();
    expect(s.match).toEqual(want.match);
    expect(s.verdict).toBe(want.verdict);
    expect(s.hangTo).toBe(want.hangTo);
    expect(s.nextHang).toBe(want.nextHang);
  });
});

describe('scoreDeal: card points', () => {
  const input = { contract: 'hearts', caller: 0, decls: [], capo: null, hang: 0 } as const;

  it('fills the other team as max − entered', () => {
    expect(scoreDeal({ ...input, cardPointsA: 3 }).cards).toEqual({ A: 3, B: 13 });
    expect(scoreDeal({ ...input, contract: 'at', cardPointsA: 3 }).cards).toEqual({ A: 3, B: 23 });
  });

  it('reports missing points', () => {
    expect(scoreDeal({ ...input, cardPointsA: null }).error).toBe('points-missing');
    expect(scoreDeal({ ...input, cardPointsA: Number.NaN }).error).toBe('points-missing');
  });

  it('reports points out of range', () => {
    expect(scoreDeal({ ...input, cardPointsA: 17 }).error).toBe('points-range');
    expect(scoreDeal({ ...input, cardPointsA: -1 }).error).toBe('points-range');
    expect(scoreDeal({ ...input, contract: 'nt', cardPointsA: 14 }).error).toBe('points-range');
  });

  it('ignores typed points when capot is on', () => {
    expect(scoreDeal({ ...input, cardPointsA: 99, capo: 'A' }).error).toBeNull();
  });

  it('shows the multiplier for no trumps', () => {
    expect(scoreDeal({ ...input, contract: 'nt', cardPointsA: 5 }).multiplier).toBe(2);
    expect(scoreDeal({ ...input, cardPointsA: 5 }).multiplier).toBe(1);
  });
});
