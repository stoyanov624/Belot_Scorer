import { describe, expect, it } from 'vitest';
import { allowedDeclarations } from '../../src/core/declarations';
import type {
  Card,
  ContractKey,
  Declaration,
  DeclInput,
  DeclKey,
  KareRank,
  Seat,
} from '../../src/core/model';
import { DEFAULT_RULES } from '../../src/core/rules';
import { exactCardPoints, maxCardPoints, scoreDeal } from '../../src/core/score';
import { GOLDEN_DEALS } from '../../src/core/testing/golden-deals';
// @ts-expect-error untyped verbatim JS port
import { calc, seatOptions } from './legacy.js';

/**
 * The prototype takes rounded card points and hangs on every rounded tie. Since ADR 0020 we take
 * exact points and hang only on an exact tie, so a case is fed to us as 10× its rounded points
 * (which round back to the same values) and a rounded tie is left out unless it is exact
 * (no trumps, 130, splits evenly).
 */
const exactFor = (rounded: number | null, contract: ContractKey) => {
  if (rounded === null) return null;
  const max = maxCardPoints(contract, DEFAULT_RULES);
  // The full rounded max is the exact total (26 in ВК is 258, not 260); max + 1 stays out of range.
  return rounded > max ? rounded * 10 : Math.min(rounded * 10, exactCardPoints(contract));
};

describe('parity with the HTML prototype: scoring', () => {
  it.each(GOLDEN_DEALS)('$name', ({ input }) => {
    const ours = scoreDeal(input);
    const theirs = calc({
      contract: input.contract,
      caller: input.caller,
      capo: input.capo,
      hang: input.hang,
      inA: ours.error || input.capo ? '' : String(ours.cards.A),
      current: input.decls.map((d, i) => ({ ...d, id: i })),
    });
    // Golden cases are already exact; the prototype sees their rounded points. Rounded ties
    // that aren't exact ties (18–20) are where ADR 0020 deliberately departs from it.
    if (theirs.verdict === 'hang' && ours.verdict !== 'hang') return;
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

describe('parity sweep', () => {
  const decl = (seat: Seat, key: DeclKey, x: { top?: Card; rank?: KareRank } = {}): DeclInput => ({
    seat,
    key,
    top: x.top ?? null,
    rank: x.rank ?? null,
  });

  interface Layout {
    name: string;
    decls: DeclInput[];
  }

  const LAYOUTS: Layout[] = [
    { name: 'none', decls: [] },
    { name: '[0 belot]', decls: [decl(0, 'belot')] },
    {
      name: '[0 terca top K, 1 terca top K]',
      decls: [decl(0, 'terca', { top: 'K' }), decl(1, 'terca', { top: 'K' })],
    },
    {
      name: '[0 terca top A, 3 terca top K]',
      decls: [decl(0, 'terca', { top: 'A' }), decl(3, 'terca', { top: 'K' })],
    },
    { name: '[0 kvarta, 1 terca]', decls: [decl(0, 'kvarta'), decl(1, 'terca')] },
    {
      name: '[0 kare rank 9, 1 kare rank J]',
      decls: [decl(0, 'kare', { rank: '9' }), decl(1, 'kare', { rank: 'J' })],
    },
    {
      name: '[0 kare rank Q, 2 kare rank Q]',
      decls: [decl(0, 'kare', { rank: 'Q' }), decl(2, 'kare', { rank: 'Q' })],
    },
    {
      name: '[0 terca (no top), 1 terca (no top)]',
      decls: [decl(0, 'terca'), decl(1, 'terca')],
    },
    {
      name: '[1 belot, 0 terca, 2 kvinta top A, 3 kvinta top A]',
      decls: [
        decl(1, 'belot'),
        decl(0, 'terca'),
        decl(2, 'kvinta', { top: 'A' }),
        decl(3, 'kvinta', { top: 'A' }),
      ],
    },
  ];

  const CONTRACTS: ContractKey[] = ['clubs', 'diamonds', 'hearts', 'spades', 'nt', 'at'];
  const CALLERS: Seat[] = [0, 1];
  const HANGS = [0, 7];

  interface DealInputLike {
    contract: ContractKey;
    caller: Seat;
    decls: DeclInput[];
    cardPointsA: number | null;
    capo: 'A' | 'B' | null;
    hang: number;
  }
  interface SweepCase {
    name: string;
    input: DealInputLike;
  }

  const cases: SweepCase[] = [];
  for (const contract of CONTRACTS) {
    const layouts = contract === 'nt' ? LAYOUTS.filter((l) => l.decls.length === 0) : LAYOUTS;
    const max = maxCardPoints(contract, DEFAULT_RULES);
    for (const caller of CALLERS) {
      for (const hang of HANGS) {
        for (const layout of layouts) {
          const cardPointsAValues: (number | null)[] = [
            ...Array.from({ length: max + 1 }, (_, i) => i),
            null,
            max + 1,
          ];
          for (const cardPointsA of cardPointsAValues) {
            cases.push({
              name: `${contract} · caller ${caller} · hang ${hang} · ${layout.name} · cardPointsA ${cardPointsA ?? 'null'}`,
              input: { contract, caller, decls: layout.decls, cardPointsA, capo: null, hang },
            });
          }
          for (const capo of ['A', 'B'] as const) {
            cases.push({
              name: `${contract} · caller ${caller} · hang ${hang} · ${layout.name} · capo ${capo}`,
              input: { contract, caller, decls: layout.decls, cardPointsA: null, capo, hang },
            });
          }
        }
      }
    }
  }

  it.each(cases)('$name', ({ input }) => {
    const ours = scoreDeal({ ...input, cardPointsA: exactFor(input.cardPointsA, input.contract) });
    const theirs = calc({
      contract: input.contract,
      caller: input.caller,
      capo: input.capo,
      hang: input.hang,
      inA: input.cardPointsA === null ? '' : String(input.cardPointsA),
      current: input.decls.map((d, i) => ({ ...d, id: i })),
    });
    // A rounded tie that isn't an exact one: ADR 0020 departs from the prototype here.
    if (theirs.verdict === 'hang' && ours.verdict !== 'hang') return;
    expect({ A: theirs.mA, B: theirs.mB }).toEqual(ours.match);
    expect(theirs.verdict).toBe(ours.verdict);
    expect(theirs.hangTo).toBe(ours.hangTo);
    expect(theirs.nextHang).toBe(ours.nextHang);
    expect(theirs.res.errors).toEqual(ours.resolution.errors);
    expect(theirs.err).toBe(ours.error ?? '');
  });
});
