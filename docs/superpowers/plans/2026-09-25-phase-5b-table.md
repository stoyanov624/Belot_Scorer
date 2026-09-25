# Phase 5b: Table and Deal Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Players can play a whole match at the table. That covers:
- declarations per seat through the popover;
- choosing the contract and its caller;
- ending a deal in two steps (resolving sequences and fours of a kind, then entering card points with live scoring);
- clearing the current deal or undoing the last one;
- ending the match by hand.

The app also resumes a stored match when it opens. Home offers "Продължи мача", and setup asks before discarding a match that has saved deals.

**Architecture:**
- **Screen:** the table screen (`src/routes/table.tsx`, eager) is built from components in `src/features/table/`.
- **Scoring:** all game behaviour stays in `src/core`. The UI previews a deal by calling the pure `scoreDeal(…, match.rules)` and `resolve(…, match.rules)`, and saves through the store's `saveDeal`, which also auto-ends and records the match.
- **UI text:** the Bulgarian text built from domain values (declaration labels, verdict sentences, the header line) comes from pure helpers in `src/features/table/copy.ts`, tested without the DOM.
- **Transient state** stays in the component that owns it: which sheet or popover is open, the contract being chosen, the card points being typed and capot.
- **Resume on start:** `main.tsx` asks a pure `resumePath(match)` where to go after hydration.
- The match-end screen (`/end`) and history (`/history`) are Phase 5c. 5b only navigates to them; their placeholders stay.

**Tech Stack:** React 19 with the React Compiler, React Router 8, Tailwind v4 (theme tokens), Zustand, Vitest with happy-dom, React Testing Library and user-event.

**Spec:** `docs/design-handoff/README.md` §4 (table), §5 (contract sheet), §6 (deal end, both steps), §7 (clear sheet), §8 (end-match sheet). `docs/design-handoff/GAME_RULES.md` covers allowed declarations, resolution and scoring, and is already implemented in `src/core`. Mockups: `docs/design-handoff/screens/png/04-masa.png`, `05-obyavi-popover.png`, `06-izbor-na-igra.png`, `07-kray-razdavane-utochnyavane.png`, `08-kray-razdavane-utochneni.png`, `09-kray-razdavane-tochki.png`. Reference behaviour and the exact copy templates are in `docs/design-handoff/prototype/Belot v3.dc.html`: `declLabel` (~741), `seatOptions` (~826), `addDecl` (~843, closes the popover), `resolve` verdict texts (~850–890), `calc` (~892–932), `startEnd`, `openContract`, and the table payload (~1125–1292). The product owner's decisions of 2026-09-25 are recorded in ADR 0011 (Task 1).

## Global Constraints

- **Copy:** UI text is the handoff's final Bulgarian, copied exactly from the README or the prototype's templates, and lives in `src/core/strings.ts`. Three texts are not in the handoff: "Продължи мача", and the title and body of the replace-match confirmation. Mark them in `strings.ts` with a "Not in the handoff" comment and list them in `docs/Status.md`.
- **Table layout (§4):**
  - Page padding `16px 16px 20px`, gap 14, full height.
  - **Header:** a 12/800 uppercase team-a line ("Белот · до 151", or during a series "Мач 2 · серия 1:0 · 2 от 3") above "Раздаване N" (22/900). A row of 44px nowrap buttons (Сподели, Изчисти, Тема, История + count badge) scrolls horizontally without a visible scrollbar.
  - **Table grid:** columns `minmax(88px,1fr) minmax(0,1.5fr) minmax(88px,1fr)`, rows `auto minmax(200px,1fr) auto`, areas `". n ." "w c e" ". s ."`, gap 12.
  - **Felt:** radius 32, 6px border in the felt rim, felt background, inset shadow.
  - **Contract pill:** "Избери игра" pill (40px, `bg-team-a`), or the chosen contract as symbol + "Купа · Иван". ♦ and ♥ use `text-suit-red`.
  - **Coaster:** a circle `min(100%,230px)`, `bg-s1`, 4px dashed `border-line`, 6px outer ring in `s1`. Team names are 12/800 in team colours. The total score is `clamp(28px,7.5vw,54px)`/900 with ":" between. Below it "обяви X · Y" (11px), plus "висят N" in team-b when hanging points exist.
  - **Seats:**
    - Avatar `clamp(64px,15vw,92px)`, 3px ring in the team colour, with shadow.
    - Name 15/800 with ellipsis.
    - "раздава" badge on the dealer (11/800, `bg-s3`, muted, radius 8), shown only when `settings.showDealer`.
    - Declaration chips (26px, team colour, "Терца ×", tap removes it).
    - South is reversed, with the avatar at the bottom.
  - **Bottom buttons:** grid `1.4fr 1fr`, 58px: "Край на раздаване" (primary) and "Край на мач" (`bg-s1` with a border).
