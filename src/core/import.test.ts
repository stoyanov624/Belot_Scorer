import { describe, expect, it } from 'vitest';
import { applyImport, needsTakeConfirm } from './import';
import { createMatch, saveDeal, setContract } from './match';
import type { Match, MatchRecord, Player } from './model';
import { DEFAULT_RULES } from './rules';
import type { SharePayload } from './share';

const player = (id: string, name: string, emoji: string | null, photo: string | null): Player => ({
  id,
  name,
  emoji,
  photo,
});

const record = (
  id: string,
  seats: [string, string, string, string],
  names: [string, string, string, string] = ['a', 'b', 'c', 'd'],
): MatchRecord => ({
  id,
  date: 0,
  seats,
  names,
  teamA: 'Ние',
  teamB: 'Вие',
  totalA: 100,
  totalB: 80,
  games: [],
});

const payload = (
  roster: Player[],
  stats: MatchRecord[] = [],
  match: Match | null = null,
): SharePayload => ({
  app: 'belot',
  v: 2,
  at: 0,
  roster,
  stats,
  match,
});

const freshMatch = (seats: [string, string, string, string] = ['p0', 'p1', 'p2', 'p3']): Match =>
  createMatch({ seats, teamA: 'Ние', teamB: 'Вие', bestOf: 1, rules: DEFAULT_RULES });

