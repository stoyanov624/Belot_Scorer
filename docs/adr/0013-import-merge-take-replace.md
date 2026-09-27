# Import applies merge, take-match and replace, with an id remap

`DATA_MODEL.md` §4 sets out the three import actions and the prototype's `applyImport` behaviour: merge players by id then by name, add new leaderboard records, and let the user take the imported match or replace everything. Phase 6a's core needed the exact edge cases spelled out. The product owner decided (2026-09-27):

- A by-id update keeps the local name when the imported name would duplicate another local player's name, so two seated players never end up sharing a display name. Every other field, including emoji, still takes the imported value.
- "Добави и продължи мача тук" (take) confirms first under the same condition as "Раздавай!" in ADR 0011: the local match is `playing` and has at least one saved deal (`needsTakeConfirm`). It reuses the approved replace-match copy: «Нов мач?» / «Текущият мач (a : b) ще бъде изтрит.» / «Започни нов мач» / «Отказ».
- "Замени всичките ми данни" (replace) clears the local match and takes the imported one if the payload has one; otherwise the match becomes `null`.
- Replace removes the photo blobs of players who are no longer in the roster, since nothing will reference them afterwards.
- There is no import of the prototype's v1 payload (ADR 0005); the importer only accepts the `v: 2` shape.

## Consequences

- Imported leaderboard names stay as recorded at the time (`MatchRecord.names`); merging a player afterwards does not rewrite history.
- A by-name link can merge two different real people who happen to share a name. That's accepted, as the spec calls for linking by name with no further disambiguation.
