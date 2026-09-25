# Backlog

Deferred work, one line each, grouped by the phase it belongs to. Phase scope comes from the [roadmap](superpowers/plans/2026-09-25-roadmap.md). Remove a line when it's done.

## Phase 4: UI foundation

- `src/core/tokens.ts` → CSS variables → Tailwind `@theme`; theme and felt switching; Nunito font ([ADR 0004](adr/0004-theme-tokens-in-typescript.md))
- `ui/` primitives: Sheet (vaul), Popover/Dialog, Button, Avatar, Segmented, Chip
- Router shell with lazy routes and an ErrorBoundary per route

## Phase 5: Screens

- All screens from the handoff, plus RTL tests for the full Deal and Match flow
- Failed-load screen: explain, offer "start fresh" via `resetData()` ([ADR 0006](adr/0006-gate-persistence-writes-until-load.md))
- Save-error banner for `saveError`; decide whether a later successful write clears it
- `src/core/strings.ts`: Bulgarian copy for every core code, including `in-match`, the `NameError`s and the `SaveDealError`s
- Avatar component that loads photo Blobs from `photoStore` (object URLs)

## Phase 6: Share & import

- Payload v2, codec, link, multi-part QR, scanner, `.belot` file, merge/continue/replace ([ADR 0005](adr/0005-share-format-v2-no-prototype-compat.md))
- Export the `belot-state.backup` document after a failed load

## Phase 7: PWA & polish

- `vite-plugin-pwa`, manifest and icons, favicon, a11y pass, Playwright happy path, bundle check

## Unassigned

- One redundant write of the loaded document on every app start (zustand persist + the `hydration: 'ready'` update)
- `memoryKv` stores references, not structured clones, so tests can't catch values IndexedDB would refuse
- The rejecting-`set` store test uses a loose write-count bound (`<= 4`; the expected count is 2)
- Store `removePlayer` returns `ok` for an unknown id, and its name shadows the core `removePlayer` import
- Photo cleanup for orphaned Blobs (must keep ids referenced by the backup)
