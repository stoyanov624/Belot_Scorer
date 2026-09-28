import { describe, expect, it } from 'vitest';
import {
  addDeclaration,
  createMatch,
  saveDeal,
  setContract,
  updateDeclaration,
} from '../../core/match';
import type { Match, Seat, Team } from '../../core/model';
import { DEFAULT_RULES } from '../../core/rules';
import { currentEntry, historyEntries } from './copy';

const NAMES = ['Иван', 'Петър', 'Мария', 'Георги'] as const;
const playerName = (seat: Seat) => NAMES[seat];
const teamName = (t: Team) => (t === 'A' ? 'Ние' : 'Вие');

const fresh = () =>
  createMatch({
    seats: ['p0', 'p1', 'p2', 'p3'],
    teamA: 'Ние',
    teamB: 'Вие',
    bestOf: 1,
    // A high target keeps every deal below in this fixture from auto-ending the match.
    rules: { ...DEFAULT_RULES, targetScore: 999 },
  });

const save = (m: Match, cardPointsA: number | null, capo: 'A' | 'B' | null = null) => {
  const r = saveDeal(m, { cardPointsA, capo });
  if (!r.ok) throw new Error(r.error);
  return r.match;
};

/**
 * Six deals covering every note kind and contract shape the history screen shows:
 * 1. clubs, no declarations, plain "ok" verdict.
 * 2. hearts, a contested tied-length sequence resolved via `updateDeclaration` — one team's
 *    declaration is dropped.
 * 3. spades, an "inside" verdict.
 * 4. clubs, a tie — "hang" verdict, points carried to the next deal.
 * 5. clubs, resolves the carried hang to team B.
 * 6. spades, a capot for team A.
 */
function buildMatch(): Match {
  let m = fresh();

  m = save(setContract(m, 'clubs', 1), 6); // deal 1: a=6, b=10

  m = setContract(m, 'hearts', 0);
  m = addDeclaration(m, { id: 'd1', seat: 0, key: 'terca' });
  m = updateDeclaration(m, 'd1', { top: 'K' });
  m = addDeclaration(m, { id: 'd2', seat: 1, key: 'terca' });
  m = updateDeclaration(m, 'd2', { top: '9' });
  m = save(m, 10); // deal 2: a=12, b=6

  m = save(setContract(m, 'spades', 2), 5); // deal 3: inside, a=0, b=16

  m = save(setContract(m, 'clubs', 1), 8); // deal 4: hang, a=8, b=0

  m = save(setContract(m, 'clubs', 1), 5); // deal 5: hangTo B, a=5, b=19

  m = save(setContract(m, 'spades', 2), null, 'A'); // deal 6: capot for A, a=25, b=0

  return m;
}

describe('historyEntries', () => {
  const m = buildMatch();
  const entries = historyEntries(m, playerName, teamName);

  it('orders newest first and keeps running totals', () => {
    expect(entries.map((e) => e.no)).toEqual([6, 5, 4, 3, 2, 1]);
    expect(entries.map((e) => [e.a, e.b])).toEqual([
      [25, 0],
      [5, 19],
      [8, 0],
      [0, 16],
      [12, 6],
      [6, 10],
    ]);
    expect(entries.map((e) => [e.runA, e.runB])).toEqual([
      [56, 51],
      [31, 51],
      [26, 32],
      [18, 32],
      [18, 16],
      [6, 10],
    ]);
  });

  it('builds the contract as a separate symbol and rest, red only for red suits', () => {
    const deal2 = entries.find((e) => e.no === 2);
    expect(deal2?.contract).toEqual({ sym: '♥', rest: 'Купа · Иван' });
    expect(deal2?.red).toBe(true);

    const deal1 = entries.find((e) => e.no === 1);
    expect(deal1?.contract).toEqual({ sym: '♣', rest: 'Спатия · Петър' });
    expect(deal1?.red).toBe(false);
  });

  it('marks a dropped declaration invalid, with a stable index-based id', () => {
    const deal2 = entries.find((e) => e.no === 2);
    expect(deal2?.decls).toEqual([
      { id: 0, seat: 0, team: 'A', label: 'Терца до K', points: 2, valid: true },
      { id: 1, seat: 1, team: 'B', label: 'Терца до 9', points: 2, valid: false },
    ]);
  });

  it('notes an inside deal', () => {
    expect(entries.find((e) => e.no === 3)?.notes).toBe('Вътре — Ние не записваме');
  });

  it('notes a hanging deal', () => {
    expect(entries.find((e) => e.no === 4)?.notes).toBe('Висяща');
  });

  it("notes the next deal's hanging points going to a team", () => {
    expect(entries.find((e) => e.no === 5)?.notes).toBe('Висящите отиват при Вие');
  });

  it('notes a capot', () => {
    expect(entries.find((e) => e.no === 6)?.notes).toBe('Капо за Ние');
  });

  it('has no declarations and empty notes on a deal without any', () => {
    const deal1 = entries.find((e) => e.no === 1);
    expect(deal1?.decls).toEqual([]);
    expect(deal1?.notes).toBe('');
  });
});

describe('currentEntry', () => {
  it('is null when there are no current declarations', () => {
    const m = fresh();
    expect(currentEntry(m)).toBeNull();
  });

  it('shows one entry per current declaration, all valid', () => {
    let m = fresh();
    m = setContract(m, 'hearts', 0);
    m = addDeclaration(m, { id: 'c1', seat: 0, key: 'belot' });
    m = addDeclaration(m, { id: 'c2', seat: 3, key: 'kare' });
    m = updateDeclaration(m, 'c2', { rank: 'J' });

    expect(currentEntry(m)).toEqual({
      no: 1,
      decls: [
        { id: 0, seat: 0, team: 'A', label: 'Белот', points: 2, valid: true },
        { id: 1, seat: 3, team: 'B', label: 'Каре J', points: 20, valid: true },
      ],
    });
  });

  it('numbers the current deal after the already-saved games', () => {
    let m = buildMatch();
    m = setContract(m, 'hearts', 0);
    m = addDeclaration(m, { id: 'c3', seat: 0, key: 'belot' });
    expect(currentEntry(m)?.no).toBe(7);
  });
});
