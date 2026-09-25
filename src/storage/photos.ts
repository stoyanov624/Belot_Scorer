import type { Kv } from './kv';

/** Player photos as Blobs, keyed by the id stored in `Player.photo` (ADR 0003). */
export interface PhotoStore {
  put(blob: Blob): Promise<string>;
  get(id: string): Promise<Blob | undefined>;
  remove(id: string): Promise<void>;
}

export function createPhotoStore(kv: Kv, newId: () => string): PhotoStore {
  return {
    async put(blob) {
      const id = newId();
      await kv.set(id, blob);
      return id;
    },
    async get(id) {
      const value = await kv.get(id);
      return value instanceof Blob ? value : undefined;
    },
    remove: (id) => kv.del(id),
  };
}
