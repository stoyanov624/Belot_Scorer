import { describe, expect, it } from 'vitest';
import { createMatch } from '../core/match';
import { DEFAULT_RULES } from '../core/rules';
import { startPath } from './share-link';

const fresh = () =>
  createMatch({
    seats: ['p0', 'p1', 'p2', 'p3'],
    teamA: 'Ние',
    teamB: 'Вие',
    bestOf: 1,
    rules: DEFAULT_RULES,
  });

describe('startPath', () => {
  it('opens import for a #belot= hash at /, even with a playing match', () => {
    expect(startPath({ pathname: '/', hash: '#belot=zAB' }, fresh())).toBe('/?import=zAB');
  });

  it('opens import for a #belot= hash at /table', () => {
    expect(startPath({ pathname: '/table', hash: '#belot=zAB' }, null)).toBe('/?import=zAB');
  });

  it('resumes to /table for a playing match with no hash, at /', () => {
    expect(startPath({ pathname: '/', hash: '' }, fresh())).toBe('/table');
  });

  it('returns null with no hash at /stats', () => {
    expect(startPath({ pathname: '/stats', hash: '' }, fresh())).toBeNull();
  });

  it('falls back to the resume rule for an empty #belot=', () => {
    expect(startPath({ pathname: '/', hash: '#belot=' }, fresh())).toBe('/table');
    expect(startPath({ pathname: '/stats', hash: '#belot=' }, null)).toBeNull();
  });
});
