# Project overview

What Belot Scorer is, who it's for, and what it deliberately doesn't do.

## What it is

A scorekeeping notebook for the Bulgarian card game Belot. During a Deal, players tap in what was declared (Belot, Tierce, Quarte, Quinte, Four-of-a-kind) and the card points at the end. The app resolves which Declarations count, applies the verdict (made, inside, hanging, capot) and keeps the running Match score. It replaces pen and paper. It is **not** the card game: no cards are dealt or played in the app.

## Who uses it

Four players at one table, sharing one phone. One person enters the scores for everyone.

## Scope

- **Roster:** players with a unique name and an avatar (emoji or photo), kept on the device.
- **Setup:** seat four players, name the two Teams, pick a Series length (best of 1, 3, 5 or 7).
- **Table:** Contract and caller, Declarations per seat, Dealer rotation, hanging points.
- **Deal end:** a Resolution step (which sequences and fours of a kind count), then card points, then save. A Match ends automatically at the target score (151 by default) unless it's a tie or a capot deal.
- **History, Series, Leaderboard:** undo the last Deal, next match or rematch, rankings of players and Pairs by valid Declaration points.
- **Themes and felts:** four colour atmospheres and four table surfaces.
- **Share:** a one-off transfer of the roster and leaderboard, or of the current match, as a link, a (multi-part) QR code or a `.belot` file. Import can merge, continue or replace.

## Non-goals

- No backend and no accounts. Data lives on the device and moves only through one-off shares.
- No live sync between phones. It would need a server (see the limits in DATA_MODEL §4).
- No card-play engine, no bidding assistant.

## Platforms

A web SPA (Vite + React 19) first, installable as a PWA in Phase 7. A React Native app comes later and reuses the game logic unchanged. That is why `src/core` is platform-free TypeScript ([ADR 0001](../adr/0001-single-vite-app-with-isolated-core.md)).

## Language

The UI is Bulgarian. The final copy is in the design handoff, and code keeps English identifiers and the canonical domain terms from `CONTEXT.md` at the repo root.

## Where it stands

See [Status](../Status.md) and the [roadmap](../superpowers/plans/2026-09-25-roadmap.md).

## See also

- [Design handoff README](../design-handoff/README.md): screens, copy, design tokens
- [GAME_RULES](../design-handoff/GAME_RULES.md): the scoring authority
- [DATA_MODEL](../design-handoff/DATA_MODEL.md): types, persistence, sharing
- [Architecture overview](../Architecture/Overview.md)
