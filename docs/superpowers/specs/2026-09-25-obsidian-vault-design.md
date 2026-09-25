# Obsidian Vault and Session Handoff: Design

**Goal:** Any new Claude Code session (or a human) can pick up Belot Scorer work with full context: what the product is, how it is built, why, where the work stands, and what comes next. The knowledge lives in an Obsidian vault versioned with the code.

## Decisions

- **`docs/` is the vault.** Nothing that exists moves. Paths in `CLAUDE.md`, the plans and the ADRs stay valid.
- **No MCP.** Claude Code reads repo files directly and always loads `CLAUDE.md`. A "Start here" pointer in `CLAUDE.md` is the entry point. An Obsidian MCP would only help for a vault outside the repo.
- **Relative Markdown links, not wikilinks.** Links then work in Obsidian, on GitHub and for Claude alike. Obsidian is configured with `useMarkdownLinks: true` and `newLinkFormat: relative`.
- **`CONTEXT.md` stays at the repo root.** The domain-modeling skill and `CLAUDE.md` expect it there. Obsidian cannot link outside the vault, so `Home.md` names it as plain text.
- **Freshness:** `CLAUDE.md` rules (update Status at the end of a task, record decisions as ADRs, record deferrals in Backlog) plus a `/handoff` project skill for an end-of-session refresh.

## Vault layout

| Path | Content |
|---|---|
| `docs/Home.md` | Map of content, with notes in the order a new session should read them. Links every note below and the existing docs. |
| `docs/Status.md` | Last updated (date + commit). Phases done. Next step. Open product questions. Known gaps. Kept short: current state only, no history. |
| `docs/Backlog.md` | Deferred work, one line each, grouped by the phase it belongs to. |
| `docs/Project/Overview.md` | Product idea, users, scope and non-goals (not the card game, no backend, no live sync), the platforms roadmap (web now, React Native later). |
| `docs/Architecture/Overview.md` | Layers and dependency direction (`core` → `storage` → `store` → UI), the core boundary and how it is enforced, a Mermaid diagram, where each folder sits. |
| `docs/Architecture/Core domain.md` | Module map of `src/core` (model, rules, declarations, resolve, score, match, roster, leaderboard, settings, persisted), and the pattern: pure `(state, …) => state` functions that return codes. |
| `docs/Architecture/Persistence.md` | One versioned document in IndexedDB, `loadPersisted` migrations, write gate + backup, `saveError`/`resetData`, photo Blob store, hydrate-before-render. |
| `docs/Architecture/Testing.md` | TDD with Vitest, core tests beside modules, golden deals, prototype parity sweep, in-memory `Kv` for store tests, `pnpm check` as the gate. |
| `docs/adr/0006-gate-persistence-writes-until-load.md` | New ADR: why writes are blocked until a successful load (zustand persist writes on every `setState`). |
| `docs/adr/0007-pin-pnpm-10.md` | New ADR: `packageManager: pnpm@10.32.1`, because pnpm 12's `minimumReleaseAge` rejected fresh lockfile entries; revisit when upgrading. |
| `docs/.obsidian/` | `app.json` (link settings) committed. `workspace*.json` and caches git-ignored. |

Existing `docs/adr/`, `docs/design-handoff/`, `docs/superpowers/` and `docs/golden-deals.md` stay as they are and are linked from Home.

## Session context

- **`CLAUDE.md`** gains a "Start here" line (`docs/Home.md`, then `docs/Status.md`) and a "Keep the vault current" section with the three rules.
- **`.claude/skills/handoff/SKILL.md`** (project skill, invoked as `/handoff`):
  1. Read `docs/Status.md` and take its recorded commit.
  2. `git log <commit>..HEAD`, plus uncommitted changes.
  3. Rewrite Status: date, HEAD, done, next step, open questions, known gaps.
  4. Move deferred items into Backlog, and remove finished ones.
  5. For each non-obvious decision in that range without an ADR, write one.
  6. Tick finished plan checkboxes.
  7. Run the link check.
  8. Commit `docs: handoff <date>`.
- **Link check:** `scripts/check-doc-links.mjs` (Node, no dependencies) verifies that every relative Markdown link in `docs/**/*.md`, `CLAUDE.md` and `README.md` resolves to an existing file. It runs as `pnpm docs:check` and is not part of `pnpm check`: docs-only.

## Out of scope

Moving existing docs, an MCP server, hooks, Obsidian community plugins, and rewriting the design-handoff content (final Bulgarian spec).

## Verification

`pnpm docs:check` passes. `pnpm check` still passes. Opening `docs/` in Obsidian shows Home with working links, and the graph connects the new notes to the ADRs and plans. Test `/handoff` by reading it through, and on the next real session end.
