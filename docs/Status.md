# Status

_Last updated: 2026-09-25 at commit da0fe52._ Current state only; history lives in git.

## Done

- Phase 1–2: scaffold and core domain ([plan](superpowers/plans/2026-09-25-phase-1-2-scaffold-and-core.md))
- Phase 3: store and persistence ([plan](superpowers/plans/2026-09-25-phase-3-store-and-persistence.md)), including the write gate from the final review ([ADR 0006](adr/0006-gate-persistence-writes-until-load.md))
- Obsidian vault and `/handoff` ([spec](superpowers/specs/2026-09-25-obsidian-vault-design.md), [plan](superpowers/plans/2026-09-25-obsidian-vault.md))
- Phase 4: UI foundation ([plan](superpowers/plans/2026-09-25-phase-4-ui-foundation.md)): `tokens.ts` → CSS variables → Tailwind `@theme`, Nunito, `src/ui` primitives (Button, Chip, Segmented, Avatar, Sheet and Popover on the native `<dialog>`/popover APIs — [ADR 0008](adr/0008-native-dialog-and-popover-over-vaul.md)), the `src/app` router shell (lazy routes, per-route error boundaries), placeholder screens in `src/routes`, and a DEV-only primitive gallery at `/dev/ui`. The final-review fixes are in: team colours are `team-a`/`team-b`, the theme paints before hydration, overlays report only user dismissals, and `Segmented` has radio keyboard support.

All behaviour so far lives in `src/core`, `src/storage`, `src/store`, `src/ui` and `src/app`, covered by tests. The screens themselves are still placeholders.

## Next

- Phase 5a (home, players, setup) in progress.

## Open product questions

- **Copy not in the handoff:** the note shown instead of «Изтрий играча» for a seated player, and the accessible labels of the team-name fields — confirm the wording in `src/core/strings.ts`.

## Known gaps

- `saveError` stays true until `resetData` ([ADR 0006](adr/0006-gate-persistence-writes-until-load.md)).
- No favicon (404 in the browser console).
- An untracked `package-lock.json` sits in the repo root. It isn't the project's (pnpm is used), so don't commit it.
