# Phase 6a: Share and Import (link, QR display, file, paste) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move data between phones with no server. «Сподели» builds a link, one or more QR codes and a `.belot` file. «Внос» reads a pasted link or code, a chosen file, or a `#belot=` link that opens the app, previews the data, and merges it, takes over the shared match, or replaces everything.

**Architecture:**
- **`src/core/share.ts`** (pure): the v2 payload schema (ADR 0005), `buildPayload` for the two scopes, `extractCode` (finds a code in pasted text), `shareLink`, and `qrTexts` (one QR with the link, or `BELOT|sid|i|n|chunk` parts).
- **`src/core/import.ts`** (pure): `applyImport` merges, takes the match, or replaces, with an id remap.
- **`src/share/codec.ts`** (platform layer, like `src/storage`): deflate-raw through `CompressionStream`, base64url with the `z`/`j` prefix, and `readShared` (decode + Zod parse).
- **`src/store`**: a thin `importShared` action. It also drops the photo blobs of players that a replace removes.
- **UI**: in `src/features/share/`. `ShareSheet` and `ImportSheet` are lazy-loaded (CLAUDE.md: share/import load with `import()`), and QR drawing uses `qrcode-generator` inside the lazy chunk.
- **Wiring**:
  - Home's «Сподели / Внос» and the table's «Сподели» open the share sheet.
  - The share sheet's «Внос от друг телефон» hands over to the import sheet. Sheets are sequenced, never stacked.
  - A `#belot=` link is caught in `main.tsx` and becomes `/?import=<code>`, which Home turns into an open import sheet.
- **Deferred to 6b**: the camera scanner (reading multi-part QR) and photos in the file.

**Tech Stack:** React 19 with the React Compiler, React Router 8, Tailwind v4 tokens, Zustand, Zod v4, Vitest with happy-dom and React Testing Library, `qrcode-generator` 2.0.4 (new dependency).

**Spec:**
- `docs/design-handoff/DATA_MODEL.md` §4 (payload, encoding, QR, file, import, limits).
- `docs/design-handoff/README.md` §13 (share and import screens) and the home/table rows that name «Сподели / Внос» and «Сподели».
- Mockups `docs/design-handoff/screens/png/15-spodeli.png` and `16-vnos.png`.
- Prototype `docs/design-handoff/prototype/Belot v3.dc.html`:
  - share and import markup ~575–640
  - `pack`/`unpack`/`payload`/`buildShare`/`readCode` ~955–1003
  - `applyImport` ~1034–1054
  - the share/import view model with its exact copy ~1299–1351
  - the hash auto-open ~767–769
- ADRs 0003 (photos by id), 0005 (payload v2, no prototype compatibility), 0009 (a match carries its rules), 0010 (seated players), 0011 (resume, confirm before replacing).

**Product decisions (2026-09-27):**
- «Добави и продължи мача тук» asks first when the local match is playing and has saved deals, as ADR 0011 does for «Раздавай!».
- «Замени всичките ми данни» also clears the local match, and takes the imported match when the data has one.
- Photos in the file ship in 6b.
- Record these in ADR 0013 (Task 2).

## Global Constraints

- **Core purity (ADR 0001):**
  - `src/core` imports only `zod` and core modules. No `Date`, no `Math.random`, no `TextEncoder`/`btoa`/`CompressionStream`. Callers pass in `at`, `sid` and the base URL.
  - `tsconfig.core.json` has no `dom` lib, and Biome bans `Date` there.
- **Payload v2 (ADR 0005):**
  - `{ app: 'belot', v: 2, at: number, roster: Player[], stats: MatchRecord[], match: Match | null }`. The importer rejects anything else, including prototype v1 data.
  - Links and QR never carry photos (`photo: null`).
  - Scope `all`: every player, all stats, `match: null`.
  - Scope `match`: only the four seated players, `stats: []`, and the match with its `rules` (ADR 0009) and `status`.
- **Encoding (DATA_MODEL §4):**
  1. `JSON.stringify(payload)`.
  2. deflate-raw via `CompressionStream` with prefix `z`; without support, no compression and prefix `j`.
  3. base64url, no `=`.
  - Link: `<app root URL>#belot=<code>`. The root is `location.origin + import.meta.env.BASE_URL`, never the current route.
- **QR:**
  - Link ≤ 1400 characters: one QR holding the whole link.
  - Otherwise the code is split into 1100-character parts, each `BELOT|<sid>|<i>|<n>|<chunk>` (`sid` is 4 base36 characters, `i` is 1-based). The parts cycle every **900 ms**.
  - Error correction `L`.
- **File:**
  - `belot-YYYY-MM-DD.belot`, plain JSON of the payload (not compressed).
  - Sent with Web Share (files) when `navigator.canShare({ files })`; otherwise downloaded.
- **Import sources in 6a:**
  - pasted link or bare code (`extractCode`)
  - a chosen `.belot`/`.json` file
  - the app opened with `#belot=`, which opens import automatically and clears the hash
- **Import rules (DATA_MODEL §4 + decisions):**
  - **Merge:**
    - A player with the same `id` is updated. The imported name is taken unless another local player already has it; the local photo is kept if the imported one is null.
    - Otherwise a player with the same name (case-insensitive, `bg` locale, trimmed) is linked by an id remap: keep the local player, take the photo only if the imported one has one.
    - Otherwise the player is added.
    - Stats records are added when their `id` is new, with `seats` remapped.
  - **Take:** a merge, plus the imported match replaces the local one (seats remapped), then navigate to `resumePath(match)`. Confirm first if the local match is playing and has ≥ 1 saved deal.
  - **Replace:** needs a second press. Roster and stats become the imported ones. The match becomes the imported match (remapped, which is the identity here), or `null`. Photos of local players that are gone are removed from the photo store.
