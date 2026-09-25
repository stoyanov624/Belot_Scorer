# Phase 3: Store & Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One Zustand store (roster, stats, match, settings) that calls the Phase 2 core functions, persists as a single versioned, Zod-validated document in IndexedDB, keeps player photos as separate Blobs, and hydrates exactly once before the app renders.

**Architecture:** Core gains the pure pieces: a `RulesConfig` schema, `Settings`, and the persisted document schema with its migration runner (`loadPersisted`). Everything platform-bound lives outside core: `src/storage/` wraps a tiny key-value interface (`Kv`) with an IndexedDB implementation (`idb-keyval`) and an in-memory one for tests; `src/store/` builds a vanilla Zustand store from injected dependencies (storage, id generator, clock, photo remover), so every store test is deterministic and runs in Node without IndexedDB. The one production instance and the React hook live in `src/store/instance.ts`, which only `main.tsx` and UI code import.

**Tech Stack:** Zustand v5 (`zustand/vanilla`, `zustand/middleware` `persist`), idb-keyval, nanoid, Zod v4, Vitest.

**Spec:** `docs/design-handoff/DATA_MODEL.md` §1–3, `docs/design-handoff/README.md` (screens 02, 12; "Постоянни данни", "Tweakable конфигурация"), `docs/adr/0002`, `docs/adr/0003`, `docs/superpowers/plans/2026-09-25-roadmap.md` (Phase 3 row). Reference behaviour: `recordMatch`, `goHome`, `nextMatch`, `rematch` in `docs/design-handoff/prototype/Belot v3.dc.html` (lines ~1073 and ~1385–1397).

## Global Constraints

- `src/core/**` imports only `zod` and other core modules; no `Date`, no id generation. Ids and dates are generated in `src/store` and passed in.
- The store only calls core functions. Totals, dealer, allowed declarations and verdict are derived, never stored (ADR 0002).
- One persisted key, `belot-state`, holding `{ version, state }` where `state` is `{ roster, stats, match, settings }`. Changing the shape means adding a migration, never editing the old schema in place (ADR 0003).
- `Player.photo` is a photo id in the separate photo store, never a data URL (ADR 0003).
- Ids: `nanoid(10)` (roadmap, ADR 0005).
- A match with no recorded deals is never written to the leaderboard (prototype `recordMatch`: `if (!games.length) return`).
- Defaults: theme `pub` (Кръчма), felt `wood` (Дърво), `showDealer: true`, rules `DEFAULT_RULES` (target 151).
- No barrel `index.ts`. No `useEffect` for game logic: auto-end and match recording happen inside the `saveDeal` action.
- Core returns codes, not Bulgarian text.
- `pnpm check` passes at the end of every task. Conventional Commits, one commit per task, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Prerequisite

`pnpm install` must succeed first. With pnpm 12 the default `minimumReleaseAge` (24 h) rejects lockfile entries published on 2026-09-24/25; this clears on its own after ~09:00 UTC on 2026-09-26. Do not run `pnpm clean --lockfile` to work around it. When adding packages in Task 1, pnpm 12 picks the newest version older than the cutoff, which is fine.

## Open decision (confirm with the product owner)

The spec says deleting a player "frees the seats they sat on". In the prototype that also works mid-match, leaving an empty seat. Our `Match.seats` is a tuple of four player ids, so an empty seat is not representable, and removing a seated player would leave their deals with no name. This plan makes `removePlayer` refuse with `'in-match'` while that player sits in the current match (playing or ended). Freeing seats in the setup draft stays a Phase 5 UI concern (`vacatePlayer` in `src/core/roster.ts`).

## File Structure

```
src/core/rules.ts            + RulesConfigSchema
src/core/settings.ts         ThemeKey, FeltKey, Settings schema, DEFAULT_SETTINGS
src/core/persisted.ts        PersistedState schema, PERSIST_VERSION, EMPTY_STATE, MIGRATIONS, loadPersisted
src/storage/kv.ts            Kv interface, idbKv (idb-keyval), memoryKv (tests)
src/storage/document.ts      createDocumentStorage: Kv → zustand PersistStorage, backup on bad data
src/storage/photos.ts        createPhotoStore: put/get/remove photo Blobs by id
src/lib/id.ts                newId = nanoid(10)
src/store/app-store.ts       AppState, AppDeps, createAppStore (vanilla + persist), STORAGE_KEY
src/store/roster-actions.ts  savePlayer, removePlayer, updateSettings
src/store/match-actions.ts   startMatch … leaveMatch, saveDeal with auto-record
src/store/instance.ts        production store, useAppStore hook, hydrateAppStore
src/main.tsx                 hydrate once, then render
```

Tests sit beside each module (`*.test.ts`). Store tests use `memoryKv`, never IndexedDB, and never import `src/store/instance.ts`. Any file that runs `idb-keyval`'s `createStore` at import time would touch `indexedDB`, which doesn't exist in Node.

---

### Task 1: Rules schema and device settings (core)

**Files:**
- Modify: `package.json` (dependencies)
- Modify: `src/core/rules.ts` (add `RulesConfigSchema`)
- Test: `src/core/rules.test.ts` (append)
- Create: `src/core/settings.ts`
- Test: `src/core/settings.test.ts`

**Interfaces:**
- Produces: `RulesConfigSchema` (`z.ZodType<RulesConfig>`); `ThemeKeySchema`, `ThemeKey = 'pub' | 'home' | 'casino' | 'night'`; `FeltKeySchema`, `FeltKey = 'wood' | 'cloth' | 'check' | 'stone'`; `SettingsSchema`, `Settings = { theme: ThemeKey; felt: FeltKey; showDealer: boolean; rules: RulesConfig }`; `DEFAULT_SETTINGS: Settings`.

- [ ] **Step 1: Add the Phase 3 dependencies**

```bash
pnpm add zustand idb-keyval nanoid
```