- **Declarations popover (§4):**
  - A 224px card next to the avatar: below North, above South, right of West, left of East.
  - Title "<name> обявява".
  - A 2-column grid of 48px `bg-s3` buttons, each with the name and its points: Белот 2, Терца 2, Кварта 5, Квинта 10, Каре "10+". Points come from `match.rules`; for Каре the "+" suffix follows its lowest rank value.
  - Only allowed declarations appear (`allowedDeclarations`). When nothing is allowed, a message replaces the buttons: "Първо изберете играта в средата на масата." / "Без коз — не се обявява." / "Няма повече възможни обяви с 8 карти.".
  - Picking a declaration adds it and closes the popover.
- **Contract sheet (§5):**
  - A 3×2 grid of 78px tiles (radius 18): symbol 28/900, label 13/800.
  - "Кой обяви играта?": 4 buttons, each a 44px avatar + name.
  - The warning "При без коз няма обяви — записаните в това раздаване ще се изтрият." appears when No Trumps is picked and declarations exist.
  - CTA: "Изберете игра и кой я обяви" (muted, inactive), or "Готово" when opened from the table, or "Напред към точките" when opened from "Край на раздаване".
  - "Край на раздаване" without a contract opens this sheet first.
- **Deal-end sheet (§6):**
  - **Step 1 "Уточнете обявите"** appears only if sequences or fours of a kind exist. It follows the README text exactly: per-declaration cards with "до"/"от" chip rows (42px), the "зачита се"/"отпада" status when the teams clash and the clash is decided, the dashed verdicts box, and errors in team-b that block "Напред".
  - **Step 2 "Край на раздаване N"**:
    - A contract pill on the right; tapping it changes the contract.
    - The hint, then two inputs (64px, 30/900, 2px border in the team colour). Typing in one fills the other with max − value.
    - A "Капо" toggle per team.
    - The calculation grid `1.3fr 1fr 1fr`: Карти / Карти + капо, Обяви, Общо / Общо ×2, and **В мача** (26/900, team colours).
    - The verdict box: `bg-team-b` with `text-on` for "inside", `s3` for hanging, `s2` otherwise.
    - Errors block saving. "Назад" / "Запиши раздаването".
- **Clear sheet (§7) and end-match sheet (§8):** copy and buttons exactly as in the README.
- **Hit targets and buttons:** minimum hit target 44px, buttons shrink on press, no Button class overrides (add a variant or size instead).
- **Accessibility:**
  - A `PlayerAvatar` next to a visible name is `decorative`.
  - Single-choice groups (contract tiles, caller buttons, resolution chips) use `aria-pressed` for now. Phase 7 revisits this; it's in the Backlog.
  - Inputs carry labels.
- **Architecture:**
  - Game rules live only in `src/core`. The UI never recomputes scores; it calls `scoreDeal`, `resolve` and `allowedDeclarations` with `match.rules`.
  - Hooks are plain top-level statements (React Compiler).
  - Narrow `useAppStore` selectors.
  - A sheet's form mounts only while the sheet is open.
  - No `useEffect` for game logic.
- **Workflow:** TDD. `pnpm check` and `pnpm docs:check` pass at the end of every task. Conventional Commits, one commit per task, stage by explicit path, never stage `package-lock.json`. Screen tests use `resetApp()` + `renderRoute(path)` (`src/test/app.tsx`).

## File Structure

```
docs/adr/0011-resume-and-replace-matches.md   new
src/app/resume.ts (+test)                     resumePath(match)
src/main.tsx                                  navigate to resumePath after hydration
src/core/strings.ts                           table/contract/deal/clear/match/home/setup copy
src/routes/home.tsx                           "Продължи мача"
src/routes/setup.tsx                          confirm before replacing a match with deals
src/features/table/copy.ts (+test)            pure label/sentence builders
src/features/table/TableHeader.tsx
src/features/table/Seat.tsx                   avatar, name, dealer badge, chips, popover
src/features/table/Coaster.tsx
src/features/table/ContractSheet.tsx
src/features/table/DealEndSheet.tsx           steps: decls → points
src/features/table/ClearSheet.tsx
src/features/table/EndMatchSheet.tsx
src/routes/table.tsx (+test)                  composes the above
src/ui/Sheet.tsx                              + optional `aside` next to the title
```

---

### Task 1: Record the decisions (ADR 0011)

**Files:** Create `docs/adr/0011-resume-and-replace-matches.md`. Modify `docs/Status.md`, `docs/Backlog.md`, `docs/Home.md`.

- [ ] **Step 1: Write ADR 0011**

```markdown
# Resume a stored match, continue it from Home, confirm before replacing it

The handoff's prototype restores the last screen on reload but offers no way back to a match from Home, and "Нова игра" silently discards it. The product owner decided (2026-09-25):

- **App start:** with a stored match, the app opens the table (match playing) or the match-end screen (match ended) instead of Home. `resumePath(match)` in `src/app/resume.ts` decides; `main.tsx` navigates there after hydration, only when the app was opened at `/`.
- **Home:** while a match exists, Home shows "Продължи мача" above "Нова игра"; it opens the table (or the end screen if the match has ended).
- **Replacing:** "Раздавай!" on the setup screen asks for confirmation before discarding a match that is still playing and has at least one saved deal. A match with no deals, or an ended match, is replaced silently (an ended match is already in the leaderboard).
- A match is "left" (ADR 0010) only when it is replaced or when the match-end screen's "Към началния екран" is used (Phase 5c).

## Consequences

"Продължи мача" and the confirmation copy are not in the handoff; they are listed in `docs/Status.md` for the product owner.
```

