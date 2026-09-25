import { z } from 'zod';
import { DEFAULT_RULES, RulesConfigSchema } from './rules';

export const ThemeKeySchema = z.enum(['pub', 'home', 'casino', 'night']);
export type ThemeKey = z.infer<typeof ThemeKeySchema>;

export const FeltKeySchema = z.enum(['wood', 'cloth', 'check', 'stone']);
export type FeltKey = z.infer<typeof FeltKeySchema>;

/** Device preferences. The rules apply to new matches; a running match keeps its own `targetScore`. */
export const SettingsSchema = z.object({
  theme: ThemeKeySchema,
  felt: FeltKeySchema,
  showDealer: z.boolean(),
  rules: RulesConfigSchema,
});
export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'pub',
  felt: 'wood',
  showDealer: true,
  rules: DEFAULT_RULES,
};