Expected: `package.json` lists `zustand` (^5), `idb-keyval` (^6), `nanoid` (^5) under `dependencies`.

- [ ] **Step 2: Write the failing tests**

Append to `src/core/rules.test.ts` (add `RulesConfigSchema` to the existing import from `./rules`):

```ts
describe('RulesConfigSchema', () => {
  it('accepts the default rules unchanged', () => {
    expect(RulesConfigSchema.parse(DEFAULT_RULES)).toEqual(DEFAULT_RULES);
  });

  it('rejects negative declaration points', () => {
    const bad = { ...DEFAULT_RULES, declPoints: { ...DEFAULT_RULES.declPoints, belot: -1 } };
    expect(RulesConfigSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a zero target score', () => {
    expect(RulesConfigSchema.safeParse({ ...DEFAULT_RULES, targetScore: 0 }).success).toBe(false);
  });
});
```

Create `src/core/settings.test.ts`:

```ts
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
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `pnpm vitest run src/core/rules.test.ts src/core/settings.test.ts`
Expected: FAIL. `RulesConfigSchema` is not exported, and `./settings` does not exist.

- [ ] **Step 4: Add `RulesConfigSchema` to `src/core/rules.ts`**

Add `import { z } from 'zod';` as the first import, and this block directly below the `RulesConfig` interface:

```ts
const nonNegative = z.number().int().nonnegative();

export const RulesConfigSchema = z.object({
  targetScore: z.number().int().positive(),
  declPoints: z.object({
    belot: nonNegative,
    terca: nonNegative,
    kvarta: nonNegative,
    kvinta: nonNegative,
  }),
  karePoints: z.object({
    Q: nonNegative,
    K: nonNegative,
    '10': nonNegative,
    A: nonNegative,
    '9': nonNegative,
    J: nonNegative,
  }),
  maxCardPoints: z.object({ color: nonNegative, nt: nonNegative, at: nonNegative }),
  capoBonus: nonNegative,
  ntMultiplier: z.number().int().positive(),
}) satisfies z.ZodType<RulesConfig>;
```

Keep the `RulesConfig` interface as the source of truth. The `satisfies` check fails to compile if the schema and the interface drift apart.

- [ ] **Step 5: Create `src/core/settings.ts`**

```ts
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
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `pnpm vitest run src/core/rules.test.ts src/core/settings.test.ts`
Expected: PASS.

- [ ] **Step 7: Run the gate and commit**

Run: `pnpm check`
Expected: lint, both typechecks and all tests pass.

```bash
git add package.json pnpm-lock.yaml src/core/rules.ts src/core/rules.test.ts src/core/settings.ts src/core/settings.test.ts
git commit -m "feat(core): rules config schema and device settings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Persisted document schema and migrations (core)

**Files:**
- Create: `src/core/persisted.ts`
- Test: `src/core/persisted.test.ts`

**Interfaces:**
- Consumes: `PlayerSchema`, `MatchRecordSchema`, `MatchSchema` from `./model`; `SettingsSchema`, `DEFAULT_SETTINGS` from `./settings`.
- Produces:
  - `PERSIST_VERSION = 1`
  - `PersistedStateSchema`, `PersistedState = { roster: Player[]; stats: MatchRecord[]; match: Match | null; settings: Settings }`
  - `EMPTY_STATE: PersistedState`
  - `type Migration = (state: unknown) => unknown`; `MIGRATIONS: Readonly<Record<number, Migration>>` (key `n` upgrades version `n` to `n + 1`)
  - `type LoadError = 'not-a-document' | 'future-version' | 'missing-migration' | 'invalid-state'`
  - `loadPersisted(doc: unknown, migrations?: Readonly<Record<number, Migration>>, target?: number): { ok: true; state: PersistedState } | { ok: false; error: LoadError }`

- [ ] **Step 1: Write the failing tests**

Create `src/core/persisted.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createMatch } from './match';
import { EMPTY_STATE, loadPersisted, type Migration, PERSIST_VERSION } from './persisted';
import { DEFAULT_SETTINGS } from './settings';

const player = { id: 'p1', name: 'Иво', emoji: '🐻', photo: null };
const match = createMatch({
  seats: ['p1', 'p2', 'p3', 'p4'],
  teamA: 'Ние',
  teamB: 'Вие',
  bestOf: 3,
  targetScore: 151,
});

describe('loadPersisted', () => {
  it('loads a valid document at the current version', () => {
    const state = { ...EMPTY_STATE, roster: [player], match };
    expect(loadPersisted({ version: PERSIST_VERSION, state })).toEqual({ ok: true, state });
  });

  it.each([null, 'x', 42, { state: EMPTY_STATE }, { version: 0, state: EMPTY_STATE }])(
    'rejects %j as not a document',
    (doc) => {
      expect(loadPersisted(doc)).toEqual({ ok: false, error: 'not-a-document' });
    },
  );

  it('rejects a document written by a newer app version', () => {
    const doc = { version: PERSIST_VERSION + 1, state: EMPTY_STATE };
    expect(loadPersisted(doc)).toEqual({ ok: false, error: 'future-version' });
  });

  it('rejects a state that fails the schema', () => {
    const state = { ...EMPTY_STATE, roster: [{ ...player, name: '' }] };
    expect(loadPersisted({ version: PERSIST_VERSION, state })).toEqual({
      ok: false,
      error: 'invalid-state',
    });
  });

  it('runs every migration in order from the stored version to the target', () => {
    const calls: number[] = [];
    const migrations: Record<number, Migration> = {
      1: (s) => {
        calls.push(1);
        return { ...(s as object), stats: [] };
      },
      2: (s) => {
        calls.push(2);
        return { ...(s as object), settings: DEFAULT_SETTINGS };
      },
    };
    const v1 = { roster: [player], match: null };
    const result = loadPersisted({ version: 1, state: v1 }, migrations, 3);
    expect(calls).toEqual([1, 2]);
    expect(result).toEqual({ ok: true, state: { ...EMPTY_STATE, roster: [player] } });
  });

  it('fails when a migration step is missing', () => {
    expect(loadPersisted({ version: 1, state: EMPTY_STATE }, {}, 2)).toEqual({
      ok: false,
      error: 'missing-migration',
    });
  });

  it('treats a throwing migration as invalid state', () => {
    const migrations: Record<number, Migration> = {
      1: () => {
        throw new Error('boom');
      },
    };
    expect(loadPersisted({ version: 1, state: EMPTY_STATE }, migrations, 2)).toEqual({
      ok: false,
      error: 'invalid-state',
    });
  });
});
```

The `as object` casts are confined to test fixtures that fake old shapes. Production migrations should parse their input with a frozen copy of the old schema instead.

- [ ] **Step 2: Run the tests to see them fail**

Run: `pnpm vitest run src/core/persisted.test.ts`
Expected: FAIL. `./persisted` does not exist.

- [ ] **Step 3: Create `src/core/persisted.ts`**

```ts
import { z } from 'zod';
import { MatchRecordSchema, MatchSchema, PlayerSchema } from './model';
import { DEFAULT_SETTINGS, SettingsSchema } from './settings';

