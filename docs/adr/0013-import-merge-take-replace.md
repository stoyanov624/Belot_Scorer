# Import applies merge, take-match and replace, with an id remap

`DATA_MODEL.md` §4 sets out the three import actions and the prototype's `applyImport` behaviour: merge players by id then by name, add new leaderboard records, and let the user take the imported match or replace everything. Phase 6a's core needed the exact edge cases spelled out. The product owner decided (2026-09-27):

- A by-id update keeps the local name when the imported name would duplicate another local player's name, so two seated players never end up sharing a display name.
- Merge links every by-id update before any by-name linking, so an imported player earlier in the payload can never link by name to a local player that a later by-id entry renames — which would otherwise seat one local player twice and lose the other import.
- Photos never travelled in 6a. In 6b they travel only in the `.belot` file our own sender emits (the schema itself would accept `photos` on any payload; link and QR payloads still always carry `photo: null`). The store resolves every incoming photo before calling `applyImport`, so core trusts every non-null incoming `photo` id as already valid on this device: a non-null imported photo wins over the local one and drops the emoji; a null one keeps the local photo, as in 6a.
- An incoming photo id with no embedded blob always resolves to `null`, with no local-ownership exception — a same-device share loses nothing, since the null-keeps-local rule above already preserves the real owner's photo untouched.
- An embedded blob is stored once PER PLAYER, never once per payload id: two imported players sharing one payload photo id get two `putPhoto` calls and two distinct local ids, so no two players ever end up sharing a photo id. A failed photo write costs only that photo, not the import (it degrades to the missing-blob outcome instead of failing `importShared`). The unreferenced-old-photo cleanup, and the cleanup of any id this run created but the result doesn't reference, both run on every mode, not only when a photo actually changed.
- "Добави и продължи мача тук" (take) confirms first under the same condition as "Раздавай!" in ADR 0011: the local match is `playing` and has at least one saved deal (`needsTakeConfirm`). It reuses the approved replace-match copy: «Нов мач?» / «Текущият мач (a : b) ще бъде изтрит.» / «Започни нов мач» / «Отказ».
- "Замени всичките ми данни" (replace) clears the local match and takes the imported one if the payload has one; otherwise the match becomes `null`.
- There is no import of the prototype's v1 payload (ADR 0005); the importer only accepts the `v: 2` shape.

## Consequences

- Imported leaderboard names stay as recorded at the time (`MatchRecord.names`); merging a player afterwards does not rewrite history.
- A by-name link can merge two different real people who happen to share a name. That's accepted, as the spec calls for linking by name with no further disambiguation.
