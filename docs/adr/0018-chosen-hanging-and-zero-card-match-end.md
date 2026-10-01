# Hanging is chosen on a tie; a match can't end while its losers took no card points

The product owner changed two scoring rules on 2026-10-01.

**Hanging.** Points are entered rounded, so a rounded tie (8 : 8) can hide a real difference (caller 82, defenders 80): the prototype and v1 made every rounded tie hang. Now the deal-end sheet shows a «Висяща» toggle, off by default, only when the two teams' raw totals tie. On, the deal hangs as before; off, it counts as made by the caller. Exact card points were considered and rejected (a different input, and a data-shape change for every stored deal).

- `DealInput.hangOnTie` (optional, false when absent) and `DealScore.tie` carry it; `saveDeal` and the store pass it through.
- The choice ends up in the stored `Deal.verdict` (`hang` or `ok`), so neither the persisted document nor the share payload changes, and nothing re-scores a stored deal.
- The prototype-parity tests score with the toggle on, which is how the prototype always treated a tie. Golden deals 18–19 cover the toggle off.

**Match end.** Before: a match ended when a team reached the target, the totals differed, and the deal was not a capot. Now: a match can't end on a deal in which the team that would lose the match took no card points, whatever its declarations (`endsMatch` in `core/match.ts`). A capot against the losers is the usual case; 0 typed in counts the same. A capot by the losers that leaves them behind no longer blocks the end. The capot button and its MAX + 9 are unchanged. The deal-end sheet says why a match goes on (`deal.endBlocked`).

## Consequences

- Old matches score unchanged: a rule snapshot (ADR 0009) holds values, not these rules, and stored deals are never re-scored.
- A tie saved without pressing «Висяща» can't be told apart later from a plain made deal; that is the intent.