export const PERSIST_VERSION = 1;

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

/**
 * `MIGRATIONS[n]` turns a version-n state into version n + 1. Add one (and bump
 * PERSIST_VERSION) for every change to PersistedStateSchema; never edit an existing step.
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

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
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `pnpm vitest run src/core/persisted.test.ts`
Expected: PASS (7 cases plus the 5 `it.each` rows).

- [ ] **Step 5: Run the gate and commit**

Run: `pnpm check`
Expected: all pass.

```bash
git add src/core/persisted.ts src/core/persisted.test.ts
git commit -m "feat(core): versioned persisted document with migration runner

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Key-value adapters and the document storage

**Files:**
- Create: `src/storage/kv.ts`
- Create: `src/storage/document.ts`
- Test: `src/storage/document.test.ts`

**Interfaces:**
- Consumes: `loadPersisted`, `LoadError`, `PERSIST_VERSION`, `PersistedState`, `EMPTY_STATE` from `src/core/persisted`.
- Produces:
  - `interface Kv { get(key: string): Promise<unknown>; set(key: string, value: unknown): Promise<void>; del(key: string): Promise<void> }`
  - `idbKv(store?: UseStore): Kv` (idb-keyval; default store when omitted)
  - `memoryKv(initial?: Record<string, unknown>): Kv & { data: Map<string, unknown> }`
  - `class PersistLoadError extends Error { readonly code: LoadError }`
  - `backupKey(name: string): string` → `` `${name}.backup` ``
  - `createDocumentStorage(kv: Kv): PersistStorage<PersistedState>`: `getItem` returns `null` when nothing is stored, `{ state, version: PERSIST_VERSION }` when the stored document loads, and otherwise copies the raw document to `backupKey(name)` and throws `PersistLoadError`. `setItem` writes `{ version: PERSIST_VERSION, state }`.

- [ ] **Step 1: Create `src/storage/kv.ts`**

This file is plain wiring, so it has no test of its own. `memoryKv` is exercised by every test below, and `idbKv` is exercised by the manual check in Task 6.

```ts
import { del, get, set, type UseStore } from 'idb-keyval';

/** The storage surface the app needs. IndexedDB on the web, MMKV/files on mobile later. */
export interface Kv {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  del(key: string): Promise<void>;
}

export function idbKv(store?: UseStore): Kv {
  return {
    get: (key) => get(key, store),
    set: (key, value) => set(key, value, store),
    del: (key) => del(key, store),
  };
}

/** In-memory Kv for tests. `data` is exposed so tests can seed and inspect it. */
export function memoryKv(initial: Record<string, unknown> = {}): Kv & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>(Object.entries(initial));
  return {
    data,
    get: async (key) => data.get(key),
    set: async (key, value) => {
      data.set(key, value);
    },
    del: async (key) => {
      data.delete(key);
    },
  };
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/storage/document.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { EMPTY_STATE, PERSIST_VERSION } from '../core/persisted';
import { backupKey, createDocumentStorage, PersistLoadError } from './document';
import { memoryKv } from './kv';

const KEY = 'belot-state';
const player = { id: 'p1', name: 'Иво', emoji: null, photo: null };

describe('createDocumentStorage', () => {
  it('returns null when nothing is stored', async () => {
    const storage = createDocumentStorage(memoryKv());
    expect(await storage.getItem(KEY)).toBeNull();
  });

  it('writes a versioned document and reads it back', async () => {
    const kv = memoryKv();
    const storage = createDocumentStorage(kv);
    const state = { ...EMPTY_STATE, roster: [player] };

    await storage.setItem(KEY, { state, version: PERSIST_VERSION });

    expect(kv.data.get(KEY)).toEqual({ version: PERSIST_VERSION, state });
    expect(await storage.getItem(KEY)).toEqual({ state, version: PERSIST_VERSION });
  });

  it('backs up an unreadable document and throws a coded error', async () => {
    const bad = { version: PERSIST_VERSION, state: { roster: 'nope' } };
    const kv = memoryKv({ [KEY]: bad });
    const storage = createDocumentStorage(kv);

    const read = storage.getItem(KEY);

    await expect(read).rejects.toBeInstanceOf(PersistLoadError);
    await expect(read).rejects.toMatchObject({ code: 'invalid-state' });
    expect(kv.data.get(backupKey(KEY))).toEqual(bad);
  });

  it('removes the document', async () => {
    const kv = memoryKv({ [KEY]: { version: PERSIST_VERSION, state: EMPTY_STATE } });
    await createDocumentStorage(kv).removeItem(KEY);
    expect(kv.data.has(KEY)).toBe(false);
  });
});
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `pnpm vitest run src/storage/document.test.ts`
Expected: FAIL. `./document` does not exist.

