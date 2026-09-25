# Backlog

Deferred work, one line each, grouped by the phase it belongs to. Phase scope comes from the [roadmap](superpowers/plans/2026-09-25-roadmap.md). Remove a line when it's done.

## Phase 4: UI foundation

- `src/core/tokens.ts` test covers only the `casino` theme's `themeVars` output
- `src/ui/Popover.tsx` doesn't reposition on resize/scroll
- `src/routes/home.tsx` duplicates `Button` secondary classes for its links instead of reusing `Button`; when Home is rebuilt, export a `buttonClass(variant, size)` from `src/ui/Button.tsx` for link-styled buttons
- `src/ui/Chip.tsx` is always a toggle (`aria-pressed`); there is no non-interactive badge component yet
- `src/ui/Sheet.tsx` keeps its children mounted while closed, so form state persists across cancel and reopen
- `src/ui/Popover.tsx`: the anchor has no `aria-expanded`/`aria-controls`
- `src/app/PreloadLink.tsx` preloads on hover/focus only; add touch (`pointerdown`) or idle preload
- `/dev/ui` gallery has double horizontal padding (its own inside `RootLayout`'s)
- `src/app/RouteError.tsx`: a per-route error inside `RootLayout` gets double side padding (its own `px-4` plus the layout's)
- `src/ui/Sheet.tsx` / `src/ui/Popover.tsx`: closing and reopening an overlay within the same task can let the late `close`/`toggle` event close it again (guard reads the `open` prop; checking the element's live state would close the gap)
- `src/ui/Segmented.tsx`: arrow keys call `preventDefault` even with a modifier held (e.g. Alt+ArrowLeft)
- `src/routes/dev-ui.tsx` (the `/dev/ui` gallery): doesn't demo the `Avatar` photo variant (`photoStore` unused); its labels are Bulgarian literals outside `src/core/strings.ts` (accepted as a dev-tool carve-out)

## Phase 5: Screens

- All screens from the handoff, plus RTL tests for the full Deal and Match flow
- Failed-load screen: explain, offer "start fresh" via `resetData()` ([ADR 0006](adr/0006-gate-persistence-writes-until-load.md))
- Save-error banner for `saveError`; decide whether a later successful write clears it
- `src/core/strings.ts`: Bulgarian copy for every core code, including `in-match`, the `NameError`s and the `SaveDealError`s
- Avatar component that loads photo Blobs from `photoStore` (object URLs)
- `src/ui/Avatar.tsx`'s border is a fixed 3px; the prototype uses 2px at 48px and 4px at 100px (the spec only names 3px) — add a width option once real screens wire those sizes

## Phase 6: Share & import

- Payload v2, codec, link, multi-part QR, scanner, `.belot` file, merge/continue/replace ([ADR 0005](adr/0005-share-format-v2-no-prototype-compat.md))
- Export the `belot-state.backup` document after a failed load

## Phase 7: PWA & polish

- `vite-plugin-pwa`, manifest and icons, favicon, a11y pass, Playwright happy path, bundle check
- Playwright smoke script for `/dev/ui`: every theme, avatar ring border widths, switching popovers, Sheet Esc, the dark pre-paint background

## Unassigned

- One redundant write of the loaded document on every app start (zustand persist + the `hydration: 'ready'` update)
- `memoryKv` stores references, not structured clones, so tests can't catch values IndexedDB would refuse
- The rejecting-`set` store test uses a loose write-count bound (`<= 4`; the expected count is 2)
- Store `removePlayer` returns `ok` for an unknown id, and its name shadows the core `removePlayer` import
- Photo cleanup for orphaned Blobs (must keep ids referenced by the backup)
