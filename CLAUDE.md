# Belot Scorer

Scorekeeping web app (React, later React Native) for the Bulgarian card game Belot. It records declarations and points at the table. It is not the card game. There's no backend, and data moves between devices through one-off link/QR/file shares.

## Where things are

- **Current work**: `docs/superpowers/plans/`. Read the roadmap first (`*-roadmap.md`), then the latest phase plan. Checked boxes (`- [x]`) mark finished steps.
- **Domain terms**: `CONTEXT.md`. Use its canonical names in code and conversation (Deal, not "round"; Declaration, not "call"). Read it before naming anything.
- **Why things are built this way**: `docs/adr/`. Read the relevant ADR before changing architecture, storage, theming or the share format.
- **Product spec**: `docs/design-handoff/`. `GAME_RULES.md` is the scoring authority, `DATA_MODEL.md` covers persistence and sharing, `README.md` has the screens, copy and design tokens, and `screens/png/` has high-fidelity mockups. The UI copy there is final Bulgarian text.
- **Golden scoring cases**: `src/core/testing/golden-deals.ts`, with a human review sheet in `docs/golden-deals.md`.

## Invariants

- `src/core` is pure, platform-free TypeScript (ADR 0001): it imports only `zod` and other core modules, and callers pass in ids and dates. `tsconfig.core.json` (no `dom` lib) and Biome enforce this.
- Game behaviour lives in `src/core` as pure `(state, …) => state` functions. The Zustand store only calls them (ADR 0002). Totals, dealer, allowed declarations and verdict are derived, never stored.
- Core returns error/verdict **codes**. The Bulgarian text lives in `src/core/strings.ts`.
- Import from the defining module (no barrel `index.ts`). Heavy features (share/import, QR, camera, photo crop, secondary routes) load with `import()`.
- When the spec and the prototype (`docs/design-handoff/prototype/`) disagree, stop and ask the product owner. The implementation follows the spec only after they confirm.

## Workflow

- `pnpm check` (lint + both typechecks + tests) is the done gate for every task. Core changes are written test-first with Vitest.
- Conventional Commits, one commit per plan task.
- Before using a library API you're unsure of (Tailwind v4, Zod v4, Biome, React Router, vaul), check current docs via context7.
