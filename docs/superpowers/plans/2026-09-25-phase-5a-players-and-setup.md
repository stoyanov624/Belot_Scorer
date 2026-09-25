# Phase 5a: Home, Players and Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** You can open the app, register players (name + emoji or photo), pick the theme and felt, seat four players on the new-game screen, and start a match. That covers the first three screens of the handoff (01 home, 02 player register/edit, 03 new game with the seat sheet) plus the "Тема" sheet (screen 14). The product owner's three decisions are also recorded and implemented: a match snapshots all its scoring rules, a seated player can't be deleted, and the error-screen copy is final.

**Architecture:** Screens live in `src/routes/` (Home is eager, Setup is lazy). Components shared by several screens live in `src/features/<area>/`: players (avatar wired to the photo store, the register sheet, photo cropping) and settings (the theme sheet). `src/ui/` stays store-free primitives. Screens read the store through narrow `useAppStore` selectors. Local UI state (which sheet is open, the seat draft, team names) stays in the screen component. A sheet's form is mounted only while the sheet is open, so every open starts from fresh state. Photo cropping loads with `import()`.

**Tech Stack:** React 19 with the React Compiler, React Router 8, Tailwind v4 (theme tokens), Zustand, Vitest with happy-dom, React Testing Library and user-event, `fake-indexeddb` for screen tests.

**Spec:** `docs/design-handoff/README.md` §1 (home), §2 (register sheet), §3 (setup + seat sheet), §12 (Тема sheet), "Глобален layout", Design Tokens. Mockups: `docs/design-handoff/screens/png/01-nachalen-ekran.png`, `02-nov-igrach.png`, `03-nova-igra.png`, `14-tema.png`. Reference behaviour: `onPhoto` (lines ~806–820), `newSetup` and `startMatch` in `docs/design-handoff/prototype/Belot v3.dc.html`. Vault: `docs/Home.md`, `docs/Architecture/Overview.md` (Gotchas, Overlay contract).

## Global Constraints

- **Copy:** UI text is the handoff's final Bulgarian, kept in `src/core/strings.ts`. Two strings are not in the handoff: the deletion-refused note and the team-name field labels (see Task 3). Status lists them for the product owner.
- **Home layout:** theme name 14/800 uppercase `tracking-[0.08em]` in team-a colour; "Белот" 64/900 line-height 1; subtitle 16/600 muted. "Нова игра" 64px, radius 20, 20/900, primary. A 2-column grid (gap 10) of 56px buttons. The players section has a 13/800 uppercase muted label with the count on the right, a grid `repeat(auto-fill, minmax(84px, 1fr))` with gap `14px 10px`, and 68px avatars (ring `line`) with a 14/800 name that truncates. The empty state is a dashed box.
- **Register sheet:**
  - Title "Нов играч" / "Редакция на играч". A 76px preview avatar (ring team-a) and the name field (56px, radius 16, `bg-bg`, 18/800).
  - "Смешна иконка" with a "🎲 Случайна" button. A 6-column grid of the 30 emojis: square, radius 16, `bg-s2`, and the selected one has a 2px team-a border.
  - "Или качи снимка" crops to a centred 192×192 square and saves it as JPEG q=0.8. Photo and emoji are mutually exclusive, and a new player starts with a random emoji.
  - Errors: "Въведете име." / "Вече има играч с това име.". Buttons "Отказ" / "Запази", and "Изтрий играча" (a text button in team-b colour) when editing.
- **Setup:**
  - "← Начало" (44px, nowrap), "Нова игра" 32/900, and the hint text.
  - Two team cards (`bg-s1`, radius 24, padding 18). The header has a 12px dot in the team colour, the editable team name (20/800, team colour, default "Ние"/"Вие") and "Север · Юг" / "Изток · Запад".
  - Seat rows: a 60px avatar ringed in the team colour, the seat label (12px uppercase), the name (17/800) or "Избери играч" in muted, and "›".
  - Team A holds seats 0 (North) and 2 (South); team B holds seats 1 (East) and 3 (West).
  - The seat sheet is titled "Място: <seat>". It has a dashed "+ Нов играч" button and the players (48px avatar, name, and the seat label if they are already seated). Picking a player who sits elsewhere swaps the two seats. "+ Нов играч" opens the register sheet, and the saved player takes that seat.
  - Series control: "1 мач", "2 от 3", "3 от 5", "4 от 7" (48px).
  - Hint: "Всеки мач се играе до <target> точки" when all four seats are taken, otherwise "Изберете играч за всяко от 4-те места.".
  - "Раздавай!" is 60–64px and active only when all four seats are taken. Otherwise it uses `bg-s3` with muted text and does nothing.
- **Тема sheet:** "Атмосфера". The "Тема" section has 4 cards, each drawn in its own theme's `bg` + `glow`, with two dots in that theme's `a`/`b`, the name and the subtitle. The selected card has a ring in its own `a`. The "Маса" section has 4 felt tiles showing the felt, ringed in team-a when selected. A primary "Готово" closes the sheet.
- **Hit targets and buttons:** minimum hit target 44px. Buttons shrink on press. Never pass Button a class that conflicts with its variant or size (there is no class merging): add a variant or size instead.
- **Architecture:**
  - `src/core` stays pure: `randomEmoji` takes the random source as an argument.
  - Every hook call is a plain top-level statement (React Compiler, see the Gotchas in `docs/Architecture/Overview.md`).
  - Photo cropping loads with `import()`.
  - Narrow selectors: one value or action per `useAppStore` call.
  - Colour utilities are `team-a`/`team-b`, never bare `-a`/`-b`.
- **Stored data:** changing the stored shape bumps `PERSIST_VERSION` and adds a migration (ADR 0003).
- **Workflow:** TDD. `pnpm check` and `pnpm docs:check` pass at the end of every task. Conventional Commits, one commit per task, stage by explicit path, never stage `package-lock.json`. Before adding a dependency, check that its version isn't hours old (ADR 0007).

## File Structure

```
docs/adr/0009-match-snapshots-rules.md          new
docs/adr/0010-seated-player-cannot-be-deleted.md new
src/core/model.ts, match.ts, persisted.ts       Match.rules snapshot, PERSIST_VERSION 2 + migration
src/store/match-actions.ts                      startMatch snapshots settings.rules
src/core/avatars.ts                             AVATAR_EMOJI, randomEmoji
src/core/roster.ts                              + draftFromSeats
src/core/strings.ts                             5a copy
src/ui/Button.tsx                               + size sm, variant muted, buttonClass()
src/test/app.tsx                                renderRoute, resetApp (screen-test helpers)
src/test-setup.ts                               + fake-indexeddb
src/features/players/PlayerAvatar.tsx           Avatar wired to photoStore
src/features/players/crop-photo.ts             squareSource, cropToJpeg (lazy)
src/features/players/RegisterSheet.tsx          new/edit player
src/features/settings/ThemeSheet.tsx            Атмосфера
src/routes/home.tsx                             home screen
src/routes/setup.tsx                            new game + SeatSheet
```

---

### Task 1: Record the product decisions

