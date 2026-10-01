import { beforeEach, describe, expect, it } from 'vitest';
import { createMatch } from '../core/match';
import { DEFAULT_RULES } from '../core/rules';
import { createDocumentStorage } from '../storage/document';
import { memoryKv } from '../storage/kv';
import { type AppStore, createAppStore } from './app-store';

let removed: string[];
let putPhotoBlobs: Blob[];
let store: AppStore;

beforeEach(() => {
  removed = [];
  putPhotoBlobs = [];
  let n = 0;
  store = createAppStore({
    storage: createDocumentStorage(memoryKv()),
    newId: () => `id${++n}`,
    now: () => 1000,
    putPhoto: async (blob) => {
      putPhotoBlobs.push(blob);
      return `phL${putPhotoBlobs.length}`;
    },
    removePhoto: async (id) => {
      removed.push(id);
    },
  });
});

const input = { id: null, name: 'Иво', emoji: '🐻', photo: null };

describe('savePlayer', () => {
  it('adds a new player with a generated id and a trimmed name', () => {
    const result = store.getState().savePlayer({ ...input, name: '  Иво ' });
    expect(result).toEqual({ ok: true, id: 'id1' });
    expect(store.getState().roster).toEqual([{ id: 'id1', name: 'Иво', emoji: '🐻', photo: null }]);
  });

  it('rejects an empty or duplicate name (case-insensitive)', () => {
    const { savePlayer } = store.getState();
    savePlayer(input);
    expect(savePlayer({ ...input, name: '  ' })).toEqual({ ok: false, error: 'empty' });
    expect(savePlayer({ ...input, name: 'иво' })).toEqual({ ok: false, error: 'duplicate' });
    expect(store.getState().roster).toHaveLength(1);
  });

  it('edits an existing player, keeping its own name allowed', () => {
    const { savePlayer } = store.getState();
    savePlayer(input);
    expect(savePlayer({ ...input, id: 'id1', emoji: '🦊' })).toEqual({ ok: true, id: 'id1' });
    expect(store.getState().roster[0]?.emoji).toBe('🦊');
  });

  it('drops the emoji when a photo is set', () => {
    store.getState().savePlayer({ ...input, photo: 'ph1' });
    expect(store.getState().roster[0]).toMatchObject({ emoji: null, photo: 'ph1' });
  });

  it('removes the old photo blob when the photo is replaced', () => {
    const { savePlayer } = store.getState();
    savePlayer({ ...input, photo: 'ph1' });
    savePlayer({ ...input, id: 'id1', photo: 'ph2' });
    expect(removed).toEqual(['ph1']);
  });

  it('keeps the photo blob when an edit keeps the same photo', () => {
    const { savePlayer } = store.getState();
    savePlayer({ ...input, photo: 'ph1' });
    savePlayer({ ...input, id: 'id1', name: 'Ивo', photo: 'ph1' });
    expect(removed).toEqual([]);
  });

  it('removes the photo blob when the player switches to an emoji', () => {
    const { savePlayer } = store.getState();
    savePlayer({ ...input, photo: 'ph1' });
    savePlayer({ ...input, id: 'id1', photo: null });
    expect(store.getState().roster[0]).toMatchObject({ emoji: '🐻', photo: null });
    expect(removed).toEqual(['ph1']);
  });
});

describe('removePlayer', () => {
  it('removes the player and their photo blob', () => {
    store.getState().savePlayer({ ...input, photo: 'ph1' });
    expect(store.getState().removePlayer('id1')).toEqual({ ok: true });
    expect(store.getState().roster).toEqual([]);
    expect(removed).toEqual(['ph1']);
  });

  it('refuses while the player sits in the current match', () => {
    store.getState().savePlayer(input);
    store.setState({
      match: createMatch({
        seats: ['id1', 'b', 'c', 'd'],
        teamA: 'Ние',
        teamB: 'Вие',
        bestOf: 1,
        rules: DEFAULT_RULES,
      }),
    });
    expect(store.getState().removePlayer('id1')).toEqual({ ok: false, error: 'in-match' });
    expect(store.getState().roster).toHaveLength(1);
  });
});

describe('updateSettings', () => {
  it('merges a partial patch', () => {
    store.getState().updateSettings({ theme: 'night' });
    expect(store.getState().settings).toMatchObject({ theme: 'night', felt: 'wood' });
  });
});