- [ ] **Step 4: Create `src/storage/document.ts`**

```ts
import type { PersistStorage } from 'zustand/middleware';
import {
  type LoadError,
  loadPersisted,
  PERSIST_VERSION,
  type PersistedState,
} from '../core/persisted';
import type { Kv } from './kv';

export class PersistLoadError extends Error {
  constructor(readonly code: LoadError) {
    super(`Stored app state could not be loaded: ${code}`);
    this.name = 'PersistLoadError';
  }
}

export const backupKey = (name: string) => `${name}.backup`;

/**
 * Zustand persist storage over one versioned document. Migrations and validation run on
 * read (core `loadPersisted`). A document that can't be loaded is copied to
 * `backupKey(name)` before the error surfaces, because the store will overwrite
 * the original with defaults on its next write.
 */
export function createDocumentStorage(kv: Kv): PersistStorage<PersistedState> {
  return {
    async getItem(name) {
      const doc = await kv.get(name);
      if (doc === undefined) return null;
      const result = loadPersisted(doc);
      if (!result.ok) {
        await kv.set(backupKey(name), doc);
        throw new PersistLoadError(result.error);
      }
      return { state: result.state, version: PERSIST_VERSION };
    },
    setItem: (name, value) => kv.set(name, { version: PERSIST_VERSION, state: value.state }),
    removeItem: (name) => kv.del(name),
  };
}
```

Before relying on it, confirm that zustand v5 exports `PersistStorage` from `zustand/middleware` (context7 `/pmndrs/zustand`, "persist custom storage PersistStorage type"). If the type name differs, use the one the docs show and keep the behaviour.

- [ ] **Step 5: Run the tests to see them pass**

Run: `pnpm vitest run src/storage/document.test.ts`
Expected: PASS.

- [ ] **Step 6: Run the gate and commit**

Run: `pnpm check`
Expected: all pass.

```bash
git add src/storage/kv.ts src/storage/document.ts src/storage/document.test.ts
git commit -m "feat(storage): versioned document storage over a key-value adapter

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Photo Blob store and id generator

**Files:**
- Create: `src/lib/id.ts`
- Create: `src/storage/photos.ts`
- Test: `src/storage/photos.test.ts`

**Interfaces:**
- Consumes: `Kv`, `memoryKv` from `./kv`.
- Produces:
  - `newId(): string` (`nanoid(10)`)
  - `interface PhotoStore { put(blob: Blob): Promise<string>; get(id: string): Promise<Blob | undefined>; remove(id: string): Promise<void> }`
  - `createPhotoStore(kv: Kv, newId: () => string): PhotoStore`

- [ ] **Step 1: Create `src/lib/id.ts`**

```ts
import { nanoid } from 'nanoid';

/** Ids for players, declarations, match records and photos (ADR 0005). */
export const newId = (): string => nanoid(10);
```

- [ ] **Step 2: Write the failing tests**

Create `src/storage/photos.test.ts`:

```ts
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
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `pnpm vitest run src/storage/photos.test.ts`
Expected: FAIL. `./photos` does not exist.

- [ ] **Step 4: Create `src/storage/photos.ts`**

```ts
import type { Kv } from './kv';

/** Player photos as Blobs, keyed by the id stored in `Player.photo` (ADR 0003). */
export interface PhotoStore {
  put(blob: Blob): Promise<string>;
  get(id: string): Promise<Blob | undefined>;
  remove(id: string): Promise<void>;
}

export function createPhotoStore(kv: Kv, newId: () => string): PhotoStore {
  return {
    async put(blob) {
      const id = newId();
      await kv.set(id, blob);
      return id;
    },
    async get(id) {
      const value = await kv.get(id);
      return value instanceof Blob ? value : undefined;
    },
    remove: (id) => kv.del(id),
  };
}
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `pnpm vitest run src/storage/photos.test.ts`
Expected: PASS.

- [ ] **Step 6: Run the gate and commit**

Run: `pnpm check`
Expected: all pass.

```bash
git add src/lib/id.ts src/storage/photos.ts src/storage/photos.test.ts
git commit -m "feat(storage): photo blob store and nanoid ids

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: App store with persistence, roster and settings actions

**Files:**
- Create: `src/store/app-store.ts`
- Create: `src/store/roster-actions.ts`
- Create: `src/store/match-actions.ts` (empty-action placeholder the type needs; filled in Task 6)
- Test: `src/store/roster-actions.test.ts`
- Test: `src/store/app-store.test.ts`

**Interfaces:**
- Consumes: `EMPTY_STATE`, `PERSIST_VERSION`, `PersistedState` (core/persisted); `validatePlayerName`, `upsertPlayer`, `removePlayer`, `NameError` (core/roster); `Settings` (core/settings); `createDocumentStorage`, `backupKey` (storage/document); `memoryKv` (storage/kv).
- Produces:
  - `STORAGE_KEY = 'belot-state'`
  - `type Hydration = 'pending' | 'ready' | 'failed'`
  - `interface AppDeps { storage: PersistStorage<PersistedState>; newId: () => string; now: () => number; removePhoto: (id: string) => Promise<void> }`
  - `type AppState = PersistedState & { hydration: Hydration } & RosterActions & MatchActions`
  - `type SetState = StoreApi<AppState>['setState']`, `type GetState = StoreApi<AppState>['getState']`
  - `createAppStore(deps: AppDeps)`: a vanilla store with `.persist.rehydrate()`; `type AppStore = ReturnType<typeof createAppStore>`
  - `interface PlayerInput { id: string | null; name: string; emoji: string | null; photo: string | null }`
  - `RosterActions`:
    - `savePlayer(input: PlayerInput): { ok: true; id: string } | { ok: false; error: NameError }`
    - `removePlayer(id: string): { ok: true } | { ok: false; error: 'in-match' }`
    - `updateSettings(patch: Partial<Settings>): void`

