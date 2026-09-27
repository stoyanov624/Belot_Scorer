import type { Match } from '../core/model';
import { extractCode } from '../core/share';
import { resumePath } from './resume';

/** Where the app goes on start: a `#belot=` link opens import (DATA_MODEL §4), else resume (ADR 0011). */
export function startPath(
  location: { pathname: string; hash: string },
  match: Match | null,
): string | null {
  const code = location.hash.includes('belot=') ? extractCode(location.hash) : null;
  if (code) return `/?import=${encodeURIComponent(code)}`;
  return location.pathname === '/' ? resumePath(match) : null;
}