**Files:**
- Create: `docs/adr/0009-match-snapshots-rules.md`, `docs/adr/0010-seated-player-cannot-be-deleted.md`
- Modify: `docs/Status.md`, `docs/Home.md`, `docs/superpowers/plans/2026-09-25-roadmap.md`

- [x] **Step 1: ADR 0009**

```markdown
# A match snapshots its scoring rules when it starts

Rules vary between groups of players, so the settings hold a full `RulesConfig`. Until Phase 5 only `targetScore` was copied into the match; declaration points, the capot bonus and the No Trumps multiplier were read from the live settings each time a deal was saved, so editing them mid-match mixed two rule sets in one match. The product owner decided that a match snapshots the whole `RulesConfig` at start (`Match.rules`): settings changes affect only new matches, and every deal of a match, its undo and its record are scored by the same rules.

## Consequences

- `Match.targetScore` is replaced by `Match.rules.targetScore`. The stored document moves to version 2; migration 1 → 2 moves a stored match's `targetScore` into `rules` (other values from `DEFAULT_RULES`).
- `saveDeal` no longer takes rules as a parameter; it uses `match.rules`.
- The leaderboard still scores recorded declarations with the current rules (match records don't carry rules). Revisit if groups start changing declaration points.
```

- [x] **Step 2: ADR 0010**

```markdown
# A player seated in the current match cannot be deleted

The handoff says deleting a player "frees the seats they sat on". That works in the setup draft, but a started `Match` always has four players, and a deleted player would leave their recorded deals nameless. The product owner decided: while a player sits in the current match (playing or ended, until the match is left), `removePlayer` refuses with `in-match`, and the register sheet shows a short note instead of "Изтрий играча". Deleting a player who is not in the current match works as specified; a setup draft never outlives the screen, so it cannot hold a deleted player.

## Consequences

The note text is not in the handoff; the placeholder is recorded in `docs/Status.md` for the product owner.
```

- [x] **Step 3: Status, Home, roadmap**
  - `docs/Status.md`:
    - Remove the three answered open questions (rules snapshot, deleting a seated player, error-boundary copy): they're decided.
    - Add an open question: "Copy not in the handoff: the note shown instead of «Изтрий играча» for a seated player, and the accessible labels of the team-name fields — confirm the wording in `src/core/strings.ts`."
    - Next: "Phase 5a (home, players, setup) in progress".
  - `docs/Home.md`: list ADRs 0009 and 0010 under Decisions, and this plan under Plans.
  - Roadmap: split the Phase 5 row into three rows.
    - **5a:** Home, player register/edit, setup + seat sheet, Тема sheet. Plan: this file.
    - **5b:** Table: seats, declarations popover, contract sheet, deal end (resolution + points), clear/undo. Plan: later.
    - **5c:** History, match end + series, leaderboard, failed-load screen, save-error banner. Plan: later.

- [x] **Step 4: Verify and commit**

Run: `pnpm docs:check`
Expected: `docs links ok`.

```bash
git add docs/adr/0009-match-snapshots-rules.md docs/adr/0010-seated-player-cannot-be-deleted.md docs/Status.md docs/Home.md docs/superpowers/plans/2026-09-25-roadmap.md
git commit -m "docs: ADR 0009 rules snapshot, ADR 0010 seated player deletion, phase 5 split

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Match snapshots its rules (core + store)

**Files:**
- Modify: `src/core/model.ts`, `src/core/match.ts`, `src/core/persisted.ts`, `src/store/match-actions.ts`
- Modify tests: `src/core/match.test.ts`, `src/core/persisted.test.ts`, `src/store/match-actions.test.ts`, and any other test that builds a match with `targetScore` (`grep -rn "targetScore" src test`)

**Interfaces:**
- Produces:
  - `MatchSchema` field `rules: RulesConfigSchema`, replacing `targetScore`.
  - `NewMatch { seats; teamA; teamB; bestOf; rules: RulesConfig }`.
  - `saveDeal(m: Match, input: { cardPointsA: number | null; capo: Team | null }): SaveDealResult`, with no rules parameter.
  - `PERSIST_VERSION = 2`, and `MIGRATIONS[1]` (v1 → v2).
  - Store: `startMatch` snapshots `settings.rules`, and the store's `saveDeal` no longer passes rules.

- [x] **Step 1: Write the failing tests first.**
  - **`match.test.ts`:** add these, and change every `createMatch({ … targetScore: N })` to `createMatch({ … rules: { ...DEFAULT_RULES, targetScore: N } })`.
    - A match created with custom `rules` keeps them (`createMatch(...).rules` equals the input).
    - `saveDeal` scores with `match.rules`: a match whose `rules.declPoints.belot` is 3 records a Belot worth 3.
    - The match ends at `match.rules.targetScore`.
  - **`persisted.test.ts`:** a v1 document whose `match` has `targetScore: 101` loads as v2 with `match.rules` equal to `{ ...DEFAULT_RULES, targetScore: 101 }` and no `targetScore` key. A v1 document with `match: null` loads unchanged. Update the "valid document at the current version" fixture to the v2 shape.
  - **`match-actions.test.ts`:**
    - "starts a match with the target score from the rules" now asserts `match.rules` equals the settings' rules at start.
    - New test: changing `settings.rules` after `startMatch` doesn't change `match.rules`, and the next deal is scored with the snapshot.

Run: `pnpm vitest run src/core/match.test.ts src/core/persisted.test.ts src/store/match-actions.test.ts`
Expected: FAIL (type errors and assertion failures).

- [x] **Step 2: Implement.**
  - **`model.ts`:** import `RulesConfigSchema` from `./rules`. Replace `targetScore: z.number().int().positive()` with `rules: RulesConfigSchema`, and update the doc comment ("Snapshotted from the settings when the match started (ADR 0009)").
  - **`match.ts`:**
    - `NewMatch` gets `rules: RulesConfig` instead of `targetScore`.
    - `saveDeal(m, input)` calls `scoreDeal({...}, m.rules)`, and `ended` compares against `m.rules.targetScore`.
    - Remove the `rules` parameter and the `DEFAULT_RULES` default from `saveDeal`, keeping any imports still used elsewhere.
  - **`persisted.ts`:** set `PERSIST_VERSION = 2` and add:

```ts
// Version 1 stored only the target score in a match; version 2 stores its full rules (ADR 0009).
const V1State = z.looseObject({
  match: z.looseObject({ targetScore: z.number() }).nullable(),
});

export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  1: (state) => {
    const v1 = V1State.parse(state);
    if (!v1.match) return v1;
    const { targetScore, ...match } = v1.match;
    return { ...v1, match: { ...match, rules: { ...DEFAULT_RULES, targetScore } } };
  },
};
```

  Check that Zod v4 has `z.looseObject`. It replaced `.passthrough()`: check `node_modules/zod` or context7. A throw inside the migration is already turned into `invalid-state` by `loadPersisted`.

  - **`match-actions.ts`:** `startMatch` → `createMatch({ ...opts, rules: get().settings.rules })`. The store `saveDeal` calls `saveDeal(match, input)`.

- [x] **Step 3: Run the tests, then the gate.** Run the three files, then `pnpm check`. Expected: PASS. Also run `grep -rn "targetScore" src test` and check that no stale uses remain outside `rules`, the migration and settings.

- [x] **Step 4: Commit.**

```bash
git add src/core/model.ts src/core/match.ts src/core/persisted.ts src/store/match-actions.ts src/core/match.test.ts src/core/persisted.test.ts src/store/match-actions.test.ts
git commit -m "feat(core): match snapshots its scoring rules, persisted v2

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Add any other test file you changed to the `git add` list.

