import { describe, expect, it } from 'vitest';
import { EMPTY_STATE, PERSIST_VERSION } from '../core/persisted';
import { backupKey, createDocumentStorage, PersistLoadError } from './document';
import { memoryKv } from './kv';

const KEY = 'belot-state';
const player = { id: 'p1', name: 'Иво', emoji: null, photo: null };

describe('createDocumentStorage', () => {
  it('returns null when nothing is stored', async () => {
    const storage = createDocumentStorage(memoryKv());
    expect(await storage.getItem(KEY)).toBeNull();
  });

  it('writes a versioned document and reads it back', async () => {
    const kv = memoryKv();
    const storage = createDocumentStorage(kv);
    const state = { ...EMPTY_STATE, roster: [player] };

    await storage.setItem(KEY, { state, version: PERSIST_VERSION });

    expect(kv.data.get(KEY)).toEqual({ version: PERSIST_VERSION, state });
    expect(await storage.getItem(KEY)).toEqual({ state, version: PERSIST_VERSION });
  });

  it('backs up an unreadable document and throws a coded error', async () => {
    const bad = { version: PERSIST_VERSION, state: { roster: 'nope' } };
    const kv = memoryKv({ [KEY]: bad });
    const storage = createDocumentStorage(kv);

    const read = storage.getItem(KEY);

    await expect(read).rejects.toBeInstanceOf(PersistLoadError);
    await expect(read).rejects.toMatchObject({ code: 'invalid-state' });
    expect(kv.data.get(backupKey(KEY))).toEqual(bad);
  });

  it('removes the document', async () => {
    const kv = memoryKv({ [KEY]: { version: PERSIST_VERSION, state: EMPTY_STATE } });
    await createDocumentStorage(kv).removeItem(KEY);
    expect(kv.data.has(KEY)).toBe(false);
  });
});
