# Obsidian Vault and Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `docs/` into an Obsidian vault with Home, Status, Backlog, Project and Architecture notes and two new ADRs. Wire a "Start here" pointer and working rules into `CLAUDE.md`, and add a `/handoff` skill, so any new session starts with full context.

**Architecture:** Plain Markdown in the repo, linked with relative Markdown links (valid in Obsidian, GitHub and for Claude). A dependency-free Node script checks that every link resolves. No MCP, no hooks.

**Tech Stack:** Markdown, Obsidian (`.obsidian/app.json` only), Node ≥ 22 (`scripts/check-doc-links.mjs`), pnpm script.

**Spec:** `docs/superpowers/specs/2026-09-25-obsidian-vault-design.md`

## Global Constraints

- Nothing that exists under `docs/` moves or is renamed. Existing paths in `CLAUDE.md` and the plans stay valid.
- Links are relative Markdown links. A space in a file name is written `%20` (`[Core domain](Architecture/Core%20domain.md)`). No `[[wikilinks]]`.
- `CONTEXT.md` stays at the repo root. Vault notes mention it as plain text (`CONTEXT.md` at the repo root), never as a link.
- Use the canonical terms from `CONTEXT.md` (Deal, Declaration, Match, Series, Pair…).
- Every fact in a note must come from the code, the spec, an ADR or the git history. Nothing may be invented. Where a fact is unknown, say so in Status under open questions.
- Notes are short and factual. They link out rather than copy: the spec files stay the authority for rules, screens and data.
- `pnpm check` must keep passing. `pnpm docs:check` must pass at the end of every task that adds links.
- Conventional Commits, one commit per task, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never stage `package-lock.json`.

## File Structure

```
.gitignore                                 + docs/.obsidian ignore rules
package.json                               + "docs:check" script
scripts/check-doc-links.mjs                link checker
docs/.obsidian/app.json                    link settings
docs/Home.md                               map of content
docs/Status.md                             current state
docs/Backlog.md                            deferred work
docs/Project/Overview.md                   product idea and scope
docs/Architecture/Overview.md              layers and boundaries
docs/Architecture/Core domain.md           src/core module map
docs/Architecture/Persistence.md           storage, store, hydration
docs/Architecture/Testing.md               test strategy
docs/adr/0006-gate-persistence-writes-until-load.md
docs/adr/0007-pin-pnpm-10.md
CLAUDE.md                                  Start here + Keep the vault current
.claude/skills/handoff/SKILL.md            /handoff
```

---

### Task 1: Vault config and link checker

**Files:**
- Create: `scripts/check-doc-links.mjs`, `docs/.obsidian/app.json`
- Modify: `package.json` (scripts), `.gitignore`

**Interfaces:**
- Produces: `pnpm docs:check`. It exits 0 and prints `docs links ok (<n> files)`, or exits 1 and lists `file: link` for each link that doesn't resolve.

- [x] **Step 1: Write `scripts/check-doc-links.mjs`**

```js
// Checks that every relative Markdown link in the docs vault, CLAUDE.md and README.md
// points at an existing file. External links (scheme:) and in-page anchors are skipped.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const SKIP_DIRS = new Set(['.obsidian', 'node_modules']);
const LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function* markdownFiles(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* markdownFiles(path);
    else if (name.endsWith('.md')) yield path;
  }
}

const files = [...markdownFiles(join(root, 'docs')), join(root, 'CLAUDE.md'), join(root, 'README.md')];
const broken = [];

for (const file of files) {
  // Code blocks and inline code often show link syntax as an example; don't check those.
  const text = readFileSync(file, 'utf8')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '');
  for (const [, href] of text.matchAll(LINK)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('#')) continue;
    const target = decodeURIComponent(href.split('#')[0]);
    if (!existsSync(resolve(dirname(file), target))) {
      broken.push(`${relative(root, file)}: ${href}`);
    }
  }
}

if (broken.length > 0) {
  console.error(`Broken links:\n${broken.join('\n')}`);
  process.exit(1);
}
console.log(`docs links ok (${files.length} files)`);
```

