import { describe, expect, it, vi } from 'vitest';
import { EMPTY_STATE, PERSIST_VERSION } from '../core/persisted';
import { backupKey, createDocumentStorage } from '../storage/document';
import { type Kv, memoryKv } from '../storage/kv';
import { createAppStore, STORAGE_KEY } from './app-store';

const make = (kv: Kv) =>
  createAppStore({
    storage: createDocumentStorage(kv),
    newId: () => 'id1',
    now: () => 1000,
    putPhoto: async () => 'ph1',
    removePhoto: async () => {},
  });

describe('app store persistence', () => {
  it('starts pending with empty data and becomes ready after rehydrating nothing', async () => {
    const store = make(memoryKv());
    expect(store.getState().hydration).toBe('pending');
    expect(store.getState().roster).toEqual([]);

    await store.persist.rehydrate();

    expect(store.getState().hydration).toBe('ready');
  });

  it('persists data only, and a fresh store reads it back', async () => {
    const kv = memoryKv();
    const first = make(kv);
    await first.persist.rehydrate();
    first.getState().savePlayer({ id: null, name: 'Иво', emoji: '🐻', photo: null });

    type Doc = { version: number; state: { roster: unknown[] } };
    const doc = () => kv.data.get(STORAGE_KEY) as Doc | undefined;
    await vi.waitFor(() => expect(doc()?.state.roster).toHaveLength(1));
    expect(doc()?.version).toBe(PERSIST_VERSION);
    expect(Object.keys(doc()?.state ?? {}).sort()).toEqual([
      'match',
      'roster',
      'settings',
      'stats',
    ]);

    const second = make(kv);
    await second.persist.rehydrate();
    expect(second.getState().roster).toEqual(first.getState().roster);
  });

  it('marks hydration failed and keeps a backup when stored data is invalid', async () => {
    const bad = { version: PERSIST_VERSION, state: { roster: 'nope' } };
    const kv = memoryKv({ [STORAGE_KEY]: bad });
    const store = make(kv);

    await store.persist.rehydrate();

    expect(store.getState().hydration).toBe('failed');
    expect(store.getState().roster).toEqual([]);
    expect(kv.data.get(backupKey(STORAGE_KEY))).toEqual(bad);
  });

  it('keeps the original document after a failed hydration from invalid data', async () => {
    const bad = { version: PERSIST_VERSION, state: { roster: 'nope' } };
    const kv = memoryKv({ [STORAGE_KEY]: bad });
    const store = make(kv);

    await store.persist.rehydrate();
    store.getState().savePlayer({ id: null, name: 'Иво', emoji: null, photo: null });
    await Promise.resolve();

    expect(kv.data.get(STORAGE_KEY)).toEqual(bad);
    expect(kv.data.get(backupKey(STORAGE_KEY))).toEqual(bad);
  });

  it('writes nothing after a failed hydration from a failing read', async () => {
    const kv = memoryKv();
    const store = make({ ...kv, get: () => Promise.reject(new Error('io')) });

    await store.persist.rehydrate();
    store.getState().savePlayer({ id: null, name: 'Иво', emoji: null, photo: null });
    await Promise.resolve();

    expect(store.getState().hydration).toBe('failed');
    expect(kv.data.size).toBe(0);
  });

  it('resetData starts fresh after a failed hydration and keeps the backup', async () => {
    const bad = { version: PERSIST_VERSION, state: { roster: 'nope' } };
    const kv = memoryKv({ [STORAGE_KEY]: bad });
    const store = make(kv);
    await store.persist.rehydrate();

    store.getState().resetData();

    expect(store.getState().hydration).toBe('ready');
    expect(store.getState().saveError).toBe(false);
    await vi.waitFor(() =>
      expect(kv.data.get(STORAGE_KEY)).toEqual({ version: PERSIST_VERSION, state: EMPTY_STATE }),
    );
    expect(kv.data.get(backupKey(STORAGE_KEY))).toEqual(bad);
  });

  it('flags saveError when a write fails, without an unhandled rejection', async () => {
    const kv = memoryKv();
    let failing = false;
    const set = vi.fn((key: string, value: unknown) =>
      failing ? Promise.reject(new Error('quota')) : kv.set(key, value),
    );
    const store = make({ ...kv, set });
    await store.persist.rehydrate();
    expect(store.getState().saveError).toBe(false);
    failing = true;
    set.mockClear();

    store.getState().savePlayer({ id: null, name: 'Иво', emoji: null, photo: null });

    await vi.waitFor(() => expect(store.getState().saveError).toBe(true));
    // Settle any follow-up writes; vitest fails the run on an unhandled rejection.
    await new Promise((r) => setTimeout(r, 0));
    expect(store.getState().saveError).toBe(true);
    expect(set.mock.calls.length).toBeLessThanOrEqual(4);
  });

  it('clears saveError once a write after a failure succeeds', async () => {
    const kv = memoryKv();
    let failing = false;
    const set = vi.fn((key: string, value: unknown) =>
      failing ? Promise.reject(new Error('quota')) : kv.set(key, value),
    );
    const store = make({ ...kv, set });
    await store.persist.rehydrate();
    failing = true;

    store.getState().savePlayer({ id: null, name: 'Иво', emoji: null, photo: null });
    await vi.waitFor(() => expect(store.getState().saveError).toBe(true));

    failing = false;
    store.getState().savePlayer({ id: null, name: 'Ани', emoji: null, photo: null });

    await vi.waitFor(() => expect(store.getState().saveError).toBe(false));
  });

  it('does not persist saveError or hydration', async () => {
    const kv = memoryKv();
    const store = make(kv);
    await store.persist.rehydrate();
    store.getState().savePlayer({ id: null, name: 'Иво', emoji: null, photo: null });
    await vi.waitFor(() => expect(kv.data.has(STORAGE_KEY)).toBe(true));
    const doc = kv.data.get(STORAGE_KEY) as { state: object };
    expect(doc.state).not.toHaveProperty('saveError');
    expect(doc.state).not.toHaveProperty('hydration');
  });
});
