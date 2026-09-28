import type { CSSProperties } from 'react';
import type { FeltKey, ThemeKey } from '../core/settings';
import { FELTS, THEMES, themeVars } from '../core/tokens';
import type { AppStore } from '../store/app-store';

/** Writes the theme's tokens as --t-* custom properties on `root` (ADR 0004). */
export function applyTheme(root: HTMLElement, key: ThemeKey): void {
  for (const [name, value] of Object.entries(themeVars(key))) root.style.setProperty(name, value);
  root.dataset.theme = key;

  // The browser chrome (status bar, task switcher) reads this; no-op if the document has none.
  const meta = root.ownerDocument?.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEMES[key].bg);
}

/** Applies the stored theme now and on every change. Returns the unsubscribe function. */
export function syncTheme(store: AppStore, root: HTMLElement): () => void {
  applyTheme(root, store.getState().settings.theme);
  return store.subscribe((state, prev) => {
    if (state.settings.theme !== prev.settings.theme) applyTheme(root, state.settings.theme);
  });
}

/** Felts are complex gradients, so they're applied as inline style, not utilities (ADR 0004). */
export function feltStyle(key: FeltKey): CSSProperties {
  const felt = FELTS[key];
  return { background: felt.bg, borderColor: felt.rim };
}
