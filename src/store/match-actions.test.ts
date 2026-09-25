import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_RULES } from '../core/rules';
import { createDocumentStorage } from '../storage/document';
import { memoryKv } from '../storage/kv';
import { type AppStore, createAppStore } from './app-store';

let store: AppStore;
const s = () => store.getState();

beforeEach(() => {
  let n = 0;
  store = createAppStore({
    storage: createDocumentStorage(memoryKv()),
    newId: () => `id${++n}`,
    now: () => 1000,
    removePhoto: async () => {},
  });
  for (const name of ['Иво', 'Мила', 'Петър', 'Ана']) {
    s().savePlayer({ id: null, name, emoji: null, photo: null });
  }
});

const start = (bestOf: 1 | 3 = 1) =>
  s().startMatch({ seats: ['id1', 'id2', 'id3', 'id4'], teamA: 'Ние', teamB: 'Вие', bestOf });

/** Hearts, called by North; team A takes 10 of 16 card points → A 10, B 6. */
const playDeal = () => {
  s().setContract('hearts', 0);
  return s().saveDeal({ cardPointsA: 10, capo: null });
};

const lowTarget = (targetScore: number) =>
  s().updateSettings({ rules: { ...DEFAULT_RULES, targetScore } });

describe('match actions', () => {
  it('starts a match with the target score from the rules', () => {
    lowTarget(101);
    start();
    expect(s().match).toMatchObject({ targetScore: 101, status: 'playing', games: [] });
  });

  it('does nothing without a match', () => {
    s().setContract('hearts', 0);
    expect(s().match).toBeNull();
    expect(s().saveDeal({ cardPointsA: 10, capo: null })).toEqual({ ok: false, error: 'no-match' });
  });

  it('adds declarations with generated ids and removes them', () => {
    start();
    s().setContract('hearts', 0);
    s().addDeclaration(0, 'belot');
    const [decl] = s().match?.current ?? [];
    expect(decl).toMatchObject({ id: 'id5', seat: 0, key: 'belot' });
    s().removeDeclaration('id5');
    expect(s().match?.current).toEqual([]);
  });

  it('saves a deal and undoes it', () => {
    start();
    expect(playDeal()).toMatchObject({ ok: true, ended: false });
    expect(s().match?.games).toHaveLength(1);
    s().undoLastDeal();
    expect(s().match?.games).toEqual([]);
  });

  it('returns the core error and keeps state when the deal is invalid', () => {
    start();
    s().setContract('hearts', 0);
    expect(s().saveDeal({ cardPointsA: 99, capo: null })).toEqual({
      ok: false,
      error: 'points-range',
    });
    expect(s().match?.games).toEqual([]);
  });

  it('records the match when a deal ends it', () => {
    lowTarget(10);
    start();
    expect(playDeal()).toMatchObject({ ok: true, ended: true });
    expect(s().match?.status).toBe('ended');
    expect(s().stats).toEqual([
      {
        id: 'id5',
        date: 1000,
        seats: ['id1', 'id2', 'id3', 'id4'],
        names: ['Иво', 'Мила', 'Петър', 'Ана'],
        teamA: 'Ние',
        teamB: 'Вие',
        totalA: 10,
        totalB: 6,
        games: [{ decls: [] }],
      },
    ]);
  });

  it('records a manually ended match once, and skips one with no deals', () => {
    start();
    s().endMatch();
    expect(s().stats).toEqual([]);

    s().rematch();
    playDeal();
    s().endMatch();
    s().endMatch();
    expect(s().stats).toHaveLength(1);
  });

  it('carries the series into the next match and resets it on rematch', () => {
    lowTarget(10);
    start(3);
    playDeal();
    s().nextMatch();
    expect(s().match).toMatchObject({ series: { A: 1, B: 0 }, status: 'playing', games: [] });
    s().rematch();
    expect(s().match?.series).toEqual({ A: 0, B: 0 });
  });

  it('leaves the match', () => {
    start();
    s().leaveMatch();
    expect(s().match).toBeNull();
  });
});