---

### Task 3: Avatars, seat draft helper and 5a copy (core)

**Files:**
- Create: `src/core/avatars.ts`, `src/core/avatars.test.ts`
- Modify: `src/core/roster.ts`, `src/core/roster.test.ts`, `src/core/strings.ts`

**Interfaces:**
- Produces:
  - `AVATAR_EMOJI: readonly string[]` (the handoff's 30, in order)
  - `randomEmoji(random: () => number): string`
  - `draftFromSeats(seats: Seats | null, known: (id: string) => boolean): SeatDraft`
  - `STRINGS.seats`, `STRINGS.home`, `STRINGS.register`, `STRINGS.setup`, `STRINGS.theme` (shapes below)

- [x] **Step 1: Write the failing tests.**

```ts
// src/core/avatars.test.ts
import { describe, expect, it } from 'vitest';
import { AVATAR_EMOJI, randomEmoji } from './avatars';

describe('avatars', () => {
  it('has the 30 handoff emojis, all different', () => {
    expect(AVATAR_EMOJI).toHaveLength(30);
    expect(new Set(AVATAR_EMOJI).size).toBe(30);
    expect(AVATAR_EMOJI[0]).toBe('🍺');
    expect(AVATAR_EMOJI[29]).toBe('👑');
  });

  it('picks by the random source', () => {
    expect(randomEmoji(() => 0)).toBe('🍺');
    expect(randomEmoji(() => 0.999999)).toBe('👑');
  });
});
```

Append to `src/core/roster.test.ts` (and import `draftFromSeats`):

```ts
describe('draftFromSeats', () => {
  it('starts empty without seats', () => {
    expect(draftFromSeats(null, () => true)).toEqual([null, null, null, null]);
  });

  it('keeps known players and empties unknown ones', () => {
    const known = (id: string) => id !== 'gone';
    expect(draftFromSeats(['a', 'gone', 'c', 'd'], known)).toEqual(['a', null, 'c', 'd']);
  });
});
```

Run: `pnpm vitest run src/core/avatars.test.ts src/core/roster.test.ts`. Expected: FAIL.

- [x] **Step 2: Implement.**

```ts
// src/core/avatars.ts
/** The handoff's "funny icons" for players (README §2), in grid order. */
export const AVATAR_EMOJI: readonly string[] = [
  '🍺', '🍷', '🥃', '🍻', '🍸', '🧉', '🤠', '🥸', '😎', '🤓',
  '🧐', '😈', '🤡', '👴', '👵', '🧔', '🐻', '🦊', '🐷', '🐸',
  '🐔', '🦉', '🐗', '🐙', '🥒', '🌶️', '🧀', '🎩', '🃏', '👑',
];

/** `random` returns [0, 1) like Math.random; core stays deterministic by taking it as input. */
export function randomEmoji(random: () => number): string {
  const index = Math.min(Math.floor(random() * AVATAR_EMOJI.length), AVATAR_EMOJI.length - 1);
  return AVATAR_EMOJI[index] ?? '🃏';
}
```

Append to `src/core/roster.ts` (import `Seats` if it isn't imported yet):

```ts
/** Setup's starting seats: the last match's players, minus anyone no longer in the roster. */
export function draftFromSeats(seats: Seats | null, known: (id: string) => boolean): SeatDraft {
  if (!seats) return EMPTY_DRAFT;
  const keep = (id: string) => (known(id) ? id : null);
  return [keep(seats[0]), keep(seats[1]), keep(seats[2]), keep(seats[3])];
}
```

- [x] **Step 3: Add the 5a copy to `src/core/strings.ts`.** Remove the "Not in the handoff: placeholder…" comment on `routeError`, because the copy is now final. Add these keys to `STRINGS`:

```ts
  /** Indexed by Seat: 0 North, 1 East, 2 South, 3 West. */
  seats: ['Север', 'Изток', 'Юг', 'Запад'],
  home: {
    subtitle: 'Записва обявите и точките, докато вие играете.',
    newGame: 'Нова игра',
    stats: 'Класация',
    theme: 'Тема',
    newPlayer: 'Нов играч',
    share: 'Сподели / Внос',
    players: 'Играчи',
    empty: 'Още няма регистрирани играчи.',
  },
  register: {
    titleNew: 'Нов играч',
    titleEdit: 'Редакция на играч',
    name: 'Име или прякор',
    icon: 'Смешна иконка',
    random: '🎲 Случайна',
    photo: 'Или качи снимка',
    cancel: 'Отказ',
    save: 'Запази',
    delete: 'Изтрий играча',
    // Not in the handoff (ADR 0010): shown instead of the delete button. See docs/Status.md.
    inMatch: 'Играчът е в текущия мач и не може да бъде изтрит.',
    errors: { empty: 'Въведете име.', duplicate: 'Вече има играч с това име.' },
  },
  setup: {
    back: '← Начало',
    title: 'Нова игра',
    hint: 'Изберете кой къде седи. Партньорите седят един срещу друг.',
    teamA: 'Ние',
    teamB: 'Вие',
    teamASeats: 'Север · Юг',
    teamBSeats: 'Изток · Запад',
    // Not in the handoff: accessible names for the team-name inputs. See docs/Status.md.
    teamAName: 'Име на отбора Север · Юг',
    teamBName: 'Име на отбора Изток · Запад',
    pickPlayer: 'Избери играч',
    series: 'Брой мачове',
    seriesOptions: [
      { value: 1, label: '1 мач' },
      { value: 3, label: '2 от 3' },
      { value: 5, label: '3 от 5' },
      { value: 7, label: '4 от 7' },
    ],
    hintTarget: (target: number) => `Всеки мач се играе до ${target} точки`,
    hintSeats: 'Изберете играч за всяко от 4-те места.',
    deal: 'Раздавай!',
    seatTitle: (seat: string) => `Място: ${seat}`,
    newPlayer: '+ Нов играч',
  },
  theme: { title: 'Атмосфера', themes: 'Тема', felts: 'Маса', done: 'Готово' },
```

`STRINGS` is `as const`, so `seriesOptions` values are the literals 1 | 3 | 5 | 7 and match `BestOf`. The functions are fine inside `as const`. The file is pure data, so core purity holds.

- [x] **Step 4: Run the tests and the gate, then commit.**

Run `pnpm vitest run src/core`, then `pnpm check`. Expected: PASS.

```bash
git add src/core/avatars.ts src/core/avatars.test.ts src/core/roster.ts src/core/roster.test.ts src/core/strings.ts
git commit -m "feat(core): avatar emoji set, seat draft from last match, 5a copy

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: UI groundwork: Button sizes, screen-test helpers

**Files:**
- Modify: `src/ui/Button.tsx`, `src/ui/controls.test.tsx`, `src/test-setup.ts`, `package.json`
- Create: `src/test/app.tsx`

**Interfaces:**
- Produces:
  - `Button` `size: 'sm' | 'md' | 'lg'` and `variant` `… | 'dangerText' | 'muted'`
  - `buttonClass(variant?, size?): string` (the same classes Button uses, for link-styled buttons)
  - `renderRoute(path: string)`, which renders the app routes in a memory router
  - `resetApp()`, which resets the store to empty data and unlocks writes

- [x] **Step 1: Write the failing Button tests.** Append to `src/ui/controls.test.tsx`:

```tsx
describe('buttonClass', () => {
  it('matches what Button renders for the same variant and size', () => {
    render(<Button variant="primary" size="lg">X</Button>);
    expect(screen.getByRole('button').className).toBe(buttonClass('primary', 'lg'));
  });

  it('has a 44px small size and a muted variant', () => {
    expect(buttonClass('secondary', 'sm')).toContain('h-11');
    expect(buttonClass('muted', 'md')).toContain('bg-s3');
  });
});
```

Import `buttonClass` from `./Button`. Run it and see it fail.

- [x] **Step 2: Refactor `src/ui/Button.tsx`.** The sizes follow the spec:
  - sm: 44px, radius 14, 15/800 (the back button)
  - md: 56px, radius 18, 17/800
  - lg: 64px, radius 20, 20/900

```tsx
import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';

type Variant = 'primary' | 'secondary' | 'danger' | 'dangerText' | 'ghost' | 'muted';
type Size = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap transition-transform active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100';
const VARIANT: Record<Variant, string> = {
  primary: 'bg-team-a text-on',
  secondary: 'bg-s1 text-text border border-line',
  danger: 'bg-transparent text-team-b border border-team-b',
  dangerText: 'bg-transparent text-team-b',
  ghost: 'bg-transparent text-muted',
  muted: 'bg-s3 text-muted',
};
const SIZE: Record<Size, string> = {
  sm: 'h-11 rounded-[14px] px-4 text-[15px] font-extrabold',
  md: 'h-14 rounded-[18px] px-4 text-[17px] font-extrabold',
  lg: 'h-16 rounded-[20px] px-5 text-xl font-black',
};

/**
 * Classes for a button look, e.g. on a router Link. Pass layout-only extras (width, margin)
 * through `className` — never colours, heights, radii or text sizes: without class merging a
 * conflicting utility wins unpredictably. Add a variant or size instead.
 */
export function buttonClass(variant: Variant = 'secondary', size: Size = 'md'): string {
  return cx(BASE, VARIANT[variant], SIZE[size]);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = 'secondary', size = 'md', type = 'button', className, ...rest }: ButtonProps) {
  return <button type={type} className={cx(buttonClass(variant, size), className)} {...rest} />;
}
```

Compare this with the current `Button.tsx` before replacing it. Keep any behaviour the current file has that this snippet lacks, and report the difference. Check that no existing caller passes a size/colour class that now conflicts: grep `<Button` in `src/`.

- [x] **Step 3: Screen-test support.**
  1. Check that `fake-indexeddb`'s latest version isn't hours old (`npm view fake-indexeddb time --json | tail -3`), then run `pnpm add -D fake-indexeddb`.
  2. In `src/test-setup.ts`, add `import 'fake-indexeddb/auto';` as the first line. It installs a global `indexedDB`, so `src/store/instance.ts` can load in happy-dom tests. Node-environment tests are unaffected.
  3. Create `src/test/app.tsx`:

```tsx
import { render } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { routes } from '../app/routes';
import { appStore } from '../store/instance';

/** Empty data, writes unlocked, hydration ready: the state a fresh install reaches. */
export function resetApp(): void {
  appStore.getState().resetData();
}

/** Renders the real route table at `path` (lazy screens need `findBy…`). */
export function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return { router, ...render(<RouterProvider router={router} />) };
}
```

  4. Add a smoke test `src/test/app.test.tsx` (happy-dom docblock). After `resetApp()` and `renderRoute('/')`, the heading "Белот" is shown and `appStore.getState().roster` is `[]`.

- [x] **Step 4: Run the tests and the gate, then commit.**

Run `pnpm vitest run src/ui src/test`, then `pnpm check`. Expected: PASS, with pristine output.

```bash
git add src/ui/Button.tsx src/ui/controls.test.tsx src/test-setup.ts src/test/app.tsx src/test/app.test.tsx package.json pnpm-lock.yaml
git commit -m "feat(ui): button sizes and buttonClass; screen-test helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Players: avatar, photo crop, register sheet

