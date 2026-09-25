import type { Card, DeclInput, DeclKey, KareRank, Seat, Team, Verdict } from '../model';
import type { DealInput } from '../score';

export interface GoldenDeal {
  name: string;
  input: DealInput;
  expect: { match: Record<Team, number>; verdict: Verdict; hangTo: Team | null; nextHang: number };
}

const d = (seat: Seat, key: DeclKey, x: { top?: Card; rank?: KareRank } = {}): DeclInput => ({
  seat,
  key,
  top: x.top ?? null,
  rank: x.rank ?? null,
});

const base = { decls: [], capo: null, hang: 0 } as const;

export const GOLDEN_DEALS: GoldenDeal[] = [
  {
    name: '01 made, colour',
    input: { ...base, contract: 'hearts', caller: 0, cardPointsA: 10 },
    expect: { match: { A: 10, B: 6 }, verdict: 'ok', hangTo: null, nextHang: 0 },
  },
  {
    name: '02 inside, colour',
    input: { ...base, contract: 'hearts', caller: 0, cardPointsA: 7 },
    expect: { match: { A: 0, B: 16 }, verdict: 'inside', hangTo: null, nextHang: 0 },
  },
  {
    name: '03 hanging, playing team B',
    input: { ...base, contract: 'clubs', caller: 1, cardPointsA: 8 },
    expect: { match: { A: 8, B: 0 }, verdict: 'hang', hangTo: null, nextHang: 8 },
  },
  {
    name: '04 hanging points go to the next winner',
    input: { ...base, contract: 'clubs', caller: 0, cardPointsA: 10, hang: 8 },
    expect: { match: { A: 18, B: 6 }, verdict: 'ok', hangTo: 'A', nextHang: 0 },
  },
  {
    name: '05 hanging on hanging accumulates',
    input: { ...base, contract: 'spades', caller: 2, cardPointsA: 8, hang: 8 },
    expect: { match: { A: 0, B: 8 }, verdict: 'hang', hangTo: null, nextHang: 16 },
  },
  {
    name: '06 capot by the playing team',
    input: { ...base, contract: 'spades', caller: 0, cardPointsA: null, capo: 'A' },
    expect: { match: { A: 25, B: 0 }, verdict: 'ok', hangTo: null, nextHang: 0 },
  },
  {
    name: '07 capot by the defenders',
    input: { ...base, contract: 'spades', caller: 0, cardPointsA: null, capo: 'B' },
    expect: { match: { A: 0, B: 25 }, verdict: 'inside', hangTo: null, nextHang: 0 },
  },
  {
    name: '08 no trumps doubled, made',
    input: { ...base, contract: 'nt', caller: 3, cardPointsA: 5 },
    expect: { match: { A: 10, B: 16 }, verdict: 'ok', hangTo: null, nextHang: 0 },
  },
  {
    name: '09 no trumps inside',
    input: { ...base, contract: 'nt', caller: 0, cardPointsA: 6 },
    expect: { match: { A: 0, B: 26 }, verdict: 'inside', hangTo: null, nextHang: 0 },
  },
  {
    name: '10 all trumps with belot',
    input: { ...base, contract: 'at', caller: 0, cardPointsA: 13, decls: [d(0, 'belot')] },
    expect: { match: { A: 15, B: 13 }, verdict: 'ok', hangTo: null, nextHang: 0 },
  },
  {
    name: '11 longer sequence wins and sends the caller inside',
    input: {
      ...base,
      contract: 'hearts',
      caller: 0,
      cardPointsA: 9,
      decls: [d(0, 'terca'), d(1, 'kvarta')],
    },
    expect: { match: { A: 0, B: 21 }, verdict: 'inside', hangTo: null, nextHang: 0 },
  },
  {
    name: '12 full sequence tie cancels both',
    input: {
      ...base,
      contract: 'hearts',
      caller: 0,
      cardPointsA: 9,
      decls: [d(0, 'terca', { top: 'K' }), d(1, 'terca', { top: 'K' })],
    },
    expect: { match: { A: 9, B: 7 }, verdict: 'ok', hangTo: null, nextHang: 0 },
  },
  {
    name: '13 higher top card wins the tie',
    input: {
      ...base,
      contract: 'diamonds',
      caller: 1,
      cardPointsA: 8,
      decls: [d(0, 'terca', { top: 'A' }), d(3, 'terca', { top: 'K' })],
    },
    expect: { match: { A: 18, B: 0 }, verdict: 'inside', hangTo: null, nextHang: 0 },
  },
  {
    name: '14 stronger four of a kind (J over 9)',
    input: {
      ...base,
      contract: 'clubs',
      caller: 1,
      cardPointsA: 8,
      decls: [d(0, 'kare', { rank: '9' }), d(1, 'kare', { rank: 'J' })],
    },
    expect: { match: { A: 8, B: 28 }, verdict: 'ok', hangTo: null, nextHang: 0 },
  },
  {
    name: '15 belot counts for the side that lost sequences, producing a hang',
    input: {
      ...base,
      contract: 'hearts',
      caller: 0,
      cardPointsA: 8,
      decls: [d(1, 'belot'), d(0, 'terca')],
    },
    expect: { match: { A: 0, B: 10 }, verdict: 'hang', hangTo: null, nextHang: 10 },
  },
  {
    name: '16 one team with two sequences in all trumps, caller inside',
    input: {
      ...base,
      contract: 'at',
      caller: 1,
      cardPointsA: 10,
      decls: [d(0, 'terca'), d(2, 'kvarta')],
    },
    expect: { match: { A: 33, B: 0 }, verdict: 'inside', hangTo: null, nextHang: 0 },
  },
  {
    name: '17 inside with points hanging: the defenders take both',
    input: { ...base, contract: 'hearts', caller: 0, cardPointsA: 7, hang: 8 },
    expect: { match: { A: 0, B: 24 }, verdict: 'inside', hangTo: 'B', nextHang: 0 },
  },
];
