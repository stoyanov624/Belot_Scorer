# Phase 4: UI Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Everything Phase 5's screens need, built and tested: theme tokens flowing from TypeScript into Tailwind, the Nunito font, the `ui/` primitives (Button, Chip, Segmented, Avatar, Sheet, Popover), and a router shell with lazy routes and an error boundary per route.

**Architecture:** Theme and felt values live once in `src/core/tokens.ts` (ADR 0004). `src/ui/theme.ts` writes them as CSS custom properties (`--t-*`) on `<html>` and follows the store's `settings.theme`. Tailwind v4 `@theme inline` maps them to utilities (`bg-s1`, `text-muted`, `border-line`, `bg-a`…). Primitives are small React components in `src/ui/`. Sheets use the native `<dialog>` element and popovers the native `popover` attribute (ADR 0008, replacing vaul). Routing uses React Router 8 in data mode: the Home and Table screens load eagerly, the rest lazily with preload on hover/focus.

**Tech Stack:** React 19, React Router 8 (`react-router`), Tailwind CSS v4, `@fontsource-variable/nunito`, Vitest with happy-dom and React Testing Library.

**Spec:** `docs/design-handoff/README.md` ("Глобален layout", "Design Tokens", typography, radii, shadows, motion; screen 04's popover description), `docs/adr/0004-theme-tokens-in-typescript.md`, `docs/superpowers/plans/2026-09-25-roadmap.md` (Phase 4 row). Vault context: `docs/Home.md`, `docs/Architecture/Overview.md`.

## Global Constraints

- **Theme tokens** (all OKLCH), copied verbatim from the handoff's Design Tokens table. Each theme defines `bg`, `glow`, `s1`, `s2`, `s3`, `line`, `text`, `muted`, `a`, `b`, `on`, and `on` equals `bg`. Suit red for ♦ ♥ is `oklch(0.68 0.19 25)`. The prototype's `THEMES`/`FELTS` match the spec exactly (checked).
- **Layout:** mobile-first. The content column is `max-width: 780px`, centred. The page background is `bg` plus the theme's `glow` gradient, with `background-attachment: fixed`.
- **Font:** Nunito, weights 500–900, with Cyrillic. Score numbers use `font-variant-numeric: tabular-nums`.
- **Hit targets and buttons:** minimum hit target 44px; main buttons 54–64px high.
- **Sheets:** bottom sheets. Overlay `rgba(dark, 0.6)`; panel `max-width: 560px`, `max-height: 88dvh`, scrolls inside, `border-radius: 28px 28px 0 0`, padding `14px 20px 26px`, gap 16px; top handle 40×5px, radius 3px, colour `line`. Tapping the overlay closes the sheet.
- **Popover:** card 224px wide next to its anchor (below North, above South, right of West, left of East), background `s2`, radius 20, padding 12, shadow `0 18px 40px oklch(0.06 0.02 50 / 0.7)`. A transparent overlay closes it.
- **Radii:** 8 badge · 12–14 chips, small buttons · 16–18 buttons, fields · 20 main buttons, popover, cards · 24 section cards · 28 sheet top · 32 table · 50% avatars.
- **Shadows:** avatar `0 6px 18px oklch(0.08 0.02 50 / 0.6)`.
- **Motion:** buttons shrink on press (`scale(0.95–0.98)`). Sheets and popovers appear with a short 150–200ms ease-out. No other animation.
- **Copy:** every Bulgarian string the UI shows lives in `src/core/strings.ts` (CLAUDE.md). Use final copy from the handoff. The only exception is the error-boundary title, which the handoff doesn't provide. Record that under Open product questions in `docs/Status.md`.
- **Architecture:** `src/core` stays platform-free, so `tokens.ts` and `strings.ts` are plain data. There are no barrel files. Components read the store through narrow `useAppStore` selectors, and there is no `useEffect` for game logic. Effects that sync with the DOM or object URLs are fine.
- **Dependencies:** before adding one, check that its version isn't hours old (ADR 0007).
- **Workflow:** `pnpm check` and `pnpm docs:check` pass at the end of every task. Conventional Commits, one commit per task. Stage by explicit path, and never stage `package-lock.json`.

## File Structure

```
src/core/tokens.ts           THEMES, FELTS, SUIT_RED, themeVars()
src/core/strings.ts          Bulgarian UI copy (starts here, grows in Phase 5)
src/index.css                Tailwind import, @theme mapping, base layer, sheet/popover motion
src/ui/theme.ts              applyTheme, syncTheme, feltStyle
src/ui/cx.ts                 className join helper
src/ui/Button.tsx · Chip.tsx · Segmented.tsx · Avatar.tsx · usePhotoUrl.ts
src/ui/Sheet.tsx · Popover.tsx · popover-position.ts
src/app/routes.tsx           route table (eager + lazy), preloadRoute
src/app/RootLayout.tsx       page column + <Outlet/>
src/app/RouteError.tsx       per-route error boundary
src/app/PreloadLink.tsx      <Link> that preloads lazy routes on hover/focus
src/routes/*.tsx             placeholder screens (Phase 5 replaces their bodies)
src/routes/dev-ui.tsx        DEV-only primitive gallery (/dev/ui)
src/main.tsx                 hydrate → syncTheme → RouterProvider
src/App.tsx                  deleted
```

Component tests are `*.test.tsx` files beside the component. The first line of each is `// @vitest-environment happy-dom`.

---

### Task 1: Tokens and strings (core)

**Files:**
- Create: `src/core/tokens.ts`, `src/core/tokens.test.ts`, `src/core/strings.ts`

**Interfaces:**
- Produces:
  - `THEMES: Record<ThemeKey, ThemeTokens>`, `FELTS: Record<FeltKey, FeltTokens>`, `SUIT_RED`, `COLOR_TOKENS`, `themeVars(key: ThemeKey): Record<string, string>`. The keys are `--t-bg … --t-on` plus `--t-glow`.
  - `STRINGS` (a nested `as const` object).

- [x] **Step 1: Write the failing tests.** Create `src/core/tokens.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { FeltKeySchema, ThemeKeySchema } from './settings';
import { COLOR_TOKENS, FELTS, SUIT_RED, THEMES, themeVars } from './tokens';

describe('tokens', () => {
  it('defines every theme and felt the settings allow', () => {
    expect(Object.keys(THEMES).sort()).toEqual([...ThemeKeySchema.options].sort());
    expect(Object.keys(FELTS).sort()).toEqual([...FeltKeySchema.options].sort());
  });

  it('uses the handoff values', () => {
    expect(THEMES.pub.a).toBe('oklch(0.8 0.14 80)');
    expect(THEMES.night.b).toBe('oklch(0.8 0.13 205)');
    expect(FELTS.cloth.rim).toBe('oklch(0.28 0.05 50)');
    expect(SUIT_RED).toBe('oklch(0.68 0.19 25)');
  });

  it('sets `on` equal to `bg` in every theme', () => {
    for (const t of Object.values(THEMES)) expect(t.on).toBe(t.bg);
  });

  it('maps a theme to --t-* custom properties', () => {
    const vars = themeVars('casino');
    expect(Object.keys(vars)).toHaveLength(COLOR_TOKENS.length + 1);
    expect(vars['--t-s1']).toBe(THEMES.casino.s1);
    expect(vars['--t-glow']).toBe(THEMES.casino.glow);
  });
});
```

- [x] **Step 2: Run the test to see it fail.** Run: `pnpm vitest run src/core/tokens.test.ts`. Expected: FAIL, because `./tokens` does not exist.

- [x] **Step 3: Create `src/core/tokens.ts`.** Leave out the prototype's `name`/`sub` fields: those are copy, and belong in `strings.ts`.

```ts
import type { FeltKey, ThemeKey } from './settings';

/** Colour tokens every theme defines; each becomes `--t-<name>` and a Tailwind colour. */
export const COLOR_TOKENS = ['bg', 's1', 's2', 's3', 'line', 'text', 'muted', 'a', 'b', 'on'] as const;
export type ColorToken = (typeof COLOR_TOKENS)[number];

export type ThemeTokens = Record<ColorToken, string> & { glow: string };
export interface FeltTokens {
  rim: string;
  bg: string;
}

/** Colour for ♦ and ♥ in every theme. */
export const SUIT_RED = 'oklch(0.68 0.19 25)';

export const THEMES: Record<ThemeKey, ThemeTokens> = {
  pub: {
    bg: 'oklch(0.19 0.03 50)',
    glow: 'radial-gradient(ellipse 90% 55% at 50% -5%, oklch(0.45 0.11 70 / 0.55), transparent 70%)',
    s1: 'oklch(0.24 0.035 50)',
    s2: 'oklch(0.29 0.04 50)',
    s3: 'oklch(0.34 0.045 52)',
    line: 'oklch(0.38 0.045 55)',
    text: 'oklch(0.95 0.02 80)',
    muted: 'oklch(0.76 0.04 70)',
    a: 'oklch(0.8 0.14 80)',
    b: 'oklch(0.72 0.15 32)',
    on: 'oklch(0.19 0.03 50)',
  },
  home: {
    bg: 'oklch(0.2 0.03 350)',
    glow: 'radial-gradient(ellipse 80% 50% at 30% 0%, oklch(0.42 0.09 40 / 0.45), transparent 70%)',
    s1: 'oklch(0.25 0.035 350)',
    s2: 'oklch(0.3 0.04 350)',
    s3: 'oklch(0.35 0.045 350)',
    line: 'oklch(0.39 0.045 350)',
    text: 'oklch(0.96 0.015 60)',
    muted: 'oklch(0.77 0.035 20)',
    a: 'oklch(0.8 0.13 150)',
    b: 'oklch(0.78 0.13 55)',
    on: 'oklch(0.2 0.03 350)',
  },
  casino: {
    bg: 'oklch(0.17 0.012 250)',
    glow: 'radial-gradient(ellipse 80% 50% at 50% 0%, oklch(0.32 0.05 165 / 0.5), transparent 70%)',
    s1: 'oklch(0.22 0.014 250)',
    s2: 'oklch(0.27 0.016 250)',
    s3: 'oklch(0.32 0.018 250)',
    line: 'oklch(0.35 0.018 250)',
    text: 'oklch(0.95 0.008 250)',
    muted: 'oklch(0.74 0.02 250)',
    a: 'oklch(0.78 0.12 185)',
    b: 'oklch(0.78 0.12 55)',
    on: 'oklch(0.17 0.012 250)',
  },
  night: {
    bg: 'oklch(0.14 0.025 285)',
    glow: 'radial-gradient(ellipse 70% 45% at 80% 0%, oklch(0.4 0.14 320 / 0.45), transparent 70%), radial-gradient(ellipse 60% 40% at 0% 100%, oklch(0.4 0.1 210 / 0.35), transparent 70%)',
    s1: 'oklch(0.2 0.03 285)',
    s2: 'oklch(0.25 0.035 285)',
    s3: 'oklch(0.3 0.04 285)',
    line: 'oklch(0.34 0.045 285)',
    text: 'oklch(0.96 0.01 285)',
    muted: 'oklch(0.76 0.04 285)',
    a: 'oklch(0.78 0.15 330)',
    b: 'oklch(0.8 0.13 205)',
    on: 'oklch(0.14 0.025 285)',
  },
};

export const FELTS: Record<FeltKey, FeltTokens> = {
  wood: {
    rim: 'oklch(0.26 0.05 45)',
    bg: 'repeating-linear-gradient(92deg, oklch(0.36 0.07 52) 0 18px, oklch(0.32 0.06 48) 18px 20px, oklch(0.38 0.075 55) 20px 46px, oklch(0.31 0.055 46) 46px 49px)',
  },
  cloth: {
    rim: 'oklch(0.28 0.05 50)',
    bg: 'radial-gradient(ellipse at center, oklch(0.42 0.08 158), oklch(0.27 0.06 162))',
  },
  check: {
    rim: 'oklch(0.3 0.04 40)',
    bg: 'repeating-conic-gradient(oklch(0.5 0.14 25) 0 25%, oklch(0.84 0.03 80) 0 50%) 0 0 / 34px 34px',
  },
  stone: {
    rim: 'oklch(0.22 0.01 250)',
    bg: 'radial-gradient(circle at 30% 30%, oklch(0.38 0.01 250), transparent 50%), radial-gradient(circle at 75% 70%, oklch(0.34 0.012 250), transparent 45%), oklch(0.28 0.01 250)',
  },
};

export function themeVars(key: ThemeKey): Record<string, string> {
  const t = THEMES[key];
  const vars: Record<string, string> = { '--t-glow': t.glow };
  for (const name of COLOR_TOKENS) vars[`--t-${name}`] = t[name];
  return vars;
}
```

These values were generated from the prototype's `THEMES`/`FELTS`, which match the handoff table exactly. The `Record<ThemeKey, …>` type makes a missing theme a compile error.

- [x] **Step 4: Create `src/core/strings.ts`.** The screen titles below are taken from the handoff. `routeError.title` is the one string without handoff copy.

```ts
/** Bulgarian UI copy. Core returns codes; the UI looks the words up here. */
export const STRINGS = {
  appName: 'Белот',
  screens: {
    home: 'Белот',
    setup: 'Нова игра',
    table: 'Маса',
    history: 'История на мача',
    end: 'Край на мача',
    stats: 'Класация',
  },
  themes: {
    pub: { name: 'Кръчма', sub: 'бира и дим' },
    home: { name: 'Вкъщи', sub: 'ракия и салата' },
    casino: { name: 'Сукно', sub: 'класическа маса' },
    night: { name: 'Късна нощ', sub: 'последна поръчка' },
  },
  felts: { wood: 'Дърво', cloth: 'Сукно', check: 'Покривка', stone: 'Камък' },
  routeError: {
    // Not in the handoff: placeholder until the product owner supplies copy (see docs/Status.md).
    title: 'Нещо се обърка.',
    home: 'Към началния екран',
  },
} as const;
```

- [x] **Step 5: Run the tests, then the gate.** Run `pnpm vitest run src/core/tokens.test.ts`, then `pnpm check`. Expected: PASS, and the core typecheck stays clean (neither file uses DOM types).

- [x] **Step 6: Commit.**

```bash
git add src/core/tokens.ts src/core/tokens.test.ts src/core/strings.ts
git commit -m "feat(core): theme and felt tokens, UI strings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Test setup, Tailwind mapping, font and theme sync

**Files:**
- Modify: `package.json`, `vite.config.ts`, `src/index.css`
- Create: `src/ui/theme.ts`, `src/ui/theme.test.ts`, `src/ui/cx.ts`

**Interfaces:**
- Consumes: `themeVars`, `FELTS` (Task 1). `AppStore` and `createAppStore` from `src/store/app-store.ts`. `createDocumentStorage` and `memoryKv` for tests.
- Produces:
  - `applyTheme(root: HTMLElement, key: ThemeKey): void`
  - `syncTheme(store: AppStore, root: HTMLElement): () => void`
  - `feltStyle(key: FeltKey): CSSProperties`
  - `cx(...parts: (string | false | null | undefined)[]): string`
  - Tailwind colours: `bg`, `s1`, `s2`, `s3`, `line`, `text`, `muted`, `a`, `b`, `on`, `suit-red`, `white`, used as `bg-s1`, `text-muted`, `border-line`, `bg-a`, `text-on`…
  - Font `font-sans` = Nunito.

- [x] **Step 1: Add the dependencies.**

```bash
pnpm add react-router @fontsource-variable/nunito
pnpm add -D happy-dom @testing-library/react @testing-library/dom @testing-library/user-event
```

Expected: `react-router` resolves to ^8, and its peer requirement (`react >=19.2.7`) is met by the installed React. Check with `pnpm ls react react-router`.

- [x] **Step 2: Let Vitest pick up component tests.** In `vite.config.ts`, change the include list to `['src/**/*.test.ts', 'src/**/*.test.tsx', 'test/**/*.test.ts']`. Leave `environment: 'node'`: DOM tests opt in per file with the docblock.

- [x] **Step 3: Write the failing test.** Create `src/ui/theme.test.ts`:

```ts
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
```

- [x] **Step 4: Run the test to see it fail.** Run: `pnpm vitest run src/ui/theme.test.ts`. Expected: FAIL, because `./theme` does not exist.

- [x] **Step 5: Create `src/ui/theme.ts` and `src/ui/cx.ts`.**

```ts
// src/ui/theme.ts
import type { CSSProperties } from 'react';
import type { FeltKey, ThemeKey } from '../core/settings';
import { FELTS, themeVars } from '../core/tokens';
import type { AppStore } from '../store/app-store';

/** Writes the theme's tokens as --t-* custom properties on `root` (ADR 0004). */
export function applyTheme(root: HTMLElement, key: ThemeKey): void {
  for (const [name, value] of Object.entries(themeVars(key))) root.style.setProperty(name, value);
  root.dataset.theme = key;
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
```

```ts
// src/ui/cx.ts
/** Joins class names, skipping falsy parts. */
export const cx = (...parts: (string | false | null | undefined)[]): string =>
  parts.filter(Boolean).join(' ');
```

- [x] **Step 6: Replace `src/index.css`.** Before writing, check the `@theme` / `@theme inline` / `--color-*: initial` syntax with context7 (`/tailwindlabs/tailwindcss.com`, "theme variables namespaces reset" and "@theme inline").

```css
@import "tailwindcss";

/* Only the design tokens exist as colours and fonts: no stray Tailwind palette. */
@theme {
  --color-*: initial;
  --font-*: initial;
  --font-sans: "Nunito Variable", system-ui, sans-serif;
}

/* Colours follow the --t-* variables that src/ui/theme.ts writes on <html> (ADR 0004). */
@theme inline {
  --color-bg: var(--t-bg);
  --color-s1: var(--t-s1);
  --color-s2: var(--t-s2);
  --color-s3: var(--t-s3);
  --color-line: var(--t-line);
  --color-text: var(--t-text);
  --color-muted: var(--t-muted);
  --color-a: var(--t-a);
  --color-b: var(--t-b);
  --color-on: var(--t-on);
  --color-suit-red: oklch(0.68 0.19 25);
  --color-white: #fff;
}

@layer base {
  html {
    background-color: var(--t-bg);
    background-image: var(--t-glow);
    background-attachment: fixed;
    color: var(--t-text);
    font-family: var(--font-sans);
    font-weight: 600;
    -webkit-tap-highlight-color: transparent;
  }
  body {
    min-height: 100dvh;
  }
}

/* Sheets and popovers: the only motion the spec allows besides the button press. */
@keyframes sheet-in {
  from { transform: translateY(100%); }
}
@keyframes pop-in {
  from { opacity: 0; transform: scale(0.96); }
}
dialog.sheet[open] {
  animation: sheet-in 180ms ease-out;
}
dialog.sheet::backdrop {
  background: oklch(0.1 0.02 50 / 0.6);
}
[popover].popover:popover-open {
  animation: pop-in 150ms ease-out;
}
@media (prefers-reduced-motion: reduce) {
  dialog.sheet[open],
  [popover].popover:popover-open {
    animation: none;
  }
}
```

In `src/main.tsx`, add `import '@fontsource-variable/nunito';` above `import './index.css';`. Task 6 rewrites `main.tsx`, so keep this line then.

- [x] **Step 7: Run the tests and the gate.** Run `pnpm vitest run src/ui/theme.test.ts`, then `pnpm check`. Expected: PASS. Then run `pnpm build` and check that the built CSS contains `--color-s1` and no `--color-red-500`: `grep -c "color-red-500" dist/assets/*.css` prints `0`.

- [x] **Step 8: Commit.**

```bash
git add package.json pnpm-lock.yaml vite.config.ts src/index.css src/main.tsx src/ui/theme.ts src/ui/theme.test.ts src/ui/cx.ts
git commit -m "feat(ui): tailwind theme mapping, Nunito, theme sync

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Button, Chip, Segmented

**Files:**
- Create: `src/ui/Button.tsx`, `src/ui/Chip.tsx`, `src/ui/Segmented.tsx`, `src/ui/controls.test.tsx`

**Interfaces:**
- Produces:
  - `Button(props: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; size?: 'md' | 'lg' })`
  - `Chip(props: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'a' | 'b' | 'neutral'; selected?: boolean; size?: 'sm' | 'md' })`
  - `Segmented<T extends string | number>(props: { label: string; options: readonly { value: T; label: string }[]; value: T; onChange: (value: T) => void })`

- [x] **Step 1: Write the failing tests.** Create `src/ui/controls.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { Chip } from './Chip';
import { Segmented } from './Segmented';

describe('Button', () => {
  it('is a type="button" by default and fires onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Запази</Button>);
    const button = screen.getByRole('button', { name: 'Запази' });
    expect(button.getAttribute('type')).toBe('button');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not fire when disabled', async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Запази</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Chip', () => {
  it('exposes selection as aria-pressed', () => {
    render(<Chip selected>Q</Chip>);
    expect(screen.getByRole('button', { name: 'Q' }).getAttribute('aria-pressed')).toBe('true');
  });
});

describe('Segmented', () => {
  const OPTIONS = [
    { value: 1, label: '1 мач' },
    { value: 3, label: '2 от 3' },
  ] as const;

  function Harness() {
    const [value, setValue] = useState<1 | 3>(1);
    return <Segmented label="Брой мачове" options={OPTIONS} value={value} onChange={setValue} />;
  }

  it('is a labelled radio group that moves the checked option on click', async () => {
    render(<Harness />);
    expect(screen.getByRole('radiogroup', { name: 'Брой мачове' })).toBeTruthy();
    const second = screen.getByRole('radio', { name: '2 от 3' });
    expect(second.getAttribute('aria-checked')).toBe('false');
    await userEvent.click(second);
    expect(second.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: '1 мач' }).getAttribute('aria-checked')).toBe('false');
  });
});
```

- [x] **Step 2: Run the tests to see them fail.** Run: `pnpm vitest run src/ui/controls.test.tsx`. Expected: FAIL, because the modules are missing.

- [x] **Step 3: Create the three components.** Sizes and radii come from the Global Constraints: md = 56px / radius 16, lg = 64px / radius 20; chips sm = 26px, md = 42px.

```tsx
// src/ui/Button.tsx
import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-a text-on',
  secondary: 'bg-s1 text-text border border-line',
  danger: 'bg-transparent text-b border border-b',
  ghost: 'bg-transparent text-muted',
};
const SIZE: Record<Size, string> = {
  md: 'h-14 rounded-2xl px-4 text-[17px] font-extrabold',
  lg: 'h-16 rounded-[20px] px-5 text-lg font-black',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = 'secondary', size = 'md', type = 'button', className, ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex min-h-11 items-center justify-center gap-2 transition-transform active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    />
  );
}
```

```tsx
// src/ui/Chip.tsx
import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';

type Tone = 'a' | 'b' | 'neutral';

const TONE: Record<Tone, string> = {
  a: 'bg-a text-on',
  b: 'bg-b text-on',
  neutral: 'bg-s3 text-text',
};

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  /** A selected chip always uses the accent, whatever its tone. */
  selected?: boolean;
  size?: 'sm' | 'md';
}

export function Chip({ tone = 'neutral', selected = false, size = 'md', type = 'button', className, ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cx(
        'inline-flex items-center justify-center gap-1 font-extrabold transition-transform active:scale-95',
        size === 'sm' ? 'h-[26px] rounded-xl px-2.5 text-xs' : 'h-[42px] min-w-11 rounded-[14px] px-3 text-base',
        selected ? 'bg-a text-on' : TONE[tone],
        className,
      )}
      {...rest}
    />
  );
}
```

```tsx
// src/ui/Segmented.tsx
import { cx } from './cx';

