import { z } from 'zod';
import type { Card, ContractKey, DeclKey, KareRank, Seat, Team } from './model';

export type ContractKind = 'color' | 'nt' | 'at';

export interface RulesConfig {
  targetScore: number;
  declPoints: Record<Exclude<DeclKey, 'kare'>, number>;
  karePoints: Record<KareRank, number>;
  maxCardPoints: Record<ContractKind, number>;
  capoBonus: number;
  ntMultiplier: number;
}

const nonNegative = z.number().int().nonnegative();

export const RulesConfigSchema = z.object({
  targetScore: z.number().int().positive(),
  declPoints: z.object({
    belot: nonNegative,
    terca: nonNegative,
    kvarta: nonNegative,
    kvinta: nonNegative,
  }),
  karePoints: z.object({
    Q: nonNegative,
    K: nonNegative,
    '10': nonNegative,
    A: nonNegative,
    '9': nonNegative,
    J: nonNegative,
  }),
  maxCardPoints: z.object({ color: nonNegative, nt: nonNegative, at: nonNegative }),
  capoBonus: nonNegative,
  ntMultiplier: z.number().int().positive(),
}) satisfies z.ZodType<RulesConfig>;

export const DEFAULT_RULES: RulesConfig = {
  targetScore: 151,
  declPoints: { belot: 2, terca: 2, kvarta: 5, kvinta: 10 },
  karePoints: { Q: 10, K: 10, '10': 10, A: 10, '9': 15, J: 20 },
  maxCardPoints: { color: 16, at: 26, nt: 13 },
  capoBonus: 9,
  ntMultiplier: 2,
};

export const CONTRACT_KIND: Record<ContractKey, ContractKind> = {
  clubs: 'color',
  diamonds: 'color',
  hearts: 'color',
  spades: 'color',
  nt: 'nt',
  at: 'at',
};

/**
 * Exact card points in a deal, last ten included (ADR 0020): a suit game 152 + 10, «Всичко коз»
 * 248 + 10, «Без коз» 120 + 10. Players enter these; the score is written rounded.
 */
export const EXACT_CARD_POINTS: Record<ContractKind, number> = { color: 162, at: 258, nt: 130 };

/** The last digit from which exact card points round up: 76 → 8 in a suit game, 84 → 9 in ВК. */
export const ROUND_UP_FROM: Record<ContractKind, number> = { color: 6, at: 4, nt: 5 };

/** Exact card points rounded the table way for the game kind (ADR 0020). */
export function roundCardPoints(exact: number, kind: ContractKind): number {
  return Math.floor(exact / 10) + (exact % 10 >= ROUND_UP_FROM[kind] ? 1 : 0);
}

export const RED_CONTRACTS: ReadonlySet<ContractKey> = new Set(['diamonds', 'hearts']);

/** Explicit order — z.enum().options depends on JS object key order, not definition order. */
export const CARDS: readonly Card[] = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const KARE_RANKS: readonly KareRank[] = ['Q', 'K', '10', 'A', '9', 'J'];

export const SEQ_LENGTH = { terca: 3, kvarta: 4, kvinta: 5 } as const;
/** Cards of a player's eight consumed by each declaration. Belot reuses cards. */
export const CARDS_USED: Record<DeclKey, number> = {
  belot: 0,
  terca: 3,
  kvarta: 4,
  kvinta: 5,
  kare: 4,
};
export const MAX_BELOTS: Record<Exclude<ContractKind, 'nt'>, number> = { color: 1, at: 4 };
export const MAX_KARES = 6;

export const DEAL_ORDER = [0, 3, 2, 1] as const satisfies readonly Seat[];

export const teamOf = (seat: Seat): Team => (seat % 2 === 0 ? 'A' : 'B');
export const otherTeam = (team: Team): Team => (team === 'A' ? 'B' : 'A');

/** A team's two seats, in table order (North/South for A, East/West for B). */
export const seatsOf = (team: Team): [Seat, Seat] => (team === 'A' ? [0, 2] : [1, 3]);

export const isSequence = (key: DeclKey): key is keyof typeof SEQ_LENGTH => key in SEQ_LENGTH;
export const seqLength = (key: DeclKey): number => (isSequence(key) ? SEQ_LENGTH[key] : 0);

/** Top cards a sequence of this kind can end on: tierce from 9, quarte from 10, quinte from J. */
export const validTops = (key: DeclKey): Card[] =>
  isSequence(key) ? CARDS.slice(SEQ_LENGTH[key] - 1) : [];

/**
 * Declarations are scored in rounded points (a терца is 2) but shown in real points (20), as
 * players announce them (ADR 0019). Card points and match scores stay rounded on screen.
 */
export const DECL_DISPLAY_FACTOR = 10;

export function declPoints(
  decl: { key: DeclKey; rank: KareRank | null },
  rules: RulesConfig = DEFAULT_RULES,
): number {
  if (decl.key === 'kare') return decl.rank ? rules.karePoints[decl.rank] : rules.karePoints.Q;
  return rules.declPoints[decl.key];
}

/** A declaration's value as shown to players, in real points: a терца is 20, a квинта 100. */
export function declDisplayPoints(
  decl: { key: DeclKey; rank: KareRank | null },
  rules: RulesConfig = DEFAULT_RULES,
): number {
  return declPoints(decl, rules) * DECL_DISPLAY_FACTOR;
}
