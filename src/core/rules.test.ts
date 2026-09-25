import { describe, expect, it } from 'vitest';
import {
  DEAL_ORDER,
  DEFAULT_RULES,
  declPoints,
  otherTeam,
  seqLength,
  teamOf,
  validTops,
} from './rules';

describe('DEAL_ORDER', () => {
  it('rotates counter-clockwise N → W → S → E', () => {
    expect(DEAL_ORDER).toEqual([0, 3, 2, 1]);
  });
});

describe('teams', () => {
  it('puts North/South in A and East/West in B', () => {
    expect([0, 1, 2, 3].map((s) => teamOf(s as 0 | 1 | 2 | 3))).toEqual(['A', 'B', 'A', 'B']);
    expect(otherTeam('A')).toBe('B');
    expect(otherTeam('B')).toBe('A');
  });
});

describe('declPoints', () => {
  it('scores fixed declarations', () => {
    const p = (key: 'belot' | 'terca' | 'kvarta' | 'kvinta') => declPoints({ key, rank: null });
    expect([p('belot'), p('terca'), p('kvarta'), p('kvinta')]).toEqual([2, 2, 5, 10]);
  });
  it('scores four-of-a-kind by rank, 10 while unknown', () => {
    expect(declPoints({ key: 'kare', rank: null })).toBe(10);
    expect(declPoints({ key: 'kare', rank: 'Q' })).toBe(10);
    expect(declPoints({ key: 'kare', rank: '9' })).toBe(15);
    expect(declPoints({ key: 'kare', rank: 'J' })).toBe(20);
  });
  it('reads points from the rules config', () => {
    const rules = { ...DEFAULT_RULES, declPoints: { ...DEFAULT_RULES.declPoints, belot: 3 } };
    expect(declPoints({ key: 'belot', rank: null }, rules)).toBe(3);
  });
});

describe('sequences', () => {
  it('knows lengths', () => {
    expect([
      seqLength('terca'),
      seqLength('kvarta'),
      seqLength('kvinta'),
      seqLength('kare'),
    ]).toEqual([3, 4, 5, 0]);
  });
  it('lists valid top cards', () => {
    expect(validTops('terca')).toEqual(['9', '10', 'J', 'Q', 'K', 'A']);
    expect(validTops('kvarta')).toEqual(['10', 'J', 'Q', 'K', 'A']);
    expect(validTops('kvinta')).toEqual(['J', 'Q', 'K', 'A']);
    expect(validTops('belot')).toEqual([]);
  });
});