export interface SegmentedProps<T extends string | number> {
  /** Accessible name of the group (the section label shown above it). */
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function Segmented<T extends string | number>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-2xl border border-line bg-s1 p-1">
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(option.value)}
            className={cx(
              'h-12 flex-1 rounded-xl text-[15px] font-extrabold transition-transform active:scale-[0.97]',
              checked ? 'bg-a text-on' : 'text-muted',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [x] **Step 4: Run the tests and the gate.** Run `pnpm vitest run src/ui/controls.test.tsx`, then `pnpm check`. Expected: PASS. If Biome's a11y rules flag `role="radio"` on a `<button>` (for example `useSemanticElements`), keep the ARIA radio pattern: native radio inputs can't be styled this way without extra markup. Add a `biome-ignore` with that reason on the exact rule Biome names.

- [x] **Step 5: Commit.**

```bash
git add src/ui/Button.tsx src/ui/Chip.tsx src/ui/Segmented.tsx src/ui/controls.test.tsx
git commit -m "feat(ui): button, chip and segmented control

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Avatar and photo URLs

**Files:**
- Create: `src/ui/Avatar.tsx`, `src/ui/usePhotoUrl.ts`, `src/ui/avatar.test.tsx`

**Interfaces:**
- Consumes: `PhotoStore` (`src/storage/photos.ts`).
- Produces:
  - `Avatar(props: { name: string; emoji: string | null; photoUrl?: string | null; size: number; ring?: 'a' | 'b' | 'line' })`
  - `usePhotoUrl(photoId: string | null, photos: Pick<PhotoStore, 'get'>): string | null`. It creates an object URL for the Blob and revokes it when the id changes or the component unmounts.

- [x] **Step 1: Write the failing tests.** Create `src/ui/avatar.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Avatar } from './Avatar';
import { usePhotoUrl } from './usePhotoUrl';

describe('Avatar', () => {
  it('shows the photo when there is one, with the name as alt text', () => {
    render(<Avatar name="Иво" emoji="🐻" photoUrl="blob:x" size={60} />);
    expect(screen.getByRole('img', { name: 'Иво' }).getAttribute('src')).toBe('blob:x');
  });

  it('shows the emoji otherwise, labelled with the name', () => {
    render(<Avatar name="Иво" emoji="🐻" size={60} />);
    expect(screen.getByRole('img', { name: 'Иво' }).textContent).toBe('🐻');
  });

  it('falls back to the first letter of the name', () => {
    render(<Avatar name="мила" emoji={null} size={60} />);
    expect(screen.getByRole('img', { name: 'мила' }).textContent).toBe('М');
  });

  it('sizes itself from the size prop', () => {
    render(<Avatar name="Иво" emoji="🐻" size={68} />);
    expect(screen.getByRole('img').style.width).toBe('68px');
  });
});

describe('usePhotoUrl', () => {
  it('returns null without a photo id', () => {
    const { result } = renderHook(() => usePhotoUrl(null, { get: vi.fn() }));
    expect(result.current).toBeNull();
  });

  it('loads the blob into an object URL and revokes it on unmount', async () => {
    const blob = new Blob(['x'], { type: 'image/jpeg' });
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:photo');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const { result, unmount } = renderHook(() => usePhotoUrl('ph1', { get: async () => blob }));

    await waitFor(() => expect(result.current).toBe('blob:photo'));
    expect(create).toHaveBeenCalledWith(blob);
    unmount();
    expect(revoke).toHaveBeenCalledWith('blob:photo');
  });
});
```

- [x] **Step 2: Run the tests to see them fail.** Run: `pnpm vitest run src/ui/avatar.test.tsx`. Expected: FAIL, because the modules are missing.

- [x] **Step 3: Create the hook and the component.**

```ts
// src/ui/usePhotoUrl.ts
import { useEffect, useState } from 'react';
import type { PhotoStore } from '../storage/photos';

/** Object URL for a stored player photo; revoked when the id changes or on unmount. */
export function usePhotoUrl(photoId: string | null, photos: Pick<PhotoStore, 'get'>): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    setUrl(null);
    if (!photoId) return;
    let cancelled = false;
    let created: string | null = null;
    void photos.get(photoId).then((blob) => {
      if (cancelled || !blob) return;
      created = URL.createObjectURL(blob);
      setUrl(created);
    });
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [photoId, photos]);

  return url;
}
```

```tsx
// src/ui/Avatar.tsx
import { cx } from './cx';

