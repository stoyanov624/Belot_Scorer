# Backlog

Deferred work, one line each, grouped by the phase it belongs to. Phase scope comes from the [roadmap](superpowers/plans/2026-09-25-roadmap.md). Remove a line when it's done.

## Phase 4: UI foundation

- `src/core/tokens.ts` test covers only the `casino` theme's `themeVars` output
- `src/ui/Popover.tsx` doesn't reposition on resize/scroll
- `src/ui/Chip.tsx` is always a toggle (`aria-pressed`); there is no non-interactive badge component yet
- `src/ui/Popover.tsx`: the anchor has no `aria-expanded`/`aria-controls`
- `src/app/PreloadLink.tsx` preloads on hover/focus only; add touch (`pointerdown`) or idle preload
- `/dev/ui` gallery has double horizontal padding (its own inside `RootLayout`'s)
- `src/app/RouteError.tsx`: a per-route error inside `RootLayout` gets double side padding (its own `px-4` plus the layout's)
- `src/ui/Sheet.tsx` / `src/ui/Popover.tsx`: closing and reopening an overlay within the same task can let the late `close`/`toggle` event close it again (guard reads the `open` prop; checking the element's live state would close the gap)
- `src/ui/Segmented.tsx`: arrow keys call `preventDefault` even with a modifier held (e.g. Alt+ArrowLeft)
- `src/routes/dev-ui.tsx` (the `/dev/ui` gallery): doesn't demo the `Avatar` photo variant (`photoStore` unused); its labels are Bulgarian literals outside `src/core/strings.ts` (accepted as a dev-tool carve-out)

## Phase 5: Screens

- Remaining screens from the handoff (table, history, end, stats), plus RTL tests for the full Deal and Match flow
- Failed-load screen: explain, offer "start fresh" via `resetData()` ([ADR 0006](adr/0006-gate-persistence-writes-until-load.md))
- Save-error banner for `saveError`; decide whether a later successful write clears it
- `src/core/strings.ts`: Bulgarian copy for the remaining core codes — declaration resolution/scoring errors and `SaveDealError` (`in-match` and the `NameError`s are covered, added in 5a)
- `src/ui/Avatar.tsx`'s border is a fixed 3px; the prototype uses 2px at 48px and 4px at 100px (the spec only names 3px) — add a width option once real screens wire those sizes

## Phase 5a: Home, players and setup

- `src/ui/controls.test.tsx`'s `toContain('h-11')` assertion also matches `BASE`'s `min-h-11`, so it's weaker than it looks
- `src/routes/setup.test.tsx` asserts a couple of sheet titles as Bulgarian literals (`'Място: Север'`, `'Нов играч'`) instead of via `STRINGS`

## Phase 5b: Table & play

- Resume/leave a match: on startup with a stored match, go to /table (playing) or /end (ended)? Does going Home or starting a new setup leave the match (`leaveMatch` has no caller yet; ADR 0010's 'until the match is left')? The prototype stores `screen` and resumes. Decide at the start of the 5b plan.
- A started match is replaced without warning when "Раздавай!" is pressed again from setup, as in the prototype — `src/routes/setup.tsx`'s `start()` calls `startMatch` unconditionally once the draft is complete
- `scoreDeal`, `resolve`, `declPoints` and `leaderboard` still default `rules` to `DEFAULT_RULES`; every match path passes `match.rules` today, but dropping the defaults would stop a future caller silently scoring with the wrong rules (ADR 0009)
- RootLayout padding: decide per-screen padding with the table — `src/app/RootLayout.tsx`'s `px-4 py-6` (16/24px) doesn't match the handoff's home padding (`48px 20px 32px`)

## Phase 6: Share & import

- Payload v2, codec, link, multi-part QR, scanner, `.belot` file, merge/continue/replace ([ADR 0005](adr/0005-share-format-v2-no-prototype-compat.md))
- Export the `belot-state.backup` document after a failed load
- Share «Текущия мач» payload must carry `match.rules` ([ADR 0009](adr/0009-match-snapshots-rules.md))

## Phase 7: PWA & polish

- `vite-plugin-pwa`, manifest and icons, favicon, a11y pass, Playwright happy path, bundle check
- a11y: single-choice groups (emoji grid, theme/felt tiles) use `aria-pressed` toggles; consider radio-group semantics
- Playwright smoke script for `/dev/ui`: every theme, avatar ring border widths, switching popovers, Sheet Esc, the dark pre-paint background

## Unassigned

- `src/features/players/RegisterSheet.tsx` (dev only): a Fast Refresh edit that re-runs effects while an unsaved upload is pending deletes its blob while the form still shows it
- One redundant write of the loaded document on every app start (zustand persist + the `hydration: 'ready'` update)
- `memoryKv` stores references, not structured clones, so tests can't catch values IndexedDB would refuse
- The rejecting-`set` store test uses a loose write-count bound (`<= 4`; the expected count is 2)
- Store `removePlayer` returns `ok` for an unknown id, and its name shadows the core `removePlayer` import
- Photo cleanup for orphaned Blobs (must keep ids referenced by the backup)
