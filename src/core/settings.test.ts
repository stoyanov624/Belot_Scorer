import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES } from './rules';
import { DEFAULT_SETTINGS, SettingsSchema } from './settings';

describe('settings', () => {
  it('defaults to the pub theme, wood felt, dealer shown and default rules', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      theme: 'pub',
      felt: 'wood',
      showDealer: true,
      rules: DEFAULT_RULES,
    });
  });

  it('validates the defaults', () => {
    expect(SettingsSchema.parse(DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
  });

  it('rejects an unknown theme', () => {
    expect(SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, theme: 'disco' }).success).toBe(false);
  });
});