- [x] **Step 2: Add the script to `package.json`**, after `"check"`:

```json
"docs:check": "node scripts/check-doc-links.mjs"
```

- [x] **Step 3: Prove the checker catches a broken link.** Create a scratch file, run the check, and delete the file:

```bash
printf '[x](nope.md)\n' > docs/zz-scratch.md
pnpm docs:check; echo "exit $?"
rm docs/zz-scratch.md
pnpm docs:check
```

Expected: first run prints `Broken links:` / `docs/zz-scratch.md: nope.md` and `exit 1`. Second run prints `docs links ok (…)`.

- [x] **Step 4: Obsidian config.** Create `docs/.obsidian/app.json`:

```json
{
  "useMarkdownLinks": true,
  "newLinkFormat": "relative",
  "alwaysUpdateLinks": true
}
```

Append to `.gitignore`:

```
# Obsidian: share link settings only, not per-machine layout or plugins
docs/.obsidian/*
!docs/.obsidian/app.json
```

- [x] **Step 5: Verify and commit**

Run: `pnpm check && pnpm docs:check && git status --short`
Expected: both pass. The status shows only the four intended files, plus the untracked `package-lock.json`, which must not be staged.

```bash
git add scripts/check-doc-links.mjs package.json .gitignore docs/.obsidian/app.json
git commit -m "chore(docs): obsidian vault config and link checker

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Project and Architecture notes

**Files:**
- Create: `docs/Project/Overview.md`, `docs/Architecture/Overview.md`, `docs/Architecture/Core domain.md`, `docs/Architecture/Persistence.md`, `docs/Architecture/Testing.md`

Read before writing: `CLAUDE.md`, `CONTEXT.md`, `docs/design-handoff/README.md` (top section), `docs/adr/0001`–`0005`, `docs/superpowers/plans/2026-09-25-roadmap.md`, and every file in `src/core`, `src/storage`, `src/store`, `src/lib` (exports and doc comments).

Each note starts with `# <Title>`, then one sentence saying what the note covers. It ends with a `## See also` list of relative links. Required content per note:

- [x] **Step 1: `docs/Project/Overview.md`**. Cover:
  - **What it is:** a scorekeeping notebook for Belot. It records Declarations and points at the table, and is not the card game.
  - **Who uses it:** four players at one table, using one phone.
  - **Scope:** roster with avatars, Deal entry, automatic scoring, Series, History, Leaderboard, themes, and one-off sharing (link, QR, `.belot` file).
  - **Non-goals:** no backend, no accounts, no live sync (DATA_MODEL §4 limits), not playing cards.
  - **Platforms:** a web SPA now, React Native later, which is why `src/core` is platform-free (ADR 0001).
  - **Language:** the UI is in Bulgarian, with final copy in the handoff.
  - **Status:** link to Status (`../Status.md`) and the roadmap.
  - **See also:** the design-handoff README, GAME_RULES and DATA_MODEL; the roadmap.
- [x] **Step 2: `docs/Architecture/Overview.md`**. Cover:
  - **Layers:** `src/core` (pure domain) → `src/storage` (key-value adapters, document storage, photo store) → `src/store` (Zustand store, actions, production instance) → UI (`src/App.tsx`, `main.tsx`; screens from Phase 4/5).
  - **Diagram:** a Mermaid `flowchart LR` of those layers plus IndexedDB.
  - **Enforcement:** the core boundary is enforced by `tsconfig.core.json` (no `dom` lib) and Biome `noRestrictedImports`/`noRestrictedGlobals` (bans `Date`). `Math.random` is a review-only convention.
  - **Rules:** no barrel files; heavy features lazy-loaded; codes, not text, from core.
  - **Diagram check:** only layers that exist today, with the UI marked "Phase 4+".
  - **See also:** the three notes below; ADR 0001, 0002 and 0004.
