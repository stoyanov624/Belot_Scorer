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

describe('scoreDeal: card points (ADR 0020)', () => {
  const input = { contract: 'hearts', caller: 0, decls: [], capo: null, hang: 0 } as const;

  it('rounds the calling team the table way and gives the other team the rest', () => {
    expect(scoreDeal({ ...input, cardPointsA: 76 }).cards).toEqual({ A: 8, B: 8 });
    expect(scoreDeal({ ...input, cardPointsA: 75 }).cards).toEqual({ A: 7, B: 9 });
    // 76 : 86 both end in 6; the calling team rounds (86 → 9), the other gets the rest.
    expect(scoreDeal({ ...input, caller: 1, cardPointsA: 76 }).cards).toEqual({ A: 7, B: 9 });
    expect(scoreDeal({ ...input, contract: 'at', cardPointsA: 124 }).cards).toEqual({
      A: 13,
      B: 13,
    });
    expect(scoreDeal({ ...input, contract: 'nt', cardPointsA: 65 }).cards).toEqual({ A: 7, B: 6 });
  });

  it('keeps the exact points of both teams', () => {
    const s = scoreDeal({ ...input, cardPointsA: 76 });
    expect(s.exactCards).toEqual({ A: 76, B: 86 });
    expect(s.total).toBe(162);
  });

  it('reports missing points', () => {
    expect(scoreDeal({ ...input, cardPointsA: null }).error).toBe('points-missing');
    expect(scoreDeal({ ...input, cardPointsA: Number.NaN }).error).toBe('points-missing');
  });

  it('reports points out of range', () => {
    expect(scoreDeal({ ...input, cardPointsA: 163 }).error).toBe('points-range');
    expect(scoreDeal({ ...input, cardPointsA: -1 }).error).toBe('points-range');
    expect(scoreDeal({ ...input, contract: 'nt', cardPointsA: 131 }).error).toBe('points-range');
    expect(scoreDeal({ ...input, contract: 'at', cardPointsA: 258 }).error).toBeNull();
  });

  it('ignores typed points when capot is on', () => {
    expect(scoreDeal({ ...input, cardPointsA: 99, capo: 'A' }).error).toBeNull();
  });

  it('shows the multiplier for no trumps', () => {
    expect(scoreDeal({ ...input, contract: 'nt', cardPointsA: 5 }).multiplier).toBe(2);
    expect(scoreDeal({ ...input, cardPointsA: 5 }).multiplier).toBe(1);
  });
});

describe('scoreDeal: the exact totals decide the verdict (ADR 0020)', () => {
  const deal = { contract: 'clubs', caller: 1, decls: [], capo: null, hang: 0 } as const;

  it('hangs only on an exact tie', () => {
    const s = scoreDeal({ ...deal, cardPointsA: 81 });
    expect(s.verdict).toBe('hang');
    expect(s.nextHang).toBe(8);
  });

  it('counts a rounded tie as made when the caller has more exact points', () => {
    expect(scoreDeal({ ...deal, cardPointsA: 80 }).verdict).toBe('ok');
  });

  it('sends a rounded tie inside when the caller has fewer exact points', () => {
    const s = scoreDeal({ ...deal, cardPointsA: 84 });
    expect(s.cards).toEqual({ A: 8, B: 8 });
    expect(s.verdict).toBe('inside');
    expect(s.match).toEqual({ A: 16, B: 0 });
  });

  it('counts declarations in real points in the comparison', () => {
    const terca = { seat: 1, key: 'terca', top: null, rank: null } as const;
    // B: 62 + 20 = 82 against A: 100 → inside; with 82 exact cards B has 102 → made.
    expect(scoreDeal({ ...deal, decls: [terca], cardPointsA: 100 }).verdict).toBe('inside');
    expect(scoreDeal({ ...deal, decls: [terca], cardPointsA: 80 }).verdict).toBe('ok');
  });
});
