import type { FeltKey, ThemeKey } from './settings';

/** Colour tokens every theme defines; each becomes `--t-<name>` and a Tailwind colour (`a`/`b` as `team-a`/`team-b`). */
export const COLOR_TOKENS = [
  'bg',
  's1',
  's2',
  's3',
  'line',
  'text',
  'muted',
  'a',
  'b',
  'on',
] as const;
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

/** A theme's CSS custom properties: every colour token, the glow, and the suit red. */
export function themeVars(key: ThemeKey): Record<string, string> {
  const t = THEMES[key];
  const vars: Record<string, string> = { '--t-glow': t.glow, '--t-suit-red': SUIT_RED };
  for (const name of COLOR_TOKENS) vars[`--t-${name}`] = t[name];
  return vars;
}