describe('applyImport', () => {
  describe('merge', () => {
    it('updates a player by id: imported name and emoji win, local photo kept when imported is null', () => {
      const local = {
        roster: [player('p1', 'Local Name', '😀', 'photo-1')],
        stats: [],
        match: null,
      };
      const data = payload([player('p1', 'New Name', '🎉', null)]);

      const result = applyImport(local, data, 'merge');

      expect(result.roster).toEqual([player('p1', 'New Name', '🎉', 'photo-1')]);
    });

    it('keeps the local name on an id update that would collide with another local name', () => {
      const local = {
        roster: [player('p1', 'Иван', '😀', null), player('p2', 'Петър', '🐟', null)],
        stats: [],
        match: null,
      };
      // The imported record for p2 carries the name 'Иван', which collides with p1's name.
      const data = payload([player('p2', 'Иван', '🎉', 'new-photo')]);

      const result = applyImport(local, data, 'merge');

      expect(result.roster).toEqual([
        player('p1', 'Иван', '😀', null),
        player('p2', 'Петър', '🎉', 'new-photo'),
      ]);
    });

    it('links a player by normalized name and remaps stats seats, leaving the local player unchanged', () => {
      const local = {
        roster: [player('local-1', 'Иван', '😀', 'ph-1')],
        stats: [],
        match: null,
      };
      const data = payload(
        [player('imported-9', '  иван ', '🤖', null)],
        [record('m2', ['imported-9', 'x', 'y', 'z'])],
      );

      const result = applyImport(local, data, 'merge');

      expect(result.roster).toEqual([player('local-1', 'Иван', '😀', 'ph-1')]);
      expect(result.stats[0]?.seats).toEqual(['local-1', 'x', 'y', 'z']);
    });

    it('adds new players in the imported order, after the local ones', () => {
      const local = {
        roster: [player('a', 'A', null, null), player('b', 'B', null, null)],
        stats: [],
        match: null,
      };
      const data = payload([player('c', 'C', null, null), player('d', 'D', null, null)]);

      const result = applyImport(local, data, 'merge');

      expect(result.roster.map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
    });

    it('skips stats records that already exist locally and appends new ones with remapped seats', () => {
      const existing = record('m1', ['a', 'b', 'c', 'd']);
      const local = {
        roster: [player('a', 'A', null, null)],
        stats: [existing],
        match: null,
      };
      const data = payload(
        [player('a', 'A', null, null)],
        [record('m1', ['a', 'b', 'c', 'd']), record('m2', ['a', 'b', 'c', 'd'])],
      );

      const result = applyImport(local, data, 'merge');

      expect(result.stats).toEqual([existing, record('m2', ['a', 'b', 'c', 'd'])]);
      expect(result.addedMatches).toBe(1);
    });

    it('leaves the local match untouched and reports tookMatch false', () => {
      const localMatch = freshMatch();
      const local = { roster: [], stats: [], match: localMatch };
      const data = payload([], [], freshMatch(['x', 'y', 'z', 'w']));

      const result = applyImport(local, data, 'merge');

      expect(result.match).toBe(localMatch);
      expect(result.tookMatch).toBe(false);
    });

    it('reports players as the imported roster length in merge mode', () => {
      const local = { roster: [], stats: [], match: null };
      const data = payload([player('a', 'A', null, null), player('b', 'B', null, null)]);

      const result = applyImport(local, data, 'merge');

      expect(result.players).toBe(2);
    });
  });

  describe('take', () => {
    it('takes the imported match with seats remapped after a by-name link', () => {
      const local = {
        roster: [player('local-1', 'Иван', null, null)],
        stats: [],
        match: null,
      };
      const importedMatch = freshMatch(['imported-9', 'x', 'y', 'z']);
      const data = payload([player('imported-9', 'иван', null, null)], [], importedMatch);

      const result = applyImport(local, data, 'take');

      expect(result.tookMatch).toBe(true);
      expect(result.match).toEqual({ ...importedMatch, seats: ['local-1', 'x', 'y', 'z'] });
    });

    it('acts as a merge when there is no imported match', () => {
      const localMatch = freshMatch();
      const local = { roster: [], stats: [], match: localMatch };
      const data = payload([], [], null);

      const result = applyImport(local, data, 'take');

      expect(result.tookMatch).toBe(false);
      expect(result.match).toBe(localMatch);
    });
  });

  describe('replace', () => {
    it('replaces the roster and stats exactly and takes the imported match', () => {
      const local = {
        roster: [player('old', 'Old', null, null)],
        stats: [record('old-m', ['old', 'w', 'x', 'y'])],
        match: freshMatch(),
      };
      const importedRoster = [player('new', 'New', null, null)];
      const importedStats = [record('new-m', ['new', 'w', 'x', 'y'])];
      const importedMatch = freshMatch(['new', 'w', 'x', 'y']);
      const data = payload(importedRoster, importedStats, importedMatch);

      const result = applyImport(local, data, 'replace');

      expect(result.roster).toEqual(importedRoster);
      expect(result.stats).toEqual(importedStats);
      expect(result.match).toEqual(importedMatch);
      expect(result.tookMatch).toBe(true);
      expect(result.players).toBe(1);
      expect(result.addedMatches).toBe(1);
    });

    it('sets the match to null when there is no imported match', () => {
      const local = { roster: [], stats: [], match: freshMatch() };
      const data = payload([], [], null);

      const result = applyImport(local, data, 'replace');

      expect(result.match).toBeNull();
      expect(result.tookMatch).toBe(false);
    });

    it('keeps the local photo of a player kept by id when imported photo is null', () => {
      const local = {
        roster: [player('p1', 'Local Name', null, 'photo-1')],
        stats: [],
        match: null,
      };
      const data = payload([player('p1', 'New Name', null, null)]);

      const result = applyImport(local, data, 'replace');

      expect(result.roster).toEqual([player('p1', 'New Name', null, 'photo-1')]);
    });

    it('takes the imported non-null photo over the local one', () => {
      const local = {
        roster: [player('p1', 'Local Name', null, 'photo-1')],
        stats: [],
        match: null,
      };
      const data = payload([player('p1', 'New Name', null, 'photo-2')]);

      const result = applyImport(local, data, 'replace');

      expect(result.roster).toEqual([player('p1', 'New Name', null, 'photo-2')]);
    });
  });
});

describe('needsTakeConfirm', () => {
  it('is false when there is no local match', () => {
    expect(needsTakeConfirm(null)).toBe(false);
  });

  it('is false for a playing match with no saved deals', () => {
    expect(needsTakeConfirm(freshMatch())).toBe(false);
  });

  it('is true for a playing match with at least one saved deal', () => {
    let m = freshMatch();
    m = setContract(m, 'hearts', 0);
    const r = saveDeal(m, { cardPointsA: 10, capo: null });
    if (!r.ok) throw new Error(r.error);

    expect(needsTakeConfirm(r.match)).toBe(true);
  });

  it('is false for an ended match', () => {
    const m: Match = { ...freshMatch(), status: 'ended' };
    expect(needsTakeConfirm(m)).toBe(false);
  });
});
