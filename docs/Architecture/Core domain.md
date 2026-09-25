# Core domain

A map of `src/core`: what each module owns and the pattern they all follow. The terms are the canonical ones from `CONTEXT.md` at the repo root.

## Modules

| Module | Responsibility | Main exports |
|---|---|---|
| `model.ts` | Zod schemas and inferred types for everything persisted or shared | `PlayerSchema`, `DeclarationSchema`, `DealSchema`, `MatchSchema`, `MatchRecordSchema`, types `Seat`, `Team`, `ContractKey`, `DeclKey`, `Card`, `KareRank` |
| `rules.ts` | Scoring configuration and constants | `RulesConfig`, `RulesConfigSchema`, `DEFAULT_RULES`, `DEAL_ORDER`, `teamOf`, `declPoints`, `validTops`, `CARDS`, `KARE_RANKS` |
| `declarations.ts` | What a Seat may still declare in the current Deal | `allowedDeclarations` → `{ options, blocked }` |
| `resolve.ts` | Resolution: which sequences and fours of a kind count | `resolve`, `ResolveError` |
| `score.ts` | Scoring one Deal: card points, verdict, match points, hanging points | `scoreDeal`, `maxCardPoints`, `ScoreError` |
| `match.ts` | Match and Series lifecycle, plus selectors | `createMatch`, `setContract`, `addDeclaration`, `saveDeal`, `undoLastDeal`, `endMatch`, `nextMatch`, `rematch`, `toMatchRecord`, `totals`, `dealer`, `winner`, `matchNumber`, `isSeriesOver` |
| `roster.ts` | Player name rules, roster edits, the seat draft used in setup | `validatePlayerName`, `upsertPlayer`, `removePlayer`, `assignSeat`, `vacatePlayer`, `isDraftComplete` |
| `leaderboard.ts` | Player and Pair rankings from match records | `leaderboard`, `LeaderRow` |
| `settings.ts` | Device settings: theme, felt, dealer marker, rules | `SettingsSchema`, `DEFAULT_SETTINGS` (`pub`, `wood`, dealer shown, `DEFAULT_RULES`) |
| `persisted.ts` | The saved-document format and its migrations | `PersistedStateSchema`, `PERSIST_VERSION`, `EMPTY_STATE`, `MIGRATIONS`, `loadPersisted` |
| `testing/golden-deals.ts` | Hand-checked scoring cases shared by unit and parity tests | `GOLDEN_DEALS` |

## The pattern

- **Transitions are pure** `(state, …) => state` functions. An illegal move (declaring after the match ended, a declaration the seat can't make) returns the input unchanged rather than throwing.
- **Operations that can fail return result objects with codes**, e.g. `saveDeal` → `{ ok: true, match, ended } | { ok: false, error }`, where `error` is a `SaveDealError` (`no-contract`, `match-ended`, resolve and score codes). The UI maps codes to Bulgarian text.
- **Derived values are computed, never stored:** totals, dealer (`DEAL_ORDER[games.length % 4]`), allowed declarations, verdict ([ADR 0002](../adr/0002-pure-core-transitions-thin-zustand-store.md)).
- **Undo** covers only the last Deal. `Deal.prevHang` restores the hanging points.
- **Rules:** a match snapshots the full `RulesConfig` at start (`Match.rules`, ADR 0009). Settings changes affect only new matches; every deal of a match, its undo and its record are scored by the same snapshotted rules.
- **`nextMatch` and `rematch` only act on an ended match.** `nextMatch` keeps the Series score; `rematch` resets it.

## See also

- [GAME_RULES](../design-handoff/GAME_RULES.md): the authority for every formula
- [Golden deals review sheet](../golden-deals.md)
- [Architecture overview](Overview.md) · [Persistence](Persistence.md) · [Testing](Testing.md)
