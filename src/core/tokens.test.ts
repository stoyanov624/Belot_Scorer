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
