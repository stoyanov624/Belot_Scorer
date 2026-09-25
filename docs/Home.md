# Belot Scorer

A scorekeeping web app (React now, React Native later) for the Bulgarian card game Belot. It records Declarations and points at the table, resolves what counts, keeps Match and Series scores and a Leaderboard, and moves data between phones through one-off link, QR or file shares. There is no backend. This folder is the project's Obsidian vault and its memory between work sessions.

## Start here

Read in this order:

1. [Status](Status.md): where the work stands, the next step, open questions
2. [Project overview](Project/Overview.md): what the product is and isn't
3. [Architecture overview](Architecture/Overview.md): layers and boundaries
4. `CONTEXT.md` at the repo root: the domain glossary (use its terms)
5. [Roadmap](superpowers/plans/2026-09-25-roadmap.md): the phases, then the latest phase plan

## Project

- [Overview](Project/Overview.md)
- [Backlog](Backlog.md)

## Architecture

- [Overview](Architecture/Overview.md)
- [Core domain](Architecture/Core%20domain.md)
- [Persistence](Architecture/Persistence.md)
- [Testing](Architecture/Testing.md)

## Decisions

- [0001 Single Vite app with an isolated `src/core`](adr/0001-single-vite-app-with-isolated-core.md)
- [0002 Game logic as pure functions behind one thin Zustand store](adr/0002-pure-core-transitions-thin-zustand-store.md)
- [0003 IndexedDB storage, photos as separate Blobs](adr/0003-indexeddb-with-photo-blobs.md)
- [0004 Theme tokens live in TypeScript and reach Tailwind as CSS variables](adr/0004-theme-tokens-in-typescript.md)
- [0005 Share payload v2, no compatibility with the HTML prototype](adr/0005-share-format-v2-no-prototype-compat.md)
- [0006 Block persistence writes until the stored document has loaded](adr/0006-gate-persistence-writes-until-load.md)
- [0007 Pin pnpm 10 via packageManager](adr/0007-pin-pnpm-10.md)

## Product spec

The design handoff is final: its Bulgarian copy is used verbatim. Where the spec and the prototype disagree, ask the product owner.

- [Handoff README](design-handoff/README.md): screens, copy, design tokens
- [GAME_RULES](design-handoff/GAME_RULES.md): the scoring authority
- [DATA_MODEL](design-handoff/DATA_MODEL.md): types, persistence, sharing
- Mockups: `design-handoff/screens/png/`. The clickable prototype is `design-handoff/prototype/Belot v3.dc.html`.

## Plans and specs

- [Roadmap](superpowers/plans/2026-09-25-roadmap.md)
- [Phase 1–2: scaffold and core](superpowers/plans/2026-09-25-phase-1-2-scaffold-and-core.md)
- [Phase 3: store and persistence](superpowers/plans/2026-09-25-phase-3-store-and-persistence.md)
- [Vault and handoff: spec](superpowers/specs/2026-09-25-obsidian-vault-design.md) · [plan](superpowers/plans/2026-09-25-obsidian-vault.md)

## Testing references

- [Golden deals review sheet](golden-deals.md)
- [Testing](Architecture/Testing.md)

## How to keep this current

- When a task ends, update [Status](Status.md).
- Record every non-obvious decision as a new ADR in `adr/` and list it above.
- Put deferred work in the [Backlog](Backlog.md).
- At the end of a session, run `/handoff` in Claude Code. `pnpm docs:check` verifies every link.