- **Copy:** use the exact Bulgarian from the prototype's view model (listed in Task 5). None of it is new product copy except the take-match confirmation, which reuses the approved `STRINGS.setup.replace*` texts.
- **UI rules:**
  - Hooks are plain top-level statements (React Compiler).
  - Never pass Button classes that conflict with its variant or size.
  - A sheet's closing button row goes in `SheetActions` when it is the sheet's last child (ADR 0012).
  - Sheets are sequenced, never stacked, and their content mounts only while open.
  - Screen tests seed state only through store actions. They never run Playwright.
- **Workflow:** `pnpm check` is green for every task. Core is test-first. Conventional Commits, one commit per task. Check the `qrcode-generator` API against `node_modules/qrcode-generator/dist/qrcode.d.ts`.

---

### Task 1: Core share model

**Files:**
- Create: `src/core/share.ts`, `src/core/share.test.ts`

**Interfaces:**
- Consumes: `PlayerSchema`, `MatchRecordSchema`, `MatchSchema`, `Player`, `MatchRecord`, `Match` from `src/core/model.ts`.
- Produces:
  - `SharePayloadSchema`, `type SharePayload`
  - `type ShareScope = 'all' | 'match'`
  - `buildPayload(state: { roster: readonly Player[]; stats: readonly MatchRecord[]; match: Match | null }, scope: ShareScope, at: number): SharePayload`
  - `extractCode(text: string): string | null`
  - `shareLink(root: string, code: string): string`
  - `qrTexts(link: string, code: string, sid: string): string[]`
  - `QR_LINK_MAX = 1400`, `QR_CHUNK = 1100`

- [ ] **Step 1: Write the failing tests** in `src/core/share.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createMatch } from './match';
import type { MatchRecord, Player, Seats } from './model';
import { DEFAULT_RULES } from './rules';
import { buildPayload, extractCode, QR_CHUNK, qrTexts, SharePayloadSchema, shareLink } from './share';

const P = (id: string, name: string, photo: string | null = null): Player => ({ id, name, emoji: '🐻', photo });
const roster = [P('a', 'Иван', 'ph1'), P('b', 'Петър'), P('c', 'Мария'), P('d', 'Гошо'), P('e', 'Стефан')];
const seats: Seats = ['a', 'b', 'c', 'd'];
const match = createMatch({ seats, teamA: 'Ние', teamB: 'Вие', bestOf: 3, rules: DEFAULT_RULES });
const record: MatchRecord = {
  id: 'm1', date: 5, seats, names: ['Иван', 'Петър', 'Мария', 'Гошо'],
  teamA: 'Ние', teamB: 'Вие', totalA: 151, totalB: 90, games: [],
};

describe('buildPayload', () => {
  it('scope all: every player without photos, all stats, no match', () => {
    const p = buildPayload({ roster, stats: [record], match }, 'all', 42);
    expect(p).toEqual({
      app: 'belot', v: 2, at: 42,
      roster: roster.map((r) => ({ ...r, photo: null })),
      stats: [record], match: null,
    });
    expect(SharePayloadSchema.parse(p)).toEqual(p);
  });

  it('scope match: only the seated players, no stats, the match with its rules', () => {
    const p = buildPayload({ roster, stats: [record], match }, 'match', 42);
    expect(p.roster.map((r) => r.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(p.roster[0]?.photo).toBeNull();
    expect(p.stats).toEqual([]);
    expect(p.match).toEqual(match);
  });

  it('scope match without a match falls back to scope all', () => {
    expect(buildPayload({ roster, stats: [record], match: null }, 'match', 1).stats).toEqual([record]);
  });
});

describe('SharePayloadSchema', () => {
  it('rejects prototype v1 data and foreign apps', () => {
    const ok = buildPayload({ roster, stats: [], match: null }, 'all', 1);
    expect(SharePayloadSchema.safeParse({ ...ok, v: 1 }).success).toBe(false);
    expect(SharePayloadSchema.safeParse({ ...ok, app: 'other' }).success).toBe(false);
  });

  it('rejects a match whose seats are not in the roster', () => {
    const p = buildPayload({ roster, stats: [], match }, 'match', 1);
    expect(SharePayloadSchema.safeParse({ ...p, roster: p.roster.slice(1) }).success).toBe(false);
  });
});

describe('extractCode', () => {
  it('finds the code in a link, in text around a link, or as a bare code', () => {
    expect(extractCode('https://x.app/#belot=zAbC-_1')).toBe('zAbC-_1');
    expect(extractCode('виж това: https://x.app/#belot=jQQ ok')).toBe('jQQ');
    expect(extractCode('  zAbc_-9  ')).toBe('zAbc_-9');
  });

  it('returns null when there is no code', () => {
    expect(extractCode('')).toBeNull();
    expect(extractCode('hello world')).toBeNull();
    expect(extractCode('xAbc')).toBeNull();
  });
});

describe('shareLink and qrTexts', () => {
  it('builds the link from the app root', () => {
    expect(shareLink('https://x.app/', 'zAB')).toBe('https://x.app/#belot=zAB');
  });

  it('one QR with the link when it fits', () => {
    const link = shareLink('https://x.app/', 'z' + 'a'.repeat(100));
    expect(qrTexts(link, 'z' + 'a'.repeat(100), 'k3f9')).toEqual([link]);
  });

  it('numbered parts of the code when the link is too long', () => {
    const code = 'z' + 'b'.repeat(QR_CHUNK * 2 + 10);
    const texts = qrTexts(shareLink('https://x.app/', code), code, 'k3f9');
    expect(texts).toHaveLength(3);
    expect(texts[0]).toBe(`BELOT|k3f9|1|3|${code.slice(0, QR_CHUNK)}`);
    expect(texts[2]).toBe(`BELOT|k3f9|3|3|${code.slice(QR_CHUNK * 2)}`);
    expect(texts.map((t) => t.split('|')[4]).join('')).toBe(code);
  });
});
```