- [x] **Step 3: `docs/Architecture/Core domain.md`**. Cover:
  - **Module table:** one row per `src/core` module (`model`, `rules`, `declarations`, `resolve`, `score`, `match`, `roster`, `leaderboard`, `settings`, `persisted`, `testing/golden-deals`). The columns are its responsibility in one line and its main exports.
  - **Pattern:** `(state, …) => state` functions that return unchanged state for illegal moves, plus result objects with error codes.
  - **Derived, never stored:** totals, dealer, allowed declarations, verdict (ADR 0002).
  - **Snapshot:** `targetScore` is fixed when a match starts; the other rules are read live (open question, see Status).
  - **See also:** CONTEXT.md (plain text), GAME_RULES, golden-deals.
- [x] **Step 4: `docs/Architecture/Persistence.md`**. Cover:
  - **Document:** one IndexedDB document `belot-state` = `{ version, state: { roster, stats, match, settings } }`.
  - **Loading:** `loadPersisted` runs migrations then Zod validation, with error codes `not-a-document`, `future-version`, `missing-migration` and `invalid-state`.
  - **Migrations:** `MIGRATIONS[n]` upgrades n → n+1, and old schemas are never edited (ADR 0003).
  - **Write gate:** writes are blocked until a successful load. An unreadable document is copied once to `belot-state.backup`. `resetData()` unlocks and starts fresh. `saveError` is set if a write fails and is sticky until reset (ADR 0006).
  - **Startup:** hydrate once in `main.tsx` before the first render. `hydration` is `pending | ready | failed`.
  - **Photos:** Blobs in the IndexedDB database `belot-photos`, keyed by `Player.photo` id. Old blobs are dropped on replace/remove. Orphans are possible, and any cleanup must keep ids referenced by the backup.
  - **Injection:** the store is built from injected `AppDeps`, and only `src/store/instance.ts` touches real IndexedDB.
  - **See also:** ADR 0003, 0005, 0006; DATA_MODEL.
- [x] **Step 5: `docs/Architecture/Testing.md`**. Cover:
  - **Gate:** `pnpm check` (Biome, two tsc projects, Vitest) is the gate for every task.
  - **Core:** test-first with Vitest, tests beside modules.
  - **Scoring cases:** golden deal cases in `src/core/testing/golden-deals.ts`, with a review sheet in `docs/golden-deals.md`.
  - **Parity:** a sweep against the HTML prototype in `test/prototype/`.
  - **Store tests:** they use `memoryKv` and never import `instance.ts`.
  - **Browser check:** `pnpm start` for manual checks.
  - **Planned:** RTL flow tests in Phase 5 and a Playwright happy path in Phase 7 (from the roadmap).
  - **See also:** golden-deals, the roadmap.
- [x] **Step 6: Verify and commit**

Run: `pnpm docs:check`
Expected: `docs links ok`. Then re-read each note against the code: every export name and path mentioned must exist (`grep` for it).

```bash
git add docs/Project docs/Architecture
git commit -m "docs: project and architecture notes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: ADRs 0006 and 0007

**Files:**
- Create: `docs/adr/0006-gate-persistence-writes-until-load.md`, `docs/adr/0007-pin-pnpm-10.md`

Follow the existing ADR style: a `# Title` stating the decision, then prose, then optional `## Considered Options` / `## Consequences` sections. No front matter.

- [x] **Step 1: Write ADR 0006**

```markdown
# Block persistence writes until the stored document has loaded

Zustand's `persist` middleware writes the whole state on every `setState`, including the one that marks hydration as failed. Without a guard, a document that fails to load (invalid, from a newer app version, or unreadable because IndexedDB threw) is overwritten with empty defaults straight away, and when the read itself threw there is no backup. The document storage (`src/storage/document.ts`) therefore drops writes until a load has succeeded or found nothing stored. An unreadable document is copied once to `belot-state.backup`, and an existing backup is never overwritten. The store sets `hydration: 'failed'`, and the only way forward is the explicit `resetData()` action, which unlocks writes and starts from empty data. Write failures after loading set a runtime `saveError` flag instead of becoming unhandled rejections.

## Consequences

- The UI must handle `hydration === 'failed'` (Phase 5): explain, and offer "start fresh" (`resetData`). Exporting the backup can come with Phase 6 sharing.
- `saveError` stays set until `resetData`. Whether a later successful write should clear it is decided with the error banner in Phase 5.
- A future photo cleanup must treat photo ids in the backup as live.
```