**Files:**
- Create: `src/features/players/PlayerAvatar.tsx`, `src/features/players/crop-photo.ts`, `src/features/players/crop-photo.test.ts`, `src/features/players/RegisterSheet.tsx`, `src/features/players/register-sheet.test.tsx`

**Interfaces:**
- Consumes: `Avatar`, `usePhotoUrl`, `Sheet`, `Button`, `photoStore` and `useAppStore` (`src/store/instance.ts`), `randomEmoji`, `AVATAR_EMOJI`, `STRINGS`.
- Produces:
  - `PlayerAvatar({ player, size, ring? })`
  - `squareSource(width, height): { sx; sy; size }`
  - `cropToJpeg(file: Blob): Promise<Blob>` (192×192 JPEG q=0.8; lazy-loaded)
  - `RegisterSheet({ open, playerId, onClose, onSaved? })`. `playerId` null means a new player. `onSaved(id)` fires after a successful save.

- [x] **Step 1: Write the failing crop test.**

```ts
// src/features/players/crop-photo.test.ts
import { describe, expect, it } from 'vitest';
import { squareSource } from './crop-photo';

describe('squareSource', () => {
  it('takes the centred square of a landscape image', () => {
    expect(squareSource(400, 300)).toEqual({ sx: 50, sy: 0, size: 300 });
  });

  it('takes the centred square of a portrait image', () => {
    expect(squareSource(300, 500)).toEqual({ sx: 0, sy: 100, size: 300 });
  });
});
```

- [x] **Step 2: Create `crop-photo.ts` and `PlayerAvatar.tsx`.**

```ts
// src/features/players/crop-photo.ts
/** Output size of a player photo (README §2). */
export const PHOTO_PX = 192;

/** The centred square of a width × height image. */
export function squareSource(width: number, height: number): { sx: number; sy: number; size: number } {
  const size = Math.min(width, height);
  return { sx: (width - size) / 2, sy: (height - size) / 2, size };
}

/** Crops an uploaded image to a centred 192×192 JPEG (quality 0.8). Load with import(). */
export async function cropToJpeg(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { sx, sy, size } = squareSource(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = PHOTO_PX;
  canvas.height = PHOTO_PX;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D canvas unavailable');
  context.drawImage(bitmap, sx, sy, size, size, 0, 0, PHOTO_PX, PHOTO_PX);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('JPEG encoding failed'))),
      'image/jpeg',
      0.8,
    );
  });
}
```

