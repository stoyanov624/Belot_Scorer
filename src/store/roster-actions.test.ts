import { beforeEach, describe, expect, it } from 'vitest';
import { createMatch } from '../core/match';
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
        targetScore: 151,
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
