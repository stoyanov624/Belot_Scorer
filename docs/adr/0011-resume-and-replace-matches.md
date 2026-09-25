# Resume a stored match, continue it from Home, confirm before replacing it

The handoff's prototype restores the last screen on reload but offers no way back to a match from Home, and "Нова игра" silently discards it. The product owner decided (2026-09-25):

- **App start:** with a stored match, the app opens the table (match playing) or the match-end screen (match ended) instead of Home. `resumePath(match)` in `src/app/resume.ts` decides; `main.tsx` navigates there after hydration, only when the app was opened at `/`.
- **Home:** while a match exists, Home shows "Продължи мача" above "Нова игра"; it opens the table (or the end screen if the match has ended).
- **Replacing:** "Раздавай!" on the setup screen asks for confirmation before discarding a match that is still playing and has at least one saved deal. A match with no deals, or an ended match, is replaced silently (an ended match is already in the leaderboard).
- A match is "left" (ADR 0010) only when it is replaced or when the match-end screen's "Към началния екран" is used (Phase 5c).

## Consequences

"Продължи мача" and the confirmation copy are not in the handoff; they are listed in `docs/Status.md` for the product owner.