- [ ] **Step 2: Run** `pnpm vitest run src/core/share.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 3: Implement** `src/core/share.ts`:

```ts
import { z } from 'zod';
import { type Match, type MatchRecord, MatchRecordSchema, MatchSchema, type Player, PlayerSchema } from './model';

/** Links and QR codes up to this length carry the whole link in one code (DATA_MODEL §4). */
export const QR_LINK_MAX = 1400;
/** Longer data is split into parts of this many code characters. */
export const QR_CHUNK = 1100;

export type ShareScope = 'all' | 'match';

/** The shared data, version 2 (ADR 0005). The importer rejects everything else. */
export const SharePayloadSchema = z
  .object({
    app: z.literal('belot'),
    v: z.literal(2),
    at: z.number(),
    roster: z.array(PlayerSchema),
    stats: z.array(MatchRecordSchema),
    match: MatchSchema.nullable(),
  })
  .refine((p) => !p.match || p.match.seats.every((id) => p.roster.some((r) => r.id === id)), {
    message: 'match seats must be in the roster',
  });
export type SharePayload = z.infer<typeof SharePayloadSchema>;

export function buildPayload(
  state: { roster: readonly Player[]; stats: readonly MatchRecord[]; match: Match | null },
  scope: ShareScope,
  at: number,
): SharePayload {
  const roster = state.roster.map((p) => ({ ...p, photo: null }));
  const match = scope === 'match' ? state.match : null;
  if (!match) return { app: 'belot', v: 2, at, roster, stats: [...state.stats], match: null };
  const seated = new Set<string>(match.seats);
  return { app: 'belot', v: 2, at, roster: roster.filter((p) => seated.has(p.id)), stats: [], match };
}

const CODE = /^[zj][A-Za-z0-9_-]+$/;

/** The share code in pasted text: after `belot=` in a link, or the whole text as a bare code. */
export function extractCode(text: string): string | null {
  const inLink = text.match(/belot=([A-Za-z0-9_-]+)/);
  if (inLink?.[1]) return inLink[1];
  const bare = text.trim();
  return CODE.test(bare) ? bare : null;
}

export function shareLink(root: string, code: string): string {
  return `${root}#belot=${code}`;
}

/** What the QR codes show: the link itself, or numbered parts of the code (`sid`: 4 base36 chars). */
export function qrTexts(link: string, code: string, sid: string): string[] {
  if (link.length <= QR_LINK_MAX) return [link];
  const n = Math.ceil(code.length / QR_CHUNK);
  return Array.from({ length: n }, (_, i) => `BELOT|${sid}|${i + 1}|${n}|${code.slice(i * QR_CHUNK, (i + 1) * QR_CHUNK)}`);
}
```

- [ ] **Step 4: Run** `pnpm vitest run src/core/share.test.ts`, then `pnpm check`. Expected: PASS.

- [ ] **Step 5: Commit** `feat(core): share payload v2, code extraction and QR texts`.

---

### Task 2: Core import (merge, take, replace) and ADR 0013

**Files:**
- Create: `src/core/import.ts`, `src/core/import.test.ts`, `docs/adr/0013-import-merge-take-replace.md`
- Modify: `docs/Home.md` (list ADR 0013)

**Interfaces:**
- Consumes: `SharePayload` (Task 1), `Player`, `MatchRecord`, `Match`, `Seats`.
- Produces:
  - `type ImportMode = 'merge' | 'take' | 'replace'`
  - `applyImport(local: { roster: readonly Player[]; stats: readonly MatchRecord[]; match: Match | null }, data: SharePayload, mode: ImportMode): ImportResult`
  - `interface ImportResult { roster: Player[]; stats: MatchRecord[]; match: Match | null; players: number; addedMatches: number; tookMatch: boolean }`
  - `needsTakeConfirm(local: Match | null): boolean`, which is true when the local match is `playing` with ≥ 1 saved deal

- [ ] **Step 1: Write the failing tests** in `src/core/import.test.ts`. Cover every rule, and assert whole results:
  - **Merge by id:** the imported name and emoji win, and the local photo is kept when the imported photo is null.
  - **Merge by id, name collision:** the imported name equals another local player's name, so the local name is kept.
  - **Merge by name:** `'  иван '` matches local `'Иван'`. The ids are remapped, so an imported stats record's seats point at the local id, and the local player is unchanged.
  - **Merge adds new players** in the imported order, after the local ones.
  - **Merge stats:** a record whose `id` exists locally is skipped. New ones are appended with remapped seats. `addedMatches` counts only the new ones.
  - **Merge leaves the local match untouched** (same object), with `tookMatch: false`.
  - **Take:** the result's match is the imported one, with seats remapped to local ids after a by-name link (`tookMatch: true`).
  - **Take without an imported match:** acts as a merge (`tookMatch: false`).
  - **Replace:** roster and stats equal the imported ones exactly; the match is the imported match, or `null` when there is none.
  - **`players`** is `data.roster.length` in every mode.
  - **`needsTakeConfirm`:**
    - `null` → false
    - a playing match with no deals → false
    - a playing match with a deal → true (build one with `setContract` + `saveDeal` from `./match`)
    - an ended match → false

- [ ] **Step 2: Run** `pnpm vitest run src/core/import.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement** `src/core/import.ts`:

