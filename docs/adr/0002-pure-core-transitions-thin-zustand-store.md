# Game logic as pure functions behind one thin Zustand store

All match behaviour (declare, set contract, save deal, undo last deal, hanging points, series) lives in `src/core` as pure `(state, …) => state` functions and selectors, unit-tested with Vitest. The Zustand store only calls them, persists the result and exposes narrow selectors. Values like totals, dealer, allowed declarations and verdict are derived, never stored. There is one store with slices (`roster`, `stats`, `match`, `settings`) under a single persisted key, so an import that "replaces all data" is one atomic write. UI state (open sheet or popover) stays in components.

## Considered Options

- Redux Toolkit: more structure and time-travel, but more boilerplate than the app needs.
- Context + useReducer: re-renders every consumer and needs hand-written persistence.
- XState: models the deal flow explicitly, but it's heavy for what is mostly data transformation.
- A single `applyAction(match, action)` reducer: gives an event log (useful for future live sync), but undo only needs to cover the last deal, and `prevHang` already handles that. Switching later is cheap.
