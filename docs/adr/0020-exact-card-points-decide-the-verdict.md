# Exact card points decide the verdict; the score is written rounded

Supersedes the hanging half of [ADR 0018](0018-chosen-hanging-and-zero-card-match-end.md) (the «Висяща» toggle). Product owner, 2026-10-01: fewer buttons, and the real points settle a close deal.

- Players enter **exact** card points, last ten included: 0–162 in a suit game, 0–258 in «Всичко коз», 0–130 in «Без коз». The other team's field fills itself with the rest.
- **Rounding** is the table rule (`roundCardPoints` in `core/rules.ts`): a last digit from 6 up rounds up in a suit game, from 4 up in «Всичко коз», from 5 up in «Без коз». The calling team's points are rounded and the other team gets the rest of 16 / 26 / 13, so the two always add up (76 : 86 in a suit game called by the 86 side is 7 : 9).
- **Verdict**: each team's exact total is its exact card points plus its declarations in real points (терца 20). The calling team has less → «вътре»; exactly as much → «висяща»; more → made. The match is then written in rounded points exactly as before for that verdict (doubled for «Без коз»).
- **Капо** fills the exact total for the capot team (162 / 0) and scores MAX + 9 rounded, as before.
- The match-end rule of ADR 0018 now reads the exact card points: the losers must have taken at least one card point.

## Consequences

- Stored deals keep their rounded totals and verdict; nothing migrates, and the share format is unchanged.
- The prototype-parity test feeds the prototype rounded points and us 10× them, and skips rounded ties that aren't exact ties: the one place this rule departs from the prototype.
- `DealInput.cardPointsA` and every saved-deal fixture are exact now.
