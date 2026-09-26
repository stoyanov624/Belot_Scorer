/**
 * Pure copy builder for the match-end screen. Turns an ended `Match` into the text and numbers
 * the winner card, series card and declaration totals show. Never scores — it reads totals,
 * winner and series state the core already derived or recorded.
 */
import {
  isSeriesOver,
  matchNumber,
  totals,
  validDeclarationTotals,
  winner,
} from '../../core/match';
import type { Match, Seat, Team } from '../../core/model';
import { otherTeam, seatsOf } from '../../core/rules';
import { STRINGS } from '../../core/strings';
import { seriesFormat } from '../table/copy';

export interface EndSummary {
  line: string;
  winner: Team | null;
  title: string;
  winnerNames: string | null;
  pays: string | null;
  isSeries: boolean;
  seriesOver: boolean;
  seriesLabel: string | null;
  series: { A: number; B: number };
  totals: { A: number; B: number };
  decls: { A: number; B: number };
  nextNo: number;
}

/** The match-end screen's text and numbers, following the prototype's `endLine`/`winTitle`. */
export function endSummary(
  match: Match,
  playerName: (seat: Seat) => string,
  teamName: (t: Team) => string,
): EndSummary {
  const isSeries = match.bestOf > 1;
  const over = isSeriesOver(match);
  const played = match.series.A + match.series.B;
  const deals = match.games.length;
  // Ties don't advance the series count, so the match's own 1-based number (which already
  // accounts for that) is the source of truth here, not `played`.
  const line = isSeries
    ? STRINGS.end.lineSeries(matchNumber(match), deals)
    : STRINGS.end.line(deals);

  const w = winner(match);
  const title =
    w === null
      ? STRINGS.end.tie
      : isSeries && over
        ? STRINGS.end.winsSeries(teamName(w))
        : isSeries
          ? STRINGS.end.winsMatch(teamName(w))
          : STRINGS.end.wins(teamName(w));
  const winnerNames =
    w === null ? null : STRINGS.end.names(playerName(seatsOf(w)[0]), playerName(seatsOf(w)[1]));
  const pays = w === null ? null : STRINGS.end.pays(teamName(otherTeam(w)));

  const seriesLabel = isSeries ? STRINGS.end.series(seriesFormat(match.bestOf)) : null;

  return {
    line,
    winner: w,
    title,
    winnerNames,
    pays,
    isSeries,
    seriesOver: over,
    seriesLabel,
    series: match.series,
    totals: totals(match),
    decls: validDeclarationTotals(match.games, match.rules),
    nextNo: played + 1,
  };
}
