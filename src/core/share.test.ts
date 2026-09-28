import { describe, expect, it } from 'vitest';
import { createMatch } from './match';
import type { MatchRecord, Player, Seats } from './model';
import { DEFAULT_RULES } from './rules';
import {
  buildPayload,
  extractCode,
  QR_CHUNK,
  qrTexts,
  readScanText,
  type ScanProgress,
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

describe('readScanText', () => {
  const part = (sid: string, i: number, n: number, chunk: string) =>
    `BELOT|${sid}|${i}|${n}|${chunk}`;

  it('returns the code from a scanned link or bare code, ignoring progress', () => {
    expect(readScanText('https://x.app/#belot=zAbc', null)).toEqual({ kind: 'code', code: 'zAbc' });
    const p = readScanText(part('k3f9', 1, 2, 'zAA'), null);
    expect(readScanText('  jQQ  ', p.kind === 'progress' ? p.progress : null)).toEqual({
      kind: 'code',
      code: 'jQQ',
    });
  });

  it('collects parts by sid, in any order, and joins them 1..n', () => {
    const s1 = readScanText(part('k3f9', 2, 3, 'BBB'), null);
    expect(s1).toEqual({
      kind: 'progress',
      progress: { sid: 'k3f9', total: 3, parts: new Map([[2, 'BBB']]) },
    });
    const s2 = readScanText(part('k3f9', 3, 3, 'CCC'), (s1 as { progress: ScanProgress }).progress);
    expect(s2.kind).toBe('progress');
    const s3 = readScanText(part('k3f9', 1, 3, 'zAA'), (s2 as { progress: ScanProgress }).progress);
    expect(s3).toEqual({ kind: 'code', code: 'zAABBBCCC' });
  });

  it('ignores duplicates and keeps the progress', () => {
    const s1 = readScanText(part('k3f9', 1, 2, 'zAA'), null);
    const s2 = readScanText(part('k3f9', 1, 2, 'zAA'), (s1 as { progress: ScanProgress }).progress);
    expect(s2).toEqual(s1);
  });

  it('a part from a different session (sid or total) restarts the collection', () => {
    const s1 = readScanText(part('k3f9', 1, 3, 'zAA'), null);
    const s2 = readScanText(part('m001', 1, 2, 'zXX'), (s1 as { progress: ScanProgress }).progress);
    expect(s2).toEqual({
      kind: 'progress',
      progress: { sid: 'm001', total: 2, parts: new Map([[1, 'zXX']]) },
    });
    const s3 = readScanText(part('k3f9', 1, 2, 'zAA'), (s1 as { progress: ScanProgress }).progress);
    expect((s3 as { progress: ScanProgress }).progress.total).toBe(2);
  });

  it('ignores junk, malformed parts and out-of-range indexes', () => {
    const s1 = readScanText(part('k3f9', 1, 2, 'zAA'), null);
    const progress = (s1 as { progress: ScanProgress }).progress;
    for (const text of [
      'hello',
      'BELOT|x|1|2',
      part('k3f9', 0, 2, 'zAA'),
      part('k3f9', 3, 2, 'zAA'),
      'BELOT|k3f9|1|2|***',
    ]) {
      expect(readScanText(text, progress)).toEqual({ kind: 'ignored' });
    }
  });

  it('a single-part session completes at once', () => {
    expect(readScanText(part('k3f9', 1, 1, 'zAll'), null)).toEqual({ kind: 'code', code: 'zAll' });
  });
});
