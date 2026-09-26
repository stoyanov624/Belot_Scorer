# Backlog

Deferred work, one line each, grouped by the phase it belongs to. Phase scope comes from the [roadmap](superpowers/plans/2026-09-25-roadmap.md). Remove a line when it's done.

## Phase 4: UI foundation

- `src/core/tokens.ts` test covers only the `casino` theme's `themeVars` output
- `src/ui/Popover.tsx` doesn't reposition on resize/scroll
- `src/ui/Chip.tsx`: there is no non-interactive badge component yet (the table's dealer badge is a plain `<p>`)
- `src/ui/Popover.tsx`: the anchor has no `aria-controls`, and `aria-expanded` is left to each caller (the table's `Seat` sets it)
- `src/app/PreloadLink.tsx` preloads on hover/focus only; add touch (`pointerdown`) or idle preload
- `/dev/ui` gallery has double horizontal padding (its own inside `RootLayout`'s)
- `src/app/RouteError.tsx`: a per-route error inside `RootLayout` gets double side padding (its own `px-4` plus the layout's)
- `src/ui/Sheet.tsx` / `src/ui/Popover.tsx`: closing and reopening an overlay within the same task can let the late `close`/`toggle` event close it again (guard reads the `open` prop; checking the element's live state would close the gap)
- `src/ui/Segmented.tsx`: arrow keys call `preventDefault` even with a modifier held (e.g. Alt+ArrowLeft)
- `src/routes/dev-ui.tsx` (the `/dev/ui` gallery): doesn't demo the `Avatar` photo variant (`photoStore` unused); its labels are Bulgarian literals outside `src/core/strings.ts` (accepted as a dev-tool carve-out)

## Phase 5: Screens

- `saveError` never clears: decide whether a later successful write should hide the banner
- `src/core/strings.ts`: no copy for `SaveDealError`'s `no-contract`/`match-ended` (the UI can't reach them today), and a failed save in the deal-end sheet is silent
- `src/ui/Avatar.tsx`'s border is a fixed 3px; the prototype uses 2px at 48px (leaderboard) and 4px at 100px (end screen), both now wired — add a width option

## Phase 5a: Home, players and setup

- `src/ui/controls.test.tsx`'s `toContain('h-11')` assertion also matches `BASE`'s `min-h-11`, so it's weaker than it looks
- `src/routes/setup.test.tsx` asserts a couple of sheet titles as Bulgarian literals (`'Място: Север'`, `'Нов играч'`) instead of via `STRINGS`

## Phase 5b: Table & play

- `scoreDeal`, `resolve`, `declPoints` and `leaderboard` still default `rules` to `DEFAULT_RULES`; every match path passes `match.rules` today, but dropping the defaults would stop a future caller silently scoring with the wrong rules (ADR 0009)
- `src/features/table/DealEndSheet.tsx`: no UI tests for card-point parse edge cases (`abc`, `-3`, `017`, B above max)
- `src/features/table/*`: the sheets repeat the 13/800 uppercase label class string; `src/routes/setup.tsx` repeats the `isDraftComplete` guard in `start` and `beginMatch`
- The step-2 contract pill wraps below the title for «Без коз»/«Всичко коз» (and «Спатия» from deal 10) at 390px; a shorter pill (symbol only?) would keep it beside the title — product call

## Phase 5c: History and wrap

- Heading levels skip: history's deal cards and the leaderboard rows are `h3` directly under the `h1` (history's `h2` appears only while a deal is in progress)
- `src/core/strings.ts`'s «Копие е запазено» in `recovery.body` overstates it slightly: `backUp` swallows write failures and keeps an older existing backup instead of the new bad document

## Phase 6: Share & import

- Payload v2, codec, link, multi-part QR, scanner, `.belot` file, merge/continue/replace ([ADR 0005](adr/0005-share-format-v2-no-prototype-compat.md))
- Export the `belot-state.backup` document after a failed load
- Share «Текущия мач» payload must carry `match.rules` ([ADR 0009](adr/0009-match-snapshots-rules.md))

## Phase 7: PWA & polish

- `vite-plugin-pwa`, manifest and icons, favicon, a11y pass, Playwright happy path, bundle check
- a11y: single-choice groups (emoji grid, theme/felt tiles, contract tiles, caller buttons, resolution chips) use `aria-pressed` toggles; consider radio-group semantics
- a11y: the table's declaration chips (`Chip` size `sm`) have a 26px hit area, below the 44px minimum
- a11y: the table's seats are `<section>` landmarks; make them `role="group"`
- a11y: focus return — after picking a declaration or removing a chip, and after the sequenced contract change (deal-end → contract sheet → deal-end)
- a11y: the table's history link is announced as «История 1» (the count badge joins the name)
- The deal-end sheet's title reads the next deal's number while it animates closed after a save; snapshot the title on open
- Playwright smoke script for `/dev/ui`: every theme, avatar ring border widths, switching popovers, Sheet Esc, the dark pre-paint background

## Unassigned

- `src/features/players/RegisterSheet.tsx` (dev only): a Fast Refresh edit that re-runs effects while an unsaved upload is pending deletes its blob while the form still shows it
- One redundant write of the loaded document on every app start (zustand persist + the `hydration: 'ready'` update)
- `memoryKv` stores references, not structured clones, so tests can't catch values IndexedDB would refuse
- The rejecting-`set` store test uses a loose write-count bound (`<= 4`; the expected count is 2)
- Store `removePlayer` returns `ok` for an unknown id, and its name shadows the core `removePlayer` import
- Photo cleanup for orphaned Blobs (must keep ids referenced by the backup)
