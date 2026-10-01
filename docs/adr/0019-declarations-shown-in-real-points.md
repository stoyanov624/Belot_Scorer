# Declarations are shown in real points; scoring stays rounded

Players announce declarations in real points (терца 20, кварта 50, квинта 100), while the app scores in rounded points (2, 5, 10), as GAME_RULES does. The product owner asked (2026-10-01) to see the real values.

- `DECL_DISPLAY_FACTOR = 10` and `declDisplayPoints()` in `core/rules.ts` are the only conversion. Every declaration value on screen goes through them: the declarations popover, the resolution cards, history rows, the coaster's «обяви X · Y» and the leaderboard.
- Card points, the calculation grid of the deal-end sheet and match scores stay rounded, so the grid still adds up on screen.
- Storage, rule snapshots and the share payload keep rounded values; nothing migrates.

## Consequences

- The coaster shows «обяви 70 · 20» next to a rounded score such as «12 : 4»; accepted by the product owner.
- A change to the rounding scheme would change the factor in one place.
