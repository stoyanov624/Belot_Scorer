import { describe, expect, it } from 'vitest';
import { createMatch } from './match';
import { EMPTY_STATE, loadPersisted, type Migration, PERSIST_VERSION } from './persisted';
import { DEFAULT_SETTINGS } from './settings';

const player = { id: 'p1', name: 'Иво', emoji: '🐻', photo: null };
const match = createMatch({
  seats: ['p1', 'p2', 'p3', 'p4'],
  teamA: 'Ние',
  teamB: 'Вие',
  bestOf: 3,
  targetScore: 151,
});

describe('loadPersisted', () => {
  it('loads a valid document at the current version', () => {
    const state = { ...EMPTY_STATE, roster: [player], match };
    expect(loadPersisted({ version: PERSIST_VERSION, state })).toEqual({ ok: true, state });
  });

  it.each([null, 'x', 42, { state: EMPTY_STATE }, { version: 0, state: EMPTY_STATE }])(
    'rejects %j as not a document',
    (doc) => {
      expect(loadPersisted(doc)).toEqual({ ok: false, error: 'not-a-document' });
    },
  );

  it('rejects a document written by a newer app version', () => {
    const doc = { version: PERSIST_VERSION + 1, state: EMPTY_STATE };
    expect(loadPersisted(doc)).toEqual({ ok: false, error: 'future-version' });
  });

  it('rejects a state that fails the schema', () => {
    const state = { ...EMPTY_STATE, roster: [{ ...player, name: '' }] };
    expect(loadPersisted({ version: PERSIST_VERSION, state })).toEqual({
      ok: false,
      error: 'invalid-state',
    });
  });

  it('runs every migration in order from the stored version to the target', () => {
    const calls: number[] = [];
    const migrations: Record<number, Migration> = {
      1: (s) => {
        calls.push(1);
        return { ...(s as object), stats: [] };
      },
      2: (s) => {
        calls.push(2);
        return { ...(s as object), settings: DEFAULT_SETTINGS };
      },
    };
    const v1 = { roster: [player], match: null };
    const result = loadPersisted({ version: 1, state: v1 }, migrations, 3);
    expect(calls).toEqual([1, 2]);
    expect(result).toEqual({ ok: true, state: { ...EMPTY_STATE, roster: [player] } });
  });

  it('fails when a migration step is missing', () => {
    expect(loadPersisted({ version: 1, state: EMPTY_STATE }, {}, 2)).toEqual({
      ok: false,
      error: 'missing-migration',
    });
  });

  it('treats a throwing migration as invalid state', () => {
    const migrations: Record<number, Migration> = {
      1: () => {
        throw new Error('boom');
      },
    };
    expect(loadPersisted({ version: 1, state: EMPTY_STATE }, migrations, 2)).toEqual({
      ok: false,
      error: 'invalid-state',
    });
  });
});
