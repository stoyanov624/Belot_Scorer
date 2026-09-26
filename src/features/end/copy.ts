/**
 * Pure copy builder for the match-end screen. Turns an ended `Match` into the text and numbers
 * the winner card, series card and declaration totals show. Never scores — it reads totals,
 * winner and series state the core already derived or recorded.
 */
import { isSeriesOver, totals, validDeclarationTotals, winner } from '../../core/match';
import type { Match, Seat, Team } from '../../core/model';
import { otherTeam } from '../../core/rules';
import { STRINGS } from '../../core/strings';

export interface EndSummary {
  line: string;
  winner: Team | null;
  title: string | null;
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

/** Seats of the winning team's two players, in table order. */
const winnerSeats = (t: Team): [Seat, Seat] => (t === 'A' ? [0, 2] : [1, 3]);

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
  const line = isSeries
    ? STRINGS.end.lineSeries(Math.max(played, 1), deals)
    : STRINGS.end.line(deals);

  const w = winner(match);
  let title: string | null = null;
  if (w !== null) {
    title =
      isSeries && over
        ? STRINGS.end.winsSeries(teamName(w))
        : isSeries
          ? STRINGS.end.winsMatch(teamName(w))
          : STRINGS.end.wins(teamName(w));
  }
  const winnerNames =
    w === null
      ? null
      : STRINGS.end.names(playerName(winnerSeats(w)[0]), playerName(winnerSeats(w)[1]));
  const pays = w === null ? null : STRINGS.end.pays(teamName(otherTeam(w)));

  const format = STRINGS.setup.seriesOptions.find((o) => o.value === match.bestOf)?.label ?? '';
  const seriesLabel = isSeries ? STRINGS.end.series(format) : null;

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
