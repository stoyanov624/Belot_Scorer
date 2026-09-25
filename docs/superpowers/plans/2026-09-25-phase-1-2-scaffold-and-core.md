# Phase 1–2: Scaffold & Core Domain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Vite + React 19 app that boots, with fully tested pure game logic in `src/core` (rules, declarations, resolution, deal scoring, match/series lifecycle, roster/seating, leaderboard) that matches GAME_RULES.md and the HTML prototype.

**Architecture:** One Vite SPA (ADR 0001). All game logic lives in `src/core` as pure functions over plain data validated by Zod schemas (ADR 0002). `src/core` may not import React or browser APIs. It is type-checked separately against a lib without `dom`, and Biome blocks UI imports there. No UI work in this phase beyond a placeholder page.

**Tech Stack:** pnpm, Vite, React 19 + React Compiler, TypeScript strict (+ `noUncheckedIndexedAccess`), Tailwind CSS v4 (`@tailwindcss/vite`), Zod v4, Vitest, Biome.

**Spec:** `docs/design-handoff/GAME_RULES.md`, `docs/design-handoff/DATA_MODEL.md` §1, `CONTEXT.md`, `docs/adr/0001–0005`, `docs/superpowers/plans/2026-09-25-roadmap.md`. The reference logic is `seatOptions`, `resolve`, `calc`, `saveGame`, `recordMatch`, `leaderboard` in `docs/design-handoff/prototype/Belot v3.dc.html` (lines ~695–1117).

## Global Constraints

- `src/core/**` imports only `zod` and other `src/core` modules. No `Date.now()`, `Math.random()` or id generation inside core: ids and dates are parameters.
- No barrel `index.ts` files.
- Team A = seats 0 (North) and 2 (South). Team B = seats 1 (East) and 3 (West). `teamOf(seat) = seat % 2 === 0 ? 'A' : 'B'`.
- Deal order `[0, 3, 2, 1]`. Dealer = `DEAL_ORDER[games.length % 4]`.
- Points are rounded (as written on paper). Max card points: color 16, all trumps 26, no trumps 13. No trumps ×2. Capot = max + 9. Target 151.
- Declaration points: Belot 2, Tierce 2, Quarte 5, Quinte 10, Four-of-a-kind Q/K/10/A 10, 9 → 15, J → 20. A four-of-a-kind with no rank yet counts 10.
- Core returns **codes**, not Bulgarian text. UI strings come in Phase 5.
- Commit messages are Conventional Commits and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File Structure

```
package.json, pnpm-lock.yaml, vite.config.ts, biome.json, index.html
tsconfig.json, tsconfig.app.json, tsconfig.node.json   (from create-vite, tightened)
tsconfig.core.json                                     core-only typecheck, lib without dom
src/main.tsx, src/App.tsx, src/index.css               placeholder page + Tailwind
src/core/model.ts          Zod schemas + inferred types (Player, Declaration, Deal, Match, MatchRecord…)
src/core/rules.ts          RulesConfig, DEFAULT_RULES, constants, teamOf, declPoints, validTops
src/core/declarations.ts   allowedDeclarations (what a seat may still declare)
src/core/resolve.ts        resolve (which sequences / fours of a kind count)
src/core/score.ts          scoreDeal (verdict, match points, hanging points)
src/core/match.ts          match + series lifecycle and selectors
src/core/roster.ts         player name validation, roster ops, seat draft
src/core/leaderboard.ts    players / pairs rankings from match records
src/core/testing/golden-deals.ts   golden deal cases (shared by score + parity tests)
src/core/*.test.ts         unit tests beside each module
test/prototype/legacy.js           prototype logic extracted verbatim (parity only)
test/prototype/parity.test.ts      runs golden cases through both implementations
docs/golden-deals.md               golden cases as a table for the product owner to review
```

---

### Task 1: Scaffold the Vite app with tooling and the core boundary

**Files:**
- Create: `package.json`, `vite.config.ts`, `biome.json`, `tsconfig.core.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/core/rules.ts` (temporary stub, replaced in Task 2)
- Modify: `tsconfig.app.json`, `.gitignore`
- Delete (template leftovers): `eslint.config.js`, `src/App.css`, `src/assets/`, `public/vite.svg`

**Interfaces:**
- Produces: scripts `pnpm dev | build | lint | format | typecheck | test | check`. Later tasks run `pnpm test` and `pnpm check`.

- [ ] **Step 1: Generate the template into a temporary folder.** The repo root already has `docs/` and `CONTEXT.md`. **Do not** run create-vite in `.`: its "remove existing files" prompt would delete them.

```bash
cd "/Users/ivaylo.stoyanov/Belot Scorer"
pnpm create vite@latest .scaffold --template react-ts
rsync -a --exclude .gitignore .scaffold/ ./
rm -rf .scaffold eslint.config.js src/App.css src/assets public/vite.svg
```

- [ ] **Step 2: Swap ESLint for Biome and add the dependencies**

```bash
pnpm remove eslint @eslint/js eslint-plugin-react-hooks eslint-plugin-react-refresh globals typescript-eslint
pnpm add zod
pnpm add -D @biomejs/biome vitest tailwindcss @tailwindcss/vite babel-plugin-react-compiler
pnpm install
```

If `pnpm remove` complains that a package isn't installed, drop that name and rerun.

- [ ] **Step 3: Write `vite.config.ts`**

```ts
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react({ babel: { plugins: ['babel-plugin-react-compiler'] } }), tailwindcss()],
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    environment: 'node',
  },
});
```

If the installed `@vitejs/plugin-react` major version no longer accepts `babel.plugins`, follow its README section "React Compiler" instead. Verify with context7 (`/vitejs/vite-plugin-react`).

- [ ] **Step 4: Tighten `tsconfig.app.json` and add `tsconfig.core.json`.** In `tsconfig.app.json` `compilerOptions`, make sure these are present: `"strict": true`, `"noUncheckedIndexedAccess": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`. Add `"test"` to its `include` array next to `"src"`. Then create `tsconfig.core.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "types": [],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src/core/**/*.ts"],
  "exclude": ["src/core/**/*.test.ts"]
}
```

Without the `dom` lib, any `window`, `document`, `localStorage` or `CompressionStream` in core fails typecheck.

- [ ] **Step 5: Write `biome.json`**

```json
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "includes": ["**", "!docs/**", "!dist/**", "!test/prototype/legacy.js"] },
  "formatter": { "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "javascript": { "formatter": { "quoteStyle": "single", "semicolons": "always" } },
  "linter": { "rules": { "recommended": true } },
  "overrides": [
    {
      "includes": ["src/core/**"],
      "linter": {
        "rules": {
          "style": {
            "noRestrictedImports": {
              "level": "error",
              "options": {
                "paths": {
                  "react": "src/core must stay platform-free (ADR 0001).",
                  "react-dom": "src/core must stay platform-free (ADR 0001).",
                  "react-dom/client": "src/core must stay platform-free (ADR 0001).",
                  "react-router": "src/core must stay platform-free (ADR 0001).",
                  "zustand": "src/core must stay platform-free (ADR 0001).",
                  "idb-keyval": "src/core must stay platform-free (ADR 0001)."
                }
              }
            }
          }
        }
      }
    }
  ]
}
```

If Biome reports a schema error, run `pnpm biome migrate --write` and keep the override.

- [ ] **Step 6: Scripts in `package.json`.** Replace the `scripts` block:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "lint": "biome check .",
  "format": "biome check --write .",
  "typecheck": "tsc -b && tsc -p tsconfig.core.json",
  "test": "vitest run",
  "test:watch": "vitest",
  "check": "pnpm lint && pnpm typecheck && pnpm test"
}
```

- [ ] **Step 7: Placeholder page.** `src/index.css`:

```css
@import "tailwindcss";
```

`src/App.tsx`:

```tsx
export function App() {
  return <main className="p-8 text-4xl font-black">Белот</main>;
}
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

In `index.html`, set `<html lang="bg">` and `<title>Белот</title>`, and remove the `vite.svg` favicon link.

- [ ] **Step 8: A stub core module and a smoke test** so `tsc -p tsconfig.core.json` has input and Vitest has a test. `src/core/rules.ts`:

```ts
export const DEAL_ORDER = [0, 3, 2, 1] as const;
```

`src/core/rules.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEAL_ORDER } from './rules';

describe('DEAL_ORDER', () => {
  it('rotates counter-clockwise N → W → S → E', () => {
    expect(DEAL_ORDER).toEqual([0, 3, 2, 1]);
  });
});
```

- [ ] **Step 9: Run everything.** Run `pnpm format && pnpm check && pnpm build`. Expected: Biome clean, both typechecks pass, 1 test passes, `dist/` is built.

- [ ] **Step 10: Prove the boundary fails when it should.** Temporarily append to `src/core/rules.ts`:

```ts
import { useState } from 'react';
export const leak = [useState, window.location];
```

Run `pnpm lint` (expect a `noRestrictedImports` error on `react`), then `pnpm exec tsc -p tsconfig.core.json` (expect `Cannot find name 'window'`). **Revert the two lines** and rerun `pnpm check`, which should pass.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold vite react app with biome, vitest, tailwind v4" -m "Core boundary enforced by tsconfig.core.json (no dom lib) and Biome noRestrictedImports." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Domain model schemas and rules constants

**Files:**
- Create: `src/core/model.ts`, `src/core/model.test.ts`
- Modify: `src/core/rules.ts` (replace the stub), `src/core/rules.test.ts`

**Interfaces:**
- Produces (`model.ts`): schemas `SeatSchema, TeamSchema, ContractKeySchema, DeclKeySchema, CardSchema, KareRankSchema, PlayerSchema, DeclarationSchema, RecordedDeclarationSchema, VerdictSchema, DealSchema, BestOfSchema, MatchSchema, MatchRecordSchema` and types `Seat, Team, ContractKey, DeclKey, Card, KareRank, Player, Declaration, RecordedDeclaration, DeclInput, Verdict, Deal, BestOf, Match, MatchStatus, MatchRecord, Seats`.
- Produces (`rules.ts`): `RulesConfig, DEFAULT_RULES, ContractKind, CONTRACT_KIND, RED_CONTRACTS, CARDS, KARE_RANKS, SEQ_LENGTH, CARDS_USED, MAX_BELOTS, MAX_KARES, DEAL_ORDER, teamOf(seat), otherTeam(team), isSequence(key), seqLength(key), validTops(key), declPoints(decl, rules?)`.