describe('clearStats', () => {
  it('clears stats and leaves the roster and match untouched', () => {
    const { savePlayer, startMatch, setContract, saveDeal, endMatch } = store.getState();
    const p0 = savePlayer({ id: null, name: 'Иван', emoji: '🐻', photo: null });
    const p1 = savePlayer({ id: null, name: 'Петър', emoji: '🐻', photo: null });
    const p2 = savePlayer({ id: null, name: 'Мария', emoji: '🐻', photo: null });
    const p3 = savePlayer({ id: null, name: 'Жоро', emoji: '🐻', photo: null });
    if (!p0.ok || !p1.ok || !p2.ok || !p3.ok) throw new Error('savePlayer failed');
    startMatch({
      seats: [p0.id, p1.id, p2.id, p3.id],
      teamA: 'Ние',
      teamB: 'Вие',
      bestOf: 1,
    });
    setContract('hearts', 0);
    saveDeal({ cardPointsA: 100, capo: null });
    endMatch();
    expect(store.getState().stats).toHaveLength(1);

    const roster = store.getState().roster;
    const match = store.getState().match;
    store.getState().clearStats();

    expect(store.getState().stats).toEqual([]);
    expect(store.getState().roster).toEqual(roster);
    expect(store.getState().match).toEqual(match);
  });
});