const RING = { a: 'border-a', b: 'border-b', line: 'border-line' } as const;

export interface AvatarProps {
  name: string;
  emoji: string | null;
  /** Object URL from usePhotoUrl; wins over the emoji. */
  photoUrl?: string | null;
  size: number;
  ring?: keyof typeof RING;
}

/** Round player avatar: photo, else emoji, else the name's first letter. */
export function Avatar({ name, emoji, photoUrl, size, ring = 'line' }: AvatarProps) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.5) };
  const frame = cx(
    'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] bg-s2 shadow-[0_6px_18px_oklch(0.08_0.02_50/0.6)]',
    RING[ring],
  );
  if (photoUrl) {
    return <img src={photoUrl} alt={name} className={cx(frame, 'object-cover')} style={style} />;
  }
  return (
    <span role="img" aria-label={name} className={cx(frame, 'font-black leading-none')} style={style}>
      {emoji ?? name.trim().charAt(0).toLocaleUpperCase('bg')}
    </span>
  );
}
```

- [x] **Step 4: Run the tests and the gate.** Run `pnpm vitest run src/ui/avatar.test.tsx`, then `pnpm check`. Expected: PASS.

- [x] **Step 5: Commit.**

```bash
git add src/ui/Avatar.tsx src/ui/usePhotoUrl.ts src/ui/avatar.test.tsx
git commit -m "feat(ui): avatar with photo, emoji or initial

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Sheet and Popover