- [ ] **Step 1: Write the failing tests.** `src/core/rules.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  DEAL_ORDER,
  DEFAULT_RULES,
  declPoints,
  otherTeam,
  seqLength,
  teamOf,
  validTops,
} from './rules';

describe('DEAL_ORDER', () => {
  it('rotates counter-clockwise N → W → S → E', () => {
    expect(DEAL_ORDER).toEqual([0, 3, 2, 1]);
  });
});

describe('teams', () => {
  it('puts North/South in A and East/West in B', () => {
    expect([0, 1, 2, 3].map((s) => teamOf(s as 0 | 1 | 2 | 3))).toEqual(['A', 'B', 'A', 'B']);
    expect(otherTeam('A')).toBe('B');
    expect(otherTeam('B')).toBe('A');
  });
});

describe('declPoints', () => {
  it('scores fixed declarations', () => {
    const p = (key: 'belot' | 'terca' | 'kvarta' | 'kvinta') => declPoints({ key, rank: null });
    expect([p('belot'), p('terca'), p('kvarta'), p('kvinta')]).toEqual([2, 2, 5, 10]);
  });
  it('scores four-of-a-kind by rank, 10 while unknown', () => {
    expect(declPoints({ key: 'kare', rank: null })).toBe(10);
    expect(declPoints({ key: 'kare', rank: 'Q' })).toBe(10);
    expect(declPoints({ key: 'kare', rank: '9' })).toBe(15);
    expect(declPoints({ key: 'kare', rank: 'J' })).toBe(20);
  });
  it('reads points from the rules config', () => {
    const rules = { ...DEFAULT_RULES, declPoints: { ...DEFAULT_RULES.declPoints, belot: 3 } };
    expect(declPoints({ key: 'belot', rank: null }, rules)).toBe(3);
  });
});

describe('sequences', () => {
  it('knows lengths', () => {
    expect([seqLength('terca'), seqLength('kvarta'), seqLength('kvinta'), seqLength('kare')]).toEqual([3, 4, 5, 0]);
  });
  it('lists valid top cards', () => {
    expect(validTops('terca')).toEqual(['9', '10', 'J', 'Q', 'K', 'A']);
    expect(validTops('kvarta')).toEqual(['10', 'J', 'Q', 'K', 'A']);
    expect(validTops('kvinta')).toEqual(['J', 'Q', 'K', 'A']);
    expect(validTops('belot')).toEqual([]);
  });
});
```

`src/core/model.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MatchSchema, PlayerSchema } from './model';

describe('model schemas', () => {
  it('accepts a valid player and trims the name', () => {
    expect(PlayerSchema.parse({ id: 'abc', name: '  Иван ', emoji: '🍺', photo: null }).name).toBe('Иван');
  });
  it('rejects an empty player name', () => {
    expect(PlayerSchema.safeParse({ id: 'abc', name: '   ', emoji: null, photo: null }).success).toBe(false);
  });
  it('rejects a seat outside 0–3 and a bestOf outside 1/3/5/7', () => {
    const base = {
      seats: ['a', 'b', 'c', 'd'], teamA: 'Ние', teamB: 'Вие', games: [], current: [],
      contract: null, caller: null, hang: 0, bestOf: 3, series: { A: 0, B: 0 }, status: 'playing',
    };
    expect(MatchSchema.safeParse(base).success).toBe(true);
    expect(MatchSchema.safeParse({ ...base, caller: 4 }).success).toBe(false);
    expect(MatchSchema.safeParse({ ...base, bestOf: 2 }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run them to see them fail.** Run `pnpm test`. Expected: FAIL, because `./model` isn't found and `declPoints`/`teamOf`… aren't exported.

- [ ] **Step 3: Implement `src/core/model.ts`**

```ts
import { z } from 'zod';

export const SeatSchema = z.literal([0, 1, 2, 3]);
export type Seat = z.infer<typeof SeatSchema>;

export const TeamSchema = z.enum(['A', 'B']);
export type Team = z.infer<typeof TeamSchema>;

export const ContractKeySchema = z.enum(['clubs', 'diamonds', 'hearts', 'spades', 'nt', 'at']);
export type ContractKey = z.infer<typeof ContractKeySchema>;

export const DeclKeySchema = z.enum(['belot', 'terca', 'kvarta', 'kvinta', 'kare']);
export type DeclKey = z.infer<typeof DeclKeySchema>;

/** Low → high. */
export const CardSchema = z.enum(['7', '8', '9', '10', 'J', 'Q', 'K', 'A']);
export type Card = z.infer<typeof CardSchema>;

/** Weakest → strongest four-of-a-kind. */
export const KareRankSchema = z.enum(['Q', 'K', '10', 'A', '9', 'J']);
export type KareRank = z.infer<typeof KareRankSchema>;

const id = z.string().min(1);
const points = z.number().int();

export const PlayerSchema = z.object({
  id,
  name: z.string().trim().min(1),
  emoji: z.string().nullable(),
  /** Photo id in the photo store (ADR 0003), never a data URL. */
  photo: z.string().nullable(),
});
export type Player = z.infer<typeof PlayerSchema>;

export const DeclarationSchema = z.object({
  id,
  seat: SeatSchema,
  key: DeclKeySchema,
  top: CardSchema.nullable(),
  rank: KareRankSchema.nullable(),
});
export type Declaration = z.infer<typeof DeclarationSchema>;

export const RecordedDeclarationSchema = DeclarationSchema.omit({ id: true }).extend({
  valid: z.boolean(),
});
export type RecordedDeclaration = z.infer<typeof RecordedDeclarationSchema>;

/** What resolution and scoring need from a declaration, current or recorded. */
export type DeclInput = Pick<Declaration, 'seat' | 'key' | 'top' | 'rank'>;

export const VerdictSchema = z.enum(['ok', 'inside', 'hang']);
export type Verdict = z.infer<typeof VerdictSchema>;

export const DealSchema = z.object({
  a: points,
  b: points,
  contract: ContractKeySchema,
  caller: SeatSchema,
  verdict: VerdictSchema,
  capo: TeamSchema.nullable(),
  raw: z.tuple([points, points]),
  hangTo: TeamSchema.nullable(),
  prevHang: points,
  decls: z.array(RecordedDeclarationSchema),
});
export type Deal = z.infer<typeof DealSchema>;

export const BestOfSchema = z.literal([1, 3, 5, 7]);
export type BestOf = z.infer<typeof BestOfSchema>;

const SeatsSchema = z.tuple([id, id, id, id]);
export type Seats = z.infer<typeof SeatsSchema>;

export const MatchStatusSchema = z.enum(['playing', 'ended']);
export type MatchStatus = z.infer<typeof MatchStatusSchema>;

export const MatchSchema = z.object({
  seats: SeatsSchema,
  teamA: z.string(),
  teamB: z.string(),
  games: z.array(DealSchema),
  current: z.array(DeclarationSchema),
  contract: ContractKeySchema.nullable(),
  caller: SeatSchema.nullable(),
  hang: points,
  bestOf: BestOfSchema,
  series: z.object({ A: points, B: points }),
  status: MatchStatusSchema,
});
export type Match = z.infer<typeof MatchSchema>;

export const MatchRecordSchema = z.object({
  id,
  date: z.number(),
  seats: SeatsSchema,
  names: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  teamA: z.string(),
  teamB: z.string(),
  totalA: points,
  totalB: points,
  games: z.array(z.object({ decls: z.array(RecordedDeclarationSchema) })),
});
export type MatchRecord = z.infer<typeof MatchRecordSchema>;
```

- [ ] **Step 4: Implement `src/core/rules.ts`** (replacing the stub)

```ts
import {
  type Card,
  CardSchema,
  type ContractKey,
  type DeclKey,
  type KareRank,
  KareRankSchema,
  type Seat,
  type Team,
} from './model';

export type ContractKind = 'color' | 'nt' | 'at';

export interface RulesConfig {
  targetScore: number;
  declPoints: Record<Exclude<DeclKey, 'kare'>, number>;
  karePoints: Record<KareRank, number>;
  maxCardPoints: Record<ContractKind, number>;
  capoBonus: number;
  ntMultiplier: number;
}

export const DEFAULT_RULES: RulesConfig = {
  targetScore: 151,
  declPoints: { belot: 2, terca: 2, kvarta: 5, kvinta: 10 },
  karePoints: { Q: 10, K: 10, '10': 10, A: 10, '9': 15, J: 20 },
  maxCardPoints: { color: 16, at: 26, nt: 13 },
  capoBonus: 9,
  ntMultiplier: 2,
};

export const CONTRACT_KIND: Record<ContractKey, ContractKind> = {
  clubs: 'color',
  diamonds: 'color',
  hearts: 'color',
  spades: 'color',
  nt: 'nt',
  at: 'at',
};

export const RED_CONTRACTS: ReadonlySet<ContractKey> = new Set(['diamonds', 'hearts']);

export const CARDS: readonly Card[] = CardSchema.options;
export const KARE_RANKS: readonly KareRank[] = KareRankSchema.options;

export const SEQ_LENGTH = { terca: 3, kvarta: 4, kvinta: 5 } as const;
/** Cards of a player's eight consumed by each declaration. Belot reuses cards. */
export const CARDS_USED: Record<DeclKey, number> = { belot: 0, terca: 3, kvarta: 4, kvinta: 5, kare: 4 };
export const MAX_BELOTS: Record<Exclude<ContractKind, 'nt'>, number> = { color: 1, at: 4 };
export const MAX_KARES = 6;

export const DEAL_ORDER = [0, 3, 2, 1] as const satisfies readonly Seat[];

export const teamOf = (seat: Seat): Team => (seat % 2 === 0 ? 'A' : 'B');
export const otherTeam = (team: Team): Team => (team === 'A' ? 'B' : 'A');

export const isSequence = (key: DeclKey): key is keyof typeof SEQ_LENGTH => key in SEQ_LENGTH;
export const seqLength = (key: DeclKey): number => (isSequence(key) ? SEQ_LENGTH[key] : 0);

/** Top cards a sequence of this kind can end on: tierce from 9, quarte from 10, quinte from J. */
export const validTops = (key: DeclKey): Card[] =>
  isSequence(key) ? CARDS.slice(SEQ_LENGTH[key] - 1) : [];

export function declPoints(
  decl: { key: DeclKey; rank: KareRank | null },
  rules: RulesConfig = DEFAULT_RULES,
): number {
  if (decl.key === 'kare') return decl.rank ? rules.karePoints[decl.rank] : rules.karePoints.Q;
  return rules.declPoints[decl.key];
}
```

- [ ] **Step 5: Run the tests.** Run `pnpm test`. Expected: PASS. Then run `pnpm check`. Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/core
git commit -m "feat(core): domain schemas and rules constants" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Allowed declarations per seat

**Files:**
- Create: `src/core/declarations.ts`, `src/core/declarations.test.ts`

**Interfaces:**
- Consumes: `Match, Seat, DeclKey` (model), `CONTRACT_KIND, CARDS_USED, MAX_BELOTS, MAX_KARES` (rules).
- Produces: `type DeclBlock = 'no-contract' | 'no-trumps' | 'no-cards'`, `interface SeatOptions { options: DeclKey[]; blocked: DeclBlock | null }`, `allowedDeclarations(deal: Pick<Match, 'contract' | 'current'>, seat: Seat): SeatOptions`.

- [ ] **Step 1: Write the failing tests.** `src/core/declarations.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { allowedDeclarations } from './declarations';
import type { ContractKey, Declaration, DeclKey, Seat } from './model';

