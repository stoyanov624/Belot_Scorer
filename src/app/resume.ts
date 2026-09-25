import type { Match } from '../core/model';

/** Where a stored match should resume: the table while it's playing, the end screen once it has ended. */
export function resumePath(match: Match | null): '/table' | '/end' | null {
  if (!match) return null;
  return match.status === 'ended' ? '/end' : '/table';
}
