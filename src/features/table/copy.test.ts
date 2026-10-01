import { describe, expect, it } from 'vitest';
import { createMatch, matchNumber } from '../../core/match';
import type { Deal, Match, Seat, Team } from '../../core/model';
import { resolve } from '../../core/resolve';
import { DEFAULT_RULES, type RulesConfig } from '../../core/rules';
import { scoreDeal } from '../../core/score';
import { STRINGS } from '../../core/strings';
import {
  calcRows,
  contractLine,
  dealVerdict,
  declLabel,
  declOptionPoints,
  endBlockedNote,
  headerLine,
  pointsHint,
  resolutionCardLabel,
  resolutionErrors,
  resolutionLines,
  seriesFormat,
  teamNameOf,
} from './copy';

const teamName = (t: Team) => (t === 'A' ? 'Ние' : 'Вие');

describe('declLabel', () => {
  it('labels a sequence with its top card', () => {
    expect(declLabel({ key: 'terca', top: 'K', rank: null })).toBe('Терца до K');
  });

  it('labels a four-of-a-kind with its rank', () => {
    expect(declLabel({ key: 'kare', top: null, rank: 'J' })).toBe('Каре J');
  });

  it('labels a belot with just its name', () => {
    expect(declLabel({ key: 'belot', top: null, rank: null })).toBe('Белот');
  });

  it('labels a sequence with no top yet by its name only', () => {
    expect(declLabel({ key: 'kvinta', top: null, rank: null })).toBe('Квинта');
  });
});

describe('resolutionCardLabel', () => {
  it('labels a sequence with its points from the rules', () => {
    expect(resolutionCardLabel({ key: 'terca', rank: null }, DEFAULT_RULES)).toBe('Терца · 20');
    expect(resolutionCardLabel({ key: 'kvinta', rank: null }, DEFAULT_RULES)).toBe('Квинта · 100');
  });

  it('labels a four-of-a-kind with its points once the rank is set, else just "Каре"', () => {
    expect(resolutionCardLabel({ key: 'kare', rank: 'J' }, DEFAULT_RULES)).toBe('Каре · 200');
    expect(resolutionCardLabel({ key: 'kare', rank: null }, DEFAULT_RULES)).toBe('Каре');
  });
});

describe('declOptionPoints', () => {
  it('reads fixed declaration points from the default rules', () => {
    expect(declOptionPoints('belot', DEFAULT_RULES)).toBe('20');
    expect(declOptionPoints('kvinta', DEFAULT_RULES)).toBe('100');
  });

  it('shows kare as the lowest value with a plus when values differ', () => {
    expect(declOptionPoints('kare', DEFAULT_RULES)).toBe('100+');
  });

  it('drops the plus when every kare value is equal', () => {
    const rules: RulesConfig = {
      ...DEFAULT_RULES,
      karePoints: { Q: 20, K: 20, '10': 20, A: 20, '9': 20, J: 20 },
    };
    expect(declOptionPoints('kare', rules)).toBe('200');
  });
});

describe('headerLine', () => {
  it('shows the single-match header for bestOf 1', () => {
    const m = createMatch({
      seats: ['a', 'b', 'c', 'd'],
      teamA: 'Ние',
      teamB: 'Вие',
      bestOf: 1,
      rules: DEFAULT_RULES,
    });
    expect(headerLine(m)).toBe('Белот · до 151');
  });

  it('shows the series header for a mid-series match', () => {
    const base = createMatch({
      seats: ['a', 'b', 'c', 'd'],
      teamA: 'Ние',
      teamB: 'Вие',
      bestOf: 3,
      rules: DEFAULT_RULES,
    });
    const m: Match = { ...base, series: { A: 1, B: 0 } };
    expect(matchNumber(m)).toBe(2);
    expect(headerLine(m)).toBe('Мач 2 · серия 1:0 · 2 от 3');
  });
});

describe('seriesFormat', () => {
  it('looks up the series option label for a bestOf value', () => {
    expect(seriesFormat(1)).toBe('1 мач');
    expect(seriesFormat(3)).toBe('2 от 3');
    expect(seriesFormat(5)).toBe('3 от 5');
    expect(seriesFormat(7)).toBe('4 от 7');
  });
});