let n = 0;
const decl = (seat: Seat, key: DeclKey): Declaration => ({ id: `d${n++}`, seat, key, top: null, rank: null });
const deal = (contract: ContractKey | null, current: Declaration[] = []) => ({ contract, current });

describe('allowedDeclarations', () => {
  it('blocks everything until a contract is chosen', () => {
    expect(allowedDeclarations(deal(null), 0)).toEqual({ options: [], blocked: 'no-contract' });
  });

  it('blocks everything in no trumps', () => {
    expect(allowedDeclarations(deal('nt'), 0)).toEqual({ options: [], blocked: 'no-trumps' });
  });

  it('offers every declaration at the start of a colour deal', () => {
    expect(allowedDeclarations(deal('hearts'), 0).options).toEqual(['belot', 'terca', 'kvarta', 'kvinta', 'kare']);
  });

  it('allows one belot per colour deal across all seats', () => {
    expect(allowedDeclarations(deal('hearts', [decl(1, 'belot')]), 0).options).not.toContain('belot');
  });

  it('allows up to four belots in all trumps', () => {
    const three = [decl(0, 'belot'), decl(1, 'belot'), decl(2, 'belot')];
    expect(allowedDeclarations(deal('at', three), 3).options).toContain('belot');
    expect(allowedDeclarations(deal('at', [...three, decl(3, 'belot')]), 0).options).not.toContain('belot');
  });

  it('respects the eight cards of a player', () => {
    const afterQuinte = allowedDeclarations(deal('spades', [decl(0, 'kvinta')]), 0).options;
    expect(afterQuinte).toContain('terca');
    expect(afterQuinte).not.toContain('kvarta');
    expect(afterQuinte).not.toContain('kare');
    // another seat is unaffected
    expect(allowedDeclarations(deal('spades', [decl(0, 'kvinta')]), 1).options).toContain('kvinta');
  });

  it('reports no-cards when nothing is left', () => {
    const full = [decl(0, 'belot'), decl(0, 'kare'), decl(0, 'kare')];
    expect(allowedDeclarations(deal('clubs', full), 0)).toEqual({ options: [], blocked: 'no-cards' });
  });

  it('caps fours of a kind at six per deal', () => {
    const six = [0, 0, 1, 1, 2, 2].map((s) => decl(s as Seat, 'kare'));
    expect(allowedDeclarations(deal('at', six), 3).options).not.toContain('kare');
  });
});
```

- [ ] **Step 2: Run them to see them fail.** Run `pnpm test src/core/declarations.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/core/declarations.ts`**

```ts
import { type DeclKey, DeclKeySchema, type Match, type Seat } from './model';
import { CARDS_USED, CONTRACT_KIND, MAX_BELOTS, MAX_KARES } from './rules';

export type DeclBlock = 'no-contract' | 'no-trumps' | 'no-cards';

export interface SeatOptions {
  options: DeclKey[];
  blocked: DeclBlock | null;
}

const CARDS_PER_PLAYER = 8;

export function allowedDeclarations(
  deal: Pick<Match, 'contract' | 'current'>,
  seat: Seat,
): SeatOptions {
  if (deal.contract === null) return { options: [], blocked: 'no-contract' };
  const kind = CONTRACT_KIND[deal.contract];
  if (kind === 'nt') return { options: [], blocked: 'no-trumps' };

  let used = 0;
  let belots = 0;
  let kares = 0;
  for (const d of deal.current) {
    if (d.seat === seat) used += CARDS_USED[d.key];
    if (d.key === 'belot') belots++;
    if (d.key === 'kare') kares++;
  }

  const options = DeclKeySchema.options.filter((key) => {
    if (key === 'belot') return belots < MAX_BELOTS[kind];
    if (key === 'kare' && kares >= MAX_KARES) return false;
    return used + CARDS_USED[key] <= CARDS_PER_PLAYER;
  });

  return { options, blocked: options.length ? null : 'no-cards' };
}
```

- [ ] **Step 4: Run the tests.** Run `pnpm test src/core/declarations.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/declarations.ts src/core/declarations.test.ts
git commit -m "feat(core): allowed declarations per seat" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Resolution (which sequences and fours of a kind count)

**Files:**
- Create: `src/core/resolve.ts`, `src/core/resolve.test.ts`

**Interfaces:**
- Consumes: `DeclInput, Team, Card` (model), `CARDS, KARE_RANKS, teamOf, isSequence, seqLength, declPoints, DEFAULT_RULES, RulesConfig` (rules).
- Produces: `type ResolveError = 'seq-top-missing' | 'kare-rank-missing' | 'kare-duplicate'` and

```ts
interface Resolution {
  errors: ResolveError[];
  seqWinner: Team | 'none' | null;   // null = no sequences, 'none' = full tie
  kareWinner: Team | null;
  contested: { seq: boolean; kare: boolean };
  topRequired: boolean[];            // by index into the input
  valid: boolean[];                  // by index into the input
  points: Record<Team, number>;      // sum of valid declaration points
}
resolve(decls: readonly DeclInput[], rules?: RulesConfig): Resolution
```

- [ ] **Step 1: Write the failing tests.** `src/core/resolve.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Card, DeclInput, DeclKey, KareRank, Seat } from './model';
import { resolve } from './resolve';

const d = (seat: Seat, key: DeclKey, x: { top?: Card; rank?: KareRank } = {}): DeclInput => ({
  seat, key, top: x.top ?? null, rank: x.rank ?? null,
});

describe('resolve: sequences', () => {
  it('counts all sequences when only one team has any', () => {
    const r = resolve([d(0, 'terca'), d(2, 'kvarta')]);
    expect(r.seqWinner).toBe('A');
    expect(r.contested.seq).toBe(false);
    expect(r.valid).toEqual([true, true]);
    expect(r.points).toEqual({ A: 7, B: 0 });
  });

  it('gives all sequences to the team with the longest one', () => {
    const r = resolve([d(0, 'terca'), d(2, 'terca'), d(1, 'kvarta')]);
    expect(r.seqWinner).toBe('B');
    expect(r.valid).toEqual([false, false, true]);
    expect(r.points).toEqual({ A: 0, B: 5 });
  });

  it('requires top cards for tied-length sequences', () => {
    const r = resolve([d(0, 'terca'), d(1, 'terca'), d(3, 'kvinta'), d(2, 'kvinta')]);
    expect(r.errors).toEqual(['seq-top-missing']);
    expect(r.topRequired).toEqual([false, false, true, true]);
    expect(r.seqWinner).toBeNull();
  });

  it('decides a tie in length by the highest top card', () => {
    const r = resolve([d(0, 'terca', { top: 'A' }), d(3, 'terca', { top: 'K' })]);
    expect(r.errors).toEqual([]);
    expect(r.seqWinner).toBe('A');
    expect(r.valid).toEqual([true, false]);
  });

  it('cancels every sequence on a full tie', () => {
    const r = resolve([d(0, 'terca', { top: 'K' }), d(1, 'terca', { top: 'K' })]);
    expect(r.seqWinner).toBe('none');
    expect(r.valid).toEqual([false, false]);
    expect(r.points).toEqual({ A: 0, B: 0 });
  });
});

describe('resolve: fours of a kind', () => {
  it('requires a rank for every four of a kind', () => {
    expect(resolve([d(0, 'kare')]).errors).toEqual(['kare-rank-missing']);
  });

  it('rejects two fours of a kind of the same rank', () => {
    expect(resolve([d(0, 'kare', { rank: 'Q' }), d(2, 'kare', { rank: 'Q' })]).errors).toEqual(['kare-duplicate']);
  });

  it('gives all fours of a kind to the team with the strongest (Q<K<10<A<9<J)', () => {
    const r = resolve([d(0, 'kare', { rank: '9' }), d(2, 'kare', { rank: 'Q' }), d(1, 'kare', { rank: 'A' })]);
    expect(r.kareWinner).toBe('A');
    expect(r.valid).toEqual([true, true, false]);
    expect(r.points).toEqual({ A: 25, B: 0 });
  });
});

describe('resolve: belot', () => {
  it('always counts belot, even for a team that loses sequences', () => {
    const r = resolve([d(1, 'belot'), d(0, 'kvarta'), d(1, 'terca')]);
    expect(r.valid).toEqual([true, true, false]);
    expect(r.points).toEqual({ A: 5, B: 2 });
  });
});
```

- [ ] **Step 2: Run them to see them fail.** Run `pnpm test src/core/resolve.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/core/resolve.ts`**

```ts
import type { DeclInput, Team } from './model';
import {
  CARDS,
  DEFAULT_RULES,
  declPoints,
  isSequence,
  KARE_RANKS,
  type RulesConfig,
  seqLength,
  teamOf,
} from './rules';

export type ResolveError = 'seq-top-missing' | 'kare-rank-missing' | 'kare-duplicate';

export interface Resolution {
  errors: ResolveError[];
  /** null = no sequences declared, 'none' = full tie (all cancelled). */
  seqWinner: Team | 'none' | null;
  kareWinner: Team | null;
  contested: { seq: boolean; kare: boolean };
  topRequired: boolean[];
  valid: boolean[];
  points: Record<Team, number>;
}

type Indexed = { d: DeclInput; i: number };

const byTeam = (list: Indexed[], team: Team) => list.filter((x) => teamOf(x.d.seat) === team);

export function resolve(decls: readonly DeclInput[], rules: RulesConfig = DEFAULT_RULES): Resolution {
  const errors: ResolveError[] = [];
  const all: Indexed[] = decls.map((d, i) => ({ d, i }));
  const topRequired = decls.map(() => false);

  // Sequences
  const seqs = all.filter((x) => isSequence(x.d.key));
  const sA = byTeam(seqs, 'A');
  const sB = byTeam(seqs, 'B');
  const len = (x: Indexed) => seqLength(x.d.key);
  let seqWinner: Resolution['seqWinner'] = null;
  if (sA.length && sB.length) {
    const lA = Math.max(...sA.map(len));
    const lB = Math.max(...sB.map(len));
    if (lA !== lB) {
      seqWinner = lA > lB ? 'A' : 'B';
    } else {
      const tied = seqs.filter((x) => len(x) === lA);
      for (const x of tied) topRequired[x.i] = true;
      if (tied.some((x) => x.d.top === null)) {
        errors.push('seq-top-missing');
      } else {
        const best = (list: Indexed[]) =>
          Math.max(...list.filter((x) => len(x) === lA).map((x) => (x.d.top === null ? -1 : CARDS.indexOf(x.d.top))));
        const tA = best(sA);
        const tB = best(sB);
        seqWinner = tA === tB ? 'none' : tA > tB ? 'A' : 'B';
      }
    }
  } else if (seqs.length) {
    seqWinner = sA.length ? 'A' : 'B';
  }

  // Fours of a kind
  const kares = all.filter((x) => x.d.key === 'kare');
  const missingRank = kares.some((x) => x.d.rank === null);
  if (missingRank) errors.push('kare-rank-missing');
  const ranks = kares.flatMap((x) => (x.d.rank === null ? [] : [x.d.rank]));
  if (new Set(ranks).size !== ranks.length) errors.push('kare-duplicate');
  const kA = byTeam(kares, 'A');
  const kB = byTeam(kares, 'B');
  let kareWinner: Team | null = null;
  if (kA.length && kB.length) {
    if (!missingRank) {
      const best = (list: Indexed[]) =>
        Math.max(...list.map((x) => (x.d.rank === null ? -1 : KARE_RANKS.indexOf(x.d.rank))));
      kareWinner = best(kA) > best(kB) ? 'A' : 'B';
    }
  } else if (kares.length) {
    kareWinner = kA.length ? 'A' : 'B';
  }

  const valid = decls.map((d) => {
    if (d.key === 'belot') return true;
    const team = teamOf(d.seat);
    return isSequence(d.key) ? team === seqWinner : team === kareWinner;
  });

  const points: Record<Team, number> = { A: 0, B: 0 };
  decls.forEach((d, i) => {
    if (valid[i]) points[teamOf(d.seat)] += declPoints(d, rules);
  });

  return {
    errors,
    seqWinner,
    kareWinner,
    contested: { seq: sA.length > 0 && sB.length > 0, kare: kA.length > 0 && kB.length > 0 },
    topRequired,
    valid,
    points,
  };
}
```