```ts
import type { Match, MatchRecord, Player, Seats } from './model';
import type { SharePayload } from './share';

export type ImportMode = 'merge' | 'take' | 'replace';

export interface ImportResult {
  roster: Player[];
  stats: MatchRecord[];
  match: Match | null;
  /** How many players the data carried. */
  players: number;
  /** How many leaderboard records were new. */
  addedMatches: number;
  tookMatch: boolean;
}

const norm = (s: string) => s.trim().toLocaleLowerCase('bg');

/** A playing match with saved deals is only replaced after the user confirms (ADR 0011, 0013). */
export function needsTakeConfirm(local: Match | null): boolean {
  return local !== null && local.status === 'playing' && local.games.length > 0;
}

/** DATA_MODEL §4 import, with the 2026-09-27 decisions (ADR 0013). */
export function applyImport(
  local: { roster: readonly Player[]; stats: readonly MatchRecord[]; match: Match | null },
  data: SharePayload,
  mode: ImportMode,
): ImportResult {
  if (mode === 'replace') {
    return {
      roster: [...data.roster],
      stats: [...data.stats],
      match: data.match,
      players: data.roster.length,
      addedMatches: data.stats.length,
      tookMatch: data.match !== null,
    };
  }

  const roster = [...local.roster];
  const idMap = new Map<string, string>();
  for (const p of data.roster) {
    const byId = roster.findIndex((r) => r.id === p.id);
    if (byId >= 0) {
      const current = roster[byId] as Player;
      const clash = roster.some((r) => r.id !== p.id && norm(r.name) === norm(p.name));
      roster[byId] = { ...p, name: clash ? current.name : p.name, photo: p.photo ?? current.photo };
      idMap.set(p.id, p.id);
      continue;
    }
    const byName = roster.findIndex((r) => norm(r.name) === norm(p.name));
    if (byName >= 0) {
      const current = roster[byName] as Player;
      idMap.set(p.id, current.id);
      if (p.photo) roster[byName] = { ...current, photo: p.photo, emoji: null };
      continue;
    }
    roster.push(p);
    idMap.set(p.id, p.id);
  }

  const remap = (seats: Seats): Seats =>
    seats.map((id) => idMap.get(id) ?? id) as unknown as Seats;

  const known = new Set(local.stats.map((r) => r.id));
  const added = data.stats.filter((r) => !known.has(r.id)).map((r) => ({ ...r, seats: remap(r.seats) }));

  const take = mode === 'take' && data.match !== null;
  return {
    roster,
    stats: [...local.stats, ...added],
    match: take && data.match ? { ...data.match, seats: remap(data.match.seats) } : local.match,
    players: data.roster.length,
    addedMatches: added.length,
    tookMatch: take,
  };
}
```

- [ ] **Step 4: Write `docs/adr/0013-import-merge-take-replace.md`.**
  - **Context:** DATA_MODEL §4's merge rules and the prototype's `applyImport`.
  - **Decisions:**
    - By-id update keeps the local name when it would duplicate another player's name.
    - Take-match confirms first under the ADR 0011 condition (`needsTakeConfirm`), reusing «Нов мач?» / «Текущият мач (a : b) ще бъде изтрит.» / «Започни нов мач» / «Отказ».
    - Replace clears the local match and takes the imported one if present.
    - Replace removes the photo blobs of players no longer in the roster.
    - No v1 import (ADR 0005).
  - **Consequences:**
    - Imported leaderboard names stay as recorded.
    - A by-name link can merge two different real people who share a name; that's accepted, as in the spec.
  - List the ADR in `docs/Home.md` after 0012.

- [ ] **Step 5: Run** `pnpm vitest run src/core/import.test.ts`, `pnpm docs:check`, then `pnpm check`. Expected: PASS.

- [ ] **Step 6: Commit** `feat(core): import merge, take and replace with id remap`.

---

### Task 3: Codec (platform layer)

**Files:**
- Create: `src/share/codec.ts`, `src/share/codec.test.ts`

**Interfaces:**
- Consumes: `SharePayload`, `SharePayloadSchema` (Task 1).
- Produces:
  - `encodeShare(payload: SharePayload): Promise<string>`, a code with prefix `z` or `j`
  - `decodeShare(code: string): Promise<unknown>`
  - `readShared(code: string): Promise<{ ok: true; data: SharePayload } | { ok: false }>`
  - `parseSharedFile(text: string): { ok: true; data: SharePayload } | { ok: false }`
  - `shareFileName(at: number): string`, e.g. `belot-2026-09-27.belot` (local date)

- [ ] **Step 1: Write the failing tests** (node environment, which has `CompressionStream`):
  - A round trip through `encodeShare` → `readShared` returns the same payload, and the code starts with `z` and matches `/^[zj][A-Za-z0-9_-]+$/`.
  - With `CompressionStream` removed (`vi.stubGlobal('CompressionStream', undefined)`), the code starts with `j` and still round-trips.
  - Compressed data is shorter than the `j` form for a 20-player payload.
  - `readShared` returns `{ ok: false }` for garbage (`'zzzz'`), for a valid code of `{ app: 'belot', v: 1 }`, and for invalid base64.
  - `parseSharedFile`:
    - accepts `JSON.stringify(payload)`
    - rejects `'{'`
    - rejects `JSON.stringify({ app: 'other' })`
  - `shareFileName(new Date(2026, 8, 27, 23, 30).getTime())` is `'belot-2026-09-27.belot'` (local date).

- [ ] **Step 2: Run** `pnpm vitest run src/share/codec.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement** `src/share/codec.ts`:

```ts
import { type SharePayload, SharePayloadSchema } from '../core/share';

const hasCompression = () => typeof CompressionStream !== 'undefined';

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** DATA_MODEL §4: JSON → deflate-raw (prefix `z`, or none with prefix `j`) → base64url. */
export async function encodeShare(payload: SharePayload): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  if (!hasCompression()) return `j${toBase64Url(bytes)}`;
  return `z${toBase64Url(await pipe(bytes, new CompressionStream('deflate-raw')))}`;
}

