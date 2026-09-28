# Status

_Last updated: 2026-09-28 at commit 2e4ea1b._ Current state only; history lives in git.

## Done

- Phase 1–2: scaffold and core domain ([plan](superpowers/plans/2026-09-25-phase-1-2-scaffold-and-core.md))
- Phase 3: store and persistence ([plan](superpowers/plans/2026-09-25-phase-3-store-and-persistence.md)), including the write gate from the final review ([ADR 0006](adr/0006-gate-persistence-writes-until-load.md))
- Obsidian vault and `/handoff` ([spec](superpowers/specs/2026-09-25-obsidian-vault-design.md), [plan](superpowers/plans/2026-09-25-obsidian-vault.md))
- Phase 4: UI foundation ([plan](superpowers/plans/2026-09-25-phase-4-ui-foundation.md)): `tokens.ts` → CSS variables → Tailwind `@theme`, Nunito, `src/ui` primitives (Button, Chip, Segmented, Avatar, Sheet and Popover on the native `<dialog>`/popover APIs — [ADR 0008](adr/0008-native-dialog-and-popover-over-vaul.md)), the `src/app` router shell (lazy routes, per-route error boundaries), placeholder screens in `src/routes`, and a DEV-only primitive gallery at `/dev/ui`. The final-review fixes are in: team colours are `team-a`/`team-b`, the theme paints before hydration, overlays report only user dismissals, and `Segmented` has radio keyboard support.
- Phase 5a: home, players, setup ([plan](superpowers/plans/2026-09-25-phase-5a-players-and-setup.md)): [ADR 0009](adr/0009-match-snapshots-rules.md) (a match snapshots its scoring rules at start; stored document moves to `PERSIST_VERSION` 2, with a 1→2 migration), [ADR 0010](adr/0010-seated-player-cannot-be-deleted.md) (a player seated in the current match can't be deleted); `src/core/avatars.ts` (`AVATAR_EMOJI`, `randomEmoji`) and `draftFromSeats` in `src/core/roster.ts`; `Button` sizes `sm`/`md`/`lg`, variants `dangerText`/`muted`, and `buttonClass()` for link-styled buttons (`src/ui/Button.tsx`); `Avatar`/`PlayerAvatar`'s `decorative` prop, which hides a photo/emoji from the accessibility tree when a visible name sits next to it; `src/features/players/` (`PlayerAvatar`, `RegisterSheet`, lazy-loaded `crop-photo`) and `src/features/settings/ThemeSheet.tsx` (fieldset/legend groups instead of lint suppressions); `src/routes/home.tsx` (players grid, register and theme sheets) and `src/routes/setup.tsx` (team cards, seat sheet, series control); screen-test infra — `fake-indexeddb` wired into `src/test-setup.ts`, and `src/test/app.tsx`'s `resetApp`/`renderRoute` (see [Testing](Architecture/Testing.md)). A real-browser check (390×844) confirmed the screens against the mockups, live persistence across reload, and a clean console.
- Phase 5b: table and deal flow ([plan](superpowers/plans/2026-09-25-phase-5b-table.md)): [ADR 0011](adr/0011-resume-and-replace-matches.md) (a stored match resumes on start, Home offers «Продължи мача», starting a new match over a playing one with saved deals asks first; an ended match at `/table` goes on to `/end`, and leaving the table for `/end` replaces it in history); `src/routes/table.tsx` wires the table, and `src/features/table/` holds its parts (`TableHeader` with «← Начало», `Seat`, `Coaster`, `ContractPill`, `ContractSheet`, `DealEndSheet` with its resolve and points steps, `ClearSheet`, `EndMatchSheet`), `copy.ts` (formats core results into the handoff's sentences) and `seat-player.ts` (seat → player lookup); `src/ui` additions: `Sheet`'s `subtitle` (describes the dialog) and `aside` (title stays on one line beside it), `Button` variants `dangerFilled` and size `bar` plus dimmed `aria-disabled` (not on `muted`), `Chip` tone `sunken` and an optional `selected` (omitted = an action chip), `Avatar`'s `style` override, `Popover`'s `data-placement`. Routes now own their vertical padding. A real-browser check at 390×844 matched mockups 04–09, with correct scoring, hanging points, undo, resume and the manual end. Product owner decisions (2026-09-26): the clear sheet gets the prototype's «Отказ»; the 5b copy not in the handoff («Продължи мача», the replace-match confirmation, «Премахни …») is approved.
- Phase 5c: history, match end, leaderboard, recovery ([plan](superpowers/plans/2026-09-26-phase-5c-history-end-stats.md)). The app is now feature-complete for a single device.
  - Core: `validDeclarationTotals` (valid declaration points per team, with `match.rules`) and `seatsOf(team)` in `rules.ts`.
  - Store: `clearStats`.
  - Pure copy helpers: `src/features/history/copy.ts` (`historyEntries`, `currentEntry`), `src/features/end/copy.ts` (`endSummary`), `src/features/stats/copy.ts` (`statsSub`, `statsName`), and `seriesFormat` in `src/features/table/copy.ts`.
  - Screens:
    - `src/routes/history.tsx`: in-progress card, past deals newest first, dropped declarations struck through, inside/hang/capot notes.
    - `src/routes/end.tsx`: winner or tie, series card, «Мач N →»/«Прекрати» or «Към началния екран»/«Реванш». Leaving calls `leaveMatch()` and replaces `/end`.
    - `src/routes/stats.tsx`: players/pairs tabs, two-press reset.
  - `RootLayout`: the failed-load recovery screen («Започни наново» → `resetData`) and the `role="alert"` save-error banner.
  - A real-browser check at 390×844 matched mockups 10–13: a best-of-3 series played through the UI, the leave flow with reload, the leaderboard reset, and recovery from a corrupt stored document (the backup was kept).

- Laptop fit ([ADR 0012](adr/0012-scale-with-viewport-height.md)): the table, end screen and setup fit a laptop browser window without scrolling, down to 650px tall. The sheets' action buttons stay visible, and the resolve cards take one line each on wide sheets. Portrait phones are unchanged.
- Phase 6a: share and import by link, QR and file ([plan](superpowers/plans/2026-09-27-phase-6a-share-and-import.md), [ADR 0013](adr/0013-import-merge-take-replace.md)). Data moves between devices with no server.
  - Core: `src/core/share.ts` (payload v2 per [ADR 0005](adr/0005-share-format-v2-no-prototype-compat.md), `extractCode`, `shareLink`, `qrTexts` with 1400/1100 QR chunking) and `src/core/import.ts` (`applyImport` — merge/take/replace with a two-pass id remap so a rename can't seat one player twice; photos never travel in 6a; `needsTakeConfirm`).
  - Platform: `src/share/codec.ts` (deflate-raw + base64url, `z`/`j` prefixes; `.belot` files are plain JSON).
  - Store: `importShared` (replace also drops photo blobs no longer referenced).
  - UI, all lazy-loaded: `src/features/share/` — `ShareSheet` (scope switch, QR with white quiet-zone frame, multi-part «Част i от n» cycling at 900 ms, «Копирай линк» via Web Share/clipboard, «Изпрати файл» via Web Share/download) and `ImportSheet` (paste/file, «Намерено» preview, merge / take with an ADR 0011-style confirmation / two-press replace). Opened from Home («Сподели / Внос») and the table («Сподели»); a `#belot=` link opens import directly (`startPath`, hash cleared).
  - A two-context browser check verified the link, file, take, confirm, replace and multi-part QR flows end to end; console clean.
- Team-name verb agreement (product owner, 2026-09-28): «Ние»/«Вие» conjugate the copy in first/second person plural («Ние печелим», «Вие черпите», «изкарахме», «взимаме», «не записваме»); custom team names keep the handoff's third person. Deviates from the handoff's fixed forms; matching is trimmed and case-insensitive (`src/core/strings.ts`).
- Phase 6b: camera scanner and photos in the file ([plan](superpowers/plans/2026-09-28-phase-6b-scanner-and-photos.md)). Phase 6 is complete — data moves by link, QR (single and multi-part), camera scan and `.belot` file.
  - Core: `readScanText` in `share.ts` assembles `BELOT|sid|i|n|chunk` scans purely (any order, duplicates, session restarts); the payload's optional `photos` map (id → data URL) and `buildPayload(..., withPhotos)`.
  - Platform/store: `src/share/photos.ts` (`attachPhotos`, `dataUrlToBlob`); async `importShared` resolves embedded photos into the photo store under fresh local ids before `applyImport` — no two players ever share a photo id, an unresolvable id becomes null, and a failed photo write costs that photo, not the import ([ADR 0013](adr/0013-import-merge-take-replace.md)).
  - Share sheet: the handoff's «Включи снимките във файла (линкът и QR са без снимки)» checkbox — file-only, link/QR stay photo-free.
  - Import sheet: «📷 Сканирай QR код» (`qr-scanner@1.4.2`, loaded on press), the aiming-frame video square, «Прочетени k от n части», «Спри камерата», and the handoff's camera error.
  - Browser-checked: a photo travelled A→B through the file end to end (data URL in the file, a fresh blob in B's store, the avatar renders); the scanner started on a fake camera and stopped cleanly.
- Phase 7: PWA & polish ([plan](superpowers/plans/2026-09-28-phase-7-pwa-and-polish.md)). **v1 is feature-complete.**
  - Installable PWA: generated icons (`scripts/icon.svg` → `pnpm icons`), manifest (name «Белот», standalone, `#1f1007`), `vite-plugin-pwa` with `autoUpdate` and offline precache (verified: offline reload renders from cache), a live `theme-color` meta following the in-app theme, and a favicon at last (the 404 is gone).
  - 150–200 ms exit transitions for sheets and popovers (`data-closing` phase before the native close; reduced motion skips them), and the deal-end sheet's title no longer flips to the next deal while closing.
  - Accessibility: every single-choice group (emoji, theme/felt tiles, contract tiles, caller, resolution chips) is a real radiogroup with roving tabindex and arrow keys (`src/ui/radio-nav.ts`); `sm` chips carry a 44px hit target; seats are `role="group"`; the history link announces «История»; history/stats headings are `h2`; picking or removing a declaration returns focus to the seat.
  - The save-error banner clears itself on the next successful write; the step-2 contract pill is symbol-only («ВК») with the full game as its accessible name — no more wrapping at 390px.
  - Committed Playwright e2e (`pnpm e2e`): the full happy path, a two-context share→import, and reload-resume; plus a DEV_UI-gated `/dev/ui` smoke. A bundle budget (`pnpm bundle`): entry 90.6 kB gz ≤ 105, total JS ≤ 210.
- Product decisions (2026-09-28): keep «← Начало» on the table; the step-2 pill is symbol-only; the save-error banner self-clears; and all previously open copy/behaviour questions are **accepted as built** — the recovery screen and banner texts, «Класация по», «Какво да се сподели», «Линк или код», «QR код», «Продължи мача» also for an ended match, the tie match-numbering, «Текущия мач» offered from Home while a match plays, and import's photo-over-emoji rule (ADR 0013).

All behaviour so far lives in `src/core`, `src/storage`, `src/store`, `src/ui`, `src/app`, `src/features` and `src/routes`, covered by tests.

## Next

- v1 is done. Next: deploy over HTTPS (needed for the camera and installability on phones), then React Native (see the handover document).

## Open product questions

- **Copy not in the handoff (Phase 5a):** the note shown instead of «Изтрий играча» for a seated player (`register.inMatch`) and the accessible labels of the team-name inputs — still awaiting wording confirmation.

## Known gaps

- Real-device QR scanning is untested: the camera needs HTTPS (or localhost), so a phone-to-phone scan waits for a deployment; the iOS file picker may also grey out `.belot` (the `accept` filter) — both need a test on real phones.
- Component tests can't round-trip the photo store: fake-indexeddb doesn't survive this repo's happy-dom test environment, so sheet tests stub `photoStore` (see `register-sheet.test.tsx` and `share-sheet.test.tsx` for the pattern).
- On a portrait phone, setup scrolls (+143px at 390×844), as does the end screen (+20px), and the table header's button row scrolls sideways since «← Начало» was added.

- `saveError` stays true until `resetData` ([ADR 0006](adr/0006-gate-persistence-writes-until-load.md)).
- Deal-end sheet: typed card points, the capot toggle and the open step aren't persisted across a reload (the contract, declarations and their resolution are).
- An untracked `package-lock.json` sits in the repo root. It isn't the project's (pnpm is used), so don't commit it.
