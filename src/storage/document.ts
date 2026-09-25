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

/**
 * Zustand persist storage over one versioned document. Migrations and validation run on
 * read (core `loadPersisted`). A document that can't be loaded is copied to
 * `backupKey(name)` before the error surfaces, because the store will overwrite
 * the original with defaults on its next write.
 */
export function createDocumentStorage(kv: Kv): PersistStorage<PersistedState> {
  return {
    async getItem(name) {
      const doc = await kv.get(name);
      if (doc === undefined) return null;
      const result = loadPersisted(doc);
      if (!result.ok) {
        await kv.set(backupKey(name), doc);
        throw new PersistLoadError(result.error);
      }
      return { state: result.state, version: PERSIST_VERSION };
    },
    setItem: (name, value) => kv.set(name, { version: PERSIST_VERSION, state: value.state }),
    removeItem: (name) => kv.del(name),
  };
}
