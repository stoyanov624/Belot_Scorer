// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { THEMES } from '../core/tokens';
import { createDocumentStorage } from '../storage/document';
import { memoryKv } from '../storage/kv';
import { createAppStore } from '../store/app-store';
import { applyTheme, feltStyle, syncTheme } from './theme';

const makeStore = () =>
  createAppStore({
    storage: createDocumentStorage(memoryKv()),
    newId: () => 'id',
    now: () => 0,
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

  it('gives a felt its background and rim colour', () => {
    expect(feltStyle('cloth')).toEqual({
      background: 'radial-gradient(ellipse at center, oklch(0.42 0.08 158), oklch(0.27 0.06 162))',
      borderColor: 'oklch(0.28 0.05 50)',
    });
  });
});