- [ ] **Step 2: Update the vault**
  - **Status:** remove the "Resuming and leaving a match" open question, since it's decided. Add to Open product questions: "Copy not in the handoff: «Продължи мача», the replace-match confirmation (title, body, buttons), and the screen-reader label «Премахни …» on declaration chips — confirm in `src/core/strings.ts`." Next: "Phase 5b (table) in progress".
  - **Backlog:** in "Phase 5b", remove the resume/leave line and the "replaced without warning" line (ADR 0011 now covers them). Keep the RootLayout padding line and the DEFAULT_RULES line.
  - **Home:** list ADR 0011 under Decisions and this plan under Plans.
- [ ] **Step 3: Verify and commit.** Run `pnpm docs:check`.

```bash
git add docs/adr/0011-resume-and-replace-matches.md docs/Status.md docs/Backlog.md docs/Home.md
git commit -m "docs: ADR 0011 resume, continue and replace matches

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Table copy and pure label helpers

**Files:** Modify `src/core/strings.ts`. Create `src/features/table/copy.ts`, `src/features/table/copy.test.ts`.

**Interfaces (produced):**
- `STRINGS.contracts: Record<ContractKey, { sym: string; label: string }>`. Red suits come from core `RED_CONTRACTS`.
- `STRINGS.decls: Record<DeclKey, string>` (Белот, Терца, Кварта, Квинта, Каре).
- `STRINGS.table`, `STRINGS.contract`, `STRINGS.deal`, `STRINGS.clear`, `STRINGS.endMatch`, plus `STRINGS.home.continueMatch`, `STRINGS.setup.replaceTitle`, `STRINGS.setup.replaceBody`, `STRINGS.setup.replaceConfirm` (shapes in Step 3).
- Functions in `copy.ts`:
  - `declLabel(d: { key; top; rank }): string`
  - `declOptionPoints(key: DeclKey, rules: RulesConfig): string`
  - `headerLine(m: Match): string`
  - `contractLine(m: Pick<Match,'contract'|'caller'>, playerName: (seat: Seat) => string): string | null`
  - `pointsHint(contract: ContractKey, rules: RulesConfig): string`
  - `resolutionLines(res: Resolution, teamName: (t: Team) => string): string[]`
  - `resolutionErrors(res: Resolution): string[]`
  - `dealVerdict(score: DealScore, caller: Seat, capo: Team | null, hang: number, teamName: (t: Team) => string, rules: RulesConfig): string`
  - `calcRows(score: DealScore, capo: Team | null): { label: string; a: number; b: number }[]`
  - `teamNameOf(m: Pick<Match,'teamA'|'teamB'>): (t: Team) => string`

- [ ] **Step 1: Write the failing tests** in `src/features/table/copy.test.ts` (node environment). Cover each function with values from the prototype templates:
  - **`declLabel`:** `{key:'terca',top:'K'}` → "Терца до K", `{key:'kare',rank:'J'}` → "Каре J", `{key:'belot'}` → "Белот", `{key:'kvinta',top:null}` → "Квинта".
  - **`declOptionPoints`:**
    - With `DEFAULT_RULES`: belot → "2", kvinta → "10", kare → "10+". Kare is `${min(karePoints)}+`.
    - With custom rules where every kare value is 20: "20" (no "+" when all kare values are equal).
  - **`headerLine`:**
    - bestOf 1, target 151 → "Белот · до 151".
    - bestOf 3 with series `{A:1,B:0}`, playing → "Мач 2 · серия 1:0 · 2 от 3". Use `matchNumber` from core. The series format label comes from `STRINGS.setup.seriesOptions`.
  - **`contractLine`:** hearts with caller 0 named "Иван" → "Купа · Иван"; no contract → null.
  - **`pointsHint`:**
    - hearts → "Закръглени точки от картите с последните 10 (общо 16)."
    - at → "…(общо 26)."
    - nt → "Закръглени точки от картите (общо 13), удвояват се."
    - The max comes from `rules.maxCardPoints`, so a custom max shows up in the text.
  - **`resolutionLines`** (build `Resolution` objects via core `resolve` on real declarations):
    - A sequence clash won by A → "Поредици: зачитат се на Ние, другите отпадат."
    - A full tie → "Поредици: равни — всички отпадат."
    - A four-of-a-kind clash won by B → "Карета: зачитат се на Вие, другите отпадат."
    - Uncontested → no lines.
  - **`resolutionErrors`** maps `seq-top-missing` / `kare-rank-missing` / `kare-duplicate` to the three README sentences, in that order, with no duplicates.
  - **`dealVerdict`** (build `DealScore` via core `scoreDeal`):
    - made → "Ние изкараха играта."
    - inside → "Вътре! Вие взимат всички N точки."
    - hanging → "Висяща: Ние не записват, N т. висят за следващото раздаване."
    - Hanging points carried into a made deal append " +N висящи за Ние."
    - Capot wraps the text: "Капо за Ние (+9). <text> С капо мачът не може да приключи — играе се още едно раздаване."
  - **`calcRows`:** color without capot → labels Карти/Обяви/Общо. Capot → "Карти + капо". nt → "Общо ×2". The values are `score.cards`, `score.decl` and `score.raw`.
- [ ] **Step 2: Add the copy to `strings.ts`.** Add it verbatim from README §4–8 and the prototype templates quoted above:

```ts
  contracts: {
    clubs: { sym: '♣', label: 'Спатия' },
    diamonds: { sym: '♦', label: 'Каро' },
    hearts: { sym: '♥', label: 'Купа' },
    spades: { sym: '♠', label: 'Пика' },
    nt: { sym: 'БК', label: 'Без коз' },
    at: { sym: 'ВК', label: 'Всичко коз' },
  },
  decls: { belot: 'Белот', terca: 'Терца', kvarta: 'Кварта', kvinta: 'Квинта', kare: 'Каре' },
  table: {
    share: 'Сподели',
    clear: 'Изчисти',
    theme: 'Тема',
    history: 'История',
    deal: (n: number) => `Раздаване ${n}`,
    headerSingle: (target: number) => `Белот · до ${target}`,
    headerSeries: (matchNo: number, a: number, b: number, format: string) =>
      `Мач ${matchNo} · серия ${a}:${b} · ${format}`,
    pickContract: 'Избери игра',
    dealer: 'раздава',
    declared: (a: number, b: number) => `обяви ${a} · ${b}`,
    hanging: (n: number) => `висят ${n}`,
    declares: (name: string) => `${name} обявява`,
    blocked: {
      'no-contract': 'Първо изберете играта в средата на масата.',
      'no-trumps': 'Без коз — не се обявява.',
      'no-cards': 'Няма повече възможни обяви с 8 карти.',
    },
    endDeal: 'Край на раздаване',
    endMatch: 'Край на мач',
    // Not in the handoff: accessible name of a declaration chip's remove action.
    removeDecl: (label: string) => `Премахни ${label}`,
  },
  contract: {
    title: 'Каква е играта?',
    caller: 'Кой обяви играта?',
    ntWarning: 'При без коз няма обяви — записаните в това раздаване ще се изтрият.',
    pick: 'Изберете игра и кой я обяви',
    done: 'Готово',
    toPoints: 'Напред към точките',
  },
  deal: {
    resolveTitle: 'Уточнете обявите',
    resolveHint: 'До коя карта е всяка поредица и от какво е карето. По-слабите отпадат.',
    to: 'до',
    from: 'от',
    counts: 'зачита се',
    drops: 'отпада',
    seqWin: (team: string) => `Поредици: зачитат се на ${team}, другите отпадат.`,
    seqTie: 'Поредици: равни — всички отпадат.',
    kareWin: (team: string) => `Карета: зачитат се на ${team}, другите отпадат.`,
    errors: {
      'seq-top-missing': 'Посочете до коя карта са поредиците с еднаква дължина.',
      'kare-rank-missing': 'Посочете от какви карти е всяко каре.',
      'kare-duplicate': 'Две карета от едни и същи карти не са възможни.',
    },
    cancel: 'Отказ',
    next: 'Напред',
    pointsTitle: (n: number) => `Край на раздаване ${n}`,
    hintColor: (max: number) => `Закръглени точки от картите с последните 10 (общо ${max}).`,
    hintNt: (max: number) => `Закръглени точки от картите (общо ${max}), удвояват се.`,
    capo: 'Капо',
    rows: { cards: 'Карти', cardsCapo: 'Карти + капо', decls: 'Обяви', total: 'Общо', totalNt: 'Общо ×2', match: 'В мача' },
    made: (team: string) => `${team} изкараха играта.`,
    inside: (team: string, n: number) => `Вътре! ${team} взимат всички ${n} точки.`,
    hang: (team: string, n: number) => `Висяща: ${team} не записват, ${n} т. висят за следващото раздаване.`,
    hangTo: (n: number, team: string) => ` +${n} висящи за ${team}.`,
    capoNote: (team: string, bonus: number, text: string) =>
      `Капо за ${team} (+${bonus}). ${text} С капо мачът не може да приключи — играе се още едно раздаване.`,
    errMissing: 'Въведете точките от картите.',
    errRange: (max: number) => `Точките от картите трябва да са между 0 и ${max}.`,
    back: 'Назад',
    save: 'Запиши раздаването',
  },
  clear: {
    title: 'Изчисти',
    body: 'Текущото раздаване започва наново: обявите и избраната игра се изтриват.',
    current: (n: number) => `Изчисти раздаване ${n}`,
    undo: (n: number) => `Изтрий последното записано раздаване (${n})`,
  },
  endMatch: {
    title: 'Приключване на мача?',
    body: (a: number, b: number) =>
      `Резултат ${a} : ${b}. Обявите от текущото раздаване няма да се запишат, ако не е приключено.`,
    keep: 'Продължи',
    end: 'Приключи мача',
  },
