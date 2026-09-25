---
name: handoff
description: End-of-session refresh of the docs vault (Status, Backlog, ADRs, plan checkboxes) so the next session starts with full context.
disable-model-invocation: true
---

# Handoff

Bring the vault up to date with everything that happened since the last handoff, then commit. The next session reads only `docs/Home.md` and `docs/Status.md` to find its footing, so what isn't written there is lost.

1. **Range.** Read `docs/Status.md` and take the commit in its "Last updated" line as BASE. Gather `git log --oneline BASE..HEAD`, `git status --short` and this conversation. Done when you can list every change, decision and deferral in that range.
2. **Status.** Rewrite `docs/Status.md`:
   - Set "Last updated" to today and the current short HEAD.
   - Update Done (one line per finished phase or feature, linking its plan).
   - Update Next (the single most useful next step).
   - Update Open product questions and Known gaps.
   - It holds the current state only; history lives in git.
3. **Backlog.** Add every deferral from the range to `docs/Backlog.md` under its phase: review minors, TODOs, "later" choices. Delete lines the range finished.
4. **Decisions.** For every non-obvious choice in the range with no ADR (a library, a data shape, a trade-off a reviewer questioned), write `docs/adr/NNNN-<slug>.md` in the existing ADR style (`# Decision as title`, prose, optional `## Consequences`), and list it under Decisions in `docs/Home.md`. A choice waiting on the product owner goes under Open product questions instead. Done when each decision in the range maps to an ADR or an open question.
5. **Plans.** In `docs/superpowers/plans/`, tick `- [x]` on every step the range finished.
6. **Home.** Link any new note from `docs/Home.md`.
7. **Links.** Run `pnpm docs:check` and fix every broken link until it passes.
8. **Commit** the docs you changed, staged by explicit path: `docs: handoff <YYYY-MM-DD>`.
9. **Report** to the user in 3–5 lines: what changed in Status, and the next step.
