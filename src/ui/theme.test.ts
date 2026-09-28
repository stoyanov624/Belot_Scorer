// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { THEMES } from '../core/tokens';
import { createDocumentStorage } from '../storage/document';
import { memoryKv } from '../storage/kv';
import { createAppStore, STORAGE_KEY } from '../store/app-store';
import { applyTheme, feltStyle, syncTheme } from './theme';

const makeStore = (kv = memoryKv()) =>
  createAppStore({
    storage: createDocumentStorage(kv),
    newId: () => 'id',
    now: () => 0,
    putPhoto: async () => 'ph1',
    removePhoto: async () => {},
  });

describe('theme', () => {
  it('writes --t-* variables and data-theme on the root', () => {
    const root = document.createElement('html');
    applyTheme(root, 'night');
    expect(root.style.getPropertyValue('--t-a')).toBe(THEMES.night.a);
    expect(root.dataset.theme).toBe('night');
  });

  it('applies the current theme and follows changes until unsubscribed', () => {
    const store = makeStore();
    const root = document.createElement('html');
    const stop = syncTheme(store, root);
    expect(root.dataset.theme).toBe('pub');

    store.getState().updateSettings({ theme: 'casino' });
    expect(root.dataset.theme).toBe('casino');

    stop();
    store.getState().updateSettings({ theme: 'home' });
    expect(root.dataset.theme).toBe('casino');
  });

  it('writes the theme color meta when present, and no-ops when it is missing', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);

    const store = makeStore();
    const root = document.createElement('html');
    syncTheme(store, root);
    expect(meta.content).toBe(THEMES.pub.bg);

    store.getState().updateSettings({ theme: 'night' });
    expect(meta.content).toBe(THEMES.night.bg);

    document.head.removeChild(meta);
    // No meta element in the document: syncTheme must not throw.
    expect(() => store.getState().updateSettings({ theme: 'home' })).not.toThrow();
  });

  it('applies the default before hydration and the stored theme once hydration loads it', async () => {
    const kv = memoryKv();
    const saved = makeStore(kv);
    await saved.persist.rehydrate();
    saved.getState().updateSettings({ theme: 'night' });
    await vi.waitFor(() => expect(JSON.stringify(kv.data.get(STORAGE_KEY))).toContain('night'));

    const store = makeStore(kv);
    const root = document.createElement('html');
    syncTheme(store, root);
    expect(root.dataset.theme).toBe('pub');
    await store.persist.rehydrate();
    expect(root.dataset.theme).toBe('night');
    expect(root.style.getPropertyValue('--t-bg')).toBe(THEMES.night.bg);
  });

  it('gives a felt its background and rim colour', () => {
    expect(feltStyle('cloth')).toEqual({
      background: 'radial-gradient(ellipse at center, oklch(0.42 0.08 158), oklch(0.27 0.06 162))',
      borderColor: 'oklch(0.28 0.05 50)',
    });
  });
});