- [x] **Step 2: Write ADR 0007**

```markdown
# Pin pnpm 10 via packageManager

`package.json` declares `"packageManager": "pnpm@10.32.1"`. pnpm 12 enables `minimumReleaseAge` (24 h) by default and refused to install a lockfile written by pnpm 10 that contained packages published the same day. Pinning the version that wrote the lockfile makes installs reproducible, and pnpm (9.7+) and corepack switch to it automatically. The cost is losing pnpm 12's supply-chain delay, so before adding dependencies check that new versions aren't hours old.

## Consequences

Upgrading pnpm is a deliberate change: bump `packageManager`, run `pnpm install`, commit the lockfile, and update this ADR.
```

- [x] **Step 3: Commit**

```bash
git add docs/adr/0006-gate-persistence-writes-until-load.md docs/adr/0007-pin-pnpm-10.md
git commit -m "docs(adr): 0006 persistence write gate, 0007 pnpm pin

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Status, Backlog and Home

**Files:**
- Create: `docs/Status.md`, `docs/Backlog.md`, `docs/Home.md`

- [x] **Step 1: `docs/Status.md`**, with exactly these sections:

```markdown
# Status

_Last updated: 2026-09-25 at commit <short HEAD of main when written>._ Current state only; history lives in git.

## Done
- Phase 1–2: scaffold and core domain (plan: …)
- Phase 3: store and persistence (plan: …)
- Obsidian vault and /handoff (this plan)

## Next
- Write the Phase 4 plan (UI foundation) from the roadmap.

## Open product questions
- Should a match snapshot all scoring rules at start, not only `targetScore`? Today the other rules are read live when each deal is saved. Deciding now is free; after release it needs a migration.
- Deleting a player who sits in the current match is refused (`in-match`). The spec's "frees their seats" assumes an empty seat, which a match can't hold. Confirm, or design seat replacement for Phase 5.

## Known gaps
- `src/core/strings.ts` (Bulgarian copy for codes) does not exist yet; CLAUDE.md refers to it. Due with Phase 4/5.
- `saveError` is sticky until `resetData` (ADR 0006).
- No favicon (404 in the console).
- Untracked `package-lock.json` in the repo root (not ours; the project uses pnpm).
```

Fill `…` with relative links to the plans, and `<short HEAD…>` with `git rev-parse --short HEAD` at the time of writing. `/handoff` later uses this commit as the start of its range.

- [x] **Step 2: `docs/Backlog.md`**. Group by phase, one line each, taken from the roadmap and the Phase 3 ledger:
  - Phase 4: tokens → CSS vars; `ui/` primitives; router shell with lazy routes.
  - Phase 5: screens; the failed-load screen with `resetData`; save-error banner; `strings.ts` codes → copy (including `in-match`).
  - Phase 6: sharing, and exporting the backup.
  - Phase 7: PWA, a11y, Playwright, favicon.
  - Unassigned:
    - one redundant write per app start;
    - `memoryKv` stores references, not structured clones;
    - the rejecting-`set` test has a loose write-count bound;
    - `removePlayer` returns ok for an unknown id;
    - the store action name shadows core `removePlayer`.
- [x] **Step 3: `docs/Home.md`**. Content:
  - A one-paragraph description of what the project is.
  - "Start here", in reading order: Status → Project Overview → Architecture Overview → CONTEXT.md (plain text, repo root) → roadmap.
  - Then grouped link lists:
    - Project;
    - Architecture (4 notes);
    - Decisions (ADRs 0001–0007, each linked with its title);
    - Spec (design-handoff README, GAME_RULES, DATA_MODEL, screens folder);
    - Plans and specs (roadmap, phase plans, this spec and plan);
    - Testing references (golden-deals).
  - End with "How to keep this current" (the three CLAUDE.md rules and `/handoff`).
- [x] **Step 4: Verify and commit**

Run: `pnpm docs:check`
Expected: `docs links ok`. Check that every ADR file in `docs/adr/` appears in Home: `ls docs/adr` against the Home list.

```bash
git add docs/Status.md docs/Backlog.md docs/Home.md
git commit -m "docs: home, status and backlog

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: CLAUDE.md pointer and /handoff skill

