# Status

_Last updated: 2026-09-25 at commit b1f638a._ Current state only; history lives in git.

## Done

- Phase 1–2: scaffold and core domain ([plan](superpowers/plans/2026-09-25-phase-1-2-scaffold-and-core.md))
- Phase 3: store and persistence ([plan](superpowers/plans/2026-09-25-phase-3-store-and-persistence.md)), including the write gate from the final review ([ADR 0006](adr/0006-gate-persistence-writes-until-load.md))
- Obsidian vault and `/handoff` ([spec](superpowers/specs/2026-09-25-obsidian-vault-design.md), [plan](superpowers/plans/2026-09-25-obsidian-vault.md))
- Phase 4: UI foundation ([plan](superpowers/plans/2026-09-25-phase-4-ui-foundation.md)): `tokens.ts` → CSS variables → Tailwind `@theme`, Nunito, `src/ui` primitives (Button, Chip, Segmented, Avatar, Sheet and Popover on the native `<dialog>`/popover APIs — [ADR 0008](adr/0008-native-dialog-and-popover-over-vaul.md)), the `src/app` router shell (lazy routes, per-route error boundaries), placeholder screens in `src/routes`, and a DEV-only primitive gallery at `/dev/ui`. The final-review fixes are in: team colours are `team-a`/`team-b`, the theme paints before hydration, overlays report only user dismissals, and `Segmented` has radio keyboard support.
- Phase 5a: home, players, setup ([plan](superpowers/plans/2026-09-25-phase-5a-players-and-setup.md)): [ADR 0009](adr/0009-match-snapshots-rules.md) (a match snapshots its scoring rules at start; stored document moves to `PERSIST_VERSION` 2, with a 1→2 migration), [ADR 0010](adr/0010-seated-player-cannot-be-deleted.md) (a player seated in the current match can't be deleted); `src/core/avatars.ts` (`AVATAR_EMOJI`, `randomEmoji`) and `draftFromSeats` in `src/core/roster.ts`; `Button` sizes `sm`/`md`/`lg`, variants `dangerText`/`muted`, and `buttonClass()` for link-styled buttons (`src/ui/Button.tsx`); `Avatar`/`PlayerAvatar`'s `decorative` prop, which hides a photo/emoji from the accessibility tree when a visible name sits next to it; `src/features/players/` (`PlayerAvatar`, `RegisterSheet`, lazy-loaded `crop-photo`) and `src/features/settings/ThemeSheet.tsx` (fieldset/legend groups instead of lint suppressions); `src/routes/home.tsx` (players grid, register and theme sheets) and `src/routes/setup.tsx` (team cards, seat sheet, series control); screen-test infra — `fake-indexeddb` wired into `src/test-setup.ts`, and `src/test/app.tsx`'s `resetApp`/`renderRoute` (see [Testing](Architecture/Testing.md)). A real-browser check (390×844) confirmed the screens against the mockups, live persistence across reload, and a clean console.

All behaviour so far lives in `src/core`, `src/storage`, `src/store`, `src/ui`, `src/app`, `src/features` and `src/routes`, covered by tests.

## Next

- Phase 5b (table & play): see the [roadmap](superpowers/plans/2026-09-25-roadmap.md).

## Open product questions

- **Copy not in the handoff:** the note shown instead of «Изтрий играча» for a seated player (placeholder text is live in `src/core/strings.ts`'s `register.inMatch`), and the accessible labels of the team-name fields — confirm the wording.
- **Resuming and leaving a match** (see [Backlog](Backlog.md) Phase 5b) — decide at the start of the 5b plan.

## Known gaps

- `saveError` stays true until `resetData` ([ADR 0006](adr/0006-gate-persistence-writes-until-load.md)).
- No favicon (404 in the browser console).
- An untracked `package-lock.json` sits in the repo root. It isn't the project's (pnpm is used), so don't commit it.
