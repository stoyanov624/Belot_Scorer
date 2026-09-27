import { describe, expect, it } from 'vitest';
import { createMatch } from './match';
import type { MatchRecord, Player, Seats } from './model';
import { DEFAULT_RULES } from './rules';
import {
  buildPayload,
  extractCode,
  QR_CHUNK,
  qrTexts,
  SharePayloadSchema,
  shareLink,
} from './share';

const P = (id: string, name: string, photo: string | null = null): Player => ({
  id,
  name,
  emoji: '🐻',
  photo,
});
const roster = [
  P('a', 'Иван', 'ph1'),
  P('b', 'Петър'),
  P('c', 'Мария'),
  P('d', 'Гошо'),
  P('e', 'Стефан'),
];
const seats: Seats = ['a', 'b', 'c', 'd'];
const match = createMatch({ seats, teamA: 'Ние', teamB: 'Вие', bestOf: 3, rules: DEFAULT_RULES });
const record: MatchRecord = {
  id: 'm1',
  date: 5,
  seats,
  names: ['Иван', 'Петър', 'Мария', 'Гошо'],
  teamA: 'Ние',
  teamB: 'Вие',
  totalA: 151,
  totalB: 90,
  games: [],
};

describe('buildPayload', () => {
  it('scope all: every player without photos, all stats, no match', () => {
    const p = buildPayload({ roster, stats: [record], match }, 'all', 42);
    expect(p).toEqual({
      app: 'belot',
      v: 2,
      at: 42,
      roster: roster.map((r) => ({ ...r, photo: null })),
      stats: [record],
      match: null,
    });
    expect(SharePayloadSchema.parse(p)).toEqual(p);
  });

  it('scope match: only the seated players, no stats, the match with its rules', () => {
    const p = buildPayload({ roster, stats: [record], match }, 'match', 42);
    expect(p.roster.map((r) => r.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(p.roster[0]?.photo).toBeNull();
    expect(p.stats).toEqual([]);
    expect(p.match).toEqual(match);
  });

  it('scope match without a match falls back to scope all', () => {
    expect(buildPayload({ roster, stats: [record], match: null }, 'match', 1).stats).toEqual([
      record,
    ]);
  });
});

describe('SharePayloadSchema', () => {
  it('rejects prototype v1 data and foreign apps', () => {
    const ok = buildPayload({ roster, stats: [], match: null }, 'all', 1);
    expect(SharePayloadSchema.safeParse({ ...ok, v: 1 }).success).toBe(false);
    expect(SharePayloadSchema.safeParse({ ...ok, app: 'other' }).success).toBe(false);
  });

  it('rejects a match whose seats are not in the roster', () => {
    const p = buildPayload({ roster, stats: [], match }, 'match', 1);
    expect(SharePayloadSchema.safeParse({ ...p, roster: p.roster.slice(1) }).success).toBe(false);
  });
});

describe('extractCode', () => {
  it('finds the code in a link, in text around a link, or as a bare code', () => {
    expect(extractCode('https://x.app/#belot=zAbC-_1')).toBe('zAbC-_1');
    expect(extractCode('виж това: https://x.app/#belot=jQQ ok')).toBe('jQQ');
    expect(extractCode('  zAbc_-9  ')).toBe('zAbc_-9');
  });

  it('returns null when there is no code', () => {
    expect(extractCode('')).toBeNull();
    expect(extractCode('hello world')).toBeNull();
    expect(extractCode('xAbc')).toBeNull();
  });
});

describe('shareLink and qrTexts', () => {
  it('builds the link from the app root', () => {
    expect(shareLink('https://x.app/', 'zAB')).toBe('https://x.app/#belot=zAB');
  });

  it('one QR with the link when it fits', () => {
    const link = shareLink('https://x.app/', `z${'a'.repeat(100)}`);
    expect(qrTexts(link, `z${'a'.repeat(100)}`, 'k3f9')).toEqual([link]);
  });

  it('numbered parts of the code when the link is too long', () => {
    const code = `z${'b'.repeat(QR_CHUNK * 2 + 10)}`;
    const texts = qrTexts(shareLink('https://x.app/', code), code, 'k3f9');
    expect(texts).toHaveLength(3);
    expect(texts[0]).toBe(`BELOT|k3f9|1|3|${code.slice(0, QR_CHUNK)}`);
    expect(texts[2]).toBe(`BELOT|k3f9|3|3|${code.slice(QR_CHUNK * 2)}`);
    expect(texts.map((t) => t.split('|')[4]).join('')).toBe(code);
  });
});
