# A match snapshots its scoring rules when it starts

Rules vary between groups of players, so the settings hold a full `RulesConfig`. Until Phase 5 only `targetScore` was copied into the match; declaration points, the capot bonus and the No Trumps multiplier were read from the live settings each time a deal was saved, so editing them mid-match mixed two rule sets in one match. The product owner decided that a match snapshots the whole `RulesConfig` at start (`Match.rules`): settings changes affect only new matches, and every deal of a match and its undo are scored by the same rules.

## Consequences

- `Match.targetScore` is replaced by `Match.rules.targetScore`. The stored document moves to version 2; migration 1 → 2 moves a stored match's `targetScore` into `rules` (other values from `DEFAULT_RULES`).
- `saveDeal` no longer takes rules as a parameter; it uses `match.rules`.
- The leaderboard still scores recorded declarations with the current rules (match records don't carry rules). Revisit if groups start changing declaration points.
