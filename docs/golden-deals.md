# Golden deals: please review

Each row is an automated test (`src/core/testing/golden-deals.ts`) derived from GAME_RULES.md §4–5.
Card points in the fixtures are **exact** since 2026-10-01 ([ADR 0020](adr/0020-exact-card-points-decide-the-verdict.md)); the table shows them rounded. Team A = North/South, team B = East/West. Mark any row that doesn't match how you score on paper.

| # | Contract | Caller | Declarations | Cards A/B | Hang in | Expected A : B | Verdict | Hang out |
|---|---|---|---|---|---|---|---|---|
| 01 | ♥ | N (A) | none | 10 / 6 | 0 | 10 : 6 | made | 0 |
| 02 | ♥ | N (A) | none | 7 / 9 | 0 | 0 : 16 | inside | 0 |
| 03 | ♣ | E (B) | none | 8 / 8 | 0 | 8 : 0 | hanging | 8 |
| 04 | ♣ | N (A) | none | 10 / 6 | 8 | 18 : 6 | made | 0 |
| 05 | ♠ | S (A) | none | 8 / 8 | 8 | 0 : 8 | hanging | 16 |
| 06 | ♠ | N (A) | none | капо A | 0 | 25 : 0 | made | 0 |
| 07 | ♠ | N (A) | none | капо B | 0 | 0 : 25 | inside | 0 |
| 08 | БК | W (B) | none | 5 / 8 | 0 | 10 : 16 | made | 0 |
| 09 | БК | N (A) | none | 6 / 7 | 0 | 0 : 26 | inside | 0 |
| 10 | ВК | N (A) | N: Белот | 13 / 13 | 0 | 15 : 13 | made | 0 |
| 11 | ♥ | N (A) | N: Терца; E: Кварта | 9 / 7 | 0 | 0 : 21 | inside | 0 |
| 12 | ♥ | N (A) | N: Терца до K; E: Терца до K | 9 / 7 | 0 | 9 : 7 | made | 0 |
| 13 | ♦ | E (B) | N: Терца до A; W: Терца до K | 8 / 8 | 0 | 18 : 0 | inside | 0 |
| 14 | ♣ | E (B) | N: Каре 9; E: Каре J | 8 / 8 | 0 | 8 : 28 | made | 0 |
| 15 | ♥ | N (A) | E: Белот; N: Терца | 8 / 8 | 0 | 0 : 10 | hanging | 10 |
| 16 | ВК | E (B) | N: Терца; S: Кварта | 10 / 16 | 0 | 33 : 0 | inside | 0 |
| 17 | ♥ | N (A) | none | 7 / 9 | 8 | 0 : 24 | inside | 0 |
| 18 | ♣ | E (B) | none (exact 80 / 82) | 8 / 8 | 0 | 8 : 8 | made | 0 |
| 19 | ♠ | S (A) | none (exact 82 / 80) | 8 / 8 | 8 | 8 : 8 | made | 8 |
| 20 | ♥ | N (A) | none (exact 76 / 86) | 8 / 8 | 0 | 0 : 16 | inside | 0 |

Notes on the columns:
- **Cards A/B**: rounded card points, last-ten included. B = max − A (color games 16, ВК 26, БК 13), or `капо A`/`капо B` when a team took every trick.
- **Declarations**: `seat: name`, only the ones that end up in the fixture (irrespective of whether they're valid — see `resolution.errors`/`valid` in the test for which declarations are actually counted). "до X" marks a sequence's top card; "Каре X" marks a four-of-a-kind's rank.
- **Exact points** (since 2026-10-01): a rounded tie is decided by the exact points. Rows 03, 05 and 15 are exact ties (81 : 81) and hang; rows 18–20 tie only rounded: 18–19 are made, 20 goes inside.
- **Hang in / Hang out**: hanging points carried into this deal, and hanging points carried into the *next* deal (`nextHang`). Row 04 shows 8 hanging points from a prior deal being folded into team A's total (verdict `made`, hang out `0`); row 17 shows the same 8 points instead going to the defending team B because the deal itself resolved `inside`.

## Disagreements

None. All golden cases except 18–20 (rounded ties that aren't exact; the prototype hangs on every rounded tie) and the 96 allowed-declarations grid cases (4 contract states × 6 declaration layouts × 4 seats) agree exactly between `src/core` and the ported prototype logic (`test/prototype/parity.test.ts`, 113/113 passing).
