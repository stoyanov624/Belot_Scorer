import { describe, expect, it } from 'vitest';
import { createMatch, matchNumber } from '../../core/match';
import type { Match, Seat, Team } from '../../core/model';
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
    expect(resolutionCardLabel({ key: 'terca', rank: null }, DEFAULT_RULES)).toBe('Терца · 2');
    expect(resolutionCardLabel({ key: 'kvinta', rank: null }, DEFAULT_RULES)).toBe('Квинта · 10');
  });

  it('labels a four-of-a-kind with its points once the rank is set, else just "Каре"', () => {
    expect(resolutionCardLabel({ key: 'kare', rank: 'J' }, DEFAULT_RULES)).toBe('Каре · 20');
    expect(resolutionCardLabel({ key: 'kare', rank: null }, DEFAULT_RULES)).toBe('Каре');
  });
});

describe('declOptionPoints', () => {
  it('reads fixed declaration points from the default rules', () => {
    expect(declOptionPoints('belot', DEFAULT_RULES)).toBe('2');
    expect(declOptionPoints('kvinta', DEFAULT_RULES)).toBe('10');
  });

  it('shows kare as the lowest value with a plus when values differ', () => {
    expect(declOptionPoints('kare', DEFAULT_RULES)).toBe('10+');
  });

  it('drops the plus when every kare value is equal', () => {
    const rules: RulesConfig = {
      ...DEFAULT_RULES,
      karePoints: { Q: 20, K: 20, '10': 20, A: 20, '9': 20, J: 20 },
    };
    expect(declOptionPoints('kare', rules)).toBe('20');
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

describe('pointsHint', () => {
  it('hints the card points for a colour contract', () => {
    expect(pointsHint('hearts', DEFAULT_RULES)).toBe(
      'Закръглени точки от картите с последните 10 (общо 16).',
    );
  });

  it('hints the card points for all-trumps', () => {
    expect(pointsHint('at', DEFAULT_RULES)).toBe(
      'Закръглени точки от картите с последните 10 (общо 26).',
    );
  });

  it('hints the doubled card points for no-trumps', () => {
    expect(pointsHint('nt', DEFAULT_RULES)).toBe(
      'Закръглени точки от картите (общо 13), удвояват се.',
    );
  });

  it('follows a custom max from the rules', () => {
    const rules: RulesConfig = {
      ...DEFAULT_RULES,
      maxCardPoints: { ...DEFAULT_RULES.maxCardPoints, color: 20 },
    };
    expect(pointsHint('hearts', rules)).toBe(
      'Закръглени точки от картите с последните 10 (общо 20).',
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
      { contract: 'clubs', caller: 0, decls: [], cardPointsA: 10, capo: null, hang: 0 },
      DEFAULT_RULES,
    );
    expect(dealVerdict(score, 0, null, 0, teamName, DEFAULT_RULES)).toBe('Ние изкараха играта.');
  });

  it('reports an inside deal', () => {
    const score = scoreDeal(
      { contract: 'hearts', caller: 0, decls: [], cardPointsA: 7, capo: null, hang: 0 },
      DEFAULT_RULES,
    );
    expect(dealVerdict(score, 0, null, 0, teamName, DEFAULT_RULES)).toBe(
      'Вътре! Вие взимат всички 16 точки.',
    );
  });

  it('reports a hanging deal', () => {
    const score = scoreDeal(
      { contract: 'clubs', caller: 0, decls: [], cardPointsA: 8, capo: null, hang: 0 },
      DEFAULT_RULES,
    );
    expect(dealVerdict(score, 0, null, 0, teamName, DEFAULT_RULES)).toBe(
      'Висяща: Ние не записват, 8 т. висят за следващото раздаване.',
    );
  });

  it('appends the carried hanging points to a made deal', () => {
    const score = scoreDeal(
      { contract: 'clubs', caller: 0, decls: [], cardPointsA: 10, capo: null, hang: 8 },
      DEFAULT_RULES,
    );
    expect(dealVerdict(score, 0, null, 8, teamName, DEFAULT_RULES)).toBe(
      'Ние изкараха играта. +8 висящи за Ние.',
    );
  });

  it('wraps the text with a capot note', () => {
    const score = scoreDeal(
      { contract: 'spades', caller: 0, decls: [], cardPointsA: null, capo: 'A', hang: 0 },
      DEFAULT_RULES,
    );
    expect(dealVerdict(score, 0, 'A', 0, teamName, DEFAULT_RULES)).toBe(
      'Капо за Ние (+9). Ние изкараха играта. С капо мачът не може да приключи — играе се още едно раздаване.',
    );
  });
});

describe('calcRows', () => {
  it('shows cards, declarations and a plain total', () => {
    const score = scoreDeal(
      { contract: 'clubs', caller: 0, decls: [], cardPointsA: 10, capo: null, hang: 0 },
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
      { contract: 'nt', caller: 3, decls: [], cardPointsA: 5, capo: null, hang: 0 },
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
