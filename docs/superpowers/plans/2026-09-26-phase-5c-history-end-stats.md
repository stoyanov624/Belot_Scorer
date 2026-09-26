# Phase 5c: History, Match End, Leaderboard and Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the app's screens:
- **History** (`/history`): the current match's deals, newest first, with the in-progress deal on top.
- **Match end** (`/end`): the winner or a tie, the series card, the score, the declaration totals, and the buttons for the next match, rematch, stop or Home.
- **Leaderboard** (`/stats`): players and pairs, with a two-press reset.
- **Recovery:** a failed-load screen that offers to start fresh, and a banner when saving fails.

**Architecture:**
- The three screens replace the placeholder bodies of the existing lazy routes in `src/routes/`.
- Every number comes from core: `totals`, `winner`, `isSeriesOver`, `leaderboard`, `declPoints`, and a new `validDeclarationTotals`.
- UI text built from domain values lives in pure `copy.ts` helpers per feature (`src/features/history/`, `src/features/end/`, `src/features/stats/`), tested without the DOM, the same pattern as `src/features/table/copy.ts`.
- `RootLayout` shows the failed-load screen instead of the routes when `hydration === 'failed'`, and a banner above the routes when `saveError` is set.
- The leaderboard scores recorded declarations with the current `settings.rules`, as ADR 0009 states.

**Tech Stack:** React 19 with the React Compiler, React Router 8, Tailwind v4 (theme tokens), Zustand, Vitest with happy-dom, React Testing Library and user-event.

**Spec:** `docs/design-handoff/README.md` §9 (history), §10 (match end), §11 (leaderboard). Mockups: `docs/design-handoff/screens/png/10-istoriya.png`, `11-kray-na-mach.png`, `12-klasaciya-igrachi.png`, `13-klasaciya-otbori.png`. The prototype's templates in `docs/design-handoff/prototype/Belot v3.dc.html`:
- history markup ~330–376 and notes ~1180–1191;
- end markup ~380–428 and its payload `endLine`/`winTitle` ~1402–1411, with `winners`/`loserTeam`/`declTotals` nearby;
- stats markup ~60–118 and its payload ~1354–1374.

ADRs 0006 (write gate, `resetData`), 0009, 0010 and 0011 apply. Backlog "Phase 5c" lines are inputs. Vault: `docs/Architecture/Overview.md` (Gotchas, Overlay contract, table orchestration) and `docs/Architecture/Testing.md`.

## Global Constraints

- **Copy:** final Bulgarian from the handoff, in `src/core/strings.ts`. Three texts are not in the handoff: the failed-load screen, the save-error banner, and the leaderboard empty state's second sentence. The last one is in the prototype, so use it. Mark the first two "Not in the handoff" and list them in `docs/Status.md`.
- **History (§9):**
  - **Header row:** "← Назад" (sm secondary button-link) and "История на мача" (24/900) on one row.
  - **Score bar** (`bg-s1` card, radius 20): "Ние 87" on the left, "до 151" muted in the middle, "64 Вие" on the right. Team names 17/800 in the team colours, numbers 26/900.
  - **In-progress card:** a dashed card "Раздаване N · в ход" with the current declarations, shown only when there are any.
  - **Deal cards** (`bg-s1`, radius 20), newest first:
    - "Раздаване N" (17/900) with a muted contract line ("♥ Купа · Иван", ♦♥ in suit red) and the result "a : b" (a in team-a, b in team-b).
    - Declaration rows: team dot, player name, label (`declLabel`), points. Dropped declarations are struck through at opacity .5.
    - "Без обяви" when there are none.
    - A notes line in team-b: "Капо за …" · "Вътре — … не записват" · "Висяща" · "Висящите отиват при …", joined with " · ".
    - "Общо след раздаването: X : Y" (12/700 muted).
  - **Empty:** "Още няма приключени раздавания." (only when there are no deals and no current declarations).
  - **"← Назад"** goes to `resumePath(match) ?? '/'`: the table while playing, the end screen when ended.
