# Testing

How the project is tested, and what must pass before work counts as done.

## The gate

`pnpm check` runs Biome (lint and format), both typechecks (`tsc -b` for the app, `tsc -p tsconfig.core.json` for core without `dom`) and the Vitest suite. It must pass at the end of every task. `pnpm docs:check` verifies the links in this vault.

## Core: test-first

Every change to `src/core` starts with a failing Vitest test in the `*.test.ts` file beside the module. Tests run in the Node environment (`vite.config.ts`, `include: src/**/*.test.ts, test/**/*.test.ts`).

## Golden deals and prototype parity

- `src/core/testing/golden-deals.ts` holds hand-checked Deal scenarios used by the scoring tests. The [golden deals review sheet](../golden-deals.md) presents them for the product owner.
- `test/prototype/` extracts the original HTML prototype's scoring logic (`legacy.js`) and runs a generated sweep plus the golden cases through both implementations (`parity.test.ts`), so the new code matches the prototype wherever the spec agrees with it.

## Store and storage

- Store tests build a store with `createAppStore` and an in-memory `Kv` (`memoryKv`), a counter for `newId` and a fixed `now`. They never import `src/store/instance.ts`.
- Failure paths use a `Kv` whose `get` or `set` rejects: write gate, backup, `saveError`, `resetData`.

## UI: component tests

- `src/test-setup.ts` (wired via `vite.config.ts`'s `test.setupFiles`) registers React Testing Library's `afterEach(cleanup)` — Vitest's own globals are off, so RTL can't self-register it. It checks `typeof document !== 'undefined'` first, since core's Node-environment tests have no DOM.
- A component test needs a DOM, which the shared Node environment doesn't give it. Add happy-dom per file with a first-line docblock (`// @vitest-environment happy-dom`) above the imports, and write the test with React Testing Library.
- **happy-dom has no Popover API** (`showPopover`/`hidePopover`/`:popover-open`), so `src/ui/Popover.tsx` guards those calls (`canTogglePopover`) and its component tests can only assert the card renders open, not its light-dismiss or Esc behaviour. That's verified by hand in a real browser via `/dev/ui` (DEV-only route, see below).

## Screen tests

- `src/test-setup.ts` also imports `fake-indexeddb/auto` before anything else runs, so `src/routes/*.test.tsx` can exercise the real store (`src/store/instance.ts`) and its IndexedDB-backed persistence without mocking `idb-keyval`.
- `src/test/app.tsx` gives screen tests two helpers: `resetApp()` calls the store's `resetData()` to reach the state a fresh install has (empty roster, writes unlocked, hydration ready), called in a `beforeEach`; `renderRoute(path)` mounts the real route table (`src/app/routes.tsx`'s `routes`) in a `createMemoryRouter` at `path` and returns `{ router, ...renderResult }`, so a screen test asserts against the actual router shell — lazy routes and all — instead of rendering a route component in isolation. Tests still need `findBy…` queries for anything behind a lazy route.
- `src/routes/home.test.tsx` and `src/routes/setup.test.tsx` are the pattern to follow: `beforeEach(() => resetApp())`, then `renderRoute('/')` / `renderRoute('/setup')` per test, driven with `@testing-library/user-event`.
- **Gotcha: `renderRoute` clones the route tree before handing it to a router.** React Router 8 resolves an object-form `lazy` route definition (`lazy: { Component: fn }`) by mutating that object in place — once resolved it sets `route.lazy.Component = undefined`. `convertRoutesToDataRoutes` only shallow-copies each route, so a route's `.lazy` object is shared by reference with the static `routes` singleton in `src/app/routes.tsx`. Without cloning, the first `renderRoute` call in a test file (or across files sharing the module registry) that resolves a lazy route would leave `routes` unable to ever load it again, breaking every later `renderRoute` call for that path. `cloneRoute` in `src/test/app.tsx` copies the tree and each route's own `.lazy` object so the mutation stays local to that one router.

## Manual check

`pnpm start` runs the dev server and opens the app. For store behaviour in a real browser, the dev server can `import('/src/store/instance.ts')` from the console. `/dev/ui` (DEV-only, registered in `src/app/routes.tsx`'s `LAZY_ROUTES`) renders every `src/ui` primitive in the current theme — the place to check things happy-dom can't cover, like popover light-dismiss, Esc-to-close and the actual sheet/popover motion, against the mockups.

## Planned

React Testing Library tests for the full Deal and Match flow (Phase 5b). A Playwright happy path and a bundle check (Phase 7). See the [roadmap](../superpowers/plans/2026-09-25-roadmap.md).

## See also

- [Architecture overview](Overview.md) · [Core domain](Core%20domain.md) · [Persistence](Persistence.md)
