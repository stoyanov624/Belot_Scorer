/**
 * Pure label and sentence builders for the table screen. Composes `STRINGS` with values
 * computed by the core (`resolve`, `scoreDeal`, `matchNumber`, rules) — it never scores or
 * resolves anything itself.
 */
import { matchNumber } from '../../core/match';
import type { Card, ContractKey, DeclKey, KareRank, Match, Seat, Team } from '../../core/model';
import type { Resolution } from '../../core/resolve';
import {
  CONTRACT_KIND,
  declPoints,
  isSequence,
  otherTeam,
  type RulesConfig,
  teamOf,
} from '../../core/rules';
import { type DealScore, maxCardPoints } from '../../core/score';
import { STRINGS } from '../../core/strings';

/** The name of a declaration, with its top card or four-of-a-kind rank when it has one. */
export function declLabel(d: { key: DeclKey; top: Card | null; rank: KareRank | null }): string {
  if (isSequence(d.key) && d.top) return `${STRINGS.decls[d.key]} ${STRINGS.deal.to} ${d.top}`;
  if (d.key === 'kare' && d.rank) return `${STRINGS.decls.kare} ${d.rank}`;
  return STRINGS.decls[d.key];
}

/** A resolution card's heading, e.g. "Терца · 2"; a four of a kind shows points only once ranked. */
export function resolutionCardLabel(
  d: { key: DeclKey; rank: KareRank | null },
  rules: RulesConfig,
): string {
  if (d.key === 'kare' && d.rank === null) return STRINGS.decls.kare;
  return `${STRINGS.decls[d.key]} · ${declPoints(d, rules)}`;
}

/** The points shown on a declaration's option button. Kare shows its lowest value with a "+". */
export function declOptionPoints(key: DeclKey, rules: RulesConfig): string {
  if (key !== 'kare') return String(declPoints({ key, rank: null }, rules));
  const values = Object.values(rules.karePoints);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? String(min) : `${min}+`;
}

/** The table header: the target score for a single match, or the series line mid-series. */
export function headerLine(m: Match): string {
  if (m.bestOf === 1) return STRINGS.table.headerSingle(m.rules.targetScore);
  const format = STRINGS.setup.seriesOptions.find((o) => o.value === m.bestOf)?.label ?? '';
  return STRINGS.table.headerSeries(matchNumber(m), m.series.A, m.series.B, format);
}

/** The contract pill's text once a contract and caller are chosen, else null. */
export function contractLine(
  m: Pick<Match, 'contract' | 'caller'>,
  playerName: (seat: Seat) => string,
): string | null {
  if (m.contract === null || m.caller === null) return null;
  return `${STRINGS.contracts[m.contract].label} · ${playerName(m.caller)}`;
}

/** The card-points hint for the deal-end sheet, with the contract's own max. */
export function pointsHint(contract: ContractKey, rules: RulesConfig): string {
  const max = maxCardPoints(contract, rules);
  return CONTRACT_KIND[contract] === 'nt' ? STRINGS.deal.hintNt(max) : STRINGS.deal.hintColor(max);
}

/** Verdict lines for a contested sequence and/or four-of-a-kind clash. Empty when uncontested. */
export function resolutionLines(res: Resolution, teamName: (t: Team) => string): string[] {
  const lines: string[] = [];
  if (res.contested.seq && res.seqWinner !== null) {
    lines.push(
      res.seqWinner === 'none' ? STRINGS.deal.seqTie : STRINGS.deal.seqWin(teamName(res.seqWinner)),
    );
  }
  if (res.contested.kare && res.kareWinner !== null) {
    lines.push(STRINGS.deal.kareWin(teamName(res.kareWinner)));
  }
  return lines;
}

/** The blocking-error sentences for a resolution, in the order the core reports them. */
export function resolutionErrors(res: Resolution): string[] {
  return res.errors.map((e) => STRINGS.deal.errors[e]);
}

/** The verdict sentence for a scored deal, with hanging carry-over and a capot wrap. */
export function dealVerdict(
  score: DealScore,
  caller: Seat,
  capo: Team | null,
  hang: number,
  teamName: (t: Team) => string,
  rules: RulesConfig,
): string {
  const callingTeam = teamOf(caller);
  const defendingTeam = otherTeam(callingTeam);
  let text: string;
  if (score.verdict === 'inside') {
    text = STRINGS.deal.inside(teamName(defendingTeam), score.raw.A + score.raw.B);
  } else if (score.verdict === 'hang') {
    text = STRINGS.deal.hang(teamName(callingTeam), score.hangPoints);
  } else {
    text = STRINGS.deal.made(teamName(callingTeam));
  }
  if (hang > 0 && score.verdict !== 'hang' && score.hangTo) {
    text += STRINGS.deal.hangTo(hang, teamName(score.hangTo));
  }
  if (capo) {
    text = STRINGS.deal.capoNote(teamName(capo), rules.capoBonus, text);
  }
  return text;
}

/** The calculation grid's rows: cards (with a capot label), declarations and the total. */
export function calcRows(
  score: DealScore,
  capo: Team | null,
): { label: string; a: number; b: number }[] {
  return [
    {
      label: capo ? STRINGS.deal.rows.cardsCapo : STRINGS.deal.rows.cards,
      a: score.cards.A,
      b: score.cards.B,
    },
    { label: STRINGS.deal.rows.decls, a: score.decl.A, b: score.decl.B },
    {
      label: score.multiplier === 2 ? STRINGS.deal.rows.totalNt : STRINGS.deal.rows.total,
      a: score.raw.A,
      b: score.raw.B,
    },
  ];
}

/** Looks up a team's display name on the match. */
export function teamNameOf(m: Pick<Match, 'teamA' | 'teamB'>): (t: Team) => string {
  return (t: Team) => (t === 'A' ? m.teamA : m.teamB);
}