- **Match end (§10):**
  - **Line** (13/800 uppercase muted): "Край на мача · N раздавания", or during a series "Край на мач K · N раздавания".
  - **Winner:**
    - The winners' 100px avatars, overlapped.
    - The title (40/900, team colour): "Ние печелят", or during a series "Ние печелят мача", or once the series is decided "Ние печелят серията".
    - The winners' names ("Иван и Мария", 16/700 muted).
    - A pill "🍻 Вие черпят следващия рунд".
  - **Tie:** "Равенство" (40/900) instead.
  - **Series:** a card "Серия · 2 от 3" with "Ние 1 : 0 Вие".
  - **Score:** the big score 56/900 with team names above.
  - **Declaration totals:** two cards "Обяви Ние" / "Обяви Вие" with the valid declaration totals.
  - **Buttons:**
    - Series not over: "Мач N →" (primary lg; `nextMatch`, then `/table`), then "История" and "Прекрати" (secondary, 2 columns).
    - Series over, or a single match: "Към началния екран" (primary lg; `leaveMatch`, then `/`), then "История" and "Реванш" (`rematch`, then `/table`).
    - "Прекрати" also does `leaveMatch`, then `/`.
  - Without an ended match, `/end` redirects: a playing match goes to `/table`, no match goes to `/`.
- **Leaderboard (§11):**
  - "← Начало" + "Класация" (24/900) on one row.
  - Hint "Зачетени обяви в закръглени точки от N завършени мача." (14/600 muted).
  - A `Segmented` with "По играчи" / "По отбори".
  - **Rows** (`bg-s1`; the first row `bg-s2`; radius 20):
    - the rank (first in team-a, 2–3 in text, the rest muted);
    - the avatar(s) (overlapping pair for teams);
    - the name (players: player name; pairs: "Иван и Петър");
    - the sub line "N обяви · N белота · W/M победи", prefixed with the team name + " · " for pairs;
    - the points, big (first in team-a), with a small "точки" under them.
  - **Empty:** a dashed box "Още няма завършени мачове. Класацията се попълва след всеки приключен мач.".
  - **Reset:** a text button (team-b) "Нулирай класацията". The first press arms it and the label becomes "Натиснете пак, за да изтриете цялата класация". The second press clears the stats. It is shown only when stats exist.
  - Sorting and aggregation come from core `leaderboard(stats, roster, settings.rules)`.
- **Recovery (ADR 0006):**
  - **Failed load** (`hydration === 'failed'`): `RootLayout` renders a centred screen with the title, body and a primary "Започни наново" that calls `resetData()`. The stored backup is untouched.
  - **Save error** (`saveError`): a thin banner at the top of the layout (`bg-team-b text-on`, 14/800) with the text. It stays until `resetData` (ADR 0006; clearing it on a later successful write stays in the Backlog).
- **Hit targets and buttons:** minimum hit target 44px, buttons shrink on press, no Button class overrides (add a variant or size instead). A `PlayerAvatar` next to a visible name is `decorative`.
- **Architecture:** screens never score (core functions with `match.rules` or `settings.rules`). Hooks are plain top-level statements. Narrow selectors. Routes own their vertical padding (`py-6` for these screens).
- **Workflow:** TDD. `pnpm check` and `pnpm docs:check` pass at the end of every task. Conventional Commits, one commit per task, stage by explicit path, never stage `package-lock.json`. Screen tests seed state only through store actions (`resetApp`, `savePlayer`, `startMatch`, `setContract`, `addDeclaration`, `saveDeal`, `endMatch` …), never `appStore.setState`.

## File Structure

```
src/core/match.ts (+test)                validDeclarationTotals(games, rules)
src/store/roster-actions.ts (+test)      clearStats()
src/core/strings.ts                      history / end / stats / recovery copy
src/features/history/copy.ts (+test)     historyEntries(match, playerName, teamName)
src/features/end/copy.ts (+test)         endSummary(match, playerName, teamName)
src/features/stats/copy.ts (+test)       statsRowSub(row, kind), statsHint(n)
src/routes/history.tsx (+test)           History screen
src/routes/end.tsx (+test)               Match-end screen
src/routes/stats.tsx (+test)             Leaderboard screen
src/app/RootLayout.tsx (+test)           failed-load screen, save-error banner
```

