import type { ContractKey, DeclInput, Seat, Team, Verdict } from './model';
import { type Resolution, resolve } from './resolve';
import {
  CONTRACT_KIND,
  DECL_DISPLAY_FACTOR,
  DEFAULT_RULES,
  EXACT_CARD_POINTS,
  otherTeam,
  type RulesConfig,
  roundCardPoints,
  teamOf,
} from './rules';

export type ScoreError = 'points-missing' | 'points-range';

export interface DealInput {
  contract: ContractKey;
  caller: Seat;
  decls: readonly DeclInput[];
  /**
   * Exact card points of team A, last ten included (0–162, 0–258 or 0–130); team B has the rest.
   * Ignored when `capo` is set (ADR 0020).
   */
  cardPointsA: number | null;
  capo: Team | null;
  /** Hanging points carried into this deal. */
  hang: number;
}

export interface DealScore {
  error: ScoreError | null;
  /** Rounded card points of the whole deal (16, 26, 13). */
  max: number;
  /** Exact card points of the whole deal (162, 258, 130). */
  total: number;
  multiplier: number;
  /** Exact card points per team (a capot adds its bonus, ×10). */
  exactCards: Record<Team, number>;
  /** Rounded card points per team: the calling team's rounded, the other team the rest. */
  cards: Record<Team, number>;
  decl: Record<Team, number>;
  raw: Record<Team, number>;
  match: Record<Team, number>;
  verdict: Verdict;
  hangPoints: number;
  hangTo: Team | null;
  nextHang: number;
  resolution: Resolution;
}

export const maxCardPoints = (contract: ContractKey, rules: RulesConfig) =>
  rules.maxCardPoints[CONTRACT_KIND[contract]];

export const exactCardPoints = (contract: ContractKey) =>
  EXACT_CARD_POINTS[CONTRACT_KIND[contract]];

/**
 * Scores one deal (GAME_RULES §5, ADR 0020). The verdict compares the two teams' exact totals
 * (exact card points + declarations in real points): the calling team has less → inside, exactly
 * as much → hanging, more → made. The match is then written in rounded points, as before.
 */
export function scoreDeal(input: DealInput, rules: RulesConfig = DEFAULT_RULES): DealScore {
  const kind = CONTRACT_KIND[input.contract];
  const max = rules.maxCardPoints[kind];
  const total = EXACT_CARD_POINTS[kind];
  const multiplier = kind === 'nt' ? rules.ntMultiplier : 1;
  const resolution = resolve(input.decls, rules);
  const T = teamOf(input.caller);
  const O = otherTeam(T);

  let error: ScoreError | null = null;
  let exactCards: Record<Team, number>;
  let cards: Record<Team, number>;
  const a = input.cardPointsA;
  if (input.capo) {
    const team = input.capo;
    const full = {
      exact: total + rules.capoBonus * DECL_DISPLAY_FACTOR,
      rounded: max + rules.capoBonus,
    };
    exactCards = { A: team === 'A' ? full.exact : 0, B: team === 'B' ? full.exact : 0 };
    cards = { A: team === 'A' ? full.rounded : 0, B: team === 'B' ? full.rounded : 0 };
  } else if (a === null || !Number.isInteger(a)) {
    error = 'points-missing';
    exactCards = { A: 0, B: 0 };
    cards = { A: 0, B: 0 };
  } else {
    if (a < 0 || a > total) error = 'points-range';
    exactCards = { A: a, B: total - a };
    const roundedT = roundCardPoints(exactCards[T], kind);
    cards = { [T]: roundedT, [O]: max - roundedT } as Record<Team, number>;
  }

  const decl = resolution.points;
  const raw = { A: (cards.A + decl.A) * multiplier, B: (cards.B + decl.B) * multiplier };
  const exactTotal = (team: Team) => exactCards[team] + decl[team] * DECL_DISPLAY_FACTOR;

  const match: Record<Team, number> = { A: 0, B: 0 };
  let verdict: Verdict = 'ok';
  let hangPoints = 0;
  if (exactTotal(T) < exactTotal(O)) {
    verdict = 'inside';
    match[O] = raw.A + raw.B;
  } else if (exactTotal(T) === exactTotal(O)) {
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
    total,
    multiplier,
    exactCards,
    cards,
    decl,
    raw,
    match,
    verdict,
    hangPoints,
    hangTo,
    nextHang,
    resolution,
  };
}
