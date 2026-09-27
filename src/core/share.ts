import { z } from 'zod';
import {
  type Match,
  type MatchRecord,
  MatchRecordSchema,
  MatchSchema,
  type Player,
  PlayerSchema,
} from './model';

/** Links and QR codes up to this length carry the whole link in one code (DATA_MODEL §4). */
export const QR_LINK_MAX = 1400;
/** Longer data is split into parts of this many code characters. */
export const QR_CHUNK = 1100;

export type ShareScope = 'all' | 'match';

/** The shared data, version 2 (ADR 0005). The importer rejects everything else. */
export const SharePayloadSchema = z
  .object({
    app: z.literal('belot'),
    v: z.literal(2),
    at: z.number(),
    roster: z.array(PlayerSchema),
    stats: z.array(MatchRecordSchema),
    match: MatchSchema.nullable(),
  })
  .refine((p) => !p.match || p.match.seats.every((id) => p.roster.some((r) => r.id === id)), {
    message: 'match seats must be in the roster',
  });
export type SharePayload = z.infer<typeof SharePayloadSchema>;

export function buildPayload(
  state: { roster: readonly Player[]; stats: readonly MatchRecord[]; match: Match | null },
  scope: ShareScope,
  at: number,
): SharePayload {
  const roster = state.roster.map((p) => ({ ...p, photo: null }));
  const match = scope === 'match' ? state.match : null;
  if (!match) return { app: 'belot', v: 2, at, roster, stats: [...state.stats], match: null };
  const seated = new Set<string>(match.seats);
  return {
    app: 'belot',
    v: 2,
    at,
    roster: roster.filter((p) => seated.has(p.id)),
    stats: [],
    match,
  };
}

const CODE = /^[zj][A-Za-z0-9_-]+$/;

/** The share code in pasted text: after `belot=` in a link, or the whole text as a bare code. */
export function extractCode(text: string): string | null {
  const inLink = text.match(/belot=([A-Za-z0-9_-]+)/);
  if (inLink?.[1]) return inLink[1];
  const bare = text.trim();
  return CODE.test(bare) ? bare : null;
}

export function shareLink(root: string, code: string): string {
  return `${root}#belot=${code}`;
}

/** What the QR codes show: the link itself, or numbered parts of the code (`sid`: 4 base36 chars). */
export function qrTexts(link: string, code: string, sid: string): string[] {
  if (link.length <= QR_LINK_MAX) return [link];
  const n = Math.ceil(code.length / QR_CHUNK);
  return Array.from(
    { length: n },
    (_, i) => `BELOT|${sid}|${i + 1}|${n}|${code.slice(i * QR_CHUNK, (i + 1) * QR_CHUNK)}`,
  );
}