---

### Task 1: Core helper, store action and copy

**Files:** Modify `src/core/match.ts`, `src/core/match.test.ts`, `src/store/roster-actions.ts`, `src/store/roster-actions.test.ts`, `src/core/strings.ts`.

**Interfaces (produced):**
- `validDeclarationTotals(games: readonly Deal[], rules: RulesConfig): Record<Team, number>`: the sum of `declPoints(d, rules)` over each deal's recorded declarations with `valid: true`, per team (`teamOf(d.seat)`).
- Store `clearStats(): void`: sets `stats: []` and touches nothing else.
- `STRINGS.history`, `STRINGS.end`, `STRINGS.stats`, `STRINGS.recovery` (shapes below).

- [ ] **Step 1: Failing tests.**
  - `validDeclarationTotals`:
    - Deals with valid and invalid declarations for both teams sum only the valid ones.
    - Custom rules (belot 3) are respected.
    - With no games it returns `{A:0,B:0}`.
  - `clearStats`: after a recorded match, `stats` becomes `[]` and the roster and match are unchanged.
- [ ] **Step 2: Implement both.**
- [ ] **Step 3: Add the copy** (exact text from the handoff and prototype):

```ts
  history: {
    back: '← Назад',
    title: 'История на мача',
    to: (target: number) => `до ${target}`,
    inProgress: (n: number) => `Раздаване ${n} · в ход`,
    deal: (n: number) => `Раздаване ${n}`,
    noDecls: 'Без обяви',
    runningTotal: (a: number, b: number) => `Общо след раздаването: ${a} : ${b}`,
    empty: 'Още няма приключени раздавания.',
    capo: (team: string) => `Капо за ${team}`,
    inside: (team: string) => `Вътре — ${team} не записват`,
    hang: 'Висяща',
    hangTo: (team: string) => `Висящите отиват при ${team}`,
  },
  end: {
    line: (deals: number) => `Край на мача · ${deals} раздавания`,
    lineSeries: (matchNo: number, deals: number) => `Край на мач ${matchNo} · ${deals} раздавания`,
    wins: (team: string) => `${team} печелят`,
    winsMatch: (team: string) => `${team} печелят мача`,
    winsSeries: (team: string) => `${team} печелят серията`,
    pays: (team: string) => `🍻 ${team} черпят следващия рунд`,
    tie: 'Равенство',
    series: (format: string) => `Серия · ${format}`,
    decls: (team: string) => `Обяви ${team}`,
    next: (n: number) => `Мач ${n} →`,
    history: 'История',
    stop: 'Прекрати',
    home: 'Към началния екран',
    rematch: 'Реванш',
    names: (a: string, b: string) => `${a} и ${b}`,
  },
  stats: {
    back: '← Начало',
    title: 'Класация',
    hint: (n: number) => `Зачетени обяви в закръглени точки от ${n} завършени мача.`,
    players: 'По играчи',
    pairs: 'По отбори',
    tabs: 'Класация по',
    empty: 'Още няма завършени мачове. Класацията се попълва след всеки приключен мач.',
    sub: (count: number, belots: number, wins: number, matches: number) =>
      `${count} обяви · ${belots} белота · ${wins}/${matches} победи`,
    points: 'точки',
    reset: 'Нулирай класацията',
    resetArmed: 'Натиснете пак, за да изтриете цялата класация',
  },
  recovery: {
    // Not in the handoff (ADR 0006): see docs/Status.md.
    title: 'Данните не могат да бъдат заредени',
    body: 'Запазените данни на това устройство са повредени или са от по-нова версия на приложението. Копие е запазено; можете да започнете наново с празни данни.',
    reset: 'Започни наново',
    saveError: 'Промените не се записват на това устройство.',
  },
```

  `stats.tabs` is the accessible name of the Segmented. It is not in the handoff; mark it as such. `end.names` is the prototype's "Иван и Мария". The history back label reuses the handoff's "← Назад".