export async function decodeShare(code: string): Promise<unknown> {
  const kind = code[0];
  if (kind !== 'z' && kind !== 'j') throw new Error('unknown prefix');
  const bytes = fromBase64Url(code.slice(1));
  const raw = kind === 'z' ? await pipe(bytes, new DecompressionStream('deflate-raw')) : bytes;
  return JSON.parse(new TextDecoder().decode(raw));
}

export async function readShared(code: string): Promise<{ ok: true; data: SharePayload } | { ok: false }> {
  try {
    const parsed = SharePayloadSchema.safeParse(await decodeShare(code));
    return parsed.success ? { ok: true, data: parsed.data } : { ok: false };
  } catch {
    return { ok: false };
  }
}

export function parseSharedFile(text: string): { ok: true; data: SharePayload } | { ok: false } {
  try {
    const parsed = SharePayloadSchema.safeParse(JSON.parse(text));
    return parsed.success ? { ok: true, data: parsed.data } : { ok: false };
  } catch {
    return { ok: false };
  }
}

export function shareFileName(at: number): string {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `belot-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.belot`;
}
```


- [ ] **Step 4: Run** `pnpm vitest run src/share/codec.test.ts`, then `pnpm check`. Expected: PASS. `src/share` is a new platform folder. Add it to the layer table in `docs/Architecture/Overview.md`, with a mermaid node "src/share<br/>codec" → Core. It may import core only.

- [ ] **Step 5: Commit** `feat(share): payload codec with deflate-raw and base64url`.

---

### Task 4: Store action `importShared`

**Files:**
- Modify: `src/store/roster-actions.ts` (it owns roster, stats and photo cleanup), `src/store/roster-actions.test.ts`

**Interfaces:**
- Consumes: `applyImport`, `ImportMode`, `ImportResult` (Task 2), `SharePayload` (Task 1).
- Produces: `importShared(data: SharePayload, mode: ImportMode): ImportResult` on the store. It sets `roster`, `stats` and `match` in one `set`. It never confirms anything; the UI checks `needsTakeConfirm` first.

- [ ] **Step 1: Write the failing tests** (store built as in the existing `roster-actions.test.ts`, with `removed` photo ids):
  - Merge adds a new player and a new record. The store's roster, stats and returned counts match.
  - Take sets `match` to the remapped imported match.
  - Replace drops the photos of local players whose ids are gone (`removed` equals those photo ids). It doesn't drop the photo of a player kept by id. It sets `match` to the imported match or `null`.
  - Merge never drops photos.

- [ ] **Step 2: Run the test.** Expected: FAIL.

- [ ] **Step 3: Implement.** Add to `RosterActions`:

```ts
  /** Applies shared data (ADR 0013). Replace also drops the photos of players that are gone. */
  importShared(data: SharePayload, mode: ImportMode): ImportResult;
```

and in `rosterActions`:

```ts
    importShared(data, mode) {
      const { roster, stats, match } = get();
      const result = applyImport({ roster, stats, match }, data, mode);
      set({ roster: result.roster, stats: result.stats, match: result.match });
      if (mode === 'replace') {
        const kept = new Set(result.roster.map((p) => p.photo));
        for (const p of roster) if (p.photo && !kept.has(p.photo)) dropPhoto(p.photo);
      }
      return result;
    },
```

- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.

- [ ] **Step 5: Commit** `feat(store): import shared data`.

---

### Task 5: Share and import copy

**Files:**
- Modify: `src/core/strings.ts`
- Create: `src/features/share/copy.ts`, `src/features/share/copy.test.ts`

**Interfaces:**
- Produces:
  - `STRINGS.share` and `STRINGS.import` (below).
  - `shareSummary(scope: ShareScope, players: number, matches: number): string`
  - `importLines(data: SharePayload): string[]`
  - `importDone(result: ImportResult): string`

- [ ] **Step 1: Add the copy.** It's verbatim from the prototype's view model (~1299–1351, and markup ~575–640):

```ts
  share: {
    title: 'Сподели',
    scopes: [
      { value: 'all', label: 'Играчи + класация' },
      { value: 'match', label: 'Текущия мач' },
    ],
    // Not in the handoff: the accessible name of the scope switch.
    scopeLabel: 'Какво да се сподели',
    summaryMatch: 'Другият телефон продължава мача от същото място.',
    summaryAll: (players: number, matches: number) => `${players} играчи и ${matches} мача от класацията.`,
    part: (i: number, n: number) => `Част ${i} от ${n}`,
    hintSingle: 'Сканирайте с камерата на другия телефон или от „Внос“ в уеб страницата.',
    hintMulti: 'Дръжте екрана пред камерата — частите се сменят сами, докато се прочетат всички.',
    tooBig: 'Данните са твърде много за QR код — използвайте линк или файл.',
    preparing: 'Подготвям…',
    copyLink: 'Копирай линк',
    sendFile: 'Изпрати файл',
    copied: 'Линкът е копиран.',
    downloaded: 'Файлът е изтеглен.',
    close: 'Затвори',
    toImport: 'Внос от друг телефон',
    // Not in the handoff: the QR image's alt text.
    qrAlt: 'QR код',
  },
  import: {
    title: 'Внос',
    intro: 'Сканирайте QR кода от другия телефон, поставете линк или изберете файл. Работи и в браузър на компютър с камера.',
    or: 'или',
    placeholder: 'https://…#belot=…',
    // Not in the handoff: the accessible name of the paste field.
    pasteLabel: 'Линк или код',
    read: 'Прочети линка',
    file: 'Избери файл',
    found: 'Намерено',
    players: (n: number, names: string) => `${n} играчи: ${names}`,
    matches: (n: number) => `${n} завършени мача за класацията`,
    currentMatch: (teamA: string, a: number, b: number, teamB: string) => `Текущ мач: ${teamA} ${a} : ${b} ${teamB}`,
    merge: 'Добави към моите',
    take: 'Добави и продължи мача тук',
    replace: 'Замени всичките ми данни',
    replaceArmed: 'Натиснете пак — моите данни ще се изтрият',
    noCode: 'Не открих код в текста.',
    badCode: 'Линкът не може да се прочете.',
    badFile: 'Файлът не е от Белот.',
    done: (players: number, matches: number, tookMatch: boolean) =>
      `Готово: ${players} играчи${matches ? `, ${matches} мача в класацията` : ''}${tookMatch ? ', мачът продължава тук' : ''}.`,
    close: 'Затвори',
  },