- [ ] **Step 1: Write the failing tests**

Create `src/store/roster-actions.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createMatch } from '../core/match';
import { createDocumentStorage } from '../storage/document';
import { memoryKv } from '../storage/kv';
import { type AppStore, createAppStore } from './app-store';

let removed: string[];
let store: AppStore;

beforeEach(() => {
  removed = [];
  let n = 0;
  store = createAppStore({
    storage: createDocumentStorage(memoryKv()),
    newId: () => `id${++n}`,
    now: () => 1000,
    removePhoto: async (id) => {
      removed.push(id);
    },
  });
});

const input = { id: null, name: 'Иво', emoji: '🐻', photo: null };

describe('savePlayer', () => {
  it('adds a new player with a generated id and a trimmed name', () => {
    const result = store.getState().savePlayer({ ...input, name: '  Иво ' });
    expect(result).toEqual({ ok: true, id: 'id1' });
    expect(store.getState().roster).toEqual([
      { id: 'id1', name: 'Иво', emoji: '🐻', photo: null },
    ]);
  });

  it('rejects an empty or duplicate name (case-insensitive)', () => {
    const { savePlayer } = store.getState();
    savePlayer(input);
    expect(savePlayer({ ...input, name: '  ' })).toEqual({ ok: false, error: 'empty' });
    expect(savePlayer({ ...input, name: 'иво' })).toEqual({ ok: false, error: 'duplicate' });
    expect(store.getState().roster).toHaveLength(1);
  });

  it('edits an existing player, keeping its own name allowed', () => {
    const { savePlayer } = store.getState();
    savePlayer(input);
    expect(savePlayer({ ...input, id: 'id1', emoji: '🦊' })).toEqual({ ok: true, id: 'id1' });
    expect(store.getState().roster[0]?.emoji).toBe('🦊');
  });

  it('drops the emoji when a photo is set', () => {
    store.getState().savePlayer({ ...input, photo: 'ph1' });
    expect(store.getState().roster[0]).toMatchObject({ emoji: null, photo: 'ph1' });
  });

  it('removes the old photo blob when the photo is replaced', () => {
    const { savePlayer } = store.getState();
    savePlayer({ ...input, photo: 'ph1' });
    savePlayer({ ...input, id: 'id1', photo: 'ph2' });
    expect(removed).toEqual(['ph1']);
  });
});

describe('removePlayer', () => {
  it('removes the player and their photo blob', () => {
    store.getState().savePlayer({ ...input, photo: 'ph1' });
    expect(store.getState().removePlayer('id1')).toEqual({ ok: true });
    expect(store.getState().roster).toEqual([]);
    expect(removed).toEqual(['ph1']);
  });

  it('refuses while the player sits in the current match', () => {
    store.getState().savePlayer(input);
    store.setState({
      match: createMatch({
        seats: ['id1', 'b', 'c', 'd'],
        teamA: 'Ние',
        teamB: 'Вие',
        bestOf: 1,
        targetScore: 151,
      }),
    });
    expect(store.getState().removePlayer('id1')).toEqual({ ok: false, error: 'in-match' });
    expect(store.getState().roster).toHaveLength(1);
  });
});

describe('updateSettings', () => {
  it('merges a partial patch', () => {
    store.getState().updateSettings({ theme: 'night' });
    expect(store.getState().settings).toMatchObject({ theme: 'night', felt: 'wood' });
  });
});
```

Create `src/store/app-store.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { PERSIST_VERSION } from '../core/persisted';
import { backupKey, createDocumentStorage } from '../storage/document';
import { type Kv, memoryKv } from '../storage/kv';
import { createAppStore, STORAGE_KEY } from './app-store';

const make = (kv: Kv) =>
  createAppStore({
    storage: createDocumentStorage(kv),
    newId: () => 'id1',
    now: () => 1000,
    removePhoto: async () => {},
  });

describe('app store persistence', () => {
  it('starts pending with empty data and becomes ready after rehydrating nothing', async () => {
    const store = make(memoryKv());
    expect(store.getState().hydration).toBe('pending');
    expect(store.getState().roster).toEqual([]);

    await store.persist.rehydrate();

    expect(store.getState().hydration).toBe('ready');
  });

  it('persists data only, and a fresh store reads it back', async () => {
    const kv = memoryKv();
    const first = make(kv);
    await first.persist.rehydrate();
    first.getState().savePlayer({ id: null, name: 'Иво', emoji: '🐻', photo: null });

    type Doc = { version: number; state: { roster: unknown[] } };
    const doc = () => kv.data.get(STORAGE_KEY) as Doc | undefined;
    await vi.waitFor(() => expect(doc()?.state.roster).toHaveLength(1));
    expect(doc()?.version).toBe(PERSIST_VERSION);
    expect(Object.keys(doc()?.state ?? {}).sort()).toEqual(['match', 'roster', 'settings', 'stats']);

    const second = make(kv);
    await second.persist.rehydrate();
    expect(second.getState().roster).toEqual(first.getState().roster);
  });

  it('marks hydration failed and keeps a backup when stored data is invalid', async () => {
    const bad = { version: PERSIST_VERSION, state: { roster: 'nope' } };
    const kv = memoryKv({ [STORAGE_KEY]: bad });
    const store = make(kv);

    await store.persist.rehydrate();

    expect(store.getState().hydration).toBe('failed');
    expect(store.getState().roster).toEqual([]);
    expect(kv.data.get(backupKey(STORAGE_KEY))).toEqual(bad);
  });
});
```

The persist middleware writes through async storage, so the test waits for the roster to appear in the stored document instead of assuming the write has landed. (Rehydrating also triggers an earlier write with an empty roster, which is why it waits for the roster rather than for the key to exist.)

