import { z } from 'zod';
import { MatchRecordSchema, MatchSchema, PlayerSchema } from './model';
import { DEFAULT_RULES } from './rules';
import { DEFAULT_SETTINGS, SettingsSchema } from './settings';

export const PERSIST_VERSION = 2;

export const PersistedStateSchema = z.object({
  roster: z.array(PlayerSchema),
  stats: z.array(MatchRecordSchema),
  match: MatchSchema.nullable(),
  settings: SettingsSchema,
});
export type PersistedState = z.infer<typeof PersistedStateSchema>;

export const EMPTY_STATE: PersistedState = {
  roster: [],
  stats: [],
  match: null,
  settings: DEFAULT_SETTINGS,
};

/** Upgrades a stored state by exactly one version. */
export type Migration = (state: unknown) => unknown;

// Version 1 stored only the target score in a match; version 2 stores its full rules (ADR 0009).
const V1State = z.looseObject({
  match: z.looseObject({ targetScore: z.number() }).nullable(),
});

/**
 * `MIGRATIONS[n]` turns a version-n state into version n + 1. Add one (and bump
 * PERSIST_VERSION) for every change to PersistedStateSchema; never edit an existing step.
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  1: (state) => {
    const v1 = V1State.parse(state);
    if (!v1.match) return v1;
    const { targetScore, ...match } = v1.match;
    return { ...v1, match: { ...match, rules: { ...DEFAULT_RULES, targetScore } } };
  },
};

const DocumentSchema = z.object({
  version: z.number().int().positive(),
  state: z.unknown(),
});

export type LoadError = 'not-a-document' | 'future-version' | 'missing-migration' | 'invalid-state';
export type LoadResult = { ok: true; state: PersistedState } | { ok: false; error: LoadError };

export function loadPersisted(
  doc: unknown,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
  target: number = PERSIST_VERSION,
): LoadResult {
  const parsed = DocumentSchema.safeParse(doc);
  if (!parsed.success) return { ok: false, error: 'not-a-document' };
  let { version, state } = parsed.data;
  if (version > target) return { ok: false, error: 'future-version' };

  while (version < target) {
    const step = migrations[version];
    if (!step) return { ok: false, error: 'missing-migration' };
    try {
      state = step(state);
    } catch {
      return { ok: false, error: 'invalid-state' };
    }
    version++;
  }

  const result = PersistedStateSchema.safeParse(state);
  return result.success ? { ok: true, state: result.data } : { ok: false, error: 'invalid-state' };
}
