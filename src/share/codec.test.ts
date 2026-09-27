import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Player } from '../core/model';
import { buildPayload } from '../core/share';
import { decodeShare, encodeShare, parseSharedFile, readShared, shareFileName } from './codec';

const P = (id: string, name: string): Player => ({ id, name, emoji: '🐻', photo: null });
const roster = [P('a', 'Иван'), P('b', 'Петър'), P('c', 'Мария')];
const payload = buildPayload({ roster, stats: [], match: null }, 'all', 42);

const bigRoster = Array.from({ length: 20 }, (_, i) => P(`p${i}`, `Играч номер ${i}`));
const bigPayload = buildPayload({ roster: bigRoster, stats: [], match: null }, 'all', 42);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('encodeShare / readShared round trip', () => {
  it('round-trips and the code starts with z, matching the code shape', async () => {
    const code = await encodeShare(payload);
    expect(code).toMatch(/^[zj][A-Za-z0-9_-]+$/);
    expect(code[0]).toBe('z');
    const result = await readShared(code);
    expect(result).toEqual({ ok: true, data: payload });
  });

  it('falls back to no compression (prefix j) and still round-trips when CompressionStream is unavailable', async () => {
    vi.stubGlobal('CompressionStream', undefined);
    const code = await encodeShare(payload);
    expect(code[0]).toBe('j');
    expect(code).toMatch(/^[zj][A-Za-z0-9_-]+$/);
    const result = await readShared(code);
    expect(result).toEqual({ ok: true, data: payload });
  });

  it('compresses a 20-player payload shorter than the uncompressed form', async () => {
    const compressed = await encodeShare(bigPayload);
    vi.stubGlobal('CompressionStream', undefined);
    const uncompressed = await encodeShare(bigPayload);
    expect(compressed[0]).toBe('z');
    expect(uncompressed[0]).toBe('j');
    expect(compressed.length).toBeLessThan(uncompressed.length);
  });
});

describe('readShared failures', () => {
  it('returns ok:false for garbage', async () => {
    expect(await readShared('zzzz')).toEqual({ ok: false });
  });

  it('returns ok:false for a valid code that fails the schema', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: deliberately invalid payload for the schema-rejection test
    const code = await encodeShare({ app: 'belot', v: 1 } as any);
    expect(await readShared(code)).toEqual({ ok: false });
  });

  it('returns ok:false for invalid base64', async () => {
    expect(await readShared('z!!!not-base64!!!')).toEqual({ ok: false });
  });
});

describe('decodeShare', () => {
  it('rejects an unknown prefix', async () => {
    await expect(decodeShare('xAbc')).rejects.toThrow();
  });
});

describe('parseSharedFile', () => {
  it('accepts a stringified payload', () => {
    expect(parseSharedFile(JSON.stringify(payload))).toEqual({ ok: true, data: payload });
  });

  it('rejects malformed JSON', () => {
    expect(parseSharedFile('{')).toEqual({ ok: false });
  });

  it('rejects JSON that fails the schema', () => {
    expect(parseSharedFile(JSON.stringify({ app: 'other' }))).toEqual({ ok: false });
  });
});

describe('shareFileName', () => {
  it('formats the local date as belot-YYYY-MM-DD.belot', () => {
    expect(shareFileName(new Date(2026, 8, 27, 23, 30).getTime())).toBe('belot-2026-09-27.belot');
  });
});
