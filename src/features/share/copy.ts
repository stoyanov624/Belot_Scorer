/**
 * Pure copy builder for the share and import sheets. Turns share/import domain values into the
 * Bulgarian sentences those sheets show. Never shares or imports anything itself.
 */
import type { ImportResult } from '../../core/import';
import { totals } from '../../core/match';
import type { SharePayload, ShareScope } from '../../core/share';
import { STRINGS } from '../../core/strings';

/** The share sheet's summary line, following the prototype's `sh.summary`. */
export function shareSummary(scope: ShareScope, players: number, matches: number): string {
  return scope === 'match'
    ? STRINGS.share.summaryMatch
    : STRINGS.share.summaryAll(players, matches);
}

/** The import sheet's "Намерено" lines, following the prototype's `lines`. */
export function importLines(data: SharePayload): string[] {
  const lines: string[] = [
    STRINGS.import.players(data.roster.length, data.roster.map((p) => p.name).join(', ')),
  ];
  if (data.stats.length > 0) lines.push(STRINGS.import.matches(data.stats.length));
  if (data.match) {
    const t = totals(data.match);
    lines.push(STRINGS.import.currentMatch(data.match.teamA, t.A, t.B, data.match.teamB));
  }
  return lines;
}

/** The import sheet's confirmation line, after `applyImport` ran. */
export function importDone(result: ImportResult): string {
  return STRINGS.import.done(result.players, result.addedMatches, result.tookMatch);
}
