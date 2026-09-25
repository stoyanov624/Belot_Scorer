import { describe, expect, it } from 'vitest';
import { newId } from '../lib/id';
import { memoryKv } from './kv';
import { createPhotoStore } from './photos';

const jpeg = () => new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });

describe('createPhotoStore', () => {
  it('stores a blob under a fresh id and returns it', async () => {
    const photos = createPhotoStore(memoryKv(), () => 'ph1');
    const blob = jpeg();

    const id = await photos.put(blob);

    expect(id).toBe('ph1');
    expect(await photos.get(id)).toBe(blob);
  });

  it('returns undefined for an unknown id or a non-blob value', async () => {
    const photos = createPhotoStore(memoryKv({ junk: 'not a blob' }), () => 'x');
    expect(await photos.get('missing')).toBeUndefined();
    expect(await photos.get('junk')).toBeUndefined();
  });

  it('removes a photo', async () => {
    const photos = createPhotoStore(memoryKv(), () => 'ph1');
    const id = await photos.put(jpeg());
    await photos.remove(id);
    expect(await photos.get(id)).toBeUndefined();
  });
});

describe('newId', () => {
  it('makes 10-character url-safe ids', () => {
    expect(newId()).toMatch(/^[A-Za-z0-9_-]{10}$/);
  });
});
