import type { AppDeps, GetState, SetState } from './app-store';

/** Filled in by the next task. */
export type MatchActions = Record<never, never>;

export function matchActions(_set: SetState, _get: GetState, _deps: AppDeps): MatchActions {
  return {};
}
