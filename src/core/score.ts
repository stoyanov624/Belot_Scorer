import type { ContractKey, DeclInput, Seat, Team, Verdict } from './model';
import { type Resolution, resolve } from './resolve';
import { CONTRACT_KIND, DEFAULT_RULES, otherTeam, type RulesConfig, teamOf } from './rules';

export type ScoreError = 'points-missing' | 'points-range';

export interface DealInput {
  contract: ContractKey;
  caller: Seat;
  decls: readonly DeclInput[];
  /** Rounded card points of team A including last ten; ignored when `capo` is set. */
  cardPointsA: number | null;
  capo: Team | null;
  /** Hanging points carried into this deal. */
  hang: number;
  /**
   * When the two teams' raw totals tie, whether the deal hangs (the «Висяща» toggle). The
   * rounded points can't tell an exact tie from a near one, so the user says (ADR 0018); off,
   * a tie counts as made by the caller.
   */
  hangOnTie?: boolean;
}

export interface DealScore {
  error: ScoreError | null;
  max: number;
  multiplier: number;
  cards: Record<Team, number>;
  decl: Record<Team, number>;
  raw: Record<Team, number>;
  match: Record<Team, number>;
  verdict: Verdict;
  /** The raw totals tie: the deal hangs only if `hangOnTie` was set. */
  tie: boolean;
  hangPoints: number;
  hangTo: Team | null;
  nextHang: number;
  resolution: Resolution;
}

export const maxCardPoints = (contract: ContractKey, rules: RulesConfig) =>
  rules.maxCardPoints[CONTRACT_KIND[contract]];

export function scoreDeal(input: DealInput, rules: RulesConfig = DEFAULT_RULES): DealScore {
  const kind = CONTRACT_KIND[input.contract];
  const max = rules.maxCardPoints[kind];
  const multiplier = kind === 'nt' ? rules.ntMultiplier : 1;
  const resolution = resolve(input.decls, rules);

  let error: ScoreError | null = null;
  let cards: Record<Team, number>;
  const a = input.cardPointsA;
  if (input.capo) {
    const full = max + rules.capoBonus;
    cards = { A: input.capo === 'A' ? full : 0, B: input.capo === 'B' ? full : 0 };
  } else if (a === null || !Number.isInteger(a)) {
    error = 'points-missing';
    cards = { A: 0, B: 0 };
  } else {
    if (a < 0 || a > max) error = 'points-range';
    cards = { A: a, B: max - a };
  }

  const decl = resolution.points;
  const raw = { A: (cards.A + decl.A) * multiplier, B: (cards.B + decl.B) * multiplier };
  const T = teamOf(input.caller);
  const O = otherTeam(T);

  const match: Record<Team, number> = { A: 0, B: 0 };
  let verdict: Verdict = 'ok';
  let hangPoints = 0;
  if (raw[T] < raw[O]) {
    verdict = 'inside';
    match[O] = raw.A + raw.B;
  } else if (raw[T] === raw[O] && input.hangOnTie) {
    verdict = 'hang';
    match[O] = raw[O];
    hangPoints = raw[T];
  } else {
    match.A = raw.A;
    match.B = raw.B;
  }

  let hangTo: Team | null = null;
  if (input.hang > 0 && verdict !== 'hang') {
    hangTo = match.A > match.B ? 'A' : match.B > match.A ? 'B' : null;
    if (hangTo) match[hangTo] += input.hang;
  }
  const nextHang = verdict === 'hang' ? input.hang + hangPoints : hangTo ? 0 : input.hang;

  return {
    error,
    max,
    multiplier,
    cards,
    decl,
    raw,
    match,
    verdict,
    tie: raw.A === raw.B,
    hangPoints,
    hangTo,
    nextHang,
    resolution,
  };
}
