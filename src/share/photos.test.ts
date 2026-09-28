import { describe, expect, it } from 'vitest';
import type { Player } from '../core/model';
import { buildPayload } from '../core/share';
import { attachPhotos, dataUrlToBlob } from './photos';

const P = (id: string, photo: string | null): Player => ({ id, name: 'Играч', emoji: null, photo });

const payloadFor = (roster: Player[]) =>
  buildPayload({ roster, stats: [], match: null }, 'all', 1, true);

describe('attachPhotos', () => {
  it('embeds a blob as a data URL, keyed by photo id', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const blob = new Blob([bytes], { type: 'image/png' });
    const payload = payloadFor([P('a', 'ph1')]);

    const result = await attachPhotos(payload, async (id) => (id === 'ph1' ? blob : undefined));

    expect(result.photos).toEqual({ ph1: expect.stringMatching(/^data:image\/png;base64,/) });
    expect(result.roster).toEqual([{ id: 'a', name: 'Играч', emoji: null, photo: 'ph1' }]);
  });

  it('leaves photos off the payload when the roster has no photo ids', async () => {
    const payload = payloadFor([P('a', null)]);

    const result = await attachPhotos(payload, async () => undefined);

    expect(result.photos).toBeUndefined();
  });

  it('nulls a player whose blob is missing, and leaves that id out of the map', async () => {
    const payload = payloadFor([P('a', 'ph1'), P('b', 'ph2')]);
    const blob = new Blob([new Uint8Array([9])], { type: 'image/png' });

    const result = await attachPhotos(payload, async (id) => (id === 'ph1' ? blob : undefined));

    expect(result.roster).toEqual([
      { id: 'a', name: 'Играч', emoji: null, photo: 'ph1' },
      { id: 'b', name: 'Играч', emoji: null, photo: null },
    ]);
    expect(Object.keys(result.photos ?? {})).toEqual(['ph1']);
  });
});

describe('dataUrlToBlob', () => {
  it('round-trips bytes and type with attachPhotos output', async () => {
    const bytes = new Uint8Array([10, 20, 30, 255, 0, 128]);
    const blob = new Blob([bytes], { type: 'image/jpeg' });
    const payload = payloadFor([P('a', 'ph1')]);
    const { photos } = await attachPhotos(payload, async () => blob);

    const decoded = dataUrlToBlob(photos?.ph1 as string);
    if (!decoded) throw new Error('dataUrlToBlob failed');

    expect(decoded.type).toBe('image/jpeg');
    expect([...new Uint8Array(await decoded.arrayBuffer())]).toEqual([...bytes]);
  });

  it('returns null for text that is not a data URL', () => {
    expect(dataUrlToBlob('nope')).toBeNull();
  });

  it('returns null for invalid base64 content', () => {
    expect(dataUrlToBlob('data:;base64,***')).toBeNull();
  });
});