**Files:**
- Create: `src/ui/Sheet.tsx`, `src/ui/Popover.tsx`, `src/ui/popover-position.ts`, `src/ui/popover-position.test.ts`, `src/ui/overlays.test.tsx`

**Interfaces:**
- Produces:
  - `Sheet(props: { open: boolean; onClose: () => void; title: string; children: ReactNode })`
  - `type Placement = 'below' | 'above' | 'right' | 'left'`
  - `popoverPosition(anchor: Rect, size: { width: number; height: number }, placement: Placement, viewport: { width: number; height: number }, gap?: number): { top: number; left: number }`
  - `Popover(props: { open: boolean; onClose: () => void; anchor: RefObject<HTMLElement | null>; placement: Placement; label: string; children: ReactNode })`

- [x] **Step 1: Write the failing position tests.** This is pure maths. Create `src/ui/popover-position.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { popoverPosition } from './popover-position';

const viewport = { width: 800, height: 800 };
const size = { width: 224, height: 150 };
const anchor = { top: 100, left: 150, width: 80, height: 80 }; // centre x = 190, centre y = 140

describe('popoverPosition', () => {
  it('centres below the anchor with an 8px gap', () => {
    expect(popoverPosition(anchor, size, 'below', viewport)).toEqual({ top: 188, left: 78 });
  });

  it('centres above the anchor', () => {
    expect(popoverPosition({ ...anchor, top: 300 }, size, 'above', viewport)).toEqual({ top: 142, left: 78 });
  });

  it('places right and left of the anchor, vertically centred', () => {
    expect(popoverPosition(anchor, size, 'right', viewport)).toEqual({ top: 65, left: 238 });
    expect(popoverPosition({ ...anchor, left: 300 }, size, 'left', viewport)).toEqual({ top: 65, left: 68 });
  });

  it('keeps the card inside the viewport with an 8px margin', () => {
    const narrow = { width: 400, height: 800 };
    expect(popoverPosition({ ...anchor, left: 0 }, size, 'below', narrow).left).toBe(8);
    expect(popoverPosition({ ...anchor, left: 380 }, size, 'below', narrow).left).toBe(400 - 224 - 8);
    expect(popoverPosition({ ...anchor, top: 0 }, size, 'above', narrow).top).toBe(8);
  });
});
```

