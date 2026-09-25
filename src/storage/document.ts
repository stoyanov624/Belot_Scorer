import type { PersistStorage } from 'zustand/middleware';
import {
  type LoadError,
  loadPersisted,
  PERSIST_VERSION,
  type PersistedState,
} from '../core/persisted';
import type { Kv } from './kv';

export class PersistLoadError extends Error {
  readonly code: LoadError;

  constructor(code: LoadError) {
    super(`Stored app state could not be loaded: ${code}`);
    this.name = 'PersistLoadError';
    this.code = code;
  }
}

export const backupKey = (name: string) => `${name}.backup`;

/** Persist storage whose writes stay gated until a load succeeds or `unlock()` is called. */
export type DocumentStorage = PersistStorage<PersistedState> & {
  /** Opens the write gate, e.g. when the user chooses to start fresh after a failed load. */
  unlock(): void;
};

/**
 * Zustand persist storage over one versioned document. Migrations and validation run on
 * read (core `loadPersisted`). Writes are ignored until `getItem` has loaded a valid
 * document or found nothing stored, so defaults never replace data that hasn't loaded.
 * A document that can't be loaded is copied to `backupKey(name)` (unless a backup is already
 * there) and the error surfaces. After a failed load the original is never overwritten
 * until `unlock()`.
 */
export function createDocumentStorage(kv: Kv): DocumentStorage {
  let loaded = false;

  const backUp = async (name: string, doc: unknown) => {
    try {
      if ((await kv.get(backupKey(name))) == null) await kv.set(backupKey(name), doc);
    } catch {
      // The write gate still protects the original, so a failed backup is not fatal.
    }
  };

  return {
    async getItem(name) {
      const doc = await kv.get(name);
      if (doc == null) {
        loaded = true;
        return null;
      }
      const result = loadPersisted(doc);
      if (!result.ok) {
        await backUp(name, doc);
        throw new PersistLoadError(result.error);
      }
      loaded = true;
      return { state: result.state, version: PERSIST_VERSION };
    },
    async setItem(name, value) {
      if (!loaded) return;
      await kv.set(name, { version: PERSIST_VERSION, state: value.state });
    },
    removeItem: (name) => kv.del(name),
    unlock() {
      loaded = true;
    },
  };
}