- [ ] **Step 2: Run the tests to see them fail**

Run: `pnpm vitest run src/store`
Expected: FAIL. `./app-store` does not exist.

- [ ] **Step 3: Create `src/store/app-store.ts`**

```ts
import { persist, type PersistStorage } from 'zustand/middleware';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { EMPTY_STATE, PERSIST_VERSION, type PersistedState } from '../core/persisted';
import { type MatchActions, matchActions } from './match-actions';
import { type RosterActions, rosterActions } from './roster-actions';

export const STORAGE_KEY = 'belot-state';

export type Hydration = 'pending' | 'ready' | 'failed';

/** Everything platform-bound the store needs, injected so tests stay deterministic. */
export interface AppDeps {
  storage: PersistStorage<PersistedState>;
  newId: () => string;
  now: () => number;
  removePhoto: (id: string) => Promise<void>;
}

export type AppState = PersistedState & { hydration: Hydration } & RosterActions & MatchActions;
export type SetState = StoreApi<AppState>['setState'];
export type GetState = StoreApi<AppState>['getState'];

export function createAppStore(deps: AppDeps) {
  const store = createStore<AppState>()(
    persist(
      (set, get) => ({
        ...EMPTY_STATE,
        hydration: 'pending',
        ...rosterActions(set, get, deps),
        ...matchActions(set, get, deps),
      }),
      {
        name: STORAGE_KEY,
        storage: deps.storage,
        version: PERSIST_VERSION,
        skipHydration: true,
        partialize: ({ roster, stats, match, settings }): PersistedState => ({
          roster,
          stats,
          match,
          settings,
        }),
        onRehydrateStorage: () => (_state, error) => {
          store.setState({ hydration: error ? 'failed' : 'ready' });
        },
      },
    ),
  );
  return store;
}

export type AppStore = ReturnType<typeof createAppStore>;
```

`skipHydration: true` means nothing loads until `store.persist.rehydrate()` is called. Task 6 calls it exactly once in `main.tsx`, before the first render. Migrations run inside the storage (`loadPersisted`), so the stored version always equals `PERSIST_VERSION` by the time zustand sees it, and its own `migrate` option is not used.

- [ ] **Step 4: Create `src/store/roster-actions.ts`**

```ts
import type { Player } from '../core/model';
import { type NameError, removePlayer, upsertPlayer, validatePlayerName } from '../core/roster';
import type { Settings } from '../core/settings';
import type { AppDeps, GetState, SetState } from './app-store';

export interface PlayerInput {
  /** null for a new player. */
  id: string | null;
  name: string;
  emoji: string | null;
  /** Photo id from the photo store. When set, the emoji is dropped. */
  photo: string | null;
}

export interface RosterActions {
  savePlayer(input: PlayerInput): { ok: true; id: string } | { ok: false; error: NameError };
  removePlayer(id: string): { ok: true } | { ok: false; error: 'in-match' };
  updateSettings(patch: Partial<Settings>): void;
}

export function rosterActions(set: SetState, get: GetState, deps: AppDeps): RosterActions {
  // An orphaned blob only wastes space, so a failed delete is not worth surfacing.
  const dropPhoto = (id: string | null) => {
    if (id) deps.removePhoto(id).catch(() => {});
  };

  return {
    savePlayer(input) {
      const { roster } = get();
      const error = validatePlayerName(input.name, roster, input.id);
      if (error) return { ok: false, error };
      const id = input.id ?? deps.newId();
      const previous = roster.find((p) => p.id === id);
      const player: Player = {
        id,
        name: input.name.trim(),
        emoji: input.photo ? null : input.emoji,
        photo: input.photo,
      };
      set({ roster: upsertPlayer(roster, player) });
      if (previous?.photo !== player.photo) dropPhoto(previous?.photo ?? null);
      return { ok: true, id };
    },

    removePlayer(id) {
      const { roster, match } = get();
      if (match?.seats.includes(id)) return { ok: false, error: 'in-match' };
      const player = roster.find((p) => p.id === id);
      set({ roster: removePlayer(roster, id) });
      dropPhoto(player?.photo ?? null);
      return { ok: true };
    },

    updateSettings(patch) {
      set((s) => ({ settings: { ...s.settings, ...patch } }));
    },
  };
}
```

- [ ] **Step 5: Create the `src/store/match-actions.ts` placeholder**

Task 6 replaces this file completely. It exists now so `AppState` compiles:

```ts
import type { AppDeps, GetState, SetState } from './app-store';

/** Filled in by the next task. */
export type MatchActions = Record<never, never>;

export function matchActions(_set: SetState, _get: GetState, _deps: AppDeps): MatchActions {
  return {};
}
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `pnpm vitest run src/store`
Expected: PASS. If the persistence test times out in `vi.waitFor`, the `partialize` or `storage` wiring is wrong. Log `kv.data` to see what was written.

- [ ] **Step 7: Run the gate and commit**

Run: `pnpm check`
Expected: all pass.

```bash
git add src/store
git commit -m "feat(store): persisted app store with roster and settings actions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Match actions with auto-record, hydration at startup

**Files:**
- Modify (replace): `src/store/match-actions.ts`
- Test: `src/store/match-actions.test.ts`
- Create: `src/store/instance.ts`
- Modify: `src/main.tsx`
- Modify: `docs/superpowers/plans/2026-09-25-roadmap.md` (Phase 3 plan link)