Run `pnpm vitest run src/ui/popover-position.test.ts`. Expected: FAIL, because `./popover-position` does not exist.

- [x] **Step 2: Create `src/ui/popover-position.ts`.**

```ts
export type Placement = 'below' | 'above' | 'right' | 'left';

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const MARGIN = 8;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Top-left of a popover card placed next to `anchor`, kept `MARGIN` inside the viewport. */
export function popoverPosition(
  anchor: Rect,
  size: { width: number; height: number },
  placement: Placement,
  viewport: { width: number; height: number },
  gap = 8,
): { top: number; left: number } {
  const centreX = anchor.left + anchor.width / 2 - size.width / 2;
  const centreY = anchor.top + anchor.height / 2 - size.height / 2;
  const raw = {
    below: { top: anchor.top + anchor.height + gap, left: centreX },
    above: { top: anchor.top - gap - size.height, left: centreX },
    right: { top: centreY, left: anchor.left + anchor.width + gap },
    left: { top: centreY, left: anchor.left - gap - size.width },
  }[placement];
  return {
    top: clamp(raw.top, MARGIN, viewport.height - size.height - MARGIN),
    left: clamp(raw.left, MARGIN, viewport.width - size.width - MARGIN),
  };
}
```

Run `pnpm vitest run src/ui/popover-position.test.ts`. Expected: PASS.

