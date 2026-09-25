import { del, get, set, type UseStore } from 'idb-keyval';

/** The storage surface the app needs. IndexedDB on the web, MMKV/files on mobile later. */
export interface Kv {
  /** Resolves `undefined` (or `null`) when the key is absent. */
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  del(key: string): Promise<void>;
}

export function idbKv(store?: UseStore): Kv {
  return {
    get: (key) => get(key, store),
    set: (key, value) => set(key, value, store),
    del: (key) => del(key, store),
  };
}

/** In-memory Kv for tests. `data` is exposed so tests can seed and inspect it. */
export function memoryKv(
  initial: Record<string, unknown> = {},
): Kv & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>(Object.entries(initial));
  return {
    data,
    get: async (key) => data.get(key),
    set: async (key, value) => {
      data.set(key, value);
    },
    del: async (key) => {
      data.delete(key);
    },
  };
}