describe('contractLine', () => {
  it('names the contract and the caller', () => {
    const playerName = (seat: Seat) => (seat === 0 ? 'Иван' : '?');
    expect(contractLine({ contract: 'hearts', caller: 0 }, playerName)).toBe('Купа · Иван');
  });

  it('is null before a contract is chosen', () => {
    const playerName = () => '?';
    expect(contractLine({ contract: null, caller: null }, playerName)).toBeNull();
  });
});

describe('pointsHint (ADR 0020)', () => {
  it('hints the exact card points for a colour contract and all trumps', () => {
    expect(pointsHint('hearts')).toBe(
      'Точки от картите с последните 10 (общо 162). Записват се закръглени.',
    );
    expect(pointsHint('at')).toBe(
      'Точки от картите с последните 10 (общо 258). Записват се закръглени.',
    );
  });

  it('hints the doubling for no trumps', () => {
    expect(pointsHint('nt')).toBe(
      'Точки от картите с последните 10 (общо 130). Записват се закръглени и удвоени.',
    );
  });
});

describe('resolutionLines', () => {
  it('names the winning team of a sequence clash', () => {
    const res = resolve([
      { seat: 0, key: 'kvarta', top: null, rank: null },
      { seat: 1, key: 'terca', top: null, rank: null },
    ]);
    expect(resolutionLines(res, teamName)).toEqual([
      'Поредици: зачитат се на Ние, другите отпадат.',
    ]);
  });

  it('reports a full tie between equal sequences', () => {
    const res = resolve([
      { seat: 0, key: 'terca', top: 'K', rank: null },
      { seat: 1, key: 'terca', top: 'K', rank: null },
    ]);
    expect(resolutionLines(res, teamName)).toEqual(['Поредици: равни — всички отпадат.']);
  });

  it('names the winning team of a four-of-a-kind clash', () => {
    const res = resolve([
      { seat: 0, key: 'kare', top: null, rank: 'Q' },
      { seat: 1, key: 'kare', top: null, rank: 'K' },
    ]);
    expect(resolutionLines(res, teamName)).toEqual(['Карета: зачитат се на Вие, другите отпадат.']);
  });

  it('has no lines when nothing is contested', () => {
    const res = resolve([{ seat: 0, key: 'terca', top: null, rank: null }]);
    expect(resolutionLines(res, teamName)).toEqual([]);
  });
});

describe('resolutionErrors', () => {
  it('maps every resolve error to its sentence, in order and without duplicates', () => {
    const res = resolve([
      { seat: 0, key: 'terca', top: null, rank: null },
      { seat: 1, key: 'terca', top: 'K', rank: null },
      { seat: 0, key: 'kare', top: null, rank: null },
      { seat: 1, key: 'kare', top: null, rank: 'Q' },
      { seat: 3, key: 'kare', top: null, rank: 'Q' },
    ]);
    expect(resolutionErrors(res)).toEqual([
      'Посочете до коя карта са поредиците с еднаква дължина.',
      'Посочете от какви карти е всяко каре.',
      'Две карета от едни и същи карти не са възможни.',
    ]);
  });
});

describe('dealVerdict', () => {
  it('reports a made deal', () => {
    const score = scoreDeal(
      { contract: 'clubs', caller: 0, decls: [], cardPointsA: 100, capo: null, hang: 0 },
      DEFAULT_RULES,
    );
    expect(dealVerdict(score, 0, null, 0, teamName, DEFAULT_RULES)).toBe('Ние изкарахме играта.');
    // A custom team name keeps the handoff's third person (product owner, 2026-09-28).
    const custom = (t: Team) => (t === 'A' ? 'Столетниците' : 'Вие');
    expect(dealVerdict(score, 0, null, 0, custom, DEFAULT_RULES)).toBe(
      'Столетниците изкараха играта.',
    );
  });

  it('reports an inside deal', () => {
    const score = scoreDeal(
      { contract: 'hearts', caller: 0, decls: [], cardPointsA: 70, capo: null, hang: 0 },
      DEFAULT_RULES,
    );
    expect(dealVerdict(score, 0, null, 0, teamName, DEFAULT_RULES)).toBe(
      'Вътре! Вие взимате всички 16 точки.',
    );
  });

  it('reports a hanging deal', () => {
    const score = scoreDeal(
      {
        contract: 'clubs',
        caller: 0,
        decls: [],
        cardPointsA: 81,
        capo: null,
        hang: 0,
      },
      DEFAULT_RULES,
    );
    expect(dealVerdict(score, 0, null, 0, teamName, DEFAULT_RULES)).toBe(
      'Висяща: Ние не записваме, 8 т. висят за следващото раздаване.',
    );
  });

  it('appends the carried hanging points to a made deal', () => {
    const score = scoreDeal(
      { contract: 'clubs', caller: 0, decls: [], cardPointsA: 100, capo: null, hang: 8 },
      DEFAULT_RULES,
    );
    expect(dealVerdict(score, 0, null, 8, teamName, DEFAULT_RULES)).toBe(
      'Ние изкарахме играта. +8 висящи за Ние.',
    );
  });

  it('wraps the text with a capot note', () => {
    const score = scoreDeal(
      { contract: 'spades', caller: 0, decls: [], cardPointsA: null, capo: 'A', hang: 0 },
      DEFAULT_RULES,
    );
    expect(dealVerdict(score, 0, 'A', 0, teamName, DEFAULT_RULES)).toBe(
      'Капо за Ние (+9). Ние изкарахме играта.',
    );
  });
});