**Interfaces:**
- Consumes: from `src/core/match`: `createMatch`, `setContract`, `addDeclaration`, `removeDeclaration`, `updateDeclaration`, `clearCurrentDeal`, `saveDeal`, `undoLastDeal`, `endMatch`, `nextMatch`, `rematch`, `toMatchRecord`, `SaveDealResult`. `AppDeps`, `GetState`, `SetState` from `./app-store`.
- Produces:
  - `MatchActions`:
    - `startMatch(opts: { seats: Seats; teamA: string; teamB: string; bestOf: BestOf }): void`: uses `settings.rules.targetScore`
    - `setContract(contract: ContractKey, caller: Seat): void`
    - `addDeclaration(seat: Seat, key: DeclKey): void`: id from `deps.newId`
    - `removeDeclaration(id: string): void`
    - `updateDeclaration(id: string, patch: { top?: Card | null; rank?: KareRank | null }): void`
    - `clearCurrentDeal(): void`
    - `undoLastDeal(): void`
    - `saveDeal(input: { cardPointsA: number | null; capo: Team | null }): SaveDealResult | { ok: false; error: 'no-match' }`: records the match when it auto-ends
    - `endMatch(): void`: manual end, records the match
    - `nextMatch(): void`, `rematch(): void`
    - `leaveMatch(): void`: sets `match` to `null` (prototype `goHome`)
  - `src/store/instance.ts`: `appStore: AppStore`, `useAppStore<T>(selector: (s: AppState) => T): T`, `hydrateAppStore(): Promise<void>`

- [ ] **Step 1: Write the failing tests**

Create `src/store/match-actions.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_RULES } from '../core/rules';
import { createDocumentStorage } from '../storage/document';
import { memoryKv } from '../storage/kv';
import { type AppStore, createAppStore } from './app-store';

let store: AppStore;
const s = () => store.getState();

beforeEach(() => {
  let n = 0;
  store = createAppStore({
    storage: createDocumentStorage(memoryKv()),
    newId: () => `id${++n}`,
    now: () => 1000,
    removePhoto: async () => {},
  });
  for (const name of ['Иво', 'Мила', 'Петър', 'Ана']) {
    s().savePlayer({ id: null, name, emoji: null, photo: null });
  }
});

const start = (bestOf: 1 | 3 = 1) =>
  s().startMatch({ seats: ['id1', 'id2', 'id3', 'id4'], teamA: 'Ние', teamB: 'Вие', bestOf });

/** Hearts, called by North; team A takes 10 of 16 card points → A 10, B 6. */
const playDeal = () => {
  s().setContract('hearts', 0);
  return s().saveDeal({ cardPointsA: 10, capo: null });
};

const lowTarget = (targetScore: number) =>
  s().updateSettings({ rules: { ...DEFAULT_RULES, targetScore } });

describe('match actions', () => {
  it('starts a match with the target score from the rules', () => {
    lowTarget(101);
    start();
    expect(s().match).toMatchObject({ targetScore: 101, status: 'playing', games: [] });
  });

  it('does nothing without a match', () => {
    s().setContract('hearts', 0);
    expect(s().match).toBeNull();
    expect(s().saveDeal({ cardPointsA: 10, capo: null })).toEqual({ ok: false, error: 'no-match' });
  });

  it('adds declarations with generated ids and removes them', () => {
    start();
    s().setContract('hearts', 0);
    s().addDeclaration(0, 'belot');
    const [decl] = s().match?.current ?? [];
    expect(decl).toMatchObject({ id: 'id5', seat: 0, key: 'belot' });
    s().removeDeclaration('id5');
    expect(s().match?.current).toEqual([]);
  });

  it('saves a deal and undoes it', () => {
    start();
    expect(playDeal()).toMatchObject({ ok: true, ended: false });
    expect(s().match?.games).toHaveLength(1);
    s().undoLastDeal();
    expect(s().match?.games).toEqual([]);
  });

  it('returns the core error and keeps state when the deal is invalid', () => {
    start();
    s().setContract('hearts', 0);
    expect(s().saveDeal({ cardPointsA: 99, capo: null })).toEqual({
      ok: false,
      error: 'points-range',
    });
    expect(s().match?.games).toEqual([]);
  });

  it('records the match when a deal ends it', () => {
    lowTarget(10);
    start();
    expect(playDeal()).toMatchObject({ ok: true, ended: true });
    expect(s().match?.status).toBe('ended');
    expect(s().stats).toEqual([
      {
        id: 'id5',
        date: 1000,
        seats: ['id1', 'id2', 'id3', 'id4'],
        names: ['Иво', 'Мила', 'Петър', 'Ана'],
        teamA: 'Ние',
        teamB: 'Вие',
        totalA: 10,
        totalB: 6,
        games: [{ decls: [] }],
      },
    ]);
  });

  it('records a manually ended match once, and skips one with no deals', () => {
    start();
    s().endMatch();
    expect(s().stats).toEqual([]);

    s().rematch();
    playDeal();
    s().endMatch();
    s().endMatch();
    expect(s().stats).toHaveLength(1);
  });

  it('carries the series into the next match and resets it on rematch', () => {
    lowTarget(10);
    start(3);
    playDeal();
    s().nextMatch();
    expect(s().match).toMatchObject({ series: { A: 1, B: 0 }, status: 'playing', games: [] });
    s().rematch();
    expect(s().match?.series).toEqual({ A: 0, B: 0 });
  });

  it('leaves the match', () => {
    start();
    s().leaveMatch();
    expect(s().match).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `pnpm vitest run src/store/match-actions.test.ts`
Expected: FAIL. `startMatch` is not a function.

- [ ] **Step 3: Replace `src/store/match-actions.ts`**

```ts
import {
  addDeclaration,
  clearCurrentDeal,
  createMatch,
  endMatch,
  nextMatch,
  rematch,
  removeDeclaration,
  type SaveDealResult,
  saveDeal,
  setContract,
  toMatchRecord,
  undoLastDeal,
  updateDeclaration,
} from '../core/match';
import type {
  BestOf,
  Card,
  ContractKey,
  DeclKey,
  KareRank,
  Match,
  MatchRecord,
  Seat,
  Seats,
  Team,
} from '../core/model';
import type { AppDeps, GetState, SetState } from './app-store';

