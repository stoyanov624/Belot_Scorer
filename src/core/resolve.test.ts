import { describe, expect, it } from 'vitest';
import type { Card, DeclInput, DeclKey, KareRank, Seat } from './model';
import { resolve } from './resolve';

const d = (seat: Seat, key: DeclKey, x: { top?: Card; rank?: KareRank } = {}): DeclInput => ({
  seat,
  key,
  top: x.top ?? null,
  rank: x.rank ?? null,
});

describe('resolve: sequences', () => {
  it('counts all sequences when only one team has any', () => {
    const r = resolve([d(0, 'terca'), d(2, 'kvarta')]);
    expect(r.seqWinner).toBe('A');
    expect(r.contested.seq).toBe(false);
    expect(r.valid).toEqual([true, true]);
    expect(r.points).toEqual({ A: 7, B: 0 });
  });

  it('gives all sequences to the team with the longest one', () => {
    const r = resolve([d(0, 'terca'), d(2, 'terca'), d(1, 'kvarta')]);
    expect(r.seqWinner).toBe('B');
    expect(r.valid).toEqual([false, false, true]);
    expect(r.points).toEqual({ A: 0, B: 5 });
  });

  it('requires top cards for tied-length sequences', () => {
    const r = resolve([d(0, 'terca'), d(1, 'terca'), d(3, 'kvinta'), d(2, 'kvinta')]);
    expect(r.errors).toEqual(['seq-top-missing']);
    expect(r.topRequired).toEqual([false, false, true, true]);
    expect(r.seqWinner).toBeNull();
  });

  it('decides a tie in length by the highest top card', () => {
    const r = resolve([d(0, 'terca', { top: 'A' }), d(3, 'terca', { top: 'K' })]);
    expect(r.errors).toEqual([]);
    expect(r.seqWinner).toBe('A');
    expect(r.valid).toEqual([true, false]);
  });

  it('cancels every sequence on a full tie', () => {
    const r = resolve([d(0, 'terca', { top: 'K' }), d(1, 'terca', { top: 'K' })]);
    expect(r.seqWinner).toBe('none');
    expect(r.valid).toEqual([false, false]);
    expect(r.points).toEqual({ A: 0, B: 0 });
  });
});

describe('resolve: fours of a kind', () => {
  it('requires a rank for every four of a kind', () => {
    expect(resolve([d(0, 'kare')]).errors).toEqual(['kare-rank-missing']);
  });

  it('rejects two fours of a kind of the same rank', () => {
    expect(resolve([d(0, 'kare', { rank: 'Q' }), d(2, 'kare', { rank: 'Q' })]).errors).toEqual([
      'kare-duplicate',
    ]);
  });

  it('gives all fours of a kind to the team with the strongest (Q<K<10<A<9<J)', () => {
    const r = resolve([
      d(0, 'kare', { rank: '9' }),
      d(2, 'kare', { rank: 'Q' }),
      d(1, 'kare', { rank: 'A' }),
    ]);
    expect(r.kareWinner).toBe('A');
    expect(r.valid).toEqual([true, true, false]);
    expect(r.points).toEqual({ A: 25, B: 0 });
  });
});

describe('resolve: belot', () => {
  it('always counts belot, even for a team that loses sequences', () => {
    const r = resolve([d(1, 'belot'), d(0, 'kvarta'), d(1, 'terca')]);
    expect(r.valid).toEqual([true, true, false]);
    expect(r.points).toEqual({ A: 5, B: 2 });
  });
});
