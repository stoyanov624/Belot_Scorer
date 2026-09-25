# A player seated in the current match cannot be deleted

The handoff says deleting a player "frees the seats they sat on". That works in the setup draft, but a started `Match` always has four players, and a deleted player would leave their recorded deals nameless. The product owner decided: while a player sits in the current match (playing or ended, until the match is left), `removePlayer` refuses with `in-match`, and the register sheet shows a short note instead of "Изтрий играча". Deleting a player who is not in the current match works as specified; a setup draft never outlives the screen, so it cannot hold a deleted player.

## Consequences

The note text is not in the handoff; the placeholder is recorded in `docs/Status.md` for the product owner.