- [x] **Step 3: Write the failing overlay tests.** Create `src/ui/overlays.test.tsx`. Before writing it, check happy-dom's support: grep `node_modules/happy-dom` for `showModal` and `showPopover`. If `showPopover` is missing, replace the Popover test with a check that the element renders with `popover="auto"` and the label, and note it in your report.

```tsx
// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Popover } from './Popover';
import { Sheet } from './Sheet';

describe('Sheet', () => {
  it('opens as a modal dialog titled by its heading', () => {
    render(<Sheet open onClose={() => {}} title="Място: Север"><p>body</p></Sheet>);
    const dialog = screen.getByRole('dialog', { name: 'Място: Север' }) as HTMLDialogElement;
    expect(dialog.open).toBe(true);
  });

  it('closes when the open prop turns false', () => {
    const { rerender } = render(<Sheet open onClose={() => {}} title="T"><p>body</p></Sheet>);
    rerender(<Sheet open={false} onClose={() => {}} title="T"><p>body</p></Sheet>);
    expect((screen.getByRole('dialog', { hidden: true }) as HTMLDialogElement).open).toBe(false);
  });

  it('calls onClose on an overlay tap, not on a tap inside the panel', async () => {
    const onClose = vi.fn();
    render(<Sheet open onClose={onClose} title="T"><p>body</p></Sheet>);
    await userEvent.click(screen.getByText('body'));
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('reports a native close (Esc) through onClose', () => {
    const onClose = vi.fn();
    render(<Sheet open onClose={onClose} title="T"><p>body</p></Sheet>);
    (screen.getByRole('dialog') as HTMLDialogElement).close();
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Popover', () => {
  it('shows its content labelled while open', () => {
    const anchor = createRef<HTMLButtonElement>();
    render(
      <>
        <button ref={anchor} type="button">Иво</button>
        <Popover open onClose={() => {}} anchor={anchor} placement="below" label="Иво обявява">
          <p>Белот</p>
        </Popover>
      </>,
    );
    expect(screen.getByRole('dialog', { name: 'Иво обявява' })).toBeTruthy();
    expect(screen.getByText('Белот')).toBeTruthy();
  });
});
```

- [x] **Step 4: Create `src/ui/Sheet.tsx`.** Use the native `<dialog>` (ADR 0008). Tapping `::backdrop` targets the dialog element itself, so the panel's content sits in an inner wrapper and only clicks whose target *is* the dialog close it. The native `close` event covers Esc and `dialog.close()`.

```tsx
import { type ReactNode, useEffect, useId, useRef } from 'react';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Bottom sheet on the native <dialog>: focus trap, Esc and top layer come from the browser. */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the click only detects taps on the backdrop; Esc closes natively.
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="sheet m-0 mx-auto mt-auto w-full max-w-[560px] max-h-[88dvh] overflow-hidden rounded-t-[28px] bg-s1 p-0 text-text"
    >
      <div className="flex max-h-[88dvh] flex-col gap-4 overflow-y-auto px-5 pt-3.5 pb-[26px]">
        <div aria-hidden className="mx-auto h-[5px] w-10 shrink-0 rounded-[3px] bg-line" />
        <h2 id={titleId} className="text-2xl font-black">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
```

If Biome names a different rule for the dialog's `onClick` (for example `noStaticElementInteractions` or `noNoninteractiveElementInteractions`), put the ignore on the rule it reports, with the same reason.

- [x] **Step 5: Create `src/ui/Popover.tsx`.** Use the native `popover="auto"`: light dismiss (tapping outside) and Esc close it and fire `toggle` with `newState: 'closed'`. Before the first paint, `useLayoutEffect` measures the card and places it with `popoverPosition`.

```tsx
import { type ReactNode, type RefObject, useLayoutEffect, useRef } from 'react';
import { type Placement, popoverPosition } from './popover-position';

export interface PopoverProps {
  open: boolean;
  onClose: () => void;
  anchor: RefObject<HTMLElement | null>;
  placement: Placement;
  /** Accessible name, e.g. "Иван обявява". */
  label: string;
  children: ReactNode;
}

/** 224px card next to its anchor on the native popover API (ADR 0008). */
export function Popover({ open, onClose, anchor, placement, label, children }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const card = ref.current;
    const target = anchor.current;
    if (!card) return;
    if (!open) {
      if (card.matches(':popover-open')) card.hidePopover();
      return;
    }
    if (!card.matches(':popover-open')) card.showPopover();
    if (!target) return;
    const { top, left } = popoverPosition(
      target.getBoundingClientRect(),
      { width: card.offsetWidth, height: card.offsetHeight },
      placement,
      { width: window.innerWidth, height: window.innerHeight },
    );
    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
  }, [open, anchor, placement]);

  return (
    <div
      ref={ref}
      popover="auto"
      role="dialog"
      aria-label={label}
      onToggle={(event) => {
        if ((event.nativeEvent as ToggleEvent).newState === 'closed') onClose();
      }}
      className="popover fixed m-0 w-56 rounded-[20px] bg-s2 p-3 text-text shadow-[0_18px_40px_oklch(0.06_0.02_50/0.7)]"
    >
      {children}
    </div>
  );
}
```

If React 19's types reject `popover` or `onToggle` on a `div`, check `@types/react` for the supported prop names (`popover` is supported in React 19). Note the exact cast you needed in your report. `w-56` is 224px.

- [x] **Step 6: Run all overlay tests and the gate.** Run `pnpm vitest run src/ui`, then `pnpm check`. Expected: PASS.

- [x] **Step 7: Commit.**