```tsx
// src/features/players/PlayerAvatar.tsx
import type { Player } from '../../core/model';
import { photoStore } from '../../store/instance';
import { Avatar, type AvatarProps } from '../../ui/Avatar';
import { usePhotoUrl } from '../../ui/usePhotoUrl';

/** A roster player's avatar, loading their photo from the photo store. */
export function PlayerAvatar({
  player,
  size,
  ring,
}: {
  player: Pick<Player, 'name' | 'emoji' | 'photo'>;
  size: number;
  ring?: AvatarProps['ring'];
}) {
  const photoUrl = usePhotoUrl(player.photo, photoStore);
  return <Avatar name={player.name} emoji={player.emoji} photoUrl={photoUrl} size={size} ring={ring} />;
}
```

`AvatarProps['ring']` is `'a' | 'b' | 'line'`.

- [x] **Step 3: Write the failing RegisterSheet tests.** Create `src/features/players/register-sheet.test.tsx` (happy-dom docblock). Call `resetApp()` in `beforeEach`. Render with `render(<RegisterSheet open playerId={…} onClose={onClose} onSaved={onSaved} />)`: the sheet doesn't need a router. Cases:
  1. **New player saves:** the title is "Нов играч". Type "Иво" into the textbox named "Име или прякор" and click "Запази". The roster then has one player named "Иво" with a non-null emoji from `AVATAR_EMOJI`, and `onSaved` and `onClose` are called.
  2. **Empty name:** clicking "Запази" with an empty name shows "Въведете име." (role alert) and saves nothing.
  3. **Duplicate name:** with "Иво" seeded via `appStore.getState().savePlayer`, typing "иво" and saving shows "Вече има играч с това име.".
  4. **Emoji pick:** clicking the "🦊" option makes it `aria-pressed="true"`. After saving, the player's emoji is "🦊".
  5. **Edit mode:** with a seeded player, `playerId={id}` shows the title "Редакция на играч" with the name prefilled. "Изтрий играча" deletes the player and closes the sheet.
  6. **Seated player:** seed four players and `startMatch` with them. The edit sheet for one of them shows the in-match note and no "Изтрий играча" button.
  7. **Cancel:** "Отказ" calls `onClose` without saving.

Run it and see it fail.

- [x] **Step 4: Create `RegisterSheet.tsx`.** The form mounts only while the sheet is open, so each open starts fresh (see the Overlay contract in the Architecture notes).

```tsx
import { type ChangeEvent, useId, useRef, useState } from 'react';
import { AVATAR_EMOJI, randomEmoji } from '../../core/avatars';
import type { NameError } from '../../core/roster';
import { STRINGS } from '../../core/strings';
import { photoStore, useAppStore } from '../../store/instance';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { Sheet } from '../../ui/Sheet';
import { usePhotoUrl } from '../../ui/usePhotoUrl';

const S = STRINGS.register;

export interface RegisterSheetProps {
  open: boolean;
  /** null registers a new player. */
  playerId: string | null;
  onClose: () => void;
  onSaved?: (id: string) => void;
}

export function RegisterSheet({ open, playerId, onClose, onSaved }: RegisterSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={playerId ? S.titleEdit : S.titleNew}>
      {open && <RegisterForm key={playerId ?? 'new'} playerId={playerId} onDone={onClose} onSaved={onSaved} />}
    </Sheet>
  );
}

function RegisterForm({
  playerId,
  onDone,
  onSaved,
}: {
  playerId: string | null;
  onDone: () => void;
  onSaved?: (id: string) => void;
}) {
  const roster = useAppStore((s) => s.roster);
  const seats = useAppStore((s) => s.match?.seats ?? null);
  const savePlayer = useAppStore((s) => s.savePlayer);
  const removePlayer = useAppStore((s) => s.removePlayer);
  const existing = playerId ? (roster.find((p) => p.id === playerId) ?? null) : null;

  const [name, setName] = useState(existing?.name ?? '');
  const [emoji, setEmoji] = useState<string | null>(() => (existing ? existing.emoji : randomEmoji(Math.random)));
  const [photo, setPhoto] = useState<string | null>(existing?.photo ?? null);
  const [error, setError] = useState<NameError | null>(null);
  const photoUrl = usePhotoUrl(photo, photoStore);
  const fileRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const seated = existing !== null && (seats?.includes(existing.id) ?? false);

  // A photo uploaded in this form but not saved would otherwise be orphaned.
  const discardUpload = () => {
    if (photo && photo !== existing?.photo) void photoStore.remove(photo);
  };

  const pickEmoji = (value: string) => {
    discardUpload();
    setPhoto(null);
    setEmoji(value);
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const { cropToJpeg } = await import('./crop-photo');
    const id = await photoStore.put(await cropToJpeg(file));
    discardUpload();
    setPhoto(id);
    setEmoji(null);
  };

  const save = () => {
    const result = savePlayer({ id: existing?.id ?? null, name, emoji: photo ? null : emoji, photo });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSaved?.(result.id);
    onDone();
  };

  const cancel = () => {
    discardUpload();
    onDone();
  };

  const remove = () => {
    if (!existing) return;
    discardUpload();
    if (removePlayer(existing.id).ok) onDone();
  };

  return (
    <>
      <div className="flex items-center gap-3.5">
        <Avatar name={name.trim() || '?'} emoji={emoji} photoUrl={photoUrl} size={76} ring="a" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <input
            aria-label={S.name}
            placeholder={S.name}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            aria-invalid={error !== null}
            aria-describedby={error ? errorId : undefined}
            className="h-14 w-full rounded-2xl border border-line bg-bg px-4 text-lg font-extrabold text-text placeholder:text-muted"
          />
          {error && (
            <p id={errorId} role="alert" className="text-sm font-bold text-team-b">
              {S.errors[error]}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-muted">{S.icon}</span>
        <button
          type="button"
          onClick={() => pickEmoji(randomEmoji(Math.random))}
          className="h-11 rounded-xl border border-line bg-s2 px-3 text-sm font-extrabold transition-transform active:scale-95"
        >
          {S.random}
        </button>
      </div>

      <div className="grid grid-cols-6 gap-2">
        {AVATAR_EMOJI.map((value) => (
          <button
            key={value}
            type="button"
            aria-label={value}
            aria-pressed={!photo && emoji === value}
            onClick={() => pickEmoji(value)}
            className={cx(
              'aspect-square rounded-2xl border-2 bg-s2 text-2xl transition-transform active:scale-95',
              !photo && emoji === value ? 'border-team-a' : 'border-transparent',
            )}
          >
            {value}
          </button>
        ))}
      </div>

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(event) => void onFile(event)} />
      <Button onClick={() => fileRef.current?.click()}>{S.photo}</Button>

      <div className="grid grid-cols-2 gap-2.5">
        <Button onClick={cancel}>{S.cancel}</Button>
        <Button variant="primary" onClick={save}>
          {S.save}
        </Button>
      </div>

      {existing &&
        (seated ? (
          <p className="text-center text-sm font-bold text-muted">{S.inMatch}</p>
        ) : (
          <Button variant="dangerText" onClick={remove}>
            {S.delete}
          </Button>
        ))}
    </>
  );
}
```