- [ ] **Step 4: Run the tests.** Run `pnpm test src/core/resolve.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/resolve.ts src/core/resolve.test.ts
git commit -m "feat(core): resolve competing sequences and fours of a kind" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Deal scoring with golden cases

**Files:**
- Create: `src/core/score.ts`, `src/core/testing/golden-deals.ts`, `src/core/score.test.ts`

**Interfaces:**
- Consumes: `resolve, Resolution` (Task 4), `CONTRACT_KIND, DEFAULT_RULES, RulesConfig, teamOf, otherTeam` (rules), `ContractKey, Seat, Team, DeclInput, Verdict` (model).
- Produces:

```ts
type ScoreError = 'points-missing' | 'points-range';
interface DealInput { contract: ContractKey; caller: Seat; decls: readonly DeclInput[];
  cardPointsA: number | null; capo: Team | null; hang: number }
interface DealScore { error: ScoreError | null; max: number; multiplier: number;
  cards: Record<Team, number>; decl: Record<Team, number>; raw: Record<Team, number>;
  match: Record<Team, number>; verdict: Verdict; hangPoints: number; hangTo: Team | null;
  nextHang: number; resolution: Resolution }
scoreDeal(input: DealInput, rules?: RulesConfig): DealScore
maxCardPoints(contract: ContractKey, rules?: RulesConfig): number
// golden-deals.ts
interface GoldenDeal { name: string; input: DealInput;
  expect: { match: Record<Team, number>; verdict: Verdict; hangTo: Team | null; nextHang: number } }
GOLDEN_DEALS: GoldenDeal[]
```

- [ ] **Step 1: Write the golden cases.** Every number here was derived by hand from GAME_RULES §5. `src/core/testing/golden-deals.ts`:

```ts
import type { Card, DeclInput, DeclKey, KareRank, Seat, Team, Verdict } from '../model';
import type { DealInput } from '../score';

export interface GoldenDeal {
  name: string;
  input: DealInput;
  expect: { match: Record<Team, number>; verdict: Verdict; hangTo: Team | null; nextHang: number };
}

const d = (seat: Seat, key: DeclKey, x: { top?: Card; rank?: KareRank } = {}): DeclInput => ({
  seat, key, top: x.top ?? null, rank: x.rank ?? null,
});

const base = { decls: [], capo: null, hang: 0 } as const;

export const GOLDEN_DEALS: GoldenDeal[] = [
  { name: '01 made, colour', input: { ...base, contract: 'hearts', caller: 0, cardPointsA: 10 },
    expect: { match: { A: 10, B: 6 }, verdict: 'ok', hangTo: null, nextHang: 0 } },
  { name: '02 inside, colour', input: { ...base, contract: 'hearts', caller: 0, cardPointsA: 7 },
    expect: { match: { A: 0, B: 16 }, verdict: 'inside', hangTo: null, nextHang: 0 } },
  { name: '03 hanging, playing team B', input: { ...base, contract: 'clubs', caller: 1, cardPointsA: 8 },
    expect: { match: { A: 8, B: 0 }, verdict: 'hang', hangTo: null, nextHang: 8 } },
  { name: '04 hanging points go to the next winner', input: { ...base, contract: 'clubs', caller: 0, cardPointsA: 10, hang: 8 },
    expect: { match: { A: 18, B: 6 }, verdict: 'ok', hangTo: 'A', nextHang: 0 } },
  { name: '05 hanging on hanging accumulates', input: { ...base, contract: 'spades', caller: 2, cardPointsA: 8, hang: 8 },
    expect: { match: { A: 0, B: 8 }, verdict: 'hang', hangTo: null, nextHang: 16 } },
  { name: '06 capot by the playing team', input: { ...base, contract: 'spades', caller: 0, cardPointsA: null, capo: 'A' },
    expect: { match: { A: 25, B: 0 }, verdict: 'ok', hangTo: null, nextHang: 0 } },
  { name: '07 capot by the defenders', input: { ...base, contract: 'spades', caller: 0, cardPointsA: null, capo: 'B' },
    expect: { match: { A: 0, B: 25 }, verdict: 'inside', hangTo: null, nextHang: 0 } },
  { name: '08 no trumps doubled, made', input: { ...base, contract: 'nt', caller: 3, cardPointsA: 5 },
    expect: { match: { A: 10, B: 16 }, verdict: 'ok', hangTo: null, nextHang: 0 } },
  { name: '09 no trumps inside', input: { ...base, contract: 'nt', caller: 0, cardPointsA: 6 },
    expect: { match: { A: 0, B: 26 }, verdict: 'inside', hangTo: null, nextHang: 0 } },
  { name: '10 all trumps with belot', input: { ...base, contract: 'at', caller: 0, cardPointsA: 13, decls: [d(0, 'belot')] },
    expect: { match: { A: 15, B: 13 }, verdict: 'ok', hangTo: null, nextHang: 0 } },
  { name: '11 longer sequence wins and sends the caller inside',
    input: { ...base, contract: 'hearts', caller: 0, cardPointsA: 9, decls: [d(0, 'terca'), d(1, 'kvarta')] },
    expect: { match: { A: 0, B: 21 }, verdict: 'inside', hangTo: null, nextHang: 0 } },
  { name: '12 full sequence tie cancels both',
    input: { ...base, contract: 'hearts', caller: 0, cardPointsA: 9, decls: [d(0, 'terca', { top: 'K' }), d(1, 'terca', { top: 'K' })] },
    expect: { match: { A: 9, B: 7 }, verdict: 'ok', hangTo: null, nextHang: 0 } },
  { name: '13 higher top card wins the tie',
    input: { ...base, contract: 'diamonds', caller: 1, cardPointsA: 8, decls: [d(0, 'terca', { top: 'A' }), d(3, 'terca', { top: 'K' })] },
    expect: { match: { A: 18, B: 0 }, verdict: 'inside', hangTo: null, nextHang: 0 } },
  { name: '14 stronger four of a kind (J over 9)',
    input: { ...base, contract: 'clubs', caller: 1, cardPointsA: 8, decls: [d(0, 'kare', { rank: '9' }), d(1, 'kare', { rank: 'J' })] },
    expect: { match: { A: 8, B: 28 }, verdict: 'ok', hangTo: null, nextHang: 0 } },
  { name: '15 belot counts for the side that lost sequences, producing a hang',
    input: { ...base, contract: 'hearts', caller: 0, cardPointsA: 8, decls: [d(1, 'belot'), d(0, 'terca')] },
    expect: { match: { A: 0, B: 10 }, verdict: 'hang', hangTo: null, nextHang: 10 } },
  { name: '16 one team with two sequences in all trumps, caller inside',
    input: { ...base, contract: 'at', caller: 1, cardPointsA: 10, decls: [d(0, 'terca'), d(2, 'kvarta')] },
    expect: { match: { A: 33, B: 0 }, verdict: 'inside', hangTo: null, nextHang: 0 } },
  { name: '17 inside with points hanging: the defenders take both',
    input: { ...base, contract: 'hearts', caller: 0, cardPointsA: 7, hang: 8 },
    expect: { match: { A: 0, B: 24 }, verdict: 'inside', hangTo: 'B', nextHang: 0 } },
];
```

- [ ] **Step 2: Write the failing tests.** `src/core/score.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { scoreDeal } from './score';
import { GOLDEN_DEALS } from './testing/golden-deals';

describe('scoreDeal: golden cases', () => {
  it.each(GOLDEN_DEALS)('$name', ({ input, expect: want }) => {
    const s = scoreDeal(input);
    expect(s.error).toBeNull();
    expect(s.match).toEqual(want.match);
    expect(s.verdict).toBe(want.verdict);
    expect(s.hangTo).toBe(want.hangTo);
    expect(s.nextHang).toBe(want.nextHang);
  });
});

describe('scoreDeal: card points', () => {
  const input = { contract: 'hearts', caller: 0, decls: [], capo: null, hang: 0 } as const;

  it('fills the other team as max − entered', () => {
    expect(scoreDeal({ ...input, cardPointsA: 3 }).cards).toEqual({ A: 3, B: 13 });
    expect(scoreDeal({ ...input, contract: 'at', cardPointsA: 3 }).cards).toEqual({ A: 3, B: 23 });
  });

  it('reports missing points', () => {
    expect(scoreDeal({ ...input, cardPointsA: null }).error).toBe('points-missing');
    expect(scoreDeal({ ...input, cardPointsA: Number.NaN }).error).toBe('points-missing');
  });

  it('reports points out of range', () => {
    expect(scoreDeal({ ...input, cardPointsA: 17 }).error).toBe('points-range');
    expect(scoreDeal({ ...input, cardPointsA: -1 }).error).toBe('points-range');
    expect(scoreDeal({ ...input, contract: 'nt', cardPointsA: 14 }).error).toBe('points-range');
  });

  it('ignores typed points when capot is on', () => {
    expect(scoreDeal({ ...input, cardPointsA: 99, capo: 'A' }).error).toBeNull();
  });

  it('shows the multiplier for no trumps', () => {
    expect(scoreDeal({ ...input, contract: 'nt', cardPointsA: 5 }).multiplier).toBe(2);
    expect(scoreDeal({ ...input, cardPointsA: 5 }).multiplier).toBe(1);
  });
});
```

- [ ] **Step 3: Run them to see them fail.** Run `pnpm test src/core/score.test.ts`. Expected: FAIL (module `./score` not found).

- [ ] **Step 4: Implement `src/core/score.ts`**

```ts
import type { ContractKey, DeclInput, Seat, Team, Verdict } from './model';
import { type Resolution, resolve } from './resolve';
import { CONTRACT_KIND, DEFAULT_RULES, otherTeam, type RulesConfig, teamOf } from './rules';