**Files:**
- Modify: `CLAUDE.md`
- Create: `.claude/skills/handoff/SKILL.md`

Load the `mattpocock-skills:writing-for-agents` skill before editing these two files.

- [x] **Step 1: `CLAUDE.md`**. Add this as the first section under the intro paragraph:

```markdown
## Start here

`docs/` is an Obsidian vault and the project's memory. Read `docs/Home.md`, then `docs/Status.md`, before starting a task.
```

Add this section before `## Workflow`:

```markdown
## Keep the vault current

- When a task ends, update `docs/Status.md` (done, next, open questions, known gaps). It holds the current state only.
- Record every non-obvious decision as a new ADR in `docs/adr/` (next free number), and link it from `docs/Home.md`.
- Anything deferred goes in `docs/Backlog.md`. Remove lines when they're done.
- Links in `docs/` are relative Markdown links (`%20` for spaces). `pnpm docs:check` must pass.
- At the end of a session, run `/handoff`.
```

- [x] **Step 2: `.claude/skills/handoff/SKILL.md`**

```markdown
---
name: handoff
description: Refresh the docs vault at the end of a work session so the next session starts with full context. Use when the user says /handoff, "wrap up", "end of session", or asks to update the status/vault.
---

# Handoff

Bring `docs/Status.md`, `docs/Backlog.md`, ADRs and plan checkboxes up to date with what happened since the last handoff, then commit.

1. Read `docs/Status.md`. Take the commit in its "Last updated" line as BASE.
2. Gather what changed: `git log --oneline BASE..HEAD`, `git status --short`, and the conversation so far.
3. Rewrite `docs/Status.md`: set "Last updated" to today and the short HEAD you are about to commit on. Update Done (one line per finished phase or feature, linking its plan), Next (the single most useful next step), Open product questions, and Known gaps. Keep the current state only, never a history.
4. Update `docs/Backlog.md`: add everything deferred in this range (review minors, TODOs, "later" decisions), and delete lines that are now done.
5. Decisions: for each non-obvious choice in this range that has no ADR (a library, a data shape, a trade-off a reviewer questioned), write `docs/adr/NNNN-<slug>.md` in the existing ADR style and link it from `docs/Home.md`. If a choice waits on the product owner, put it under Open product questions instead.
6. Plans: in `docs/superpowers/plans/`, tick `- [x]` every step the commits show as finished.
7. If new notes were added, link them from `docs/Home.md`.
8. Run `pnpm docs:check` and fix any broken link.
9. Commit only the docs you changed, by explicit path: `docs: handoff <YYYY-MM-DD>`. Never stage unrelated files.
10. Tell the user in 3–5 lines what changed in Status and what the next step is.
```

- [x] **Step 3: Verify and commit**

Run: `pnpm docs:check && pnpm check`
Expected: both pass.

```bash
git add CLAUDE.md .claude/skills/handoff/SKILL.md
git commit -m "docs: vault pointer in CLAUDE.md and /handoff skill

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Open the vault in Obsidian and check it

- [ ] **Step 1: Open it:** `open "obsidian://open?path=$(pwd)/docs"`. Obsidian registers the folder as a vault.
- [ ] **Step 2: Confirm the config:** `git status --short` shows no new tracked changes. The per-machine files Obsidian creates in `docs/.obsidian/` are ignored.
- [ ] **Step 3: Ask the user to check** that Home opens, its links work, and the graph view connects the notes. Fix anything they report, re-run `pnpm docs:check`, and commit as `docs: fix vault links`.
