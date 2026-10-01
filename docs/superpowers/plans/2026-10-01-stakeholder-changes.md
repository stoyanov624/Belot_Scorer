# Stakeholder changes (2026-10-01) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the product owner's 2026-10-01 changes to the web app first; the mobile repo then copies the core verbatim and mirrors the UI (its own plan). Decisions were made in a grilling session with the product owner; they are recorded in ADR 0018 (rules) and ADR 0019 (display); 0014–0017 are taken by the mobile repo.

**Decisions:**
1. **Hanging is chosen, not inferred.** When the rounded raw totals of the two teams tie, the points step shows a «Висяща» toggle (off by default). On: the deal hangs as before. Off: the deal counts as made by the caller. Non-ties score as before. The choice ends up in the deal's stored `verdict`, so the persisted and shared data shapes do not change.
2. **Match end.** A match can't end on a deal in which the team that would lose the match took 0 card points, whatever its declarations. This replaces «a capot deal never ends the match». The capot button stays.
3. **Declarations are shown in real points** (×10: белот/терца 20, кварта 50, квинта 100, карета 100/150/200): the declarations popover, resolution cards, history rows, the coaster's «обяви X · Y» and the leaderboard. Card points, the calculation grid and match scores stay rounded. Storage and scoring are unchanged.
4. **«Край на раздаване» is disabled until a contract is set**; the «Избери игра» pill gets a stronger, contrasting look.
5. **Leaderboard period filter:** a «Период» button opens a month calendar for a day range (with a year jump) and presets «Всички», «Тази година», «Миналата година», «Този месец». Not persisted. Every row shows its number of matches.
6. **Round felt:** the table is a circle with seats at 12/3/6/9 o'clock, sized by the narrower dimension, on every screen size.
7. **Player names are always readable** (resolution step first, then an audit).
8. **Visible name «Белотомания»** (title, PWA name, Home heading). Ids, the payload's `app: 'belot'`, the `.belot` extension and links are unchanged.

## Global Constraints

- Core changes are test-first; golden deals updated with a review line in `docs/golden-deals.md`.
- Copy only in `src/core/strings.ts`.
- The mobile repo's drift guard copies `src/core`, `src/features/*/copy.ts` and the new `src/features/stats/period.ts` verbatim: keep them platform-free.
- `pnpm check` green per task; one Conventional Commit per task.

---

### Task 1: Core rules — chosen hanging, match-end rule, display points

- [ ] `score.ts`: `DealInput.hangOnTie: boolean`; a raw tie hangs only when it is set, else verdict `ok`. `DealScore.tie: boolean` (raw totals equal) for the UI.
- [ ] `match.ts`: `saveDeal` input gains `hangOnTie`; the end rule becomes «max ≥ target, totals differ, and the match loser's card points in this deal > 0». Export `endBlocked(m, score)` for the verdict line.
- [ ] `rules.ts`: `DECL_DISPLAY_FACTOR = 10`, `declDisplayPoints(d, rules)`.
- [ ] Golden deals: existing hanging cases set `hangOnTie: true`; add «tie not hanging» and the four match-end cases.
- [ ] Commit `feat(core): chosen hanging and the zero-card match-end rule`.

### Task 2: Copy and table UI

- [ ] Strings: `deal.hangToggle`, `deal.hangToggleHint`, `deal.endBlocked`, capot note without the old end sentence, `appName` «Белотомания», stats hint/sub with matches, period strings.
- [ ] Copy helpers use `declDisplayPoints` (option buttons, resolution cards, history rows); coaster and leaderboard multiply sums.
- [ ] Deal-end points step: the «Висяща» toggle shown only on a tie; the verdict reads the toggle; an end-blocked note.
- [ ] Table: «Край на раздаване» disabled without a contract; the pill gets a ring/glow and larger size; round felt with seats around it.
- [ ] Names audit (resolution cards, seats, contract sheet callers, history, end).
- [ ] Commit `feat(table): hanging toggle, contract gating, round felt, real-point declarations`.

### Task 3: Leaderboard period filter

- [ ] `src/features/stats/period.ts` (pure, platform-free, verbatim on mobile): month grid, range presets, range label, record filter.
- [ ] Stats screen: «Период» button, calendar sheet, presets; rows show matches.
- [ ] Commit `feat(stats): period filter and match counts`.

### Task 4: Rename and vault

- [ ] `<title>`, PWA manifest, icons' names; Status, ADRs 0018/0019, Home, Backlog.
- [ ] Commit `docs: stakeholder changes`.
