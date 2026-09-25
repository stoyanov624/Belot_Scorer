import { describe, expect, it } from 'vitest';
import { createMatch, endMatch } from '../core/match';
import { DEFAULT_RULES } from '../core/rules';
import { resumePath } from './resume';

const fresh = () =>
  createMatch({
    seats: ['p0', 'p1', 'p2', 'p3'],
    teamA: 'Ние',
    teamB: 'Вие',
    bestOf: 1,
    rules: DEFAULT_RULES,
  });

describe('resumePath', () => {
  it('returns null when there is no match', () => {
    expect(resumePath(null)).toBeNull();
  });

  it('returns /table for a playing match', () => {
    expect(resumePath(fresh())).toBe('/table');
  });

  it('returns /end for an ended match', () => {
    expect(resumePath(endMatch(fresh()))).toBe('/end');
  });
});