```

  Mark the two "Not in the handoff" keys in `docs/Status.md` under Open product questions (Task 9 does the vault; note them now in the report).

- [ ] **Step 2: Write failing tests** for the helpers (node env), asserting exact strings:
  - `shareSummary('match', 4, 0)` → `summaryMatch`; `shareSummary('all', 5, 2)` → `'5 играчи и 2 мача от класацията.'`.
  - `importLines`:
    - The players line joins names with `', '`.
    - The matches line is present only when there are stats.
    - The current match line shows totals from core `totals(match)` (a match with one saved deal).
  - `importDone`:
    - With `{ players: 4, addedMatches: 0, tookMatch: true }` → `'Готово: 4 играчи, мачът продължава тук.'`.
    - With `{ players: 5, addedMatches: 2, tookMatch: false }` → `'Готово: 5 играчи, 2 мача в класацията.'`.

- [ ] **Step 3: Implement** `src/features/share/copy.ts` with core `totals` from `src/core/match.ts`. Run the tests and `pnpm check`. Commit `feat(share): share and import copy`.

---

### Task 6: Share sheet

**Files:**
- Create: `src/features/share/qr.ts`, `src/features/share/qr.test.ts`, `src/features/share/ShareSheet.tsx`, `src/features/share/share-sheet.test.tsx`
- Modify: `package.json` (`pnpm add qrcode-generator@2.0.4`), `src/routes/home.tsx`, `src/features/table/TableHeader.tsx`, `src/routes/table.tsx`

**Interfaces:**
- Consumes:
  - `buildPayload`, `shareLink`, `qrTexts`, `ShareScope` (Task 1)
  - `encodeShare`, `shareFileName` (Task 3)
  - `shareSummary` and `STRINGS.share` (Task 5)
  - `appStore`/`useAppStore`, `Segmented`, `Sheet`, `SheetActions`, `Button`
- Produces:
  - `qrDataUrl(text: string): string | null`, a GIF data URL at cell size 6 with margin 0, or null when the text doesn't fit a QR.
  - `ShareSheet` props `{ open: boolean; onClose: () => void; defaultScope: ShareScope; allowMatch: boolean; onImport: () => void }`. It is default-exported for `lazy()`, and `onImport` means "close me and open import".

- [ ] **Step 1: `qr.ts` with tests.**

```ts
import qrcode from 'qrcode-generator';

/** A QR code image for `text` (error correction L), or null when it can't hold that much. */
export function qrDataUrl(text: string): string | null {
  try {
    const q = qrcode(0, 'L');
    q.addData(text);
    q.make();
    return q.createDataURL(6, 0);
  } catch {
    return null;
  }
}
```

  Tests:
  - A short link gives a string starting `data:image/gif;base64,`.
  - `'x'.repeat(5000)` gives `null`.

- [ ] **Step 2: Write the failing sheet tests** (`share-sheet.test.tsx`, happy-dom). Render `ShareSheet` directly with `open` in a small wrapper; seed the store through actions.
  - **Scope `all`:**
    - Shows «Сподели», the summary `'4 играчи и 0 мача от класацията.'`, and after `findBy` an `img` named «QR код».
    - The Segmented «Какво да се сподели» is absent when `allowMatch` is false.
  - **Scope `match`** (`allowMatch`, `defaultScope: 'match'`): the Segmented shows both options with «Текущия мач» checked, and the summary is `summaryMatch`.
  - **Many parts:**
    - Seed 40 players, so the link exceeds 1400.
    - Shows «Част 1 от N» and the multi hint.
    - With `vi.useFakeTimers({ shouldAdvanceTime: true })`, advancing 900 ms shows «Част 2 от N».
  - **«Копирай линк»:**
    - With `navigator.share` undefined and `navigator.clipboard.writeText` mocked, it writes a string matching `/^http:\/\/localhost(:\d+)?\/#belot=z/` and shows «Линкът е копиран.».
    - With `navigator.share` mocked, it's called with `{ title: 'Белот', url }` and the status shows.
  - **«Изпрати файл»:**
    - Without `canShare`, it creates an object URL (`URL.createObjectURL` mocked) and clicks a download anchor named `belot-YYYY-MM-DD.belot`, then shows «Файлът е изтеглен.».
    - With `canShare` returning true, `navigator.share` gets `{ files: [File], title: 'Белот' }` and no status shows.
  - **«Внос от друг телефон»** calls `onImport`; «Затвори» calls `onClose`.

