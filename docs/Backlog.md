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

## Phase 6a: Share & import

- `norm` (trimmed bg-locale lowercase) is duplicated in `src/core/import.ts` and `src/core/roster.ts`
- `src/core/import.test.ts`: `players` never asserted for `take`; `src/routes/setup.tsx` could reuse `needsTakeConfirm`
- `src/share/codec.ts`: no direct `readShared` unknown-prefix test; the `as BlobPart` cast has no explaining comment; no size cap on decompression (a crafted link can expand ~1000:1)
- `src/features/share/share-sheet.test.tsx`: the 900 ms QR-cycling test mixes fake timers with real async and is delicate
- Home's import close path (`params.has('import')` guard) is untested
- Replacing from the table with a no-match payload redirects before the «Готово…» message is seen
- «Изпрати файл» falls back to download when `canShare` rejects the `.belot` extension (Chrome Android); iOS may grey out `.belot` in the file picker because of the `accept` filter — verify on a real iPhone in 6b and drop `accept` if so
- CONTEXT.md says a shared match "continues"; the code says `take`/`tookMatch` — align the vocabulary

## Phase 6b: Scanner & photos

- `src/store/roster-actions.ts`: ~40 lines of photo resolution sit in `importShared`; a `resolvePhotos(data, localIds, put)` in `src/share/photos.ts` would keep the store thin and test on its own
- `src/features/share/ImportSheet.tsx`: a paste/file read succeeding while the camera runs leaves it scanning — a later decoded frame replaces the preview mid-choice; stop the scanner when a preview appears
- The camera error renders in the sheet's generic error slot below the paste area; the prototype puts it beside the scan button — product call
- «Спри камерата» is 44px (`sm`); the prototype says 48px, a size the Button scale lacks
- `src/share/photos.ts` near-duplicates `codec.ts`'s binary-string helpers; `dataUrlToBlob` accepts any MIME type (an `image/` check is cheap); the regex capture-tuple casts in `share.ts`/`photos.ts` bypass `noUncheckedIndexedAccess`
- `src/core/import.test.ts`: replace mode lacks a photo+emoji-both-set incoming fixture; no fixture uses an emoji-only local player
- `src/features/players/RegisterSheet.tsx`: the in-component `import('./crop-photo')` makes the React Compiler skip RegisterForm (harmless today; hoist like the scanner's loader to restore memoization)
- The import sheet's effect-local `stop()`/guarded-read duplicate `stopScanner`/`readCode` (kept for compiler-independence; unify if it grows)
- Export the `belot-state.backup` document after a failed load

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