The Avatar ring keys are `'a' | 'b' | 'line'` (they map to the `team-a`/`team-b` classes).

- [x] **Step 5: Run the tests and the gate, then commit.** Run `pnpm vitest run src/features/players`, then `pnpm check`. Expected: PASS, with pristine output. Cropping itself (canvas) is verified in the browser in Task 9.

```bash
git add src/features/players
git commit -m "feat(players): register sheet with emoji or cropped photo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Тема sheet

**Files:**
- Create: `src/features/settings/ThemeSheet.tsx`, `src/features/settings/theme-sheet.test.tsx`

**Interfaces:**
- Produces: `ThemeSheet({ open, onClose })`

- [x] **Step 1: Write the failing tests** (happy-dom, `resetApp()` in `beforeEach`).
  1. With `open`, the dialog "Атмосфера" shows 4 theme buttons, named by theme name ("Кръчма" …), and 4 felt buttons ("Дърво" …). "Кръчма" and "Дърво" are `aria-pressed="true"`.
  2. Clicking "Късна нощ" sets `appStore.getState().settings.theme` to `'night'`.
  3. Clicking "Камък" sets `settings.felt` to `'stone'`.
  4. "Готово" calls `onClose`.

  Two names collide: the theme "Сукно" and the felt "Сукно". Query each inside its section: wrap each section in a `role="group"` with `aria-label` = the section title, and use `within(screen.getByRole('group', { name: 'Тема' }))`.

- [x] **Step 2: Create `ThemeSheet.tsx`.**

```tsx
import { FeltKeySchema, ThemeKeySchema } from '../../core/settings';
import { STRINGS } from '../../core/strings';
import { THEMES } from '../../core/tokens';
import { useAppStore } from '../../store/instance';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { Sheet } from '../../ui/Sheet';
import { feltStyle } from '../../ui/theme';

const S = STRINGS.theme;
const LABEL = 'text-[13px] font-extrabold uppercase tracking-[0.06em] text-muted';

export function ThemeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={S.title}>
      {open && <ThemeForm onDone={onClose} />}
    </Sheet>
  );
}