- [ ] **Step 3: Implement `ShareSheet.tsx`.** Follow mockup 15 and prototype markup ~575–605.
  - `Sheet` titled `S.title`, with the summary as the subtitle.
  - A `Segmented` with `S.scopes` (label `S.scopeLabel`), only when `allowMatch`. Scope state starts at `defaultScope` and resets each time the sheet opens (content mounts only while open).
  - **Build:**
    - In an effect keyed on the scope:
      1. `buildPayload(state, scope, Date.now())`
      2. `encodeShare`
      3. `link = shareLink(location.origin + import.meta.env.BASE_URL, code)`
      4. `texts = qrTexts(link, code, Date.now().toString(36).slice(-4))`
      5. `images = texts.map(qrDataUrl)`
    - If any image is null, show `S.tooBig`. While building, show `S.preparing`.
    - Ignore a stale result with an `active` flag in the effect cleanup.
  - **QR block:** a white 220px square (radius 20, padding 12) holding a 196px `<img alt={S.qrAlt}>` with `image-rendering: pixelated`.
    - With several images: «Част i от n» in team-a (15/900) and a `setInterval` of 900 ms advancing the frame, cleared on cleanup.
    - The hint (13/700 muted, centred): `hintSingle` or `hintMulti`.
  - **Buttons** «Копирай линк» / «Изпрати файл» (2 columns, secondary):
    - Copy: `navigator.share` if present, else `navigator.clipboard.writeText`; on a share error, fall back to the clipboard. Status `S.copied`.
    - File: `new File([JSON.stringify(payload)], shareFileName(Date.now()), { type: 'application/json' })`. If `navigator.canShare?.({ files: [file] })`, share it and set no status; a share rejection (user cancelled) is ignored. Otherwise download through an anchor with `URL.createObjectURL`, revoke the URL afterwards, and set status `S.downloaded`.
  - **Status line:** 14/800 team-a, `role="status"`.
  - **`SheetActions`:** «Затвори» (secondary) + «Внос от друг телефон» (primary), grid `1fr 1.6fr`.
  - No photo checkbox (6b).

- [ ] **Step 4: Wire it.**
  - **Home:** «Сподели / Внос» is enabled and opens `ShareSheet` (`defaultScope: 'all'`, `allowMatch: match?.status === 'playing'`), loaded with `const ShareSheet = lazy(() => import('../features/share/ShareSheet'))` inside `<Suspense fallback={null}>`, rendered only while open.
  - **Table:** «Сподели» in `TableHeader` is enabled and gets an `onShare` prop. `table.tsx` owns `shareOpen` (`defaultScope: 'match'`, `allowMatch: true`), lazy the same way.
  - For now `onImport` closes the share sheet and does nothing else. Task 7 opens the import sheet.
  - Update the existing tests that assert the share buttons are disabled (`grep -rn "S.share\|home.share\|table.share" src --include=*.test.tsx`).

- [ ] **Step 5: Run** the tests and `pnpm check`. Expected: PASS. Confirm with `pnpm build` that `qrcode-generator` sits in a lazy chunk, not the entry chunk: grep `dist/assets/index-*.js` for `createDataURL` and expect no match.

- [ ] **Step 6: Commit** `feat(share): share sheet with link, QR and file`.

---

### Task 7: Import sheet

**Files:**
- Create: `src/features/share/ImportSheet.tsx`, `src/features/share/import-sheet.test.tsx`
- Modify: `src/routes/home.tsx`, `src/routes/table.tsx`

**Interfaces:**
- Consumes:
  - `extractCode` (Task 1)
  - `needsTakeConfirm`, `ImportResult` (Task 2)
  - `readShared`, `parseSharedFile` (Task 3)
  - `importShared` (Task 4)
  - `importLines`, `importDone`, `STRINGS.import`, `STRINGS.setup.replace*` (Task 5)
  - `resumePath` (`src/app/resume.ts`)
- Produces: `ImportSheet` props `{ open: boolean; onClose: () => void; initialCode?: string | null }`, default-exported for `lazy()`. When `initialCode` is set, it's read as soon as the sheet opens.

- [ ] **Step 1: Write the failing tests** (`import-sheet.test.tsx`). Build real codes with `encodeShare(buildPayload(...))` from a second, fake data set.
  - Shows «Внос», the intro, «или», the textarea (label «Линк или код», placeholder) and «Прочети линка».
  - **Reading:**
    - Pasting a text with no code and pressing «Прочети линка» shows «Не открих код в текста.».
    - Pasting `http://x/#belot=zzzz` shows «Линкът не може да се прочете.».
    - Pasting a valid link shows «Намерено» and the lines from `importLines`, plus «Добави към моите». «Добави и продължи мача тук» shows only when the data has a match.
  - **«Добави към моите»:** the store roster grows; the message is `importDone(...)`; the preview is gone.
  - **«Избери файл»:**
    - Uploading (`userEvent.upload`) a `.belot` file with `JSON.stringify(payload)` shows the preview.
    - A file with `{}` shows «Файлът не е от Белот.».
  - **Replace:**
    - The first press of «Замени всичките ми данни» changes the label to the armed text, and the store is unchanged.
    - The second press replaces everything, and the local match is gone when the data has none.
  - **Take:**
    - With no local match: it applies at once and navigates to `/table` (render through `renderRoute('/')` and open the sheet from Home; assert `router.state.location.pathname`).
    - With a local playing match with a saved deal: it shows an inline confirmation instead of applying. The body is `STRINGS.setup.replaceBody(a, b)` with the local totals, with «Започни нов мач» / «Отказ». «Отказ» returns to the preview with the store unchanged; «Започни нов мач» applies and navigates.
  - **`initialCode`:** a valid code shows the preview without pressing anything.

