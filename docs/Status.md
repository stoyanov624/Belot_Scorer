# Status

_Last updated: 2026-09-25 at commit 3e4b37a._ Current state only; history lives in git.

## Done

- Phase 1–2: scaffold and core domain ([plan](superpowers/plans/2026-09-25-phase-1-2-scaffold-and-core.md))
- Phase 3: store and persistence ([plan](superpowers/plans/2026-09-25-phase-3-store-and-persistence.md)), including the write gate from the final review ([ADR 0006](adr/0006-gate-persistence-writes-until-load.md))
- Obsidian vault and `/handoff` ([spec](superpowers/specs/2026-09-25-obsidian-vault-design.md), [plan](superpowers/plans/2026-09-25-obsidian-vault.md))

The app still shows only a placeholder page ("Белот"). All behaviour so far lives in `src/core`, `src/storage` and `src/store`, covered by tests.

## Next

- Write the Phase 4 plan (UI foundation: tokens → CSS variables, `ui/` primitives, router shell) from the [roadmap](superpowers/plans/2026-09-25-roadmap.md).

## Open product questions

- **Snapshot all rules per match?** Today a match fixes only `targetScore` at start. Declaration points, capot bonus and the No Trumps multiplier come from the current settings each time a Deal is saved, so editing them mid-match mixes two rule sets. Snapshotting is free now; after the first release it needs a migration.
- **Deleting a seated player.** `removePlayer` refuses with `in-match` while the player sits in the current match. The spec says deleting "frees their seats", but a `Match` cannot hold an empty seat. Confirm, or design seat replacement for Phase 5.

## Known gaps

- `src/core/strings.ts` (Bulgarian copy for core codes) does not exist yet, although CLAUDE.md refers to it. Due with Phase 4/5.
- `saveError` stays true until `resetData` ([ADR 0006](adr/0006-gate-persistence-writes-until-load.md)).
- No favicon (404 in the browser console).
- An untracked `package-lock.json` sits in the repo root. It isn't the project's (pnpm is used), so don't commit it.