describe('importShared', () => {
  it('merge: adds a new player and updates the result counts', async () => {
    const { savePlayer, importShared } = store.getState();
    const p0 = savePlayer({ id: null, name: 'Иван', emoji: '🐻', photo: null });
    if (!p0.ok) throw new Error('savePlayer failed');

    const imported = {
      app: 'belot' as const,
      v: 2 as const,
      at: 2000,
      roster: [
        { id: 'ext1', name: 'Нов Играч', emoji: null, photo: null },
        { id: 'ext2', name: 'Втори', emoji: null, photo: null },
        { id: 'ext3', name: 'Трети', emoji: null, photo: null },
        { id: 'ext4', name: 'Четвърти', emoji: null, photo: null },
      ],
      stats: [
        {
          id: 'stat-ext1',
          date: 2000,
          seats: ['ext1', 'ext2', 'ext3', 'ext4'] as unknown as [string, string, string, string],
          names: ['Нов Играч', 'Втори', 'Трети', 'Четвърти'] as unknown as [
            string,
            string,
            string,
            string,
          ],
          teamA: 'Ние',
          teamB: 'Вие',
          totalA: 100,
          totalB: 80,
          games: [],
        },
      ],
      match: null,
    };

    const result = await importShared(imported, 'merge');

    expect(store.getState().roster).toEqual([
      { id: p0.id, name: 'Иван', emoji: '🐻', photo: null },
      { id: 'ext1', name: 'Нов Играч', emoji: null, photo: null },
      { id: 'ext2', name: 'Втори', emoji: null, photo: null },
      { id: 'ext3', name: 'Трети', emoji: null, photo: null },
      { id: 'ext4', name: 'Четвърти', emoji: null, photo: null },
    ]);
    expect(store.getState().stats).toEqual([
      {
        id: 'stat-ext1',
        date: 2000,
        seats: ['ext1', 'ext2', 'ext3', 'ext4'] as unknown as [string, string, string, string],
        names: ['Нов Играч', 'Втори', 'Трети', 'Четвърти'] as unknown as [
          string,
          string,
          string,
          string,
        ],
        teamA: 'Ние',
        teamB: 'Вие',
        totalA: 100,
        totalB: 80,
        games: [],
      },
    ]);
    expect(result.players).toBe(4);
    expect(result.addedMatches).toBe(1);
  });

  it('take: replaces the match with the imported one', async () => {
    const { savePlayer, importShared } = store.getState();
    const p0 = savePlayer({ id: null, name: 'Иван', emoji: '🐻', photo: null });
    const p1 = savePlayer({ id: null, name: 'Петър', emoji: '🐻', photo: null });
    if (!p0.ok || !p1.ok) throw new Error('savePlayer failed');

    const importedMatch = createMatch({
      seats: [p0.id, p1.id, 'ext2', 'ext3'] as const,
      teamA: 'Ние',
      teamB: 'Вие',
      bestOf: 3,
      rules: DEFAULT_RULES,
    });

    const imported = {
      app: 'belot' as const,
      v: 2 as const,
      at: 2000,
      roster: [
        { id: p0.id, name: 'Иван', emoji: '🐻', photo: null },
        { id: p1.id, name: 'Петър', emoji: '🐻', photo: null },
        { id: 'ext2', name: 'Мария', emoji: null, photo: null },
        { id: 'ext3', name: 'Жоро', emoji: null, photo: null },
      ],
      stats: [],
      match: importedMatch,
    };

    const result = await importShared(imported, 'take');

    expect(store.getState().match).toEqual(importedMatch);
    expect(result.tookMatch).toBe(true);
  });

  it('replace: drops photos of local players whose ids are gone', async () => {
    const { savePlayer, importShared } = store.getState();
    const p0 = savePlayer({ id: null, name: 'Иван', emoji: null, photo: 'ph1' });
    const p1 = savePlayer({ id: null, name: 'Петър', emoji: null, photo: 'ph2' });
    if (!p0.ok || !p1.ok) throw new Error('savePlayer failed');

    const imported = {
      app: 'belot' as const,
      v: 2 as const,
      at: 2000,
      roster: [{ id: p0.id, name: 'Иван', emoji: null, photo: null }],
      stats: [],
      match: null,
    };

    await importShared(imported, 'replace');

    expect(store.getState().roster).toEqual([
      { id: p0.id, name: 'Иван', emoji: null, photo: 'ph1' },
    ]);
    expect(store.getState().match).toBeNull();
    expect(removed).toEqual(['ph2']);
  });

  it('replace: keeps the local photo of a player kept by id and clears a started match', async () => {
    const { savePlayer, startMatch, importShared } = store.getState();
    const p0 = savePlayer({ id: null, name: 'Иван', emoji: null, photo: 'ph1' });
    const p1 = savePlayer({ id: null, name: 'Петър', emoji: '🐻', photo: null });
    const p2 = savePlayer({ id: null, name: 'Мария', emoji: '🐻', photo: null });
    const p3 = savePlayer({ id: null, name: 'Жоро', emoji: '🐻', photo: null });
    if (!p0.ok || !p1.ok || !p2.ok || !p3.ok) throw new Error('savePlayer failed');
    startMatch({
      seats: [p0.id, p1.id, p2.id, p3.id],
      teamA: 'Ние',
      teamB: 'Вие',
      bestOf: 1,
    });

    const imported = {
      app: 'belot' as const,
      v: 2 as const,
      at: 2000,
      roster: [{ id: p0.id, name: 'Иван', emoji: null, photo: null }],
      stats: [],
      match: null,
    };

    const result = await importShared(imported, 'replace');

    expect(store.getState().roster).toEqual([
      { id: p0.id, name: 'Иван', emoji: null, photo: 'ph1' },
    ]);
    expect(store.getState().match).toBeNull();
    expect(result.tookMatch).toBe(false);
    expect(removed).toEqual([]);
  });

  it('replace: takes the imported match and clears old photos', async () => {
    const { savePlayer, importShared } = store.getState();
    const p0 = savePlayer({ id: null, name: 'Иван', emoji: null, photo: 'ph1' });
    const p1 = savePlayer({ id: null, name: 'Петър', emoji: null, photo: 'ph2' });
    if (!p0.ok || !p1.ok) throw new Error('savePlayer failed');

    const importedMatch = createMatch({
      seats: ['new1', 'new2', 'new3', 'new4'] as const,
      teamA: 'Ние',
      teamB: 'Вие',
      bestOf: 1,
      rules: DEFAULT_RULES,
    });

    const imported = {
      app: 'belot' as const,
      v: 2 as const,
      at: 2000,
      roster: [
        { id: 'new1', name: 'Нов 1', emoji: null, photo: null },
        { id: 'new2', name: 'Нов 2', emoji: null, photo: null },
        { id: 'new3', name: 'Нов 3', emoji: null, photo: null },
        { id: 'new4', name: 'Нов 4', emoji: null, photo: null },
      ],
      stats: [],
      match: importedMatch,
    };

    const result = await importShared(imported, 'replace');

    expect(store.getState().match).toEqual(importedMatch);
    expect(result.tookMatch).toBe(true);
    expect(removed).toEqual(['ph1', 'ph2']);
  });

  it('merge: never drops photos', async () => {
    const { savePlayer, importShared } = store.getState();
    const p0 = savePlayer({ id: null, name: 'Иван', emoji: null, photo: 'ph1' });
    const p1 = savePlayer({ id: null, name: 'Петър', emoji: null, photo: 'ph2' });
    if (!p0.ok || !p1.ok) throw new Error('savePlayer failed');

    const imported = {
      app: 'belot' as const,
      v: 2 as const,
      at: 2000,
      roster: [{ id: 'ext1', name: 'Нов Играч', emoji: null, photo: null }],
      stats: [],
      match: null,
    };

    await importShared(imported, 'merge');

    expect(store.getState().roster).toEqual([
      { id: p0.id, name: 'Иван', emoji: null, photo: 'ph1' },
      { id: p1.id, name: 'Петър', emoji: null, photo: 'ph2' },
      { id: 'ext1', name: 'Нов Играч', emoji: null, photo: null },
    ]);
    expect(removed).toEqual([]);
  });

  it('merge: resolves an embedded photo to a new local id, saving it through the photo store', async () => {
    const { savePlayer, importShared } = store.getState();
    const p0 = savePlayer({ id: null, name: 'Иван', emoji: null, photo: 'ph1' });
    if (!p0.ok) throw new Error('savePlayer failed');

    const imported = {
      app: 'belot' as const,
      v: 2 as const,
      at: 2000,
      roster: [{ id: p0.id, name: 'Иван', emoji: null, photo: 'remote1' }],
      stats: [],
      match: null,
      photos: { remote1: 'data:image/png;base64,aGVsbG8=' },
    };

    const result = await importShared(imported, 'merge');

    expect(store.getState().roster).toEqual([
      { id: p0.id, name: 'Иван', emoji: null, photo: 'phL1' },
    ]);
    expect(putPhotoBlobs).toHaveLength(1);
    const saved = putPhotoBlobs[0];
    if (!saved) throw new Error('putPhoto was not called');
    expect(saved.type).toBe('image/png');
    expect([...new Uint8Array(await saved.arrayBuffer())]).toEqual([
      ...new TextEncoder().encode('hello'),
    ]);
    // ph1 was the overwritten local blob for the same player, so it's dropped.
    expect(removed).toEqual(['ph1']);
    expect(result.players).toBe(1);
  });

  it('merge: nulls a payload photo id with no embedded blob and no local owner', async () => {
    const { importShared } = store.getState();

    const imported = {
      app: 'belot' as const,
      v: 2 as const,
      at: 2000,
      roster: [{ id: 'ext1', name: 'Нов Играч', emoji: null, photo: 'remote1' }],
      stats: [],
      match: null,
    };

    await importShared(imported, 'merge');

    expect(store.getState().roster).toEqual([
      { id: 'ext1', name: 'Нов Играч', emoji: null, photo: null },
    ]);
    expect(putPhotoBlobs).toHaveLength(0);
  });

  it('merge: nulls a payload photo id with no embedded blob even when a local player already owns it (same-device share)', async () => {
    const { savePlayer, importShared } = store.getState();
    const p0 = savePlayer({ id: null, name: 'Иван', emoji: null, photo: 'ph1' });
    if (!p0.ok) throw new Error('savePlayer failed');

    const imported = {
      app: 'belot' as const,
      v: 2 as const,
      at: 2000,
      roster: [{ id: 'ext1', name: 'Нов Играч', emoji: null, photo: 'ph1' }],
      stats: [],
      match: null,
    };

    await importShared(imported, 'merge');

    expect(store.getState().roster).toEqual([
      { id: p0.id, name: 'Иван', emoji: null, photo: 'ph1' },
      { id: 'ext1', name: 'Нов Играч', emoji: null, photo: null },
    ]);
    expect(putPhotoBlobs).toHaveLength(0);
    expect(removed).toEqual([]);
  });

  it('merge: a failed photo write degrades that photo instead of failing the import', async () => {
    const localStore = createAppStore({
      storage: createDocumentStorage(memoryKv()),
      newId: () => 'id1',
      now: () => 1000,
      putPhoto: async () => {
        throw new Error('quota exceeded');
      },
      removePhoto: async () => {},
    });

    const imported = {
      app: 'belot' as const,
      v: 2 as const,
      at: 2000,
      roster: [{ id: 'ext1', name: 'Нов Играч', emoji: null, photo: 'remote1' }],
      stats: [],
      match: null,
      photos: { remote1: 'data:image/png;base64,aGVsbG8=' },
    };

    const result = await localStore.getState().importShared(imported, 'merge');

    expect(localStore.getState().roster).toEqual([
      { id: 'ext1', name: 'Нов Играч', emoji: null, photo: null },
    ]);
    expect(result.players).toBe(1);
    expect(result.addedMatches).toBe(0);
  });

  it('merge: stores an embedded blob once per player, so two imported players sharing one payload photo id get two distinct local ids', async () => {
    const { importShared } = store.getState();

    const imported = {
      app: 'belot' as const,
      v: 2 as const,
      at: 2000,
      roster: [
        { id: 'ext1', name: 'Първи', emoji: null, photo: 'remote1' },
        { id: 'ext2', name: 'Втори', emoji: null, photo: 'remote1' },
      ],
      stats: [],
      match: null,
      photos: { remote1: 'data:image/png;base64,aGVsbG8=' },
    };

    await importShared(imported, 'merge');

    const roster = store.getState().roster;
    expect(putPhotoBlobs).toHaveLength(2);
    const photo1 = roster.find((p) => p.id === 'ext1')?.photo;
    const photo2 = roster.find((p) => p.id === 'ext2')?.photo;
    expect(photo1).toBe('phL1');
    expect(photo2).toBe('phL2');
    expect(photo1).not.toBe(photo2);
  });

  it("take: resolves an embedded photo overwriting a local player's photo, dropping the old blob", async () => {
    const { savePlayer, importShared } = store.getState();
    const p0 = savePlayer({ id: null, name: 'Иван', emoji: null, photo: 'ph1' });
    if (!p0.ok) throw new Error('savePlayer failed');

    const imported = {
      app: 'belot' as const,
      v: 2 as const,
      at: 2000,
      roster: [{ id: p0.id, name: 'Иван', emoji: null, photo: 'remote1' }],
      stats: [],
      match: null,
      photos: { remote1: 'data:image/png;base64,aGVsbG8=' },
    };

    const result = await importShared(imported, 'take');

    expect(store.getState().roster).toEqual([
      { id: p0.id, name: 'Иван', emoji: null, photo: 'phL1' },
    ]);
    expect(removed).toEqual(['ph1']);
    expect(result.players).toBe(1);
  });

  it('a double invocation resolves coherently: the later-finishing call wins, and every orphaned created photo is dropped', async () => {
    const puts: Blob[] = [];
    let n = 0;
    const first = deferred();
    const localStore = createAppStore({
      storage: createDocumentStorage(memoryKv()),
      newId: () => `id${++n}`,
      now: () => 1000,
      putPhoto: async (blob) => {
        puts.push(blob);
        if (puts.length === 1) return first.promise;
        return `phL${puts.length}`;
      },
      removePhoto: async (id) => {
        removed.push(id);
      },
    });

    const imported = {
      app: 'belot' as const,
      v: 2 as const,
      at: 2000,
      roster: [{ id: 'ext1', name: 'Нов', emoji: null, photo: 'remote1' }],
      stats: [],
      match: null,
      photos: { remote1: 'data:image/png;base64,aGVsbG8=' },
    };

    const call1 = localStore.getState().importShared(imported, 'merge');
    const call2 = localStore.getState().importShared(imported, 'merge');

    await call2;
    expect(localStore.getState().roster).toEqual([
      { id: 'ext1', name: 'Нов', emoji: null, photo: 'phL2' },
    ]);

    first.resolve('phL1');
    await call1;

    expect(localStore.getState().roster).toEqual([
      { id: 'ext1', name: 'Нов', emoji: null, photo: 'phL1' },
    ]);
    expect(removed).toEqual(['phL2']);
  });
});

function deferred(): { promise: Promise<string>; resolve: (value: string) => void } {
  let resolve!: (value: string) => void;
  const promise = new Promise<string>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}