```bash
git add src/ui/Sheet.tsx src/ui/Popover.tsx src/ui/popover-position.ts src/ui/popover-position.test.ts src/ui/overlays.test.tsx
git commit -m "feat(ui): bottom sheet and popover on native dialog and popover

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Router shell

**Files:**
- Create: `src/app/routes.tsx`, `src/app/RootLayout.tsx`, `src/app/RouteError.tsx`, `src/app/PreloadLink.tsx`, `src/app/router.test.tsx`
- Create: `src/routes/home.tsx`, `src/routes/table.tsx`, `src/routes/setup.tsx`, `src/routes/history.tsx`, `src/routes/end.tsx`, `src/routes/stats.tsx`
- Modify: `src/main.tsx`
- Delete: `src/App.tsx`

**Interfaces:**
- Consumes: `STRINGS` (Task 1), `syncTheme` (Task 2), `appStore` and `hydrateAppStore` (`src/store/instance.ts`).
- Produces:
  - `routes: RouteObject[]`
  - `LAZY_ROUTES` (path → `() => import(...)`)
  - `preloadRoute(path: string): void`
  - `PreloadLink` (same props as React Router's `Link`)
  - Paths: `/` home, `/table`, `/setup`, `/history`, `/end`, `/stats` (plus `/dev/ui` from Task 7). Every lazy route module exports `Component`.

Before writing code, check with context7 (`/websites/reactrouter`, current version) the data-mode imports for v8: `createBrowserRouter`, `createMemoryRouter` and `RouteObject` from `react-router`, `RouterProvider` from `react-router/dom`, and the object form of `lazy: { Component: async () => … }`. Also check `node_modules/react-router/package.json` for the installed version.

- [x] **Step 1: Placeholder screens.** Each route file renders its title from `STRINGS.screens` as an `<h1 className="text-[32px] font-black">`. `home.tsx` and `table.tsx` export named components `Home` and `Table`, which load eagerly. The lazy ones (`setup`, `history`, `end`, `stats`) export `Component`. `home.tsx` also shows `PreloadLink`s to `/setup`, `/stats` and `/table` as `Button`-styled links (`className` from the secondary Button look, text = the target's screen title), so preload can be tried in the browser. Phase 5 replaces these bodies.

- [x] **Step 2: Write the failing router tests.** Create `src/app/router.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { describe, expect, it, vi } from 'vitest';
import { STRINGS } from '../core/strings';
import { RouteError } from './RouteError';
import { LAZY_ROUTES, preloadRoute, routes } from './routes';

const renderAt = (path: string) =>
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />);

describe('router', () => {
  it('renders the home screen eagerly', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: STRINGS.screens.home })).toBeTruthy();
  });

  it('lazy-loads a secondary screen', async () => {
    renderAt('/stats');
    expect(await screen.findByRole('heading', { name: STRINGS.screens.stats })).toBeTruthy();
  });

  it('shows the error boundary for an unknown path', async () => {
    renderAt('/nope');
    expect(await screen.findByText(STRINGS.routeError.title)).toBeTruthy();
  });

  it('catches a render error in a route with its own boundary', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Boom = () => {
      throw new Error('boom');
    };
    render(
      <RouterProvider router={createMemoryRouter([{ path: '/', Component: Boom, ErrorBoundary: RouteError }])} />,
    );
    expect(await screen.findByText(STRINGS.routeError.title)).toBeTruthy();
    expect(screen.getByRole('link', { name: STRINGS.routeError.home }).getAttribute('href')).toBe('/');
  });

  it('preloads a lazy route module once per call', () => {
    const load = vi.spyOn(LAZY_ROUTES, '/stats');
    preloadRoute('/stats');
    preloadRoute('/table'); // eager: nothing to preload
    expect(load).toHaveBeenCalledOnce();
  });
});
```

- [x] **Step 3: Run the tests to see them fail.** Run: `pnpm vitest run src/app`. Expected: FAIL, because the modules are missing.

- [x] **Step 4: Create the shell.**

```tsx
// src/app/routes.tsx
import type { RouteObject } from 'react-router';
import { Home } from '../routes/home';
import { Table } from '../routes/table';
import { RootLayout } from './RootLayout';
import { RouteError } from './RouteError';

/** Secondary screens, loaded on first visit (or earlier via preloadRoute). */
export const LAZY_ROUTES: Record<string, () => Promise<{ Component: React.ComponentType }>> = {
  '/setup': () => import('../routes/setup'),
  '/history': () => import('../routes/history'),
  '/end': () => import('../routes/end'),
  '/stats': () => import('../routes/stats'),
};

/** Starts downloading a lazy screen's code; no-op for eager or unknown paths. */
export function preloadRoute(path: string): void {
  void LAZY_ROUTES[path]?.();
}

const lazyRoute = (path: string): RouteObject => ({
  path: path.slice(1),
  lazy: { Component: async () => (await LAZY_ROUTES[path]!()).Component },
  ErrorBoundary: RouteError,
});

