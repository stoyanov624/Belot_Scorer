import { type PersistStorage, persist } from 'zustand/middleware';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { EMPTY_STATE, PERSIST_VERSION, type PersistedState } from '../core/persisted';
import type { DocumentStorage } from '../storage/document';
import { type MatchActions, matchActions } from './match-actions';
import { type RosterActions, rosterActions } from './roster-actions';

export const STORAGE_KEY = 'belot-state';

export type Hydration = 'pending' | 'ready' | 'failed';

/** Everything platform-bound the store needs, injected so tests stay deterministic. */
export interface AppDeps {
  storage: DocumentStorage;
  newId: () => string;
  now: () => number;
  removePhoto: (id: string) => Promise<void>;
}

/** Runtime flags, never persisted. `saveError` turns true once a write to storage fails. */
export interface RuntimeState {
  hydration: Hydration;
  saveError: boolean;
}

export type AppState = PersistedState & RuntimeState & RosterActions & MatchActions;
export type SetState = StoreApi<AppState>['setState'];
export type GetState = StoreApi<AppState>['getState'];

export function createAppStore(deps: AppDeps) {
  // persist calls setItem on every setState and drops the promise, so failures are caught
  // here. Only flip the flag once: its own setState writes again, which may fail again.
  const storage: PersistStorage<PersistedState> = {
    getItem: (name) => deps.storage.getItem(name),
    removeItem: (name) => deps.storage.removeItem(name),
    async setItem(name, value) {
      try {
        await deps.storage.setItem(name, value);
      } catch {
        if (!store.getState().saveError) store.setState({ saveError: true });
      }
    },
  };

  const store = createStore<AppState>()(
    persist(
      (set, get) => ({
        ...EMPTY_STATE,
        hydration: 'pending',
        saveError: false,
        ...rosterActions(set, get, deps),
        ...matchActions(set, get, deps),
      }),
      {
        name: STORAGE_KEY,
        storage,
        version: PERSIST_VERSION,
        skipHydration: true,
        partialize: ({ roster, stats, match, settings }): PersistedState => ({
          roster,
          stats,
          match,
          settings,
        }),
        onRehydrateStorage: () => (_state, error) => {
          store.setState({ hydration: error ? 'failed' : 'ready' });
        },
      },
    ),
  );
  return store;
}

export type AppStore = ReturnType<typeof createAppStore>;