export type ScoreError = 'points-missing' | 'points-range';

export interface DealInput {
  contract: ContractKey;
  caller: Seat;
  decls: readonly DeclInput[];
  /** Rounded card points of team A including last ten; ignored when `capo` is set. */
  cardPointsA: number | null;
  capo: Team | null;
  /** Hanging points carried into this deal. */
  hang: number;
}

export interface DealScore {
  error: ScoreError | null;
  max: number;
  multiplier: number;
  cards: Record<Team, number>;
  decl: Record<Team, number>;
  raw: Record<Team, number>;
  match: Record<Team, number>;
  verdict: Verdict;
  hangPoints: number;
  hangTo: Team | null;
  nextHang: number;
  resolution: Resolution;
}

export const maxCardPoints = (contract: ContractKey, rules: RulesConfig = DEFAULT_RULES) =>
  rules.maxCardPoints[CONTRACT_KIND[contract]];

export function scoreDeal(input: DealInput, rules: RulesConfig = DEFAULT_RULES): DealScore {
  const kind = CONTRACT_KIND[input.contract];
  const max = rules.maxCardPoints[kind];
  const multiplier = kind === 'nt' ? rules.ntMultiplier : 1;
  const resolution = resolve(input.decls, rules);

  let error: ScoreError | null = null;
  let cards: Record<Team, number>;
  const a = input.cardPointsA;
  if (input.capo) {
    const full = max + rules.capoBonus;
    cards = { A: input.capo === 'A' ? full : 0, B: input.capo === 'B' ? full : 0 };
  } else if (a === null || !Number.isInteger(a)) {
    error = 'points-missing';
    cards = { A: 0, B: 0 };
  } else {
    if (a < 0 || a > max) error = 'points-range';
    cards = { A: a, B: max - a };
  }

  const decl = resolution.points;
  const raw = { A: (cards.A + decl.A) * multiplier, B: (cards.B + decl.B) * multiplier };
  const T = teamOf(input.caller);
  const O = otherTeam(T);

  const match: Record<Team, number> = { A: 0, B: 0 };
  let verdict: Verdict = 'ok';
  let hangPoints = 0;
  if (raw[T] < raw[O]) {
    verdict = 'inside';
    match[O] = raw.A + raw.B;
  } else if (raw[T] === raw[O]) {
    verdict = 'hang';
    match[O] = raw[O];
    hangPoints = raw[T];
  } else {
    match.A = raw.A;
    match.B = raw.B;
  }

  let hangTo: Team | null = null;
  if (input.hang > 0 && verdict !== 'hang') {
    hangTo = match.A > match.B ? 'A' : match.B > match.A ? 'B' : null;
    if (hangTo) match[hangTo] += input.hang;
  }
  const nextHang = verdict === 'hang' ? input.hang + hangPoints : hangTo ? 0 : input.hang;

  return { error, max, multiplier, cards, decl, raw, match, verdict, hangPoints, hangTo, nextHang, resolution };
}
```

- [ ] **Step 5: Run the tests.** Run `pnpm test src/core/score.test.ts`. Expected: PASS (17 golden + 5 unit).

- [ ] **Step 6: Commit**

```bash
git add src/core/score.ts src/core/score.test.ts src/core/testing
git commit -m "feat(core): deal scoring with inside, hanging and capot" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Match and series lifecycle

**Files:**
- Create: `src/core/match.ts`, `src/core/match.test.ts`

**Interfaces:**
- Consumes: `allowedDeclarations` (Task 3), `scoreDeal, ScoreError` (Task 5), `ResolveError` (Task 4), rules + model.
- Produces:

```ts
interface NewMatch { seats: Seats; teamA: string; teamB: string; bestOf: BestOf }
createMatch(opts: NewMatch): Match
setContract(m: Match, contract: ContractKey, caller: Seat): Match   // 'nt' clears current
addDeclaration(m: Match, decl: { id: string; seat: Seat; key: DeclKey }): Match  // no-op if not allowed
removeDeclaration(m: Match, id: string): Match
updateDeclaration(m: Match, id: string, patch: { top?: Card | null; rank?: KareRank | null }): Match
clearCurrentDeal(m: Match): Match
type SaveDealError = 'no-contract' | ResolveError | ScoreError
type SaveDealResult = { ok: true; match: Match; ended: boolean } | { ok: false; error: SaveDealError }
saveDeal(m: Match, input: { cardPointsA: number | null; capo: Team | null }, rules?: RulesConfig): SaveDealResult
undoLastDeal(m: Match): Match
totals(m: Pick<Match, 'games'>): Record<Team, number>
winner(m: Pick<Match, 'games'>): Team | null
dealer(m: Pick<Match, 'games'>): Seat
currentDeclarationSum(m: Pick<Match, 'current'>, rules?: RulesConfig): Record<Team, number>
endMatch(m: Match): Match                 // status 'ended', series[winner]++ (idempotent)
seriesNeed(bestOf: BestOf): number
isSeriesOver(m: Pick<Match, 'bestOf' | 'series'>): boolean
matchNumber(m: Match): number
nextMatch(m: Match): Match                // keeps series
rematch(m: Match): Match                  // resets series
toMatchRecord(m: Match, names: [string, string, string, string], meta: { id: string; date: number }): MatchRecord
```

- [ ] **Step 1: Write the failing tests.** `src/core/match.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  addDeclaration,
  clearCurrentDeal,
  createMatch,
  currentDeclarationSum,
  dealer,
  endMatch,
  isSeriesOver,
  matchNumber,
  nextMatch,
  rematch,
  removeDeclaration,
  saveDeal,
  setContract,
  toMatchRecord,
  totals,
  undoLastDeal,
  updateDeclaration,
} from './match';
import type { Deal, Match } from './model';
import { DEFAULT_RULES } from './rules';

const fresh = (bestOf: 1 | 3 | 5 | 7 = 1) =>
  createMatch({ seats: ['p0', 'p1', 'p2', 'p3'], teamA: 'Ние', teamB: 'Вие', bestOf });

const fakeDeal = (a: number, b: number): Deal => ({
  a, b, contract: 'hearts', caller: 0, verdict: 'ok', capo: null, raw: [a, b], hangTo: null, prevHang: 0, decls: [],
});

const withGames = (m: Match, ...scores: [number, number][]): Match => ({
  ...m, games: scores.map(([a, b]) => fakeDeal(a, b)),
});

const save = (m: Match, cardPointsA: number, capo: 'A' | 'B' | null = null) => {
  const r = saveDeal(setContract(m, 'hearts', 0), { cardPointsA, capo });
  if (!r.ok) throw new Error(r.error);
  return r;
};

describe('current deal', () => {
  it('adds, patches and removes declarations', () => {
    let m = setContract(fresh(), 'hearts', 0);
    m = addDeclaration(m, { id: 'x', seat: 0, key: 'terca' });
    m = updateDeclaration(m, 'x', { top: 'K' });
    expect(m.current).toEqual([{ id: 'x', seat: 0, key: 'terca', top: 'K', rank: null }]);
    expect(removeDeclaration(m, 'x').current).toEqual([]);
  });

  it('ignores a declaration that is not allowed', () => {
    const m = fresh(); // no contract yet
    expect(addDeclaration(m, { id: 'x', seat: 0, key: 'belot' })).toBe(m);
  });

  it('clears declarations when switching to no trumps', () => {
    let m = setContract(fresh(), 'hearts', 0);
    m = addDeclaration(m, { id: 'x', seat: 0, key: 'belot' });
    expect(setContract(m, 'nt', 1).current).toEqual([]);
    expect(setContract(m, 'at', 1).current).toHaveLength(1);
  });

  it('clearCurrentDeal resets declarations, contract and caller', () => {
    let m = setContract(fresh(), 'hearts', 0);
    m = addDeclaration(m, { id: 'x', seat: 0, key: 'belot' });
    expect(clearCurrentDeal(m)).toMatchObject({ current: [], contract: null, caller: null });
  });

  it('sums current declarations naively for the coaster', () => {
    let m = setContract(fresh(), 'at', 0);
    m = addDeclaration(m, { id: 'a', seat: 0, key: 'belot' });
    m = addDeclaration(m, { id: 'b', seat: 1, key: 'kvarta' });
    expect(currentDeclarationSum(m)).toEqual({ A: 2, B: 5 });
  });
});

describe('saveDeal', () => {
  it('needs a contract', () => {
    expect(saveDeal(fresh(), { cardPointsA: 10, capo: null })).toEqual({ ok: false, error: 'no-contract' });
  });

  it('refuses to save with unresolved declarations', () => {
    let m = setContract(fresh(), 'hearts', 0);
    m = addDeclaration(m, { id: 'k', seat: 0, key: 'kare' });
    expect(saveDeal(m, { cardPointsA: 10, capo: null })).toEqual({ ok: false, error: 'kare-rank-missing' });
  });

  it('records the deal and resets the current one', () => {
    let m = setContract(fresh(), 'hearts', 0);
    m = addDeclaration(m, { id: 'b', seat: 0, key: 'belot' });
    const r = saveDeal(m, { cardPointsA: 10, capo: null });
    if (!r.ok) throw new Error(r.error);
    expect(r.ended).toBe(false);
    expect(r.match.games[0]).toMatchObject({
      a: 12, b: 6, contract: 'hearts', caller: 0, verdict: 'ok', prevHang: 0,
      decls: [{ seat: 0, key: 'belot', top: null, rank: null, valid: true }],
    });
    expect(r.match).toMatchObject({ current: [], contract: null, caller: null });
  });

  it('ends the match at 151 and credits the series', () => {
    let m = fresh(3);
    for (let i = 0; i < 9; i++) {
      const r = save(m, 16);
      expect(r.ended).toBe(false);
      m = r.match;
    }
    const last = save(m, 16);
    expect(totals(last.match)).toEqual({ A: 160, B: 0 });
    expect(last.ended).toBe(true);
    expect(last.match.status).toBe('ended');
    expect(last.match.series).toEqual({ A: 1, B: 0 });
  });

  it('does not end on a tie', () => {
    const r = save(withGames(fresh(), [145, 149]), 10);
    expect(totals(r.match)).toEqual({ A: 155, B: 155 });
    expect(r.ended).toBe(false);
  });

  it('does not end on a capot deal', () => {
    const r = save(withGames(fresh(), [150, 0]), 0, 'A');
    expect(totals(r.match).A).toBe(175);
    expect(r.ended).toBe(false);
  });

  it('respects a custom target score', () => {
    const rules = { ...DEFAULT_RULES, targetScore: 101 };
    const r = saveDeal(setContract(withGames(fresh(), [95, 0]), 'hearts', 0), { cardPointsA: 10, capo: null }, rules);
    expect(r.ok && r.ended).toBe(true);
  });
});

describe('undoLastDeal', () => {
  it('removes the last deal and restores hanging points', () => {
    const hung = saveDeal(setContract(fresh(), 'clubs', 1), { cardPointsA: 8, capo: null });
    if (!hung.ok) throw new Error(hung.error);
    expect(hung.match.hang).toBe(8);
    const undone = undoLastDeal(hung.match);
    expect(undone.games).toEqual([]);
    expect(undone.hang).toBe(0);
  });

  it('is a no-op without deals', () => {
    const m = fresh();
    expect(undoLastDeal(m)).toBe(m);
  });
});

describe('dealer', () => {
  it('rotates N → W → S → E', () => {
    const seq = [0, 1, 2, 3, 4].map((n) => dealer({ games: Array.from({ length: n }, () => fakeDeal(0, 0)) }));
    expect(seq).toEqual([0, 3, 2, 1, 0]);
  });
});

describe('series', () => {
  it('ends a best-of-3 at two wins and keeps the series between matches', () => {
    let m = endMatch(withGames(fresh(3), [160, 40]));
    expect(m.series).toEqual({ A: 1, B: 0 });
    expect(isSeriesOver(m)).toBe(false);
    expect(matchNumber(m)).toBe(1);
    m = nextMatch(m);
    expect(m).toMatchObject({ games: [], current: [], hang: 0, status: 'playing', series: { A: 1, B: 0 } });
    expect(matchNumber(m)).toBe(2);
    m = endMatch(withGames(m, [155, 90]));
    expect(isSeriesOver(m)).toBe(true);
  });

  it('a single match is always a finished series once ended', () => {
    expect(isSeriesOver(endMatch(withGames(fresh(1), [10, 0])))).toBe(true);
  });

  it('endMatch is idempotent and a tie credits nobody', () => {
    const once = endMatch(withGames(fresh(3), [100, 100]));
    expect(once.series).toEqual({ A: 0, B: 0 });
    expect(endMatch(once)).toBe(once);
  });

  it('rematch resets the series', () => {
    expect(rematch(endMatch(withGames(fresh(3), [160, 0]))).series).toEqual({ A: 0, B: 0 });
  });
});

describe('toMatchRecord', () => {
  it('snapshots totals, names and recorded declarations', () => {
    const r = save(fresh(), 10);
    const rec = toMatchRecord(r.match, ['Иван', 'Петър', 'Мария', 'Жоро'], { id: 'm1', date: 1 });
    expect(rec).toEqual({
      id: 'm1', date: 1, seats: ['p0', 'p1', 'p2', 'p3'], names: ['Иван', 'Петър', 'Мария', 'Жоро'],
      teamA: 'Ние', teamB: 'Вие', totalA: 10, totalB: 6, games: [{ decls: [] }],
    });
  });
});
```

