import { beforeEach, describe, expect, it } from 'vitest';
import { createMatch } from '../core/match';
import { DEFAULT_RULES } from '../core/rules';
import { createDocumentStorage } from '../storage/document';
import { memoryKv } from '../storage/kv';
import { type AppStore, createAppStore } from './app-store';

let removed: string[];
let store: AppStore;

beforeEach(() => {
  removed = [];
  let n = 0;
  store = createAppStore({
    storage: createDocumentStorage(memoryKv()),
    newId: () => `id${++n}`,
    now: () => 1000,
    removePhoto: async (id) => {
      removed.push(id);
    },
  });
});

const input = { id: null, name: 'Иво', emoji: '🐻', photo: null };

describe('savePlayer', () => {
  it('adds a new player with a generated id and a trimmed name', () => {
    const result = store.getState().savePlayer({ ...input, name: '  Иво ' });
    expect(result).toEqual({ ok: true, id: 'id1' });
    expect(store.getState().roster).toEqual([{ id: 'id1', name: 'Иво', emoji: '🐻', photo: null }]);
  });

  it('rejects an empty or duplicate name (case-insensitive)', () => {
    const { savePlayer } = store.getState();
    savePlayer(input);
    expect(savePlayer({ ...input, name: '  ' })).toEqual({ ok: false, error: 'empty' });
    expect(savePlayer({ ...input, name: 'иво' })).toEqual({ ok: false, error: 'duplicate' });
    expect(store.getState().roster).toHaveLength(1);
  });

  it('edits an existing player, keeping its own name allowed', () => {
    const { savePlayer } = store.getState();
    savePlayer(input);
    expect(savePlayer({ ...input, id: 'id1', emoji: '🦊' })).toEqual({ ok: true, id: 'id1' });
    expect(store.getState().roster[0]?.emoji).toBe('🦊');
  });

  it('drops the emoji when a photo is set', () => {
    store.getState().savePlayer({ ...input, photo: 'ph1' });
    expect(store.getState().roster[0]).toMatchObject({ emoji: null, photo: 'ph1' });
  });

  it('removes the old photo blob when the photo is replaced', () => {
    const { savePlayer } = store.getState();
    savePlayer({ ...input, photo: 'ph1' });
    savePlayer({ ...input, id: 'id1', photo: 'ph2' });
    expect(removed).toEqual(['ph1']);
  });

  it('keeps the photo blob when an edit keeps the same photo', () => {
    const { savePlayer } = store.getState();
    savePlayer({ ...input, photo: 'ph1' });
    savePlayer({ ...input, id: 'id1', name: 'Ивo', photo: 'ph1' });
    expect(removed).toEqual([]);
  });

  it('removes the photo blob when the player switches to an emoji', () => {
    const { savePlayer } = store.getState();
    savePlayer({ ...input, photo: 'ph1' });
    savePlayer({ ...input, id: 'id1', photo: null });
    expect(store.getState().roster[0]).toMatchObject({ emoji: '🐻', photo: null });
    expect(removed).toEqual(['ph1']);
  });
});

describe('removePlayer', () => {
  it('removes the player and their photo blob', () => {
    store.getState().savePlayer({ ...input, photo: 'ph1' });
    expect(store.getState().removePlayer('id1')).toEqual({ ok: true });
    expect(store.getState().roster).toEqual([]);
    expect(removed).toEqual(['ph1']);
  });

  it('refuses while the player sits in the current match', () => {
    store.getState().savePlayer(input);
    store.setState({
      match: createMatch({
        seats: ['id1', 'b', 'c', 'd'],
        teamA: 'Ние',
        teamB: 'Вие',
        bestOf: 1,
        rules: DEFAULT_RULES,
      }),
    });
    expect(store.getState().removePlayer('id1')).toEqual({ ok: false, error: 'in-match' });
    expect(store.getState().roster).toHaveLength(1);
  });
});

describe('updateSettings', () => {
  it('merges a partial patch', () => {
    store.getState().updateSettings({ theme: 'night' });
    expect(store.getState().settings).toMatchObject({ theme: 'night', felt: 'wood' });
  });
});

describe('clearStats', () => {
  it('clears stats and leaves the roster and match untouched', () => {
    const { savePlayer, startMatch, setContract, saveDeal, endMatch } = store.getState();
    const p0 = savePlayer({ id: null, name: 'Иван', emoji: '🐻', photo: null });
    const p1 = savePlayer({ id: null, name: 'Петър', emoji: '🐻', photo: null });
    const p2 = savePlayer({ id: null, name: 'Мария', emoji: '🐻', photo: null });
    const p3 = savePlayer({ id: null, name: 'Жоро', emoji: '🐻', photo: null });
    if (!p0.ok || !p1.ok || !p2.ok || !p3.ok) throw new Error('savePlayer failed');
    startMatch({
      seats: [p0.id, p1.id, p2.id, p3.id],
      teamA: 'Ние',
      teamB: 'Вие',
      bestOf: 1,
    });
    setContract('hearts', 0);
    saveDeal({ cardPointsA: 10, capo: null });
    endMatch();
    expect(store.getState().stats).toHaveLength(1);

    const roster = store.getState().roster;
    const match = store.getState().match;
    store.getState().clearStats();

    expect(store.getState().stats).toEqual([]);
    expect(store.getState().roster).toEqual(roster);
    expect(store.getState().match).toEqual(match);
  });
});
