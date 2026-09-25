import { createStore } from 'idb-keyval';
import { useStore } from 'zustand';
import { newId } from '../lib/id';
import { createDocumentStorage } from '../storage/document';
import { idbKv } from '../storage/kv';
import { createPhotoStore } from '../storage/photos';
import { type AppState, createAppStore } from './app-store';

/** Separate IndexedDB database so photo Blobs never load with the state document. */
export const photoStore = createPhotoStore(idbKv(createStore('belot-photos', 'photos')), newId);

export const appStore = createAppStore({
  storage: createDocumentStorage(idbKv()),
  newId,
  now: () => Date.now(),
  removePhoto: (id) => photoStore.remove(id),
});

/** Read store state in components. Select narrowly: one value or one action per call. */
export function useAppStore<T>(selector: (s: AppState) => T): T {
  return useStore(appStore, selector);
}

/** Loads saved data. Call once, before the first render. */
export const hydrateAppStore = (): Promise<void> => Promise.resolve(appStore.persist.rehydrate());
