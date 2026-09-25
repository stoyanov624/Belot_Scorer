import { describe, expect, it } from 'vitest';
import { allowedDeclarations } from '../../src/core/declarations';
import type { ContractKey, Declaration, DeclKey, Seat } from '../../src/core/model';
import { scoreDeal } from '../../src/core/score';
import { GOLDEN_DEALS } from '../../src/core/testing/golden-deals';
// @ts-expect-error untyped verbatim JS port
import { calc, seatOptions } from './legacy.js';

describe('parity with the HTML prototype: scoring', () => {
  it.each(GOLDEN_DEALS)('$name', ({ input }) => {
    const ours = scoreDeal(input);
    const theirs = calc({
      contract: input.contract,
      caller: input.caller,
      capo: input.capo,
      hang: input.hang,
      inA: input.cardPointsA === null ? '' : String(input.cardPointsA),
      current: input.decls.map((d, i) => ({ ...d, id: i })),
    });
    expect({ A: theirs.mA, B: theirs.mB }).toEqual(ours.match);
    expect(theirs.verdict).toBe(ours.verdict);
    expect(theirs.hangTo).toBe(ours.hangTo);
    expect(theirs.nextHang).toBe(ours.nextHang);
    expect(theirs.res.errors).toEqual(ours.resolution.errors);
  });
});

describe('parity with the HTML prototype: allowed declarations', () => {
  const contracts: (ContractKey | null)[] = [null, 'hearts', 'nt', 'at'];
  const layouts: [Seat, DeclKey][][] = [
    [],
    [[0, 'belot']],
    [[0, 'kvinta']],
    [
      [0, 'belot'],
      [0, 'kare'],
      [0, 'kare'],
    ],
    [
      [0, 'kare'],
      [0, 'kare'],
      [1, 'kare'],
      [1, 'kare'],
      [2, 'kare'],
      [2, 'kare'],
    ],
    [
      [0, 'belot'],
      [1, 'belot'],
      [2, 'belot'],
      [3, 'belot'],
    ],
  ];
  for (const contract of contracts) {
    layouts.forEach((layout, li) => {
      for (const seat of [0, 1, 2, 3] as Seat[]) {
        it(`${contract ?? 'none'} · layout ${li} · seat ${seat}`, () => {
          const current: Declaration[] = layout.map(([s, key], i) => ({
            id: `d${i}`,
            seat: s,
            key,
            top: null,
            rank: null,
          }));
          const ours = allowedDeclarations({ contract, current }, seat);
          const theirs = seatOptions({ contract, current }, seat);
          expect(ours.options).toEqual(theirs.opts);
          expect(ours.blocked ?? '').toBe(theirs.msg);
        });
      }
    });
  }
});
