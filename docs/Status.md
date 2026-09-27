# Status

_Last updated: 2026-09-26 at commit 7c73b35._ Current state only; history lives in git.

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

All behaviour so far lives in `src/core`, `src/storage`, `src/store`, `src/ui`, `src/app`, `src/features` and `src/routes`, covered by tests.

## Next

- Phase 6 (share and import): write its plan; see the [roadmap](superpowers/plans/2026-09-25-roadmap.md).

## Open product questions

- **Copy not in the handoff:** the note shown instead of «Изтрий играча» for a seated player (placeholder text is live in `src/core/strings.ts`'s `register.inMatch`), and the accessible labels of the team-name fields — confirm the wording.
- **Copy not in the handoff (Phase 5c, ADR 0006):** confirm the wording of:
  - the failed-load screen's title, body and «Започни наново» (`recovery.title`/`recovery.body`/`recovery.reset` in `src/core/strings.ts`). The body's «Копие е запазено» isn't strictly guaranteed (see [Backlog](Backlog.md)).
  - the save-error banner (`recovery.saveError`).
  - the accessible name of the leaderboard's players/pairs switch («Класация по», `stats.tabs`).
- **End line after a tied match (deviates from the prototype):** «Край на мач K» uses the match number the table header shows, where ties don't count. The prototype's formula shows the previous match's number after a tie. Confirm.
- **«Продължи мача» for an ended match:** Home still shows it, and it opens `/end`, whose buttons leave the match (ADR 0011). Keep that label, or use another for an ended match?
- **«← Начало» on the table** is not in mockup 04 or the prototype. It was added (first in the header's button row) because resume-on-start would otherwise leave no way Home; keep or drop? The product owner decides after testing.
- **Step-2 contract pill:** «Без коз», «Всичко коз» (and «Спатия» from deal 10) wrap below «Край на раздаване N» at 390px; a symbol-only pill would fit. The product owner decides after testing.

## Known gaps

- On a portrait phone, setup scrolls (+143px at 390×844), as does the end screen (+20px), and the table header's button row scrolls sideways since «← Начало» was added.

- `saveError` stays true until `resetData` ([ADR 0006](adr/0006-gate-persistence-writes-until-load.md)).
- No favicon (404 in the browser console).
- Deal-end sheet: typed card points, the capot toggle and the open step aren't persisted across a reload (the contract, declarations and their resolution are).
- «Сподели» on the table and «Сподели / Внос» on Home are disabled until Phase 6.
- An untracked `package-lock.json` sits in the repo root. It isn't the project's (pnpm is used), so don't commit it.