export interface MatchActions {
  startMatch(opts: { seats: Seats; teamA: string; teamB: string; bestOf: BestOf }): void;
  setContract(contract: ContractKey, caller: Seat): void;
  addDeclaration(seat: Seat, key: DeclKey): void;
  removeDeclaration(id: string): void;
  updateDeclaration(id: string, patch: { top?: Card | null; rank?: KareRank | null }): void;
  clearCurrentDeal(): void;
  undoLastDeal(): void;
  /** Saves the current deal. When it ends the match, the match is recorded in the same update. */
  saveDeal(input: {
    cardPointsA: number | null;
    capo: Team | null;
  }): SaveDealResult | { ok: false; error: 'no-match' };
  /** Ends the match by hand (after the user confirms) and records it. */
  endMatch(): void;
  nextMatch(): void;
  rematch(): void;
  leaveMatch(): void;
}

export function matchActions(set: SetState, get: GetState, deps: AppDeps): MatchActions {
  const update = (fn: (m: Match) => Match) => {
    const { match } = get();
    if (match) set({ match: fn(match) });
  };

  /** Leaderboard entry for a just-ended match. Matches with no deals are not recorded. */
  const withRecord = (m: Match): MatchRecord[] => {
    const { stats, roster } = get();
    if (m.games.length === 0) return stats;
    const nameOf = (id: string) => roster.find((p) => p.id === id)?.name ?? '';
    const names: MatchRecord['names'] = [
      nameOf(m.seats[0]),
      nameOf(m.seats[1]),
      nameOf(m.seats[2]),
      nameOf(m.seats[3]),
    ];
    return [...stats, toMatchRecord(m, names, { id: deps.newId(), date: deps.now() })];
  };

  return {
    startMatch(opts) {
      set({ match: createMatch({ ...opts, targetScore: get().settings.rules.targetScore }) });
    },
    setContract: (contract, caller) => update((m) => setContract(m, contract, caller)),
    addDeclaration: (seat, key) =>
      update((m) => addDeclaration(m, { id: deps.newId(), seat, key })),
    removeDeclaration: (id) => update((m) => removeDeclaration(m, id)),
    updateDeclaration: (id, patch) => update((m) => updateDeclaration(m, id, patch)),
    clearCurrentDeal: () => update(clearCurrentDeal),
    undoLastDeal: () => update(undoLastDeal),

    saveDeal(input) {
      const { match, settings } = get();
      if (!match) return { ok: false, error: 'no-match' };
      const result = saveDeal(match, input, settings.rules);
      if (!result.ok) return result;
      set(
        result.ended
          ? { match: result.match, stats: withRecord(result.match) }
          : { match: result.match },
      );
      return result;
    },

    endMatch() {
      const { match } = get();
      if (!match || match.status === 'ended') return;
      const ended = endMatch(match);
      set({ match: ended, stats: withRecord(ended) });
    },

    nextMatch: () => update(nextMatch),
    rematch: () => update(rematch),
    leaveMatch: () => set({ match: null }),
  };
}
```

`addDeclaration` calls `deps.newId()` even when core rejects the declaration. That is harmless: an unused id is simply discarded.

- [ ] **Step 4: Run the tests to see them pass**

Run: `pnpm vitest run src/store`
Expected: PASS (roster, app-store and match-actions suites).

- [ ] **Step 5: Create `src/store/instance.ts`**

```ts
import { createStore } from 'idb-keyval';
import { useStore } from 'zustand';
import { newId } from '../lib/id';
import { createDocumentStorage } from '../storage/document';
import { idbKv } from '../storage/kv';
import { createPhotoStore } from '../storage/photos';
import { type AppState, createAppStore } from './app-store';

/** Separate IndexedDB database so photo Blobs never load with the state document. */
export const photoStore = createPhotoStore(idbKv(createStore('belot-photos', 'photos')), newId);

export const appStore = createAppStore({
  storage: createDocumentStorage(idbKv()),
  newId,
  now: () => Date.now(),
  removePhoto: (id) => photoStore.remove(id),
});

/** Read store state in components. Select narrowly: one value or one action per call. */
export function useAppStore<T>(selector: (s: AppState) => T): T {
  return useStore(appStore, selector);
}

/** Loads saved data. Call once, before the first render. */
export const hydrateAppStore = (): Promise<void> => appStore.persist.rehydrate();
```

Only `main.tsx` and UI components import this module. Tests must not import it, because `createStore('belot-photos', …)` opens IndexedDB as soon as the module loads.

- [ ] **Step 6: Hydrate before rendering in `src/main.tsx`**

Replace the file with:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { hydrateAppStore } from './store/instance';

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');

// Render only after saved data has loaded, so no component ever sees the empty defaults
// and no write can overwrite stored data before it has been read.
void hydrateAppStore().then(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
```

`rehydrate()` resolves even when loading fails. The store then reports `hydration: 'failed'`, and Phase 5 shows that state to the user.

- [ ] **Step 7: Link the plan from the roadmap**

In `docs/superpowers/plans/2026-09-25-roadmap.md`, change the Phase 3 row's last cell from `later` to `` `2026-09-25-phase-3-store-and-persistence.md` ``.

- [ ] **Step 8: Run the gate and check the app in a browser**

Run: `pnpm check`
Expected: all pass.

Run: `pnpm build`
Expected: builds with no errors.

Run: `pnpm start`, then check the page in the browser:
- The page still shows "Белот".
- The DevTools console has no errors.
- In DevTools → Application → IndexedDB, the `belot-photos` database exists. `keyval-store` holds no `belot-state` entry yet: nothing writes until a store action runs, and Phase 5 adds those actions.

- [ ] **Step 9: Commit**

```bash
git add src/store src/main.tsx docs/superpowers/plans/2026-09-25-roadmap.md
git commit -m "feat(store): match actions with auto-record, hydrate before first render

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
