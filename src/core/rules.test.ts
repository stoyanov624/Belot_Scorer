import { describe, expect, it } from 'vitest';
import { CardSchema, KareRankSchema } from './model';
import {
  CARDS,
  DEAL_ORDER,
  DEFAULT_RULES,
  declDisplayPoints,
  declPoints,
  KARE_RANKS,
  otherTeam,
  RulesConfigSchema,
  roundCardPoints,
  seatsOf,
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

describe('seatsOf', () => {
  it('gives each team its two seats in table order', () => {
    expect(seatsOf('A')).toEqual([0, 2]);
    expect(seatsOf('B')).toEqual([1, 3]);
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

describe('orders', () => {
  it('has correct CARDS order', () => {
    expect(CARDS).toEqual(['7', '8', '9', '10', 'J', 'Q', 'K', 'A']);
  });

  it('has correct KARE_RANKS order', () => {
    expect(KARE_RANKS).toEqual(['Q', 'K', '10', 'A', '9', 'J']);
  });

  it('CARDS contains exactly the schema members', () => {
    expect([...CARDS].sort()).toEqual([...CardSchema.options].sort());
  });

  it('KARE_RANKS contains exactly the schema members', () => {
    expect([...KARE_RANKS].sort()).toEqual([...KareRankSchema.options].sort());
  });
});

describe('RulesConfigSchema', () => {
  it('accepts the default rules unchanged', () => {
    expect(RulesConfigSchema.parse(DEFAULT_RULES)).toEqual(DEFAULT_RULES);
  });

  it('rejects negative declaration points', () => {
    const bad = { ...DEFAULT_RULES, declPoints: { ...DEFAULT_RULES.declPoints, belot: -1 } };
    expect(RulesConfigSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a zero target score', () => {
    expect(RulesConfigSchema.safeParse({ ...DEFAULT_RULES, targetScore: 0 }).success).toBe(false);
  });
});

describe('declDisplayPoints (ADR 0019)', () => {
  it('shows declarations in real points', () => {
    const p = (key: 'belot' | 'terca' | 'kvarta' | 'kvinta') =>
      declDisplayPoints({ key, rank: null });
    expect([p('belot'), p('terca'), p('kvarta'), p('kvinta')]).toEqual([20, 20, 50, 100]);
    expect(declDisplayPoints({ key: 'kare', rank: 'J' })).toBe(200);
    expect(declDisplayPoints({ key: 'kare', rank: '9' })).toBe(150);
    expect(declDisplayPoints({ key: 'kare', rank: 'A' })).toBe(100);
  });
});

describe('roundCardPoints (ADR 0020)', () => {
  it('rounds up from 6 in a suit game, 4 in all trumps, 5 in no trumps', () => {
    expect([75, 76].map((x) => roundCardPoints(x, 'color'))).toEqual([7, 8]);
    expect([83, 84].map((x) => roundCardPoints(x, 'at'))).toEqual([8, 9]);
    expect([64, 65].map((x) => roundCardPoints(x, 'nt'))).toEqual([6, 7]);
    expect(
      [162, 258, 130].map((x, i) =>
        roundCardPoints(x, (['color', 'at', 'nt'] as const)[i] ?? 'color'),
      ),
    ).toEqual([16, 26, 13]);
  });
});