- [ ] **Step 2: Implement `ImportSheet.tsx`.** Follow mockup 16 and prototype markup ~607–638.
  - The intro is the `Sheet` subtitle.
  - **Paste area:**
    - «или» (13/800 uppercase muted).
    - A 3-row textarea (`bg-bg`, border `line`, radius 16).
    - Two secondary buttons in 2 columns: «Прочети линка», and «Избери файл», a `<label>` styled with `buttonClass('secondary', 'md')` wrapping a hidden `<input type="file" accept=".belot,.json,application/json">`. Reset its value after reading.
  - **Errors:** 14/800 team-b.
  - **Preview card** (`bg-s2`, radius 18, padding 14): «Намерено» 16/900 and the lines at 14/700.
  - **Actions:**
    - «Добави към моите»: primary, 54px (`size="lg"` is fine).
    - «Добави и продължи мача тук»: secondary, only when there's a match.
    - «Замени…»: `dangerText`, armed on the first press.
  - **Done:** the message (14/800 team-a, `role="status"`). The preview hides after applying.
  - **Take flow:**
    - If `needsTakeConfirm(localMatch)`, set a `confirming` state that shows the inline confirmation in place of the action buttons.
    - After take (or replace with a match), close the sheet and `navigate(resumePath(result.match) ?? '/')`.
  - **`SheetActions`:** «Затвори» (secondary), full width.
  - **`initialCode`:** read in an effect on open, with an `active` flag.

- [ ] **Step 3: Wire it.**
  - Home and table own an `importOpen` state and render the lazy `ImportSheet` while it's open.
  - The share sheet's `onImport` becomes `() => { setShareOpen(false); setImportOpen(true); }`, so the sheets are sequenced.
  - Add a Home test: open «Сподели / Внос» → «Внос от друг телефон» → the import sheet shows and the share sheet is gone.

- [ ] **Step 4: Run** the tests and `pnpm check`. Expected: PASS.

- [ ] **Step 5: Commit** `feat(share): import sheet with paste, file, merge, take and replace`.

---

### Task 8: Open import from a `#belot=` link

**Files:**
- Create: `src/app/share-link.ts`, `src/app/share-link.test.ts`
- Modify: `src/main.tsx`, `src/routes/home.tsx`, `src/routes/home.test.tsx`

**Interfaces:**
- Consumes: `extractCode` (Task 1), `ImportSheet` `initialCode` (Task 7).
- Produces: `startPath(location: { pathname: string; hash: string }, match: Match | null): string | null`. It returns `/?import=<code>` when the hash holds `belot=<code>`, `resumePath(match)` when the pathname is `/`, and `null` otherwise.

- [ ] **Step 1: Write the failing tests** for `startPath`:
  - hash `#belot=zAB` at `/` → `/?import=zAB`, even with a playing match (import wins over resume)
  - hash `#belot=zAB` at `/table` → `/?import=zAB`
  - no hash at `/` with a playing match → `/table`
  - no hash at `/stats` → `null`
  - an empty `#belot=` → falls back to the resume rule

- [ ] **Step 2: Implement.** `src/app/share-link.ts`:

```ts
import { extractCode } from '../core/share';
import type { Match } from '../core/model';
import { resumePath } from './resume';

/** Where the app goes on start: a `#belot=` link opens import (DATA_MODEL §4), else resume (ADR 0011). */
export function startPath(location: { pathname: string; hash: string }, match: Match | null): string | null {
  const code = location.hash.includes('belot=') ? extractCode(location.hash) : null;
  if (code) return `/?import=${encodeURIComponent(code)}`;
  return location.pathname === '/' ? resumePath(match) : null;
}
```

  In `main.tsx`, replace the resume block with:

```ts
  const path = startPath(window.location, appStore.getState().match);
  if (window.location.hash.includes('belot=')) history.replaceState(null, '', window.location.pathname + window.location.search);
  if (path) void router.navigate(path, { replace: true });
```

  In `home.tsx`:
  - Read `const [params, setParams] = useSearchParams()` and `const pendingCode = params.get('import')`.
  - When it's set, render the import sheet open with `initialCode={pendingCode}`.
  - On close, clear it with `setParams({}, { replace: true })`.
  - Keep `importOpen` for the manual path; the sheet is open when `importOpen || pendingCode !== null`.

- [ ] **Step 3: Add a Home test.** `renderRoute('/?import=' + code)` shows the import preview. Closing it leaves the URL at `/` with no search.

- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.

- [ ] **Step 5: Commit** `feat(share): open import from a #belot= link`.

---

### Task 9: Browser check and vault update (controller)

- [ ] **Step 1: Browser check at 390×844 and 1280×720.** Use two isolated browser contexts: two Playwright pages on different ports of the dev server, each with its own IndexedDB. Seed through the real UI only.
  1. On A, register 4 players, play 2 deals, and open «Сподели» on the table. Compare with mockup 15: the QR shows, and «Копирай линк» gives a link.
  2. On B (empty), open the link. The import sheet opens with the preview and the hash is cleared. «Добави и продължи мача тук» lands on `/table` with the same score and deal number.
  3. On B, with the match playing and a saved deal, import again with take. The confirmation shows.
  4. From Home on A, share «Играчи + класация» with 40 players, so the QR has several parts. «Част i от n» cycles every ~0.9 s.
  5. «Изпрати файл» downloads `belot-YYYY-MM-DD.belot`. Choosing it in B's «Избери файл» shows the preview. Compare with mockup 16.
  6. Replace needs two presses and ends with the imported data only.
  7. The console has no errors except the favicon 404.
- [ ] **Step 2: Update the vault.**
  - **Status:**
    - Done: 6a.
    - Next: the 6b plan (camera scanner, multi-part assembly, photos in the file).
    - Open questions: the not-in-handoff labels «Какво да се сподели», «Линк или код», «QR код».
  - **Backlog:** remove the done Phase 6 items. Keep the scanner and photo lines under a "Phase 6b" heading.
  - **Architecture/Overview:** add `src/share` and `src/features/share`, the lazy sheets, and the `#belot=` start path.
  - **Roadmap:** mark 6 as "6a ✅, 6b next".
  - Tick this plan.
  - Run `pnpm docs:check && pnpm check`, then commit `docs: phase 6a vault update`.
