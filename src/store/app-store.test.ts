import { describe, expect, it, vi } from 'vitest';
import { PERSIST_VERSION } from '../core/persisted';
import { backupKey, createDocumentStorage } from '../storage/document';
import { type Kv, memoryKv } from '../storage/kv';
import { createAppStore, STORAGE_KEY } from './app-store';

const make = (kv: Kv) =>
  createAppStore({
    storage: createDocumentStorage(kv),
    newId: () => 'id1',
    now: () => 1000,
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
});