```

  Add to `home`: `continueMatch: 'Продължи мача'`, with a "Not in the handoff (ADR 0011)" comment. Add to `setup`, all with the same comment:
  - `replaceTitle: 'Нов мач?'`
  - `replaceBody: (a: number, b: number) => \`Текущият мач (${a} : ${b}) ще бъде изтрит.\``
  - `replaceConfirm: 'Започни нов мач'`
  - `replaceCancel: 'Отказ'`

  `capoNote` takes the bonus from `rules.capoBonus` (default 9), so the text follows the match's rules.
  The clear sheet's title is not in the README. The sheet is opened by the "Изчисти" button, so reuse "Изчисти" as the dialog title.
- [ ] **Step 3: Implement `copy.ts`.** Every function is pure and composes `STRINGS` with core values. It must not score: it uses the `Resolution`/`DealScore` passed in.
- [ ] **Step 4: Run the tests and the gate, then commit.**

```bash
git add src/core/strings.ts src/features/table/copy.ts src/features/table/copy.test.ts
git commit -m "feat(table): table, contract and deal copy with pure label helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Resume on start, "Продължи мача", confirm before replacing

**Files:** Create `src/app/resume.ts`, `src/app/resume.test.ts`. Modify `src/main.tsx`, `src/routes/home.tsx`, `src/routes/home.test.tsx`, `src/routes/setup.tsx`, `src/routes/setup.test.tsx`.

**Interfaces:**
- `resumePath(match: Match | null): '/table' | '/end' | null`: `/table` when a match is playing, `/end` when it has ended, null otherwise.

- [ ] **Step 1: Write the failing tests.**
  - **`resume.test.ts`:**
    - null → null.
    - `createMatch(...)` → `/table`.
    - `endMatch(match)` → `/end`.
  - **`home.test.tsx`:**
    - Without a match there is no "Продължи мача".
    - With a playing match (via `startMatch`) there is a primary link "Продължи мача" to `/table`, above "Нова игра".
    - With an ended match (`endMatch`), the link goes to `/end`.
  - **`setup.test.tsx`:**
    - A playing match with ≥1 saved deal: filling the seats and pressing "Раздавай!" opens the dialog "Нов мач?" with the body "Текущият мач (A : B) ще бъде изтрит.". "Отказ" keeps the old match (same seats and games). "Започни нов мач" replaces it and navigates to `/table`.
    - A playing match with no deals is replaced without a dialog.
    - An ended match is replaced without a dialog.
    - Seed deals with `setContract` + `saveDeal({cardPointsA: 10, capo: null})`.
- [ ] **Step 2: Implement.**
  - **`resume.ts`:** a pure function over `match.status`.
  - **`main.tsx`:** after `hydrateAppStore()` resolves and `syncTheme` runs, but before render:

```ts
const path = resumePath(appStore.getState().match);
if (path && window.location.pathname === '/') void router.navigate(path, { replace: true });
```

  - **Home:** `const resume = useAppStore((s) => resumePath(s.match));`. `resumePath` returns a primitive string, so the selector is stable. When it's non-null, render `<PreloadLink to={resume} className={buttonClass('primary', 'lg')}>{S.continueMatch}</PreloadLink>` above "Нова игра". Make "Нова игра" `secondary`/`lg` in that case, so only one primary CTA shows.
  - **Setup:** `start()` checks whether `match.status === 'playing' && match.games.length > 0` (read via `appStore.getState()` at click time). If so, open a confirmation `Sheet` (title `S.replaceTitle`, body `S.replaceBody(totals)`, buttons "Отказ" (secondary) and "Започни нов мач" (variant `danger`)). Otherwise start at once. Confirming calls the existing start path. Compute the totals with core `totals(match)`.
- [ ] **Step 3: Run the tests and the gate, then commit.**

```bash
git add src/app/resume.ts src/app/resume.test.ts src/main.tsx src/routes/home.tsx src/routes/home.test.tsx src/routes/setup.tsx src/routes/setup.test.tsx
git commit -m "feat(app): resume stored match, continue from home, confirm replacing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Table screen: header, felt, seats, coaster, bottom buttons

