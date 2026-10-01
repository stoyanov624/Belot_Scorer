/**
 * Pure copy builders for the history screen. Turns a stored `Match` into the text and numbers
 * the deal cards and in-progress card show. Never scores or resolves anything itself — it reads
 * the totals and validity the core already recorded on each `Deal`.
 */

import type { Card, Deal, DeclKey, KareRank, Match, Seat, Team } from '../../core/model';
import { declDisplayPoints, RED_CONTRACTS, teamOf } from '../../core/rules';
import { STRINGS } from '../../core/strings';
import { contractLine, declLabel } from '../table/copy';

export interface HistoryDeclRow {
  /** Stable within one deal's rows — an index, since recorded declarations carry no id. */
  id: number;
  seat: Seat;
  team: Team;
  label: string;
  points: number;
  valid: boolean;
}

export interface HistoryEntry {
  no: number;
  a: number;
  b: number;
  runA: number;
  runB: number;
  contract: { sym: string; rest: string };
  red: boolean;
  decls: HistoryDeclRow[];
  notes: string;
}

interface DeclLike {
  seat: Seat;
  key: DeclKey;
  top: Card | null;
  rank: KareRank | null;
  valid: boolean;
}

/** The declaration rows shown on a deal card or the in-progress card. */
function declRows(decls: readonly DeclLike[], rules: Match['rules']): HistoryDeclRow[] {
  return decls.map((d, i) => ({
    id: i,
    seat: d.seat,
    team: teamOf(d.seat),
    label: declLabel(d),
    points: declDisplayPoints(d, rules),
    valid: d.valid,
  }));
}

/** Notes for a deal, in the prototype's order: capot, inside, hanging, hang-to. */
function dealNotes(g: Deal, teamName: (t: Team) => string): string {
  const notes: string[] = [];
  if (g.capo) notes.push(STRINGS.history.capo(teamName(g.capo)));
  if (g.verdict === 'inside') notes.push(STRINGS.history.inside(teamName(teamOf(g.caller))));
  if (g.verdict === 'hang') notes.push(STRINGS.history.hang);
  if (g.hangTo) notes.push(STRINGS.history.hangTo(teamName(g.hangTo)));
  return notes.join(' · ');
}

/** The played deals, newest first, with running totals and the notes each one earned. */
export function historyEntries(
  match: Match,
  playerName: (seat: Seat) => string,
  teamName: (t: Team) => string,
): HistoryEntry[] {
  let runA = 0;
  let runB = 0;
  const entries = match.games.map((g, i): HistoryEntry => {
    runA += g.a;
    runB += g.b;
    // Deal.contract/.caller are always set on a recorded deal, unlike the in-progress
    // Match.contract/.caller that contractLine also serves.
    const rest = contractLine({ contract: g.contract, caller: g.caller }, playerName) ?? '';
    return {
      no: i + 1,
      a: g.a,
      b: g.b,
      runA,
      runB,
      contract: { sym: STRINGS.contracts[g.contract].sym, rest },
      red: RED_CONTRACTS.has(g.contract),
      decls: declRows(g.decls, match.rules),
      notes: dealNotes(g, teamName),
    };
  });
  return entries.reverse();
}

export interface CurrentEntry {
  no: number;
  decls: HistoryDeclRow[];
}

/** The in-progress deal's card: null once there are no declarations yet to show. */
export function currentEntry(
  match: Pick<Match, 'current' | 'games' | 'rules'>,
): CurrentEntry | null {
  if (match.current.length === 0) return null;
  return {
    no: match.games.length + 1,
    decls: declRows(
      match.current.map((d) => ({ ...d, valid: true })),
      match.rules,
    ),
  };
}