- [ ] **Step 2: Run them to see them fail.** Run `pnpm test src/core/match.test.ts`. Expected: FAIL (module `./match` not found).

- [ ] **Step 3: Implement `src/core/match.ts`**

```ts
import { allowedDeclarations } from './declarations';
import type {
  BestOf,
  Card,
  ContractKey,
  DeclKey,
  Deal,
  KareRank,
  Match,
  MatchRecord,
  Seat,
  Seats,
  Team,
} from './model';
import type { ResolveError } from './resolve';
import { DEAL_ORDER, DEFAULT_RULES, declPoints, type RulesConfig, teamOf } from './rules';
import { type ScoreError, scoreDeal } from './score';

export interface NewMatch {
  seats: Seats;
  teamA: string;
  teamB: string;
  bestOf: BestOf;
}

const EMPTY_DEAL = { current: [], contract: null, caller: null } as const;

export function createMatch(opts: NewMatch): Match {
  return { ...opts, ...EMPTY_DEAL, games: [], hang: 0, series: { A: 0, B: 0 }, status: 'playing' };
}

export function setContract(m: Match, contract: ContractKey, caller: Seat): Match {
  return { ...m, contract, caller, current: contract === 'nt' ? [] : m.current };
}

export function addDeclaration(m: Match, decl: { id: string; seat: Seat; key: DeclKey }): Match {
  if (!allowedDeclarations(m, decl.seat).options.includes(decl.key)) return m;
  return { ...m, current: [...m.current, { ...decl, top: null, rank: null }] };
}

export function removeDeclaration(m: Match, id: string): Match {
  return { ...m, current: m.current.filter((d) => d.id !== id) };
}

export function updateDeclaration(
  m: Match,
  id: string,
  patch: { top?: Card | null; rank?: KareRank | null },
): Match {
  return { ...m, current: m.current.map((d) => (d.id === id ? { ...d, ...patch } : d)) };
}

export function clearCurrentDeal(m: Match): Match {
  return { ...m, ...EMPTY_DEAL };
}

export type SaveDealError = 'no-contract' | ResolveError | ScoreError;
export type SaveDealResult =
  | { ok: true; match: Match; ended: boolean }
  | { ok: false; error: SaveDealError };

export function saveDeal(
  m: Match,
  input: { cardPointsA: number | null; capo: Team | null },
  rules: RulesConfig = DEFAULT_RULES,
): SaveDealResult {
  if (m.contract === null || m.caller === null) return { ok: false, error: 'no-contract' };
  const score = scoreDeal(
    { contract: m.contract, caller: m.caller, decls: m.current, hang: m.hang, ...input },
    rules,
  );
  const resolveError = score.resolution.errors[0];
  if (resolveError) return { ok: false, error: resolveError };
  if (score.error) return { ok: false, error: score.error };

  const deal: Deal = {
    a: score.match.A,
    b: score.match.B,
    contract: m.contract,
    caller: m.caller,
    verdict: score.verdict,
    capo: input.capo,
    raw: [score.raw.A, score.raw.B],
    hangTo: score.hangTo,
    prevHang: m.hang,
    decls: m.current.map(({ id: _id, ...d }, i) => ({ ...d, valid: score.resolution.valid[i] ?? false })),
  };
  const next: Match = { ...m, ...EMPTY_DEAL, games: [...m.games, deal], hang: score.nextHang };
  const t = totals(next);
  const ended = Math.max(t.A, t.B) >= rules.targetScore && t.A !== t.B && input.capo === null;
  return { ok: true, match: ended ? endMatch(next) : next, ended };
}

export function undoLastDeal(m: Match): Match {
  const last = m.games.at(-1);
  if (!last) return m;
  return { ...m, games: m.games.slice(0, -1), hang: last.prevHang };
}

export function totals(m: Pick<Match, 'games'>): Record<Team, number> {
  let A = 0;
  let B = 0;
  for (const g of m.games) {
    A += g.a;
    B += g.b;
  }
  return { A, B };
}

export function winner(m: Pick<Match, 'games'>): Team | null {
  const t = totals(m);
  return t.A > t.B ? 'A' : t.B > t.A ? 'B' : null;
}

export function dealer(m: Pick<Match, 'games'>): Seat {
  return DEAL_ORDER[m.games.length % DEAL_ORDER.length] ?? 0;
}

export function currentDeclarationSum(
  m: Pick<Match, 'current'>,
  rules: RulesConfig = DEFAULT_RULES,
): Record<Team, number> {
  const sum: Record<Team, number> = { A: 0, B: 0 };
  for (const d of m.current) sum[teamOf(d.seat)] += declPoints(d, rules);
  return sum;
}

export function endMatch(m: Match): Match {
  if (m.status === 'ended') return m;
  const w = winner(m);
  const series = w ? { ...m.series, [w]: m.series[w] + 1 } : m.series;
  return { ...m, series, status: 'ended' };
}

export const seriesNeed = (bestOf: BestOf) => Math.ceil(bestOf / 2);

export function isSeriesOver(m: Pick<Match, 'bestOf' | 'series'>): boolean {
  const need = seriesNeed(m.bestOf);
  return m.bestOf === 1 || m.series.A >= need || m.series.B >= need;
}

/** 1-based number of the match within its series (ties don't advance the count). */
export function matchNumber(m: Match): number {
  const decided = m.series.A + m.series.B;
  return m.status === 'ended' && winner(m) !== null ? decided : decided + 1;
}

export function nextMatch(m: Match): Match {
  return { ...m, ...EMPTY_DEAL, games: [], hang: 0, status: 'playing' };
}

export function rematch(m: Match): Match {
  return { ...nextMatch(m), series: { A: 0, B: 0 } };
}

export function toMatchRecord(
  m: Match,
  names: [string, string, string, string],
  meta: { id: string; date: number },
): MatchRecord {
  const t = totals(m);
  return {
    ...meta,
    seats: m.seats,
    names,
    teamA: m.teamA,
    teamB: m.teamB,
    totalA: t.A,
    totalB: t.B,
    games: m.games.map((g) => ({ decls: g.decls })),
  };
}
```

- [ ] **Step 4: Run the tests.** Run `pnpm test src/core/match.test.ts`. Expected: PASS. If Biome flags the unused `_id` destructure, keep the underscore name (Biome ignores `_`-prefixed bindings) or map explicitly with `({ seat, key, top, rank }, i) => ({ seat, key, top, rank, valid: … })`.

- [ ] **Step 5: Commit**

```bash
git add src/core/match.ts src/core/match.test.ts
git commit -m "feat(core): match and series lifecycle" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Roster and seating

**Files:**
- Create: `src/core/roster.ts`, `src/core/roster.test.ts`

**Interfaces:**
- Consumes: `Player, Seat, Seats` (model).
- Produces:

```ts
type NameError = 'empty' | 'duplicate'
validatePlayerName(name: string, roster: readonly Player[], exceptId: string | null): NameError | null
upsertPlayer(roster: readonly Player[], player: Player): Player[]
removePlayer(roster: readonly Player[], id: string): Player[]
type SeatDraft = [string | null, string | null, string | null, string | null]
EMPTY_DRAFT: SeatDraft
assignSeat(draft: SeatDraft, seat: Seat, playerId: string): SeatDraft  // swaps if already seated
vacatePlayer(draft: SeatDraft, playerId: string): SeatDraft
isDraftComplete(draft: SeatDraft): draft is Seats
```

- [ ] **Step 1: Write the failing tests.** `src/core/roster.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Player } from './model';
import {
  assignSeat,
  EMPTY_DRAFT,
  isDraftComplete,
  removePlayer,
  type SeatDraft,
  upsertPlayer,
  vacatePlayer,
  validatePlayerName,
} from './roster';

const p = (id: string, name: string): Player => ({ id, name, emoji: '🍺', photo: null });
const roster = [p('a', 'Иван'), p('b', 'Петър')];