**Files:** Create `src/features/table/TableHeader.tsx`, `src/features/table/Seat.tsx`, `src/features/table/Coaster.tsx`. Modify `src/routes/table.tsx`. Create `src/routes/table.test.tsx`. Modify `src/ui/Sheet.tsx` (optional `aside`).

**Interfaces:**
- `Table` keeps its name (eager route). With no match it redirects to `/` via `<Navigate to="/" replace />`.
- `Seat({ seat, player, team, isDealer, decls, onAvatar, onRemoveDecl, anchorRef })`. `decls` is the current match's declarations for this seat.
- `Sheet` gains `aside?: ReactNode`, rendered right of the title in the same row (Task 8's contract pill).

- [ ] **Step 1: Write the failing tests** (`table.test.tsx`). Seed 4 players and `startMatch` with names Иван/Петър/Мария/Гошо, then `renderRoute('/table')`.
  - **Header:** "Белот · до 151" and "Раздаване 1". With bestOf 3, "Мач 1 · серия 0:0 · 2 от 3".
  - **Header buttons:** "Изчисти", "Тема" and "История" are present, and "Сподели" is disabled (Phase 6).
  - **Seats:** the four names are shown.
  - **Dealer badge:** "раздава" is next to North on deal 1 (`DEAL_ORDER[0] = 0`). After one saved deal it's next to West. With `updateSettings({ showDealer: false })` no badge shows.
  - **Coaster:** "Ние" and "Вие" with the totals "0" and "0". After a saved hearts deal (A 10), the totals update to 10 : 6. "обяви 0 · 0" is shown. With hanging points, "висят N" appears.
  - **Chips:** with a declaration added via the store (`setContract('hearts',0)`, `addDeclaration(0,'terca')`), North shows a chip "Терца". Tapping its remove button (accessible name "Премахни Терца") removes it.
  - **Contract pill:** without a contract it's the button "Избери игра". With hearts/caller 0 it shows "Купа · Иван".
  - **Bottom:** "Край на раздаване" and "Край на мач" buttons are present.
  - **No match:** with no match, `/table` redirects to Home (heading "Белот").
- [ ] **Step 2: Implement.** Follow the Global Constraints for every size and colour.
  - **Seat:**
    - The avatar is a `<button>` (accessible name = player name) wrapping a decorative `PlayerAvatar` with ring `a`/`b` and size via `style={{ width: 'clamp(64px,15vw,92px)' }}`. `PlayerAvatar` takes a numeric `size`; if clamp sizing needs it, add a `className`/`style` passthrough to `Avatar`. Keep it minimal and mention it in the report.
    - Chips are `Chip size="sm" tone={team==='A'?'a':'b'}` with the text `declLabel(d)` plus a "×" glyph (aria-hidden) and `aria-label={STRINGS.table.removeDecl(label)}`.
    - South renders its column reversed.
  - **Coaster:** the circle, names, totals (`totals(match)`), `currentDeclarationSum(match)` and `match.hang`.
  - **Table:**
    - The `grid-template-areas` grid, with the felt using `feltStyle(settings.felt)`.
    - The contract pill button opens the contract sheet (wired in Task 6; for now a no-op `onClick` with `// wired in Task 6` is acceptable, as long as the button renders).
    - "Тема" opens `ThemeSheet`. "История" is a `PreloadLink` to `/history` with a count badge (`match.games.length`, hidden at 0).
    - "Изчисти", "Край на раздаване" and "Край на мач" are wired in Tasks 6–9. Render them now with no-op handlers.
  - **Selectors:** `useAppStore((s) => s.match)` returns the match object, which is fine: it only changes on store writes. Plus the settings fields and the roster.
- [ ] **Step 3: Run the tests and the gate, then commit.**

```bash
git add src/features/table src/routes/table.tsx src/routes/table.test.tsx src/ui/Sheet.tsx
git commit -m "feat(table): table screen with seats, coaster and header

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Add `src/ui/Avatar.tsx` and any test file you changed to the `git add` list.

---

### Task 5: Declarations popover

**Files:** Modify `src/features/table/Seat.tsx`, `src/routes/table.tsx`, `src/routes/table.test.tsx`.

- [ ] **Step 1: Write the failing tests.**
  - With no contract, tapping "Иван" opens the dialog "Иван обявява" with the text "Първо изберете играта в средата на масата." and no declaration buttons.
  - With `nt`: "Без коз — не се обявява.".
  - With hearts, the options are "Белот 2", "Терца 2", "Кварта 5", "Квинта 10" and "Каре 10+". Accessible names are name + points; compose them visually as the mockup shows.
  - Picking "Терца" adds a terca for seat 0, closes the popover, and the chip appears.
  - After a quinte and a quarte (9 of 8 cards used), only Белот remains. After that belot plus one more, "Няма повече възможни обяви с 8 карти.".
  - The popover placement per seat is `below` (N), `above` (S), `right` (W) and `left` (E). Assert the `placement` prop via a data attribute, since happy-dom can't lay it out.
- [ ] **Step 2: Implement.**
  - One `Popover` per seat (or one shared one) anchored to that seat's avatar button.
  - The options come from `allowedDeclarations(match, seat)`. Points come from `declOptionPoints(key, match.rules)`.
  - A pick calls the store's `addDeclaration(seat, key)` and closes.
  - The table owns the popover state `openSeat: Seat | null`.
- [ ] **Step 3: Run the tests and the gate, then commit** as `feat(table): declarations popover per seat` (add the files by path).

---

### Task 6: Contract sheet

**Files:** Create `src/features/table/ContractSheet.tsx`, `src/features/table/contract-sheet.test.tsx`. Modify `src/routes/table.tsx`.

**Interfaces:** `ContractSheet({ open, mode: 'set' | 'toPoints', onClose, onConfirmed })`. It reads the match from the store and calls `setContract(contract, caller)` on confirm. It pre-selects the current contract and caller. `onConfirmed()` fires after `setContract`; the table uses it in `toPoints` mode to open the deal-end sheet.

- [ ] **Step 1: Write the failing tests.**
  - It opens from the contract pill with the title "Каква е играта?".
  - It shows the six tiles "♣ Спатия" … "ВК Всичко коз", with ♦ and ♥ in `text-suit-red`, and 4 caller buttons with the players' names.
  - The CTA is "Изберете игра и кой я обяви" and does nothing until both a contract and a caller are picked. Then it reads "Готово" (mode `set`) and saves `match.contract`/`caller`.
  - Picking "Без коз" when declarations exist shows the warning. Confirming clears the declarations (core `setContract` does this).
  - Opened via "Край на раздаване" without a contract, the CTA reads "Напред към точките". Confirming opens the deal-end sheet (tested in Task 7/8, where it's wired).
- [ ] **Step 2: Implement.** The local form state (`picked`, `caller`) mounts only while the sheet is open. The tiles and caller buttons use `aria-pressed`. Callers use a decorative `PlayerAvatar` at 44px.
- [ ] **Step 3: Run the tests and the gate, then commit** as `feat(table): contract sheet`.

---

### Task 7: Deal-end sheet, step 1 (resolution)

**Files:** Create `src/features/table/DealEndSheet.tsx`, `src/features/table/deal-end-sheet.test.tsx`. Modify `src/routes/table.tsx`.

**Interfaces:** `DealEndSheet({ open, onClose, onChangeContract, onSaved })`. It holds `step: 'decls' | 'points'` and starts at `decls` when the current deal has any sequence or four of a kind, otherwise at `points`. `onSaved(ended: boolean)` fires after a successful save (Task 8).

- [ ] **Step 1: Write the failing tests.**
  - **Entry from the table:** "Край на раздаване" with a contract opens this sheet; without a contract it opens the contract sheet in `toPoints` mode first.
  - **Step 1 layout:** with a terca for North and one for East, the title is "Уточнете обявите" with the hint text. There is one card per sequence or four of a kind, each with the player name, "Терца · 2", the prefix "до" and chips 9 10 J Q K A (tops from core `validTops`). A four of a kind shows "от" + Q K 10 A 9 J.
  - **Blocking error:** with equal-length sequences on both teams and no tops set, the error "Посочете до коя карта са поредиците с еднаква дължина." shows and "Напред" does nothing.
  - **Resolving:** picking K for North and Q for East shows "зачита се" on North, "отпада" on East, and the verdict line "Поредици: зачитат се на Ние, другите отпадат.". "Напред" moves to step 2 (the title "Край на раздаване 1").
  - **Chip toggle:** picking a selected top chip again clears it (`updateDeclaration(id, { top: null })`). Rank chips set the rank.
  - **Cancel:** "Отказ" closes the sheet and keeps the declarations and their tops/ranks.
- [ ] **Step 2: Implement step 1.**
  - Resolve with `resolve(match.current, match.rules)`.
  - Chip taps call the store's `updateDeclaration`.
  - The status shows only when `res.contested.seq` (or `.kare`) is true and the winner is decided (`seqWinner !== null` or `kareWinner !== null`).
  - Copy comes from `resolutionLines` / `resolutionErrors`.
  - Leave step 2 as a heading placeholder until Task 8.
- [ ] **Step 3: Run the tests and the gate, then commit** as `feat(table): deal end step 1, resolving declarations`.

---

### Task 8: Deal-end sheet, step 2 (points and save)

**Files:** Modify `src/features/table/DealEndSheet.tsx`, `src/features/table/deal-end-sheet.test.tsx`, `src/routes/table.tsx`.

- [ ] **Step 1: Write the failing tests.**
  - **Layout:** a hearts deal with no sequences opens straight at step 2. The title is "Край на раздаване 1" with the pill "♥ Купа" beside it (via `Sheet` `aside`). Tapping the pill opens the contract sheet; after confirming it returns to step 2.
  - **Hint:** hearts shows "(общо 16)"; nt shows the "удвояват се" hint.
  - **Inputs:** typing 10 in the "Ние" input shows 6 in the "Вие" input, and typing 4 in "Вие" shows 12 in "Ние". The inputs are labelled by team name.
  - **Calculation:** the table shows Карти 10/6, Обяви 0/0, Общо 10/6, В мача 10/6, and the verdict "Ние изкараха играта.".
  - **Inside:** with caller East (team B) and A 10 → "Вътре! Ние взимат всички 16 точки.", and the verdict box has the inside styling (`data-verdict="inside"`).
  - **Hanging:** with hearts, caller 0 and A 8 → "Висяща: Ние не записват, 8 т. висят за следващото раздаване.".
  - **Capot:** pressing "Капо" for Ние sets the inputs to 16/0, the row label reads "Карти + капо", and the verdict starts "Капо за Ние (+9).". Pressing it again clears capot.
  - **Errors:** an empty input shows "Въведете точките от картите." and a value of 17 shows "Точките от картите трябва да са между 0 и 16.". Both block saving.
  - **Save:** "Запиши раздаването" saves through the store. Afterwards the table shows "Раздаване 2" and the new totals, and the sheet closes.
  - **Auto-end:** set `settings.rules.targetScore` to 10 before `startMatch`. After a winning save, the app navigates to `/end` (heading "Край на мача").
  - **Back:** "Назад" returns to step 1 when step 1 applied, otherwise closes the sheet.
- [ ] **Step 2: Implement step 2.**
  - **Local state:** `cardA: string` (raw input) and `capo: Team | null`.
  - **Inputs:** the B input is derived (`max − A`), and typing in B sets A to `max − B`. Use `inputMode="numeric"`.
  - **Preview:**

```ts
scoreDeal(
  { contract, caller, decls: match.current, hang: match.hang, cardPointsA: parsed, capo },
  match.rules,
)
```

    `parsed` is `null` for empty or non-integer input, so `scoreDeal` reports `points-missing`. The verdict comes from `dealVerdict`, the rows from `calcRows`, and error copy maps `score.error`.
  - **Save:** call the store's `saveDeal({ cardPointsA: parsed, capo })`. On `ok`, call `onSaved(result.ended)`. The table then closes the sheet and, if `ended`, calls `navigate('/end')`.
- [ ] **Step 3: Run the tests and the gate, then commit** as `feat(table): deal end step 2, points and save`.

---

### Task 9: Clear sheet and end-match sheet

**Files:** Create `src/features/table/ClearSheet.tsx`, `src/features/table/EndMatchSheet.tsx`, `src/features/table/table-sheets.test.tsx`. Modify `src/routes/table.tsx`.

- [ ] **Step 1: Write the failing tests.**
  - **Clear sheet:**
    - "Изчисти" opens it with the body text and "Изчисти раздаване 1". That button clears the current declarations and contract (`clearCurrentDeal`) and closes the sheet.
    - With no saved deals there is no undo button.
    - After one saved deal, "Изтрий последното записано раздаване (1)" undoes it (`undoLastDeal`), restores the previous hanging points, and closes the sheet.
  - **End-match sheet:**
    - "Край на мач" opens "Приключване на мача?" with "Резултат X : Y. Обявите от текущото раздаване няма да се запишат, ако не е приключено.".
    - "Продължи" closes the sheet.
    - "Приключи мача" calls `endMatch` and navigates to `/end`. The match is recorded in stats only if it has deals (existing store behaviour).
- [ ] **Step 2: Implement.** Use the README copy through `STRINGS.clear` / `STRINGS.endMatch`. The undo button is Button variant `danger`. "Приключи мача" needs a filled team-b look: add a Button variant `dangerFilled` (`bg-team-b text-on`) rather than overriding classes.
- [ ] **Step 3: Run the tests and the gate, then commit** as `feat(table): clear and end-match sheets`.

---

### Task 10: Browser check and vault update

- [ ] **Step 1: Browser check** (controller, Playwright at 390×844; screenshots stay out of the repo):
  1. Resume: reopening `/` with a stored match lands on `/table`. Home shows "Продължи мача".
  2. Compare the table against `04-masa.png`.
  3. Open the popover per seat and compare against `05-obyavi-popover.png`. Check it's placed on the correct side and closes on an outside tap.
  4. Compare the contract sheet against `06-izbor-na-igra.png`.
  5. Play a deal with a contested terca (compare step 1 against `07`/`08`) and points (compare against `09`). Check the auto-fill and capot.
  6. Play hanging and inside deals; check that "висят" shows on the coaster.
  7. Use Clear and undo.
  8. End the match by hand and land on `/end`.
  9. With a low target, the match auto-ends.
  10. Setup asks before replacing a match with deals.
  11. Reload keeps the in-progress deal.
  12. The console shows no errors except the favicon 404.
- [ ] **Step 2: Vault update.**
  - **Status:** 5b done. Next: the Phase 5c plan (end screen, history, leaderboard, failed-load screen, save-error banner).
  - **Backlog:** add anything deferred. Remove the 5b lines that are done.
  - **Architecture/Overview:** add the `src/features/table/` note and the `copy.ts` pattern (pure copy builders over core results).
  - **Roadmap:** tick 5b.
  - Run `pnpm docs:check && pnpm check` and commit as `docs: phase 5b vault update`.
