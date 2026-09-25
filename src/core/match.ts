import { allowedDeclarations } from './declarations';
import type {
  BestOf,
  Card,
  ContractKey,
  Deal,
  DeclKey,
  KareRank,
  Match,
  MatchRecord,
  Seat,
  Seats,
  Team,
} from './model';
import type { ResolveError } from './resolve';
import { DEAL_ORDER, DEFAULT_RULES, declPoints, type RulesConfig, teamOf } from './rules';
import { type ScoreError, scoreDeal } from './score';

export interface NewMatch {
  seats: Seats;
  teamA: string;
  teamB: string;
  bestOf: BestOf;
}

const EMPTY_DEAL = { current: [], contract: null, caller: null };

export function createMatch(opts: NewMatch): Match {
  return {
    ...opts,
    ...EMPTY_DEAL,
    games: [],
    hang: 0,
    series: { A: 0, B: 0 },
    status: 'playing',
  } as Match;
}

export function setContract(m: Match, contract: ContractKey, caller: Seat): Match {
  return { ...m, contract, caller, current: contract === 'nt' ? [] : m.current };
}

export function addDeclaration(m: Match, decl: { id: string; seat: Seat; key: DeclKey }): Match {
  if (!allowedDeclarations(m, decl.seat).options.includes(decl.key)) return m;
  return { ...m, current: [...m.current, { ...decl, top: null, rank: null }] };
}

export function removeDeclaration(m: Match, id: string): Match {
  return { ...m, current: m.current.filter((d) => d.id !== id) };
}

export function updateDeclaration(
  m: Match,
  id: string,
  patch: { top?: Card | null; rank?: KareRank | null },
): Match {
  return { ...m, current: m.current.map((d) => (d.id === id ? { ...d, ...patch } : d)) };
}

export function clearCurrentDeal(m: Match): Match {
  return { ...m, ...EMPTY_DEAL } as Match;
}

export type SaveDealError = 'no-contract' | ResolveError | ScoreError;
export type SaveDealResult =
  | { ok: true; match: Match; ended: boolean }
  | { ok: false; error: SaveDealError };

export function saveDeal(
  m: Match,
  input: { cardPointsA: number | null; capo: Team | null },
  rules: RulesConfig = DEFAULT_RULES,
): SaveDealResult {
  if (m.contract === null || m.caller === null) return { ok: false, error: 'no-contract' };
  const score = scoreDeal(
    { contract: m.contract, caller: m.caller, decls: m.current, hang: m.hang, ...input },
    rules,
  );
  const resolveError = score.resolution.errors[0];
  if (resolveError) return { ok: false, error: resolveError };
  if (score.error) return { ok: false, error: score.error };

  const deal: Deal = {
    a: score.match.A,
    b: score.match.B,
    contract: m.contract,
    caller: m.caller,
    verdict: score.verdict,
    capo: input.capo,
    raw: [score.raw.A, score.raw.B],
    hangTo: score.hangTo,
    prevHang: m.hang,
    decls: m.current.map(({ id: _id, ...d }, i) => ({
      ...d,
      valid: score.resolution.valid[i] ?? false,
    })),
  };
  const next: Match = {
    ...m,
    ...EMPTY_DEAL,
    games: [...m.games, deal],
    hang: score.nextHang,
  } as Match;
  const t = totals(next);
  const ended = Math.max(t.A, t.B) >= rules.targetScore && t.A !== t.B && input.capo === null;
  return { ok: true, match: ended ? endMatch(next) : next, ended };
}

export function undoLastDeal(m: Match): Match {
  const last = m.games.at(-1);
  if (!last) return m;
  return { ...m, games: m.games.slice(0, -1), hang: last.prevHang };
}

export function totals(m: Pick<Match, 'games'>): Record<Team, number> {
  let A = 0;
  let B = 0;
  for (const g of m.games) {
    A += g.a;
    B += g.b;
  }
  return { A, B };
}

export function winner(m: Pick<Match, 'games'>): Team | null {
  const t = totals(m);
  return t.A > t.B ? 'A' : t.B > t.A ? 'B' : null;
}

export function dealer(m: Pick<Match, 'games'>): Seat {
  return DEAL_ORDER[m.games.length % DEAL_ORDER.length] ?? 0;
}

export function currentDeclarationSum(
  m: Pick<Match, 'current'>,
  rules: RulesConfig = DEFAULT_RULES,
): Record<Team, number> {
  const sum: Record<Team, number> = { A: 0, B: 0 };
  for (const d of m.current) sum[teamOf(d.seat)] += declPoints(d, rules);
  return sum;
}

export function endMatch(m: Match): Match {
  if (m.status === 'ended') return m;
  const w = winner(m);
  const series = w ? { ...m.series, [w]: m.series[w] + 1 } : m.series;
  return { ...m, series, status: 'ended' };
}

export const seriesNeed = (bestOf: BestOf) => Math.ceil(bestOf / 2);

export function isSeriesOver(m: Pick<Match, 'bestOf' | 'series'>): boolean {
  const need = seriesNeed(m.bestOf);
  return m.bestOf === 1 || m.series.A >= need || m.series.B >= need;
}

/** 1-based number of the match within its series (ties don't advance the count). */
export function matchNumber(m: Match): number {
  const decided = m.series.A + m.series.B;
  return m.status === 'ended' && winner(m) !== null ? decided : decided + 1;
}

export function nextMatch(m: Match): Match {
  return { ...m, ...EMPTY_DEAL, games: [], hang: 0, status: 'playing' } as Match;
}

export function rematch(m: Match): Match {
  return { ...nextMatch(m), series: { A: 0, B: 0 } };
}

export function toMatchRecord(
  m: Match,
  names: [string, string, string, string],
  meta: { id: string; date: number },
): MatchRecord {
  const t = totals(m);
  return {
    ...meta,
    seats: m.seats,
    names,
    teamA: m.teamA,
    teamB: m.teamB,
    totalA: t.A,
    totalB: t.B,
    games: m.games.map((g) => ({ decls: g.decls })),
  };
}
