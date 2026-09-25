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

  it('returns null without a backup when the kv reports null', async () => {
    const kv = memoryKv({ [KEY]: null });
    expect(await createDocumentStorage(kv).getItem(KEY)).toBeNull();
    expect(kv.data.has(backupKey(KEY))).toBe(false);
  });

  it('writes a versioned document and reads it back', async () => {
    const kv = memoryKv();
    const storage = createDocumentStorage(kv);
    const state = { ...EMPTY_STATE, roster: [player] };

    await storage.getItem(KEY);
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

  it('does not overwrite an earlier backup', async () => {
    const earlier = { version: PERSIST_VERSION, state: 'first' };
    const kv = memoryKv({
      [KEY]: { version: PERSIST_VERSION, state: 'second' },
      [backupKey(KEY)]: earlier,
    });

    await expect(createDocumentStorage(kv).getItem(KEY)).rejects.toBeInstanceOf(PersistLoadError);
    expect(kv.data.get(backupKey(KEY))).toEqual(earlier);
  });

  it('still throws the load error when the backup write fails', async () => {
    const kv = memoryKv({ [KEY]: { version: PERSIST_VERSION, state: 'bad' } });
    const failing = { ...kv, set: async () => Promise.reject(new Error('quota')) };

    await expect(createDocumentStorage(failing).getItem(KEY)).rejects.toBeInstanceOf(
      PersistLoadError,
    );
  });

  it('propagates a failing read', async () => {
    const kv = { ...memoryKv(), get: () => Promise.reject(new Error('io')) };
    await expect(createDocumentStorage(kv).getItem(KEY)).rejects.toThrow('io');
  });

  describe('write gate', () => {
    const state = { ...EMPTY_STATE, roster: [player] };

    it('ignores writes before anything was loaded', async () => {
      const kv = memoryKv();
      await createDocumentStorage(kv).setItem(KEY, { state, version: PERSIST_VERSION });
      expect(kv.data.has(KEY)).toBe(false);
    });

    it('keeps the original untouched after a failed load', async () => {
      const bad = { version: PERSIST_VERSION, state: { roster: 'nope' } };
      const kv = memoryKv({ [KEY]: bad });
      const storage = createDocumentStorage(kv);
      await expect(storage.getItem(KEY)).rejects.toBeInstanceOf(PersistLoadError);

      await storage.setItem(KEY, { state, version: PERSIST_VERSION });

      expect(kv.data.get(KEY)).toEqual(bad);
    });

    it('writes after unlock()', async () => {
      const bad = { version: PERSIST_VERSION, state: { roster: 'nope' } };
      const kv = memoryKv({ [KEY]: bad });
      const storage = createDocumentStorage(kv);
      await expect(storage.getItem(KEY)).rejects.toBeInstanceOf(PersistLoadError);

      storage.unlock();
      await storage.setItem(KEY, { state, version: PERSIST_VERSION });

      expect(kv.data.get(KEY)).toEqual({ version: PERSIST_VERSION, state });
      expect(kv.data.get(backupKey(KEY))).toEqual(bad);
    });
  });

  it('removes the document', async () => {
    const kv = memoryKv({ [KEY]: { version: PERSIST_VERSION, state: EMPTY_STATE } });
    await createDocumentStorage(kv).removeItem(KEY);
    expect(kv.data.has(KEY)).toBe(false);
  });
});