describe('validatePlayerName', () => {
  it('rejects empty names', () => {
    expect(validatePlayerName('   ', roster, null)).toBe('empty');
  });
  it('rejects duplicates case-insensitively, ignoring surrounding spaces', () => {
    expect(validatePlayerName(' иВАН ', roster, null)).toBe('duplicate');
  });
  it('lets a player keep their own name when editing', () => {
    expect(validatePlayerName('Иван', roster, 'a')).toBeNull();
  });
  it('accepts a new name', () => {
    expect(validatePlayerName('Мария', roster, null)).toBeNull();
  });
});

describe('roster ops', () => {
  it('adds a new player and replaces an existing one by id', () => {
    expect(upsertPlayer(roster, p('c', 'Мария'))).toHaveLength(3);
    expect(upsertPlayer(roster, p('a', 'Ванката'))[0]?.name).toBe('Ванката');
  });
  it('removes a player', () => {
    expect(removePlayer(roster, 'a').map((x) => x.id)).toEqual(['b']);
  });
});

describe('seat draft', () => {
  it('seats a player', () => {
    expect(assignSeat(EMPTY_DRAFT, 2, 'a')).toEqual([null, null, 'a', null]);
  });
  it('swaps when the player already sits elsewhere', () => {
    const draft: SeatDraft = ['a', 'b', null, null];
    expect(assignSeat(draft, 1, 'a')).toEqual(['b', 'a', null, null]);
  });
  it('moves to an empty seat, leaving the old one empty', () => {
    expect(assignSeat(['a', null, null, null], 3, 'a')).toEqual([null, null, null, 'a']);
  });
  it('vacates a deleted player', () => {
    expect(vacatePlayer(['a', 'b', 'a', null], 'a')).toEqual([null, 'b', null, null]);
  });
  it('is complete only with four players', () => {
    expect(isDraftComplete(['a', 'b', 'c', null])).toBe(false);
    expect(isDraftComplete(['a', 'b', 'c', 'd'])).toBe(true);
  });
});
```

- [ ] **Step 2: Run them to see them fail.** Run `pnpm test src/core/roster.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/core/roster.ts`**

```ts
import type { Player, Seat, Seats } from './model';

export type NameError = 'empty' | 'duplicate';

const norm = (s: string) => s.trim().toLocaleLowerCase('bg');

export function validatePlayerName(
  name: string,
  roster: readonly Player[],
  exceptId: string | null,
): NameError | null {
  const n = norm(name);
  if (!n) return 'empty';
  return roster.some((p) => p.id !== exceptId && norm(p.name) === n) ? 'duplicate' : null;
}

export function upsertPlayer(roster: readonly Player[], player: Player): Player[] {
  return roster.some((p) => p.id === player.id)
    ? roster.map((p) => (p.id === player.id ? player : p))
    : [...roster, player];
}

export function removePlayer(roster: readonly Player[], id: string): Player[] {
  return roster.filter((p) => p.id !== id);
}

export type SeatDraft = [string | null, string | null, string | null, string | null];

export const EMPTY_DRAFT: SeatDraft = [null, null, null, null];

export function assignSeat(draft: SeatDraft, seat: Seat, playerId: string): SeatDraft {
  const next: SeatDraft = [...draft];
  const from = draft.indexOf(playerId);
  if (from >= 0) next[from] = draft[seat] ?? null;
  next[seat] = playerId;
  return next;
}

export function vacatePlayer(draft: SeatDraft, playerId: string): SeatDraft {
  return draft.map((id) => (id === playerId ? null : id)) as SeatDraft;
}

export function isDraftComplete(draft: SeatDraft): draft is Seats {
  return draft.every((id) => id !== null);
}
```

- [ ] **Step 4: Run the tests.** Run `pnpm test src/core/roster.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/roster.ts src/core/roster.test.ts
git commit -m "feat(core): roster validation and seat draft" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Leaderboard

**Files:**
- Create: `src/core/leaderboard.ts`, `src/core/leaderboard.test.ts`

**Interfaces:**
- Consumes: `MatchRecord, Player, Team` (model), `declPoints, teamOf, DEFAULT_RULES, RulesConfig` (rules).
- Produces:

```ts
interface LeaderRow { key: string; playerIds: string[]; names: string[]; teamName: string | null;
  pts: number; count: number; belots: number; deals: number; matches: number; wins: number }
leaderboard(stats: readonly MatchRecord[], roster: readonly Player[], rules?: RulesConfig):
  { players: LeaderRow[]; pairs: LeaderRow[] }
```

`names` is taken from the current roster when the player still exists, otherwise from the latest record. A pair's `teamName` is the team name used in its latest match. Both lists are sorted by `pts ↓, count ↓, wins ↓`, with a stable order on ties.

- [ ] **Step 1: Write the failing tests.** `src/core/leaderboard.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { leaderboard } from './leaderboard';
import type { MatchRecord, Player } from './model';

const rec: MatchRecord = {
  id: 'm1', date: 1, seats: ['p1', 'p2', 'p3', 'p4'], names: ['Иван', 'Петър', 'Мария', 'Жоро'],
  teamA: 'Ние', teamB: 'Вие', totalA: 160, totalB: 100,
  games: [{
    decls: [
      { seat: 0, key: 'belot', top: null, rank: null, valid: true },
      { seat: 1, key: 'terca', top: null, rank: null, valid: false },
      { seat: 2, key: 'kvarta', top: null, rank: null, valid: true },
    ],
  }, { decls: [] }],
};

const roster: Player[] = [{ id: 'p1', name: 'Ванката', emoji: null, photo: null }];

describe('leaderboard', () => {
  it('ranks players by valid declaration points', () => {
    const { players } = leaderboard([rec], roster);
    expect(players.map((r) => r.key)).toEqual(['p3', 'p1', 'p2', 'p4']);
    expect(players[1]).toMatchObject({ names: ['Ванката'], pts: 2, count: 1, belots: 1, wins: 1, matches: 1, deals: 2 });
    expect(players[2]).toMatchObject({ names: ['Петър'], pts: 0, count: 0, wins: 0 });
  });

  it('ranks pairs regardless of seats or team name', () => {
    const swapped: MatchRecord = {
      ...rec, id: 'm2', seats: ['p3', 'p4', 'p1', 'p2'], names: ['Мария', 'Жоро', 'Иван', 'Петър'],
      teamA: 'Шефовете', totalA: 10, totalB: 151,
      games: [{ decls: [] }],
    };
    const { pairs } = leaderboard([rec, swapped], roster);
    expect(pairs[0]).toMatchObject({
      key: 'p1|p3', playerIds: ['p1', 'p3'], names: ['Ванката', 'Мария'], teamName: 'Шефовете',
      pts: 7, count: 2, belots: 1, matches: 2, wins: 1, deals: 3,
    });
    expect(pairs[1]).toMatchObject({ key: 'p2|p4', pts: 0, wins: 1, matches: 2 });
  });

  it('ignores invalid declarations', () => {
    const { players } = leaderboard([rec], []);
    expect(players.find((r) => r.key === 'p2')?.pts).toBe(0);
  });
});
```

- [ ] **Step 2: Run them to see them fail.** Run `pnpm test src/core/leaderboard.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/core/leaderboard.ts`**

```ts
import type { MatchRecord, Player, Seat, Team } from './model';
import { DEFAULT_RULES, declPoints, type RulesConfig, teamOf } from './rules';

export interface LeaderRow {
  key: string;
  playerIds: string[];
  names: string[];
  teamName: string | null;
  pts: number;
  count: number;
  belots: number;
  deals: number;
  matches: number;
  wins: number;
}

const SEATS_OF: Record<Team, [Seat, Seat]> = { A: [0, 2], B: [1, 3] };

const newRow = (key: string, playerIds: string[]): LeaderRow => ({
  key, playerIds, names: [], teamName: null, pts: 0, count: 0, belots: 0, deals: 0, matches: 0, wins: 0,
});

const byRank = (a: LeaderRow, b: LeaderRow) => b.pts - a.pts || b.count - a.count || b.wins - a.wins;

export function leaderboard(
  stats: readonly MatchRecord[],
  roster: readonly Player[],
  rules: RulesConfig = DEFAULT_RULES,
): { players: LeaderRow[]; pairs: LeaderRow[] } {
  const players = new Map<string, LeaderRow>();
  const pairs = new Map<string, LeaderRow>();
  const lastName = new Map<string, string>();

  const pairKey = (m: MatchRecord, team: Team) =>
    SEATS_OF[team].map((s) => m.seats[s]).toSorted().join('|');

  for (const m of stats) {
    const w: Team | null = m.totalA > m.totalB ? 'A' : m.totalB > m.totalA ? 'B' : null;

    m.seats.forEach((id, seat) => {
      lastName.set(id, m.names[seat] ?? id);
      const row = players.get(id) ?? newRow(id, [id]);
      row.matches++;
      row.deals += m.games.length;
      if (w === teamOf(seat as Seat)) row.wins++;
      players.set(id, row);
    });

    for (const team of ['A', 'B'] as const) {
      const key = pairKey(m, team);
      const row = pairs.get(key) ?? newRow(key, key.split('|'));
      row.teamName = team === 'A' ? m.teamA : m.teamB;
      row.matches++;
      row.deals += m.games.length;
      if (w === team) row.wins++;
      pairs.set(key, row);
    }

    for (const g of m.games) {
      for (const d of g.decls) {
        if (!d.valid) continue;
        const pts = declPoints(d, rules);
        const targets = [players.get(m.seats[d.seat]), pairs.get(pairKey(m, teamOf(d.seat)))];
        for (const row of targets) {
          if (!row) continue;
          row.pts += pts;
          row.count++;
          if (d.key === 'belot') row.belots++;
        }
      }
    }
  }

  const live = new Map(roster.map((p) => [p.id, p.name]));
  const nameOf = (id: string) => live.get(id) ?? lastName.get(id) ?? '?';
  const finish = (rows: Iterable<LeaderRow>) =>
    [...rows].map((r) => ({ ...r, names: r.playerIds.map(nameOf) })).sort(byRank);

  return { players: finish(players.values()), pairs: finish(pairs.values()) };
}
```

- [ ] **Step 4: Run the tests.** Run `pnpm test src/core/leaderboard.test.ts`. Expected: PASS. (`Array.prototype.toSorted` needs lib ES2023, which is already set in both tsconfigs.)

- [ ] **Step 5: Commit**