export const routes: RouteObject[] = [
  {
    Component: RootLayout,
    ErrorBoundary: RouteError,
    children: [
      { index: true, Component: Home, ErrorBoundary: RouteError },
      { path: 'table', Component: Table, ErrorBoundary: RouteError },
      ...Object.keys(LAZY_ROUTES).map(lazyRoute),
    ],
  },
];
```

Biome may forbid the non-null `!` (`noNonNullAssertion`). If it does, write the lazy entry as a `const load = LAZY_ROUTES[path]` guard that throws `new Error(\`no lazy route ${path}\`)` when it's missing, then call it.

```tsx
// src/app/RootLayout.tsx
import { Outlet } from 'react-router';

/** Centred mobile column; the themed background fills the page behind it. */
export function RootLayout() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[780px] flex-col gap-4 px-4 py-6">
      <Outlet />
    </main>
  );
}
```

```tsx
// src/app/RouteError.tsx
import { Link, useRouteError } from 'react-router';
import { STRINGS } from '../core/strings';

/** Per-route error boundary: the rest of the app keeps working. */
export function RouteError() {
  const error = useRouteError();
  if (import.meta.env.DEV) console.error(error);
  return (
    <div role="alert" className="flex flex-col items-start gap-4 py-10">
      <h1 className="text-[32px] font-black">{STRINGS.routeError.title}</h1>
      <Link to="/" className="inline-flex h-14 items-center rounded-2xl bg-a px-5 text-[17px] font-extrabold text-on">
        {STRINGS.routeError.home}
      </Link>
    </div>
  );
}
```

```tsx
// src/app/PreloadLink.tsx
import { Link, type LinkProps } from 'react-router';
import { preloadRoute } from './routes';

/** Link that starts loading a lazy screen on hover or focus (roadmap: preload on intent). */
export function PreloadLink({ onPointerEnter, onFocus, ...props }: LinkProps) {
  const path = typeof props.to === 'string' ? props.to : (props.to.pathname ?? '');
  return (
    <Link
      {...props}
      onPointerEnter={(event) => {
        preloadRoute(path);
        onPointerEnter?.(event);
      }}
      onFocus={(event) => {
        preloadRoute(path);
        onFocus?.(event);
      }}
    />
  );
}
```

`routes.tsx` imports `home.tsx`, which imports `PreloadLink`, which imports `routes.tsx`. The cycle is safe because `preloadRoute` is only called in event handlers. If Biome or the typecheck objects, move `LAZY_ROUTES` and `preloadRoute` into `src/app/lazy-routes.ts` and import them from both.

- [x] **Step 5: Rewrite `src/main.tsx` and delete `src/App.tsx`.**

```tsx
import '@fontsource-variable/nunito';
import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { routes } from './app/routes';
import { appStore, hydrateAppStore } from './store/instance';
import { syncTheme } from './ui/theme';

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');

const router = createBrowserRouter(routes);

// Render only after saved data has loaded, so no component ever sees the empty defaults
// and no write can overwrite stored data before it has been read.
void hydrateAppStore().then(() => {
  syncTheme(appStore, document.documentElement);
  createRoot(root).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
});
```

Run `git rm src/App.tsx`.

- [x] **Step 6: Run the tests, the gate and the build.** Run `pnpm vitest run src/app`, then `pnpm check`, then `pnpm build`. Expected: PASS. The build output lists separate JS chunks for `setup`, `history`, `end` and `stats`.

- [x] **Step 7: Commit.**

```bash
git add src/app src/routes src/main.tsx src/App.tsx
git commit -m "feat(app): router shell with lazy routes and per-route error boundaries

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: DEV-only primitive gallery

**Files:**
- Create: `src/routes/dev-ui.tsx`
- Modify: `src/app/routes.tsx` (register `/dev/ui` only in DEV)

**Interfaces:**
- Consumes: every `src/ui` primitive, `useAppStore` and `photoStore` from `src/store/instance.ts`, `THEMES`, `FELTS`, `STRINGS`, `feltStyle`.
- Produces: the route `/dev/ui`, present only when `import.meta.env.DEV`.

- [x] **Step 1: Build the gallery page** (`export function Component()`). It has one section per primitive, so the product owner and later tasks can compare the primitives against `docs/design-handoff/screens/png/`:
  - **Theme switcher:** four `Chip`s labelled `STRINGS.themes[key].name`, `selected` for the current theme, `onClick` → `updateSettings({ theme })`. Select the current theme with a narrow selector: `useAppStore((s) => s.settings.theme)`.
  - **Felt swatches:** four 120×80 boxes, `rounded-[32px] border-[6px]`, `style={feltStyle(key)}`, labelled `STRINGS.felts[key]`.
  - **Buttons:** every variant in both sizes, plus one disabled.
  - **Chips:** each tone in both sizes, one selected. Include a suit sample `<span className="text-suit-red">♥ ♦</span>` next to `♠ ♣`.
  - **Segmented:** the four series options `1 мач`, `2 от 3`, `3 от 5`, `4 от 7` (handoff copy), with local state.
  - **Avatars:** sizes 44, 60, 68 and 92, rings `a`, `b` and `line`, emoji and initial fallbacks.
  - **Sheet:** a button opens a Sheet titled `Място: Север` with a few rows of text.
  - **Popover:** four avatar buttons, one per placement, each opening a Popover labelled `Иван обявява` with a 2×2 grid of 48px `bg-s3` buttons (`Белот 2`, `Терца 2`, `Кварта 5`, `Квинта 10`).
  - **Typography scale:** one line for each size in the handoff's typography list (64/900 down to 11/800), plus a tabular-nums sample `151 · 87`.

  UI state (sheet open, popover open) stays in the component. This page is a developer tool: its labels may mix English section headings with handoff copy.

- [x] **Step 2: Register it in DEV only.** In `src/app/routes.tsx`, add this to `LAZY_ROUTES` conditionally:

```ts
...(import.meta.env.DEV ? { '/dev/ui': () => import('../routes/dev-ui') } : {}),
```

`lazyRoute` derives the path `dev/ui` from the key.

- [x] **Step 3: Check it builds without the gallery.** Run `pnpm check && pnpm build`, then `grep -l "Иван обявява" dist/assets/*.js || echo "not in production bundle"`. Expected: `not in production bundle`.

- [x] **Step 4: Check it in a browser.** Run `pnpm dev`, open `/dev/ui` (the controller can use Playwright) and confirm:
  - the four themes switch the page colours and glow;
  - the font is Nunito;
  - a sheet slides up, closes on an overlay tap and on Esc;
  - popovers appear on the correct side and close on an outside tap;
  - the console shows no errors.

  Take one screenshot per theme into the scratchpad for the report. Don't commit them.

- [x] **Step 5: Commit.**

```bash
git add src/routes/dev-ui.tsx src/app/routes.tsx
git commit -m "feat(dev): primitive gallery at /dev/ui

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Vault update

**Files:**
- Create: `docs/adr/0008-native-dialog-and-popover-over-vaul.md`
- Modify: `docs/superpowers/plans/2026-09-25-roadmap.md`, `docs/Home.md`, `docs/Status.md`, `docs/Backlog.md`, `docs/Architecture/Overview.md`, `docs/Architecture/Testing.md`

- [x] **Step 1: Write ADR 0008.**

```markdown
# Sheets and popovers on the native dialog and popover APIs, not vaul

The roadmap planned bottom sheets on vaul. By Phase 4 vaul had seen no release since December 2024 and its README declares it unmaintained. The browser now provides what the spec asks for: `<dialog>` with `showModal()` gives a modal in the top layer with a focus trap, Esc to close and a `::backdrop` to tap. The `popover` attribute gives light dismiss for the declaration popover. `src/ui/Sheet.tsx` and `src/ui/Popover.tsx` wrap them, and `popoverPosition` places the popover next to its avatar. There are no dependencies, and React Native will need its own sheet anyway.

## Considered Options

- vaul: adds swipe-to-dismiss, but it's unmaintained and future React releases may break it.
- Radix Dialog/Popover: maintained, but a dependency for what the platform now does natively.

## Consequences

No swipe-down-to-dismiss (the spec doesn't ask for it). The sheet slide-in and popover fade are CSS keyframes in `src/index.css`, turned off under `prefers-reduced-motion`.
```

- [x] **Step 2: Update the other docs.**
  - **Roadmap:** in the Phase 4 row, replace "Sheet on vaul" with "Sheet on native `<dialog>` (ADR 0008)". Link this plan in the Plan column.
  - **Home:** list ADR 0008 under Decisions and this plan under Plans.
  - **Architecture/Overview:** describe the UI layer (`src/ui` primitives, `src/app` router shell, `src/routes` screens), and remove "Phase 4+" from the UI box.
  - **Architecture/Testing:** component tests use happy-dom via the docblock, with React Testing Library.
  - **Status:**
    - Phase 4 done; next is the Phase 5 plan.
    - Add the open question "error-boundary copy (`STRINGS.routeError.title`) is a placeholder; the handoff has none".
    - Remove the `strings.ts` gap.
  - **Backlog:** remove the done Phase 4 lines, and add anything the reviews deferred.

- [x] **Step 3: Verify and commit.**

Run: `pnpm docs:check && pnpm check`
Expected: both pass.

```bash
git add docs/adr/0008-native-dialog-and-popover-over-vaul.md docs/superpowers/plans/2026-09-25-roadmap.md docs/Home.md docs/Status.md docs/Backlog.md docs/Architecture/Overview.md docs/Architecture/Testing.md
git commit -m "docs: phase 4 vault update, ADR 0008

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