function ThemeForm({ onDone }: { onDone: () => void }) {
  const theme = useAppStore((s) => s.settings.theme);
  const felt = useAppStore((s) => s.settings.felt);
  const updateSettings = useAppStore((s) => s.updateSettings);

  return (
    <>
      <div role="group" aria-label={S.themes} className="flex flex-col gap-2.5">
        <span className={LABEL}>{S.themes}</span>
        <div className="grid grid-cols-2 gap-2.5">
          {ThemeKeySchema.options.map((key) => {
            const t = THEMES[key];
            const selected = theme === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={selected}
                onClick={() => updateSettings({ theme: key })}
                // Each card previews its own theme, so it uses that theme's values, not the page's.
                style={{ background: `${t.glow}, ${t.bg}`, color: t.text, borderColor: selected ? t.a : 'transparent' }}
                className="flex min-h-[92px] flex-col items-start gap-2 rounded-[20px] border-2 p-3.5 text-left transition-transform active:scale-[0.98]"
              >
                <span aria-hidden className="flex gap-1.5">
                  <span className="size-4 rounded-full" style={{ background: t.a }} />
                  <span className="size-4 rounded-full" style={{ background: t.b }} />
                </span>
                <span className="text-base font-black">{STRINGS.themes[key].name}</span>
                <span className="text-xs font-bold" style={{ color: t.muted }}>
                  {STRINGS.themes[key].sub}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div role="group" aria-label={S.felts} className="flex flex-col gap-2.5">
        <span className={LABEL}>{S.felts}</span>
        <div className="grid grid-cols-2 gap-2.5">
          {FeltKeySchema.options.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={felt === key}
              onClick={() => updateSettings({ felt: key })}
              className={cx(
                'flex flex-col items-stretch gap-2 rounded-[20px] border-2 bg-s2 p-2.5 text-base font-extrabold transition-transform active:scale-[0.98]',
                felt === key ? 'border-team-a' : 'border-transparent',
              )}
            >
              <span aria-hidden className="h-14 rounded-xl border-4" style={feltStyle(key)} />
              {STRINGS.felts[key]}
            </button>
          ))}
        </div>
      </div>

      <Button variant="primary" size="lg" onClick={onDone}>
        {S.done}
      </Button>
    </>
  );
}
```

The theme card's accessible name comes from its text (name plus subtitle), so query with a regex: `getByRole('button', { name: /Кръчма/ })`.

- [x] **Step 3: Run the tests and the gate, then commit.** Run `pnpm vitest run src/features/settings`, then `pnpm check`. Expected: PASS.

```bash
git add src/features/settings
git commit -m "feat(settings): theme and felt sheet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Home screen

**Files:**
- Modify: `src/routes/home.tsx`, `src/app/router.test.tsx` (only if an assertion depends on the old placeholder)
- Create: `src/routes/home.test.tsx`

**Interfaces:**
- Consumes: `PreloadLink`, `buttonClass`, `Button`, `PlayerAvatar`, `RegisterSheet`, `ThemeSheet`, `useAppStore`, `STRINGS`.
- Produces: `Home`, the eager route component (keeps its name).

- [x] **Step 1: Write the failing tests** (`renderRoute('/')` after `resetApp()`):
  1. The heading "Белот", the theme label "Кръчма", the subtitle, and the empty state "Още няма регистрирани играчи." are shown, and the players count is `0`.
  2. "Нова игра" is a link to `/setup`, and "Класация" is a link to `/stats`.
  3. "Нов играч" opens the dialog "Нов играч". Saving "Иво" closes it and shows "Иво" in the players grid.
  4. Tapping a player opens "Редакция на играч" with the name prefilled.
  5. "Тема" opens the dialog "Атмосфера".
  6. "Сподели / Внос" is disabled (sharing comes in Phase 6).

- [x] **Step 2: Replace `src/routes/home.tsx`.**

```tsx
import { useState } from 'react';
import { PreloadLink } from '../app/PreloadLink';
import { STRINGS } from '../core/strings';
import { PlayerAvatar } from '../features/players/PlayerAvatar';
import { RegisterSheet } from '../features/players/RegisterSheet';
import { ThemeSheet } from '../features/settings/ThemeSheet';
import { useAppStore } from '../store/instance';
import { Button, buttonClass } from '../ui/Button';

const S = STRINGS.home;

export function Home() {
  const theme = useAppStore((s) => s.settings.theme);
  const roster = useAppStore((s) => s.roster);
  const [register, setRegister] = useState<{ playerId: string | null } | null>(null);
  const [themeOpen, setThemeOpen] = useState(false);

  return (
    <div className="flex flex-col gap-7 pt-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-team-a">
          {STRINGS.themes[theme].name}
        </p>
        <h1 className="text-[64px] font-black leading-none">{STRINGS.appName}</h1>
        <p className="text-base font-semibold text-muted">{S.subtitle}</p>
      </header>

      <nav className="flex flex-col gap-2.5">
        <PreloadLink to="/setup" className={buttonClass('primary', 'lg')}>
          {S.newGame}
        </PreloadLink>
        <div className="grid grid-cols-2 gap-2.5">
          <PreloadLink to="/stats" className={buttonClass('secondary', 'md')}>
            {S.stats}
          </PreloadLink>
          <Button onClick={() => setThemeOpen(true)}>{S.theme}</Button>
          <Button onClick={() => setRegister({ playerId: null })}>{S.newPlayer}</Button>
          {/* Sharing arrives in Phase 6. */}
          <Button disabled>{S.share}</Button>
        </div>
      </nav>

      <section aria-labelledby="home-players" className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between text-[13px] font-extrabold uppercase tracking-[0.06em] text-muted">
          <h2 id="home-players">{S.players}</h2>
          <span>{roster.length}</span>
        </div>
        {roster.length === 0 ? (
          <p className="rounded-[20px] border-2 border-dashed border-line p-6 text-center text-[15px] font-bold text-muted">
            {S.empty}
          </p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-x-2.5 gap-y-3.5">
            {roster.map((player) => (
              <li key={player.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => setRegister({ playerId: player.id })}
                  className="flex w-full flex-col items-center gap-1.5 transition-transform active:scale-95"
                >
                  <PlayerAvatar player={player} size={68} />
                  <span className="w-full truncate text-center text-sm font-extrabold">{player.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <RegisterSheet
        open={register !== null}
        playerId={register?.playerId ?? null}
        onClose={() => setRegister(null)}
      />
      <ThemeSheet open={themeOpen} onClose={() => setThemeOpen(false)} />
    </div>
  );
}
```

`STRINGS.appName` is "Белот". Check that `src/app/router.test.tsx` still passes: it looks for the home heading "Белот", which is still there.

- [x] **Step 3: Run the tests and the gate, then commit.** Run `pnpm vitest run src/routes src/app`, then `pnpm check`. Expected: PASS.

```bash
git add src/routes/home.tsx src/routes/home.test.tsx
git commit -m "feat(home): home screen with players, theme and register sheets

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Add `src/app/router.test.tsx` to the `git add` list if you changed it.

---

### Task 8: Setup screen and seat sheet

**Files:**
- Modify: `src/routes/setup.tsx`
- Create: `src/routes/setup.test.tsx`

**Interfaces:**
- Consumes: `draftFromSeats`, `assignSeat`, `isDraftComplete`, `SeatDraft` (core/roster), `Segmented`, `Sheet`, `Button`/`buttonClass`, `PlayerAvatar`, `RegisterSheet`, `appStore`/`useAppStore`, `STRINGS`, `useNavigate` and `Link` from `react-router`.
- Produces: `Component`, the lazy setup route.

- [x] **Step 1: Write the failing tests** (`resetApp()`, then seed players via `appStore.getState().savePlayer`, then `renderRoute('/setup')` and `findBy…`):
  1. With no players, the heading "Нова игра", both team cards ("Ние"/"Вие" inputs, "Север · Юг"/"Изток · Запад") and four seat rows each reading "Избери играч" are shown. The hint "Изберете играч за всяко от 4-те места." is shown. "Раздавай!" has `aria-disabled="true"`, and clicking it creates no match.
  2. **Seat sheet:** with 4 players seeded, tapping the "Север" row opens the dialog "Място: Север". Choosing "Иво" closes it, and the North row shows "Иво".
  3. **Swap:** with "Иво" at North, opening "Изток" and choosing "Иво" moves "Иво" to East and empties North.
  4. **New player from a seat:** opening "Юг" and choosing "+ Нов играч" opens "Нов играч". Saving "Нина" adds her to the roster and seats her at South.
  5. **Start:** fill all four seats, rename team A to "Ние2", and pick "2 от 3". The hint then reads "Всеки мач се играе до 151 точки" and "Раздавай!" has `aria-disabled="false"`. Clicking it creates a match with those seats, `teamA: 'Ние2'`, `bestOf: 3` and `rules` equal to the settings' rules, and navigates to `/table` (heading "Маса").
  6. **Prefill:** if a match already exists (created via `startMatch`), the setup screen starts with its seats, team names and series length.
  7. **Blank team name:** a team name left blank starts the match with the default "Ние"/"Вие".
  8. "← Начало" is a link to `/`.

- [x] **Step 2: Replace `src/routes/setup.tsx`.**

```tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { BestOf, Player, Seat, Team } from '../core/model';
import { assignSeat, draftFromSeats, isDraftComplete, type SeatDraft } from '../core/roster';
import { STRINGS } from '../core/strings';
import { PlayerAvatar } from '../features/players/PlayerAvatar';
import { RegisterSheet } from '../features/players/RegisterSheet';
import { appStore, useAppStore } from '../store/instance';
import { Button, buttonClass } from '../ui/Button';
import { cx } from '../ui/cx';
import { Segmented } from '../ui/Segmented';
import { Sheet } from '../ui/Sheet';

const S = STRINGS.setup;
const TEAM_SEATS: Record<Team, [Seat, Seat]> = { A: [0, 2], B: [1, 3] };

/** Where setup starts: the last match's table (the same friends usually play again). */
function initialSetup() {
  const { match, roster } = appStore.getState();
  const known = new Set(roster.map((p) => p.id));
  return {
    seats: draftFromSeats(match?.seats ?? null, (id) => known.has(id)),
    teamA: match?.teamA ?? S.teamA,
    teamB: match?.teamB ?? S.teamB,
    bestOf: match?.bestOf ?? 1,
  };
}

export function Component() {
  const navigate = useNavigate();
  const roster = useAppStore((s) => s.roster);
  const targetScore = useAppStore((s) => s.settings.rules.targetScore);
  const startMatch = useAppStore((s) => s.startMatch);
  const [initial] = useState(initialSetup);
  const [draft, setDraft] = useState<SeatDraft>(initial.seats);
  const [teamA, setTeamA] = useState(initial.teamA);
  const [teamB, setTeamB] = useState(initial.teamB);
  const [bestOf, setBestOf] = useState<BestOf>(initial.bestOf);
  const [pickSeat, setPickSeat] = useState<Seat | null>(null);
  const [registerSeat, setRegisterSeat] = useState<Seat | null>(null);

  const byId = new Map(roster.map((p) => [p.id, p]));
  const complete = isDraftComplete(draft);

  const seatPlayer = (seat: Seat, playerId: string) => setDraft((d) => assignSeat(d, seat, playerId));

  const start = () => {
    if (!isDraftComplete(draft)) return;
    startMatch({ seats: draft, teamA: teamA.trim() || S.teamA, teamB: teamB.trim() || S.teamB, bestOf });
    navigate('/table');
  };

  const teamCard = (team: Team) => (
    <section className="flex flex-col gap-3 rounded-3xl border border-line bg-s1 p-[18px]">
      <header className="flex items-center gap-2.5">
        <span aria-hidden className={cx('size-3 shrink-0 rounded-full', team === 'A' ? 'bg-team-a' : 'bg-team-b')} />
        <input
          aria-label={team === 'A' ? S.teamAName : S.teamBName}
          value={team === 'A' ? teamA : teamB}
          onChange={(event) => (team === 'A' ? setTeamA : setTeamB)(event.target.value)}
          className={cx(
            'min-w-0 flex-1 bg-transparent text-xl font-extrabold',
            team === 'A' ? 'text-team-a' : 'text-team-b',
          )}
        />
        <span className="shrink-0 text-sm font-bold text-muted">{team === 'A' ? S.teamASeats : S.teamBSeats}</span>
      </header>
      {TEAM_SEATS[team].map((seat) => (
        <SeatRow
          key={seat}
          seat={seat}
          team={team}
          player={byId.get(draft[seat] ?? '') ?? null}
          onPick={() => setPickSeat(seat)}
        />
      ))}
    </section>
  );

  return (
    <div className="flex flex-col gap-5">
      <Link to="/" className={cx(buttonClass('secondary', 'sm'), 'self-start')}>
        {S.back}
      </Link>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[32px] font-black leading-tight">{S.title}</h1>
        <p className="text-base font-semibold text-muted">{S.hint}</p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
        {teamCard('A')}
        {teamCard('B')}
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-muted">{S.series}</span>
        <Segmented label={S.series} options={S.seriesOptions} value={bestOf} onChange={setBestOf} />
        <p className="text-center text-sm font-bold text-muted">
          {complete ? S.hintTarget(targetScore) : S.hintSeats}
        </p>
      </div>

      {/* aria-disabled, not disabled: the spec's inactive look is the muted variant, not faded primary. */}
      <Button variant={complete ? 'primary' : 'muted'} size="lg" aria-disabled={!complete} onClick={start}>
        {S.deal}
      </Button>

      <SeatSheet
        seat={pickSeat}
        draft={draft}
        roster={roster}
        onClose={() => setPickSeat(null)}
        onPick={(playerId) => {
          if (pickSeat !== null) seatPlayer(pickSeat, playerId);
          setPickSeat(null);
        }}
        onNewPlayer={() => {
          setRegisterSeat(pickSeat);
          setPickSeat(null);
        }}
      />
      <RegisterSheet
        open={registerSeat !== null}
        playerId={null}
        onClose={() => setRegisterSeat(null)}
        onSaved={(playerId) => {
          if (registerSeat !== null) seatPlayer(registerSeat, playerId);
        }}
      />
    </div>
  );
}

function SeatRow({ seat, team, player, onPick }: { seat: Seat; team: Team; player: Player | null; onPick: () => void }) {
  const ring = team === 'A' ? 'border-team-a' : 'border-team-b';
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full items-center gap-3.5 rounded-[20px] border border-line bg-bg p-3 text-left transition-transform active:scale-[0.98]"
    >
      {player ? (
        <PlayerAvatar player={player} size={60} ring={team === 'A' ? 'a' : 'b'} />
      ) : (
        <span aria-hidden className={cx('size-[60px] shrink-0 rounded-full border-[3px] border-dashed', ring)} />
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs font-extrabold uppercase tracking-[0.06em] text-muted">{STRINGS.seats[seat]}</span>
        <span className={cx('truncate text-[17px] font-extrabold', !player && 'text-muted')}>
          {player?.name ?? S.pickPlayer}
        </span>
      </span>
      <span aria-hidden className="text-xl font-black text-muted">
        ›
      </span>
    </button>
  );
}

function SeatSheet({
  seat,
  draft,
  roster,
  onClose,
  onPick,
  onNewPlayer,
}: {
  seat: Seat | null;
  draft: SeatDraft;
  roster: readonly Player[];
  onClose: () => void;
  onPick: (playerId: string) => void;
  onNewPlayer: () => void;
}) {
  return (
    <Sheet open={seat !== null} onClose={onClose} title={seat === null ? '' : S.seatTitle(STRINGS.seats[seat])}>
      {seat !== null && (
        <>
          <button
            type="button"
            onClick={onNewPlayer}
            className="h-14 rounded-2xl border-2 border-dashed border-line text-base font-extrabold transition-transform active:scale-[0.98]"
          >
            {S.newPlayer}
          </button>
          <ul className="flex flex-col gap-2">
            {roster.map((player) => {
              const at = draft.indexOf(player.id);
              return (
                <li key={player.id}>
                  <button
                    type="button"
                    onClick={() => onPick(player.id)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-s2 p-2.5 text-left transition-transform active:scale-[0.98]"
                  >
                    <PlayerAvatar player={player} size={48} />
                    <span className="min-w-0 flex-1 truncate text-base font-extrabold">{player.name}</span>
                    {at >= 0 && (
                      <span className="text-xs font-extrabold uppercase tracking-[0.06em] text-muted">
                        {STRINGS.seats[at]}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Sheet>
  );
}
```

Points to check against the code:
- `useState(initialSetup)` passes the function itself, so it runs once.
- `STRINGS.seats[at]` is `string | undefined` under `noUncheckedIndexedAccess`, which renders fine.
- `STRINGS.seats[seat]` with `seat: Seat` is a tuple index, so it is always a string.
- `(team === 'A' ? setTeamA : setTeamB)(value)` may trip Biome's style rules. If it does, write two plain `onChange` handlers.

- [x] **Step 3: Run the tests and the gate, then commit.** Run `pnpm vitest run src/routes`, then `pnpm check` and `pnpm build`. Expected: PASS, and `setup` is still its own chunk.

```bash
git add src/routes/setup.tsx src/routes/setup.test.tsx
git commit -m "feat(setup): new game screen with seat sheet and series

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Browser check and vault update

**Files:**
- Modify: `docs/Status.md`, `docs/Backlog.md`, `docs/Architecture/Overview.md`, `docs/superpowers/plans/2026-09-25-roadmap.md`

- [x] **Step 1: Browser check** (controller, Playwright at 430×900; screenshots stay out of the repo). Do these in order:
  1. On `/`, compare against `01-nachalen-ekran.png`.
  2. Register a player with an emoji, then one with an uploaded photo. Use any local JPEG, and check the avatar shows the cropped square.
  3. Open the "Тема" sheet and compare against `14-tema.png`. Switch the theme.
  4. On `/setup`, compare against `03-nova-igra.png`. Fill the seats, including a swap, start the match, and land on `/table`.
  5. Reload: the roster, theme and match survive.
  6. The console shows no errors apart from the known favicon 404.
- [x] **Step 2: Update the vault.**
  - **Status:** 5a done; Next is the Phase 5b plan.
  - **Backlog:**
    - Remove the fixed items: the `buttonClass` export, and "Sheet keeps children mounted", which 5a resolves by mounting forms only while open.
    - Add anything deferred.
    - Add "a started match is replaced without warning when 'Раздавай!' is pressed again from setup", as in the prototype.
  - **Architecture/Overview:** add `src/features/<area>/` to the layer table (shared screen components that may use the store). Note that `src/ui` stays store-free.
  - **Roadmap:** tick 5a.
- [x] **Step 3: Verify and commit.**

Run: `pnpm docs:check && pnpm check`

```bash
git add docs/Status.md docs/Backlog.md docs/Architecture/Overview.md docs/superpowers/plans/2026-09-25-roadmap.md
git commit -m "docs: phase 5a vault update

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
