import { type PersistStorage, persist } from 'zustand/middleware';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { EMPTY_STATE, PERSIST_VERSION, type PersistedState } from '../core/persisted';
import { type MatchActions, matchActions } from './match-actions';
import { type RosterActions, rosterActions } from './roster-actions';

export const STORAGE_KEY = 'belot-state';

export type Hydration = 'pending' | 'ready' | 'failed';

/** Everything platform-bound the store needs, injected so tests stay deterministic. */
export interface AppDeps {
  storage: PersistStorage<PersistedState>;
  newId: () => string;
  now: () => number;
  removePhoto: (id: string) => Promise<void>;
}

export type AppState = PersistedState & { hydration: Hydration } & RosterActions & MatchActions;
export type SetState = StoreApi<AppState>['setState'];
export type GetState = StoreApi<AppState>['getState'];

export function createAppStore(deps: AppDeps) {
  const store = createStore<AppState>()(
    persist(
      (set, get) => ({
        ...EMPTY_STATE,
        hydration: 'pending',
        ...rosterActions(set, get, deps),
        ...matchActions(set, get, deps),
      }),
      {
        name: STORAGE_KEY,
        storage: deps.storage,
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
