import { z } from 'zod';

export const SeatSchema = z.literal([0, 1, 2, 3]);
export type Seat = z.infer<typeof SeatSchema>;

export const TeamSchema = z.enum(['A', 'B']);
export type Team = z.infer<typeof TeamSchema>;

export const ContractKeySchema = z.enum(['clubs', 'diamonds', 'hearts', 'spades', 'nt', 'at']);
export type ContractKey = z.infer<typeof ContractKeySchema>;

export const DeclKeySchema = z.enum(['belot', 'terca', 'kvarta', 'kvinta', 'kare']);
export type DeclKey = z.infer<typeof DeclKeySchema>;

/**
 * `.options` is NOT rank order — integer-like keys ('10') are hoisted by JS object key
 * order regardless of definition order. Use `CARDS` from rules.ts for card rank order.
 */
export const CardSchema = z.enum(['7', '8', '9', '10', 'J', 'Q', 'K', 'A']);
export type Card = z.infer<typeof CardSchema>;

/**
 * `.options` is NOT rank order — integer-like keys ('10') are hoisted by JS object key
 * order regardless of definition order. Use `KARE_RANKS` from rules.ts for four-of-a-kind order.
 */
export const KareRankSchema = z.enum(['Q', 'K', '10', 'A', '9', 'J']);
export type KareRank = z.infer<typeof KareRankSchema>;

const id = z.string().min(1);
const points = z.number().int();

export const PlayerSchema = z.object({
  id,
  name: z.string().trim().min(1),
  emoji: z.string().nullable(),
  /** Photo id in the photo store (ADR 0003), never a data URL. */
  photo: z.string().nullable(),
});
export type Player = z.infer<typeof PlayerSchema>;

export const DeclarationSchema = z.object({
  id,
  seat: SeatSchema,
  key: DeclKeySchema,
  top: CardSchema.nullable(),
  rank: KareRankSchema.nullable(),
});
export type Declaration = z.infer<typeof DeclarationSchema>;

export const RecordedDeclarationSchema = DeclarationSchema.omit({ id: true }).extend({
  valid: z.boolean(),
});
export type RecordedDeclaration = z.infer<typeof RecordedDeclarationSchema>;

/** What resolution and scoring need from a declaration, current or recorded. */
export type DeclInput = Pick<Declaration, 'seat' | 'key' | 'top' | 'rank'>;

export const VerdictSchema = z.enum(['ok', 'inside', 'hang']);
export type Verdict = z.infer<typeof VerdictSchema>;

export const DealSchema = z.object({
  a: points,
  b: points,
  contract: ContractKeySchema,
  caller: SeatSchema,
  verdict: VerdictSchema,
  capo: TeamSchema.nullable(),
  raw: z.tuple([points, points]),
  hangTo: TeamSchema.nullable(),
  prevHang: points,
  decls: z.array(RecordedDeclarationSchema),
});
export type Deal = z.infer<typeof DealSchema>;

export const BestOfSchema = z.literal([1, 3, 5, 7]);
export type BestOf = z.infer<typeof BestOfSchema>;

const SeatsSchema = z.tuple([id, id, id, id]);
export type Seats = z.infer<typeof SeatsSchema>;

export const MatchStatusSchema = z.enum(['playing', 'ended']);
export type MatchStatus = z.infer<typeof MatchStatusSchema>;

export const MatchSchema = z.object({
  seats: SeatsSchema,
  teamA: z.string(),
  teamB: z.string(),
  games: z.array(DealSchema),
  current: z.array(DeclarationSchema),
  contract: ContractKeySchema.nullable(),
  caller: SeatSchema.nullable(),
  hang: points,
  bestOf: BestOfSchema,
  /** Snapshotted from the rules when the match started; changing the device setting mid-match must not move it. */
  targetScore: z.number().int().positive(),
  series: z.object({ A: points, B: points }),
  status: MatchStatusSchema,
});
export type Match = z.infer<typeof MatchSchema>;

export const MatchRecordSchema = z.object({
  id,
  date: z.number(),
  seats: SeatsSchema,
  names: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  teamA: z.string(),
  teamB: z.string(),
  totalA: points,
  totalB: points,
  games: z.array(z.object({ decls: z.array(RecordedDeclarationSchema) })),
});
export type MatchRecord = z.infer<typeof MatchRecordSchema>;