```bash
git add src/core/leaderboard.ts src/core/leaderboard.test.ts
git commit -m "feat(core): player and pair leaderboard" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Prototype parity check and golden-case review sheet

**Files:**
- Create: `test/prototype/legacy.js`, `test/prototype/parity.test.ts`, `docs/golden-deals.md`

**Interfaces:**
- Consumes: `GOLDEN_DEALS` (Task 5), `scoreDeal` (Task 5), `allowedDeclarations` (Task 3).
- Produces: nothing used by later tasks. This is a verification gate.

- [ ] **Step 1: Extract the prototype logic** into `test/prototype/legacy.js`. Copy the bodies of `resolve`, `calc` and `seatOptions` from `docs/design-handoff/prototype/Belot v3.dc.html` (lines ~826–931) **verbatim**. The only changes: turn methods into functions taking `st`, and replace `this.tname(x)` with `x`. Keep the constants block (lines 695–718) as is.

```js
// Verbatim port of the HTML prototype's scoring logic, used only for parity tests.
// Source: docs/design-handoff/prototype/Belot v3.dc.html. Do not "fix" anything here.
const CARDS = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SEQ = { terca: 3, kvarta: 4, kvinta: 5 };
const KARE_RANKS = ['Q', 'K', '10', 'A', '9', 'J'];
const KARE_PTS = { Q: 10, K: 10, '10': 10, A: 10, '9': 15, J: 20 };
const DECL = [
  { key: 'belot', pts: 2 }, { key: 'terca', pts: 2 }, { key: 'kvarta', pts: 5 },
  { key: 'kvinta', pts: 10 }, { key: 'kare', pts: '10+' },
];
const DMAP = Object.fromEntries(DECL.map((d) => [d.key, d]));
const KIND = { clubs: 'color', diamonds: 'color', hearts: 'color', spades: 'color', nt: 'nt', at: 'at' };
const MAXIN = { color: 16, at: 26, nt: 13 };
const teamOf = (seat) => (seat % 2 === 0 ? 'A' : 'B');
const declPts = (d) => (d.key === 'kare' ? (d.rank ? KARE_PTS[d.rank] : 10) : DMAP[d.key].pts);

export function seatOptions(st, i) {
  const kind = st.contract ? KIND[st.contract] : null, cur = st.current;
  if (!kind) return { msg: 'no-contract', opts: [] };
  if (kind === 'nt') return { msg: 'no-trumps', opts: [] };
  const mine = cur.filter((d) => d.seat === i);
  const used = mine.reduce((a, d) => a + (SEQ[d.key] || (d.key === 'kare' ? 4 : 0)), 0);
  const belots = cur.filter((d) => d.key === 'belot').length;
  const kares = cur.filter((d) => d.key === 'kare').length;
  const opts = DECL.filter((o) => {
    if (o.key === 'belot') return belots < (kind === 'color' ? 1 : 4);
    if (SEQ[o.key]) return used + SEQ[o.key] <= 8;
    if (o.key === 'kare') return used + 4 <= 8 && kares < 6;
    return true;
  });
  return { msg: opts.length ? '' : 'no-cards', opts: opts.map((o) => o.key) };
}

export function resolve(list) {
  const errors = [];
  const seqs = list.filter((d) => SEQ[d.key]);
  const sA = seqs.filter((d) => teamOf(d.seat) === 'A'), sB = seqs.filter((d) => teamOf(d.seat) === 'B');
  const maxLen = (arr) => Math.max(0, ...arr.map((d) => SEQ[d.key]));
  const required = new Set();
  let seqWin = null;
  if (sA.length && sB.length) {
    const lA = maxLen(sA), lB = maxLen(sB);
    if (lA !== lB) seqWin = lA > lB ? 'A' : 'B';
    else {
      seqs.filter((d) => SEQ[d.key] === lA).forEach((d) => required.add(d.id));
      const missing = seqs.filter((d) => required.has(d.id) && !d.top);
      if (missing.length) errors.push('seq-top-missing');
      else {
        const top = (arr) => Math.max(...arr.filter((d) => SEQ[d.key] === lA).map((d) => CARDS.indexOf(d.top)));
        const tA = top(sA), tB = top(sB);
        seqWin = tA === tB ? 'none' : tA > tB ? 'A' : 'B';
      }
    }
  } else if (seqs.length) seqWin = sA.length ? 'A' : 'B';
  const kares = list.filter((d) => d.key === 'kare');
  let kareWin = null;
  if (kares.some((d) => !d.rank)) errors.push('kare-rank-missing');
  const ranks = kares.filter((d) => d.rank).map((d) => d.rank);
  if (new Set(ranks).size !== ranks.length) errors.push('kare-duplicate');
  const kA = kares.filter((d) => teamOf(d.seat) === 'A'), kB = kares.filter((d) => teamOf(d.seat) === 'B');
  if (kA.length && kB.length) {
    if (!kares.some((d) => !d.rank)) {
      const best = (arr) => Math.max(...arr.map((d) => KARE_RANKS.indexOf(d.rank)));
      kareWin = best(kA) > best(kB) ? 'A' : 'B';
    }
  } else if (kares.length) kareWin = kA.length ? 'A' : 'B';
  const valid = (d) => d.key === 'belot' || (SEQ[d.key] ? teamOf(d.seat) === seqWin : teamOf(d.seat) === kareWin);
  const sum = (team) => list.filter((d) => teamOf(d.seat) === team && valid(d)).reduce((a, d) => a + declPts(d), 0);
  return { errors, valid, seqWin, kareWin, dA: sum('A'), dB: sum('B') };
}

export function calc(st) {
  const kind = KIND[st.contract];
  const max = MAXIN[kind], mult = kind === 'nt' ? 2 : 1;
  const res = resolve(st.current);
  let cA, cB, err = '';
  if (st.capo) { cA = st.capo === 'A' ? max + 9 : 0; cB = st.capo === 'B' ? max + 9 : 0; }
  else {
    const a = parseInt(st.inA, 10);
    if (st.inA === '' || isNaN(a)) { err = 'points-missing'; cA = 0; cB = 0; }
    else if (a < 0 || a > max) { err = 'points-range'; cA = a; cB = max - a; }
    else { cA = a; cB = max - a; }
  }
  const rawA = (cA + res.dA) * mult, rawB = (cB + res.dB) * mult;
  const T = teamOf(st.caller ?? 0), O = T === 'A' ? 'B' : 'A';
  const raw = { A: rawA, B: rawB };
  let m = { A: 0, B: 0 }, verdict = 'ok', hangPts = 0;
  if (raw[T] < raw[O]) { verdict = 'inside'; m[O] = rawA + rawB; }
  else if (raw[T] === raw[O]) { verdict = 'hang'; m[O] = raw[O]; hangPts = raw[T]; }
  else { m.A = rawA; m.B = rawB; }
  let hangTo = null;
  if (st.hang > 0 && verdict !== 'hang') {
    hangTo = m.A > m.B ? 'A' : m.B > m.A ? 'B' : null;
    if (hangTo) m[hangTo] += st.hang;
  }
  const nextHang = verdict === 'hang' ? st.hang + hangPts : (hangTo ? 0 : st.hang);
  return { err, mA: m.A, mB: m.B, verdict, hangTo, nextHang, res };
}
```

- [ ] **Step 2: Write the parity test.** `test/prototype/parity.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { allowedDeclarations } from '../../src/core/declarations';
import type { ContractKey, Declaration, DeclKey, Seat } from '../../src/core/model';
import { scoreDeal } from '../../src/core/score';
import { GOLDEN_DEALS } from '../../src/core/testing/golden-deals';
// @ts-expect-error untyped verbatim JS port
import { calc, seatOptions } from './legacy.js';

describe('parity with the HTML prototype: scoring', () => {
  it.each(GOLDEN_DEALS)('$name', ({ input }) => {
    const ours = scoreDeal(input);
    const theirs = calc({
      contract: input.contract,
      caller: input.caller,
      capo: input.capo,
      hang: input.hang,
      inA: input.cardPointsA === null ? '' : String(input.cardPointsA),
      current: input.decls.map((d, i) => ({ ...d, id: i })),
    });
    expect({ A: theirs.mA, B: theirs.mB }).toEqual(ours.match);
    expect(theirs.verdict).toBe(ours.verdict);
    expect(theirs.hangTo).toBe(ours.hangTo);
    expect(theirs.nextHang).toBe(ours.nextHang);
    expect(theirs.res.errors).toEqual(ours.resolution.errors);
  });
});

describe('parity with the HTML prototype: allowed declarations', () => {
  const contracts: (ContractKey | null)[] = [null, 'hearts', 'nt', 'at'];
  const layouts: [Seat, DeclKey][][] = [
    [],
    [[0, 'belot']],
    [[0, 'kvinta']],
    [[0, 'belot'], [0, 'kare'], [0, 'kare']],
    [[0, 'kare'], [0, 'kare'], [1, 'kare'], [1, 'kare'], [2, 'kare'], [2, 'kare']],
    [[0, 'belot'], [1, 'belot'], [2, 'belot'], [3, 'belot']],
  ];
  for (const contract of contracts) {
    layouts.forEach((layout, li) => {
      for (const seat of [0, 1, 2, 3] as Seat[]) {
        it(`${contract ?? 'none'} · layout ${li} · seat ${seat}`, () => {
          const current: Declaration[] = layout.map(([s, key], i) => ({ id: `d${i}`, seat: s, key, top: null, rank: null }));
          const ours = allowedDeclarations({ contract, current }, seat);
          const theirs = seatOptions({ contract, current }, seat);
          expect(ours.options).toEqual(theirs.opts);
          expect(ours.blocked ?? '').toBe(theirs.msg);
        });
      }
    });
  }
});
```

- [ ] **Step 3: Run the parity tests.** Run `pnpm test test/prototype`. Expected: PASS. **If any case differs, do not change either implementation.** Write the case, both outputs and the relevant GAME_RULES paragraph into `docs/golden-deals.md` under "Disagreements", and stop for the product owner to decide (agreed rule: the owner resolves spec vs. prototype conflicts).

- [ ] **Step 4: Write the review sheet** `docs/golden-deals.md` for the product owner. It's one table generated by hand from `GOLDEN_DEALS` with the columns: `#`, contract, caller (seat → team), declarations, card points A/B (or capot), hanging in, **expected** A : B, verdict, hanging out. Start it with:

```md
# Golden deals: please review

Each row is an automated test (`src/core/testing/golden-deals.ts`) derived from GAME_RULES.md §4–5.
Points are rounded. Team A = North/South, team B = East/West. Mark any row that doesn't match how you score on paper.

| # | Contract | Caller | Declarations | Cards A/B | Hang in | Expected A : B | Verdict | Hang out |
|---|---|---|---|---|---|---|---|---|
| 01 | ♥ | N (A) | none | 10 / 6 | 0 | 10 : 6 | made | 0 |
```

Fill in rows 02–17 the same way from the fixture.

- [ ] **Step 5: Full check.** Run `pnpm check`. Expected: lint, both typechecks and all tests pass.

- [ ] **Step 6: Commit**

```bash
git add test/prototype docs/golden-deals.md
git commit -m "test: parity with html prototype and golden deal review sheet" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Phase exit criteria

- `pnpm check && pnpm build` is green.
- Adding a React import or `window` to `src/core` fails lint or typecheck (checked in Task 1).
- Every rule in GAME_RULES §1–9 that doesn't involve the UI is covered by a test in `src/core`. §8 "clear/undo" → `clearCurrentDeal`/`undoLastDeal`. §9 → `leaderboard`.
- `docs/golden-deals.md` has been handed to the product owner for review.