describe('calcRows', () => {
  it('shows cards, declarations and a plain total', () => {
    const score = scoreDeal(
      { contract: 'clubs', caller: 0, decls: [], cardPointsA: 100, capo: null, hang: 0 },
      DEFAULT_RULES,
    );
    expect(calcRows(score, null)).toEqual([
      { label: 'Карти', a: 10, b: 6 },
      { label: 'Обяви', a: 0, b: 0 },
      { label: 'Общо', a: 10, b: 6 },
    ]);
  });

  it('labels the cards row with a capot', () => {
    const score = scoreDeal(
      { contract: 'spades', caller: 0, decls: [], cardPointsA: null, capo: 'A', hang: 0 },
      DEFAULT_RULES,
    );
    const rows = calcRows(score, 'A');
    expect(rows[0]).toEqual({ label: 'Карти + капо', a: 25, b: 0 });
  });

  it('doubles the total label for no-trumps', () => {
    const score = scoreDeal(
      { contract: 'nt', caller: 3, decls: [], cardPointsA: 50, capo: null, hang: 0 },
      DEFAULT_RULES,
    );
    const rows = calcRows(score, null);
    expect(rows[2]).toEqual({ label: 'Общо ×2', a: 10, b: 16 });
  });
});

describe('teamNameOf', () => {
  it('reads team names off the match', () => {
    const name = teamNameOf({ teamA: 'Ние', teamB: 'Вие' });
    expect(name('A')).toBe('Ние');
    expect(name('B')).toBe('Вие');
  });
});

describe('STRINGS table copy sanity', () => {
  it('exposes the contract symbols and labels', () => {
    expect(STRINGS.contracts.hearts).toEqual({ sym: '♥', label: 'Купа' });
  });
});

describe('endBlockedNote (ADR 0018)', () => {
  const m = createMatch({
    seats: ['p0', 'p1', 'p2', 'p3'],
    teamA: 'Ние',
    teamB: 'Те',
    bestOf: 1,
    rules: DEFAULT_RULES,
  });
  const name = (t: Team) => (t === 'A' ? 'Ние' : 'Те');
  const deal = (a: number, b: number): Deal => ({
    a,
    b,
    contract: 'hearts',
    caller: 0,
    verdict: 'ok',
    capo: null,
    raw: [a, b],
    hangTo: null,
    prevHang: 0,
    decls: [],
  });
  const score = (cardPointsA: number) =>
    scoreDeal({ contract: 'hearts', caller: 0, decls: [], cardPointsA, capo: null, hang: 0 });

  it('names the losers when they took no card points in the deciding deal', () => {
    const match = { ...m, games: [deal(140, 100)] };
    expect(endBlockedNote(match, score(162), name)).toBe(
      'Мачът не приключва: Те не взеха точки от картите — играе се още едно раздаване.',
    );
  });

  it('is null when the losers took card points, or the target is not reached', () => {
    expect(endBlockedNote({ ...m, games: [deal(140, 100)] }, score(140), name)).toBeNull();
    expect(endBlockedNote({ ...m, games: [deal(100, 100)] }, score(162), name)).toBeNull();
  });
});