- [ ] **Step 4: Run the tests and the gate, then commit** as `feat(core): valid declaration totals, clear stats, 5c copy`.

---

### Task 2: History and end-screen copy helpers

**Files:** Create `src/features/history/copy.ts` (+`copy.test.ts`) and `src/features/end/copy.ts` (+`copy.test.ts`).

**Interfaces:**
- `historyEntries(match: Match, playerName: (seat: Seat) => string, teamName: (t: Team) => string)` returns an array, newest first, of:

```ts
{
  no: number;
  a: number;
  b: number;
  runA: number;
  runB: number;
  contract: string; // from table copy's contractLine plus the symbol, e.g. "♥ Купа · Иван"
  red: boolean;
  decls: { seat: Seat; team: Team; label: string; points: number; valid: boolean }[];
  notes: string; // "" when none
}
```

  The declaration label comes from `declLabel`, and the points from `declPoints(d, match.rules)`. Notes are built from `deal.capo` / `verdict` / `hangTo` in the prototype's order (capot, inside, hanging, hang-to), joined with " · ".
- `currentEntry(match, playerName)` returns `{ no: games.length + 1, decls: [...] } | null`: null when `match.current` is empty; every current declaration is shown as valid.
- `endSummary(match: Match, playerName: (seat: Seat) => string, teamName: (t: Team) => string)` returns:

```ts
{
  line: string;
  winner: Team | null;
  title: string | null;
  winnerNames: string | null;
  pays: string | null;
  isSeries: boolean;
  seriesOver: boolean;
  seriesLabel: string | null;
  series: { A: number; B: number };
  totals: { A: number; B: number };
  decls: { A: number; B: number };
  nextNo: number;
}
```

  It follows the prototype's `endLine`/`winTitle`: a series match that decides the series says "печелят серията".
  - `decls` = `validDeclarationTotals(match.games, match.rules)`.
  - `nextNo` = `series.A + series.B + 1`.
  - `line` uses `STRINGS.end.lineSeries(Math.max(series.A + series.B, 1), games)` in a series (prototype).

- [ ] **Step 1: Failing tests** (node environment; build every fixture through core `createMatch` + `setContract` + `saveDeal` + `endMatch`, and resolve through `updateDeclaration`):
  - **`historyEntries`:**
    - Newest first, with running totals.
    - Contract strings, with `red` true for hearts.
    - A dropped declaration has `valid: false`.
    - Notes for an inside deal ("Вътре — Ние не записват"), a hanging deal ("Висяща"), the next deal's "Висящите отиват при Вие", and capot ("Капо за Ние").
    - A deal without declarations has `decls: []`.
  - **`currentEntry`:** null with no current declarations, otherwise one entry per current declaration.
  - **`endSummary`:**
    - Single match won by A: "Край на мача · 2 раздавания", "Ние печелят", the winner names (seats 0 and 2), "🍻 Вие черпят следващия рунд".
    - bestOf 3 after one A win: "Край на мач 1 · …", "Ние печелят мача", `seriesOver: false`, `nextNo: 2`.
    - A series-deciding win: "Ние печелят серията", `seriesOver: true`.
    - A tie: `winner: null`, `title: null`.
    - The declaration totals equal `validDeclarationTotals`.
- [ ] **Step 2: Implement** (pure; reuse the table's `declLabel`/`contractLine`/`teamNameOf` and `STRINGS.contracts`).
- [ ] **Step 3: Run the tests and the gate, then commit** as `feat(history,end): pure history entries and match-end summary`.

---

### Task 3: History screen

**Files:** Modify `src/routes/history.tsx`. Create `src/routes/history.test.tsx`.

- [ ] **Step 1: Failing tests** (`renderRoute('/history')`, state seeded through store actions):
  - **No match:** redirects to `/`.
  - **Header:** "История на мача" with a "← Назад" link to `/table` while playing, or to `/end` once ended.
  - **Score bar:** shows the team names, the totals and "до 151".
  - **Deal cards:** after three saved deals, three cards appear newest first ("Раздаване 3" first), each with its contract line and "a : b". "Общо след раздаването" shows the running totals.
  - **Dropped declaration:** it's struck through (`line-through` class, or `<s>`/`<del>`; pick one semantic element and assert on it).
  - **Notes:** inside and hanging notes render in the card.
  - **In-progress card:** "Раздаване 4 · в ход" appears while current declarations exist.
  - **Empty:** "Още няма приключени раздавания." shows with no deals and no current declarations.
  - **Header badge:** the table's "История" badge link still navigates here (existing table test).
- [ ] **Step 2: Implement.** Use `historyEntries`/`currentEntry`, `playerAt` for names, and `teamNameOf`. Players are shown by name only; the mockup has no avatars. Use `<del>` for dropped declarations, which is semantic.
- [ ] **Step 3: Run the tests and the gate, then commit** as `feat(history): match history screen`.

---

### Task 4: Match-end screen

**Files:** Modify `src/routes/end.tsx`. Create `src/routes/end.test.tsx`.

- [ ] **Step 1: Failing tests:**
  - **Redirects:** no match goes to `/`; a playing match goes to `/table`.
  - **Single match won by Ние:** shows the line, "Ние печелят", the winner names, "🍻 Вие черпят следващия рунд", the big score, "Обяви Ние"/"Обяви Вие" with the valid totals, and the buttons "Към началния екран", "История", "Реванш".
    - "Към началния екран" leaves the match (`match` becomes null) and navigates to `/`. Home then shows no "Продължи мача".
    - "Реванш" starts a new match with the same seats and a 0:0 series, then navigates to `/table`.
  - **Series:** bestOf 3 after the first A win shows "Ние печелят мача", the card "Серия · 2 от 3" with 1 : 0, and the buttons "Мач 2 →", "История", "Прекрати".
    - "Мач 2 →" keeps the series and navigates to `/table` ("Мач 2 · серия 1:0 · 2 от 3" in the header).
    - "Прекрати" leaves the match and goes to `/`.
  - **Series decided:** shows "Ние печелят серията" with the home/history/rematch buttons.
  - **Tie** (manual end at equal scores): shows "Равенство" and no winner avatars or pill.
  - **History:** the "История" link goes to `/history`, whose back link returns to `/end`.
- [ ] **Step 2: Implement.**
  - Build it from `endSummary`.
  - Winner avatars are `PlayerAvatar` at 100px, `decorative` (the names are shown), ring in the team colour, overlapped with `-ml-4` on the second.
  - Store actions: `nextMatch`, `rematch`, `leaveMatch`. Navigate with `replace: true` to `/table`, since the end screen shouldn't stay in history once play resumes. Use a plain push to `/` after `leaveMatch`.
- [ ] **Step 3: Run the tests and the gate, then commit** as `feat(end): match end screen with series and rematch`.

---

### Task 5: Leaderboard screen

**Files:** Modify `src/routes/stats.tsx`. Create `src/routes/stats.test.tsx`, `src/features/stats/copy.ts` (+`copy.test.ts`).

**Interfaces:** `statsSub(row: LeaderRow, kind: 'players' | 'pairs'): string`. For pairs it's prefixed with `row.teamName + ' · '` when a team name exists, otherwise it's the plain sub line.

- [ ] **Step 1: Failing tests:**
  - **`statsSub`** (node environment, rows from core `leaderboard` over records built with `toMatchRecord` or through store actions): the players line and the pairs line with the team-name prefix.
  - **Screen, empty:** with no stats, the title, the hint with 0, the empty box, and no reset button.
  - **Screen, one recorded match** (play and end a match through store actions):
    - The hint shows 1.
    - "По играчи" is selected (Segmented) and lists 4 rows sorted as core returns them.
    - The first row's rank is highlighted (`data-rank="1"`).
    - Each row shows the name, the sub line, the points and "точки". Avatars are decorative.
  - **Pairs tab:** "По отбори" lists 2 pair rows named "Иван и Мария" (seats 0 and 2) with the team-name prefix and overlapped avatars.
  - **Reset:** the first press changes the label to the armed text and keeps the stats; the second press clears them (the empty box shows). Leaving the screen disarms it (arm state is local).
  - **Back:** "← Начало" links to `/`.
- [ ] **Step 2: Implement.**
  - Call `leaderboard(stats, roster, settings.rules)` in the render. It's pure; if cost ever matters, memoise it with the compiler, not with `useMemo`.
  - Avatars come from the roster by `playerIds`. A player no longer in the roster falls back to the row's name with no photo and no emoji (Avatar shows the initial).
  - The reset button is Button `dangerText`.
- [ ] **Step 3: Run the tests and the gate, then commit** as `feat(stats): leaderboard with players and pairs`.

---

### Task 6: Failed-load screen and save-error banner

**Files:** Modify `src/app/RootLayout.tsx`. Create `src/app/root-layout.test.tsx`.

- [ ] **Step 1: Failing tests:**
  - **Failed load:** seed the failure the real way. Write an invalid document into fake IndexedDB under `STORAGE_KEY` (`belot-state`) with `idb-keyval`'s `set`, then call `appStore.persist.rehydrate()`, which yields `hydration: 'failed'` with the write gate closed.
    - `renderRoute('/')` shows the recovery title, body and "Започни наново" instead of Home.
    - Pressing it calls `resetData` (hydration becomes `ready`, data is empty) and Home appears.
    - The backup key still holds the invalid document.
  - **Save error:** simulate a write failure the real way if feasible (a store whose `set` rejects is how `app-store.test.ts` does it). With the shared instance, a spy on `idb-keyval`'s `set` rejecting once, followed by a store action, is acceptable. The banner text appears and doesn't cover the routes (the page heading is still present).
- [ ] **Step 2: Implement** in `RootLayout`:
  - Select `hydration` and `saveError`.
  - On `failed`, render the recovery screen (centred column, 24/900 title, 15/600 muted body, primary lg button) instead of `<Outlet />`.
  - When `saveError` is set, render the banner (`role="alert"`) above the outlet.
- [ ] **Step 3: Run the tests and the gate, then commit** as `feat(app): failed-load recovery screen and save-error banner`.

---

### Task 7: Browser check and vault update

- [ ] **Step 1: Browser check** (controller, Playwright at 390×844; screenshots stay out of the repo; state through the real UI or store actions only):
  1. Play a bestOf-3 series to the end through the UI, comparing against `11-kray-na-mach.png` at each end screen: "Мач 2 →", then "Ние печелят серията", then "Реванш".
  2. Compare history after several deals (including a dropped tierce, inside, hanging and capot) against `10-istoriya.png`.
  3. Compare the leaderboard against `12`/`13`. Test the reset double press.
  4. "Към началния екран" leaves the match and Home shows no "Продължи мача".
  5. Recovery: write a corrupt document via DevTools/evaluate and reload. The recovery screen shows, and "Започни наново" recovers.
  6. The console shows no errors except the favicon 404.
- [ ] **Step 2: Vault update.**
  - **Status:**
    - Done: 5c, with a summary. The app is feature-complete for a single device.
    - Next: the Phase 6 plan (share and import).
    - Open questions: add the recovery-screen and save-banner copy.
    - Last updated.
  - **Backlog:**
    - Remove the fixed 5c lines.
    - Decide the "Продължи мача for an ended match" line: it's kept, and it leads to the end screen, whose buttons leave the match (ADR 0011).
    - Add anything deferred.
  - **Architecture/Overview:** the history/end/stats copy helpers; `RootLayout` owns the recovery and banner states.
  - **Roadmap:** tick 5c. Tick every step in this plan.
  - Run `pnpm docs:check && pnpm check` and commit as `docs: phase 5c vault update`.
