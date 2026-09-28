# Phase 7: PWA & Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Ship v1: installable PWA with icons and offline support (killing the favicon 404), 150–200 ms sheet/popover exit transitions, the backlog's accessibility pass, the four product decisions of 2026-09-28 (keep «← Начало»; symbol-only step-2 pill; pending copy accepted; the save-error banner self-clears), a committed Playwright happy path, and a bundle budget.

**Architecture:**
- `vite-plugin-pwa@1.3.0` (supports Vite 8) with `registerType: 'autoUpdate'` and Workbox precaching; icons are generated once by a committed `sharp` script from an in-repo SVG, outputs committed to `public/`.
- Exit animations stay in CSS (`sheet-out`/`pop-out`), driven by a `data-closing` phase in `Sheet`/`Popover` before the native `close()`; `prefers-reduced-motion` skips them.
- The a11y pass converts the single-choice groups to real radiogroup semantics by extending the existing primitives (`Chip` gains a `choice` mode; the arrow-key roving logic follows `Segmented`'s pattern).
- Playwright e2e lives in `e2e/` with its own config against `vite preview`; implementers WRITE specs but never run browsers — the controller executes them (Task 7).

**Tech Stack:** React 19 + React Compiler, Tailwind v4 tokens, Zustand, Vitest + happy-dom + RTL, `vite-plugin-pwa@1.3.0`, `sharp@0.35.5` (dev), `@playwright/test@1.63.0` (dev).

**Spec:** the roadmap's Phase 7 row (`docs/superpowers/plans/2026-09-25-roadmap.md`), the Backlog's "Phase 7: PWA & polish" section (its lines are requirements here), `docs/design-handoff/README.md` (copy stays final), ADRs 0004 (tokens), 0006, 0012. Product decisions (2026-09-28, recorded in Status by Task 7): keep «← Начало»; step-2 contract pill becomes symbol-only; all pending copy/behaviour questions accepted as built; the save-error banner clears on a later successful write.

## Global Constraints

- **No copy changes.** The manifest name/short_name are `Белот` (already `STRINGS.appName`); no new user-facing strings anywhere.
- **Pinned deps:** `vite-plugin-pwa@1.3.0`, `sharp@0.35.5` (dev), `@playwright/test@1.63.0` (dev). Exact versions, no `^`.
- **Icons are deterministic and committed:** `scripts/icon.svg` (source) + `scripts/make-icons.mjs` (sharp) → `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, `public/apple-touch-icon.png` (180), `public/favicon.svg`. The script is idempotent; outputs are committed.
- **Colours come from `src/core/tokens.ts`** (pub theme: bg `oklch(0.19 0.03 50)`, `a`/`b` team colours) — hardcode the resolved values in the SVG with a comment naming the source.
- **The theme resets Tailwind's palette:** only theme tokens or arbitrary values (`bg-[#000]`) exist. `aspect-*` and layout utilities are unaffected.
- **Hooks are plain top-level statements** (React Compiler). No `import()` expression and no `try/finally` inside a component body (both bail the compiler — see Overview Gotchas); dynamic imports go through module-scope helpers.
- **Overlay contract holds:** callers own `open`; `onClose` fires only for user dismissal while open; late native events are ignored. The new closing phase must not re-fire `onClose`.
- **Implementers never run Playwright or any browser.** Task 5 writes specs and config only; `pnpm exec playwright install` and every run belong to the controller (Task 7).
- **Tests:** store-action seeding; stubs restored; behavioural queries. `pnpm check` green per task (it must NOT grow a build step). Conventional Commits, one commit per task, subject + blank line + `Co-Authored-By` trailer; stage by explicit path; never `package-lock.json`.

---

### Task 1: PWA shell — icons, manifest, service worker, theme-color

**Files:**
- Create: `scripts/icon.svg`, `scripts/make-icons.mjs`, `public/` outputs (per Global Constraints)
- Modify: `package.json` (deps + `"icons": "node scripts/make-icons.mjs"` script), `vite.config.ts`, `index.html`, `src/main.tsx`, `src/vite-env.d.ts` (or the existing env dts), `src/ui/theme.ts`, `src/ui/theme.test.ts`

**Steps:**
- [x] **Icon.** `scripts/icon.svg`: a 512×512 rounded square (radius 96) filled with the pub background `oklch(0.19 0.03 50)`, carrying a large ♠ glyph in the team-a amber and a smaller offset ♥ in team-b red (pull both exact values from `src/core/tokens.ts` and cite them in an SVG comment). Text-free. `scripts/make-icons.mjs` uses `sharp` to render the four PNGs (the maskable variant re-renders with the artwork scaled to 80% inside a full-bleed background) and copies the SVG to `public/favicon.svg`. Run it; commit outputs.
- [x] **Manifest + SW.** In `vite.config.ts` add `VitePWA({ registerType: 'autoUpdate', includeAssets: ['favicon.svg', 'apple-touch-icon.png'], manifest: { name: 'Белот', short_name: 'Белот', description: 'Записва обявите и точките, докато вие играете.', lang: 'bg', start_url: '/', display: 'standalone', background_color: <pub bg as hex — convert the oklch once, comment it>, theme_color: <same>, icons: [192 any, 512 any, 512 maskable] } })`. Workbox defaults precache the built assets; add `navigateFallback: '/index.html'`. Check the plugin's current option names via context7 if unsure.
- [x] **Registration.** In `main.tsx`: `import { registerSW } from 'virtual:pwa-register'; registerSW();` (autoUpdate needs no UI). Add the `vite-plugin-pwa/client` types reference so `tsc -b` accepts the virtual module.
- [x] **`index.html`:** `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`, `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`, a static `<meta name="theme-color">` with the pub value.
- [x] **Live theme-color.** `syncTheme` (`src/ui/theme.ts`) also writes the current theme's `bg` into the `meta[name=theme-color]` element when present. Extend `theme.test.ts`: after a theme change the meta content equals that theme's `bg`.
- [x] **Verify:** `pnpm check` green; `pnpm build` emits `dist/sw.js` and `dist/manifest.webmanifest`, and the entry chunk did not grow past the Task 6 budget. Report both. Remove `dist/`.
- [x] **Commit** `feat(pwa): installable app with icons, manifest and offline service worker`.

### Task 2: Exit transitions and the closing-title freeze

**Files:**
- Modify: `src/ui/Sheet.tsx`, `src/ui/Popover.tsx`, `src/index.css`, `src/ui/overlays.test.tsx`, `src/features/table/DealEndSheet.tsx`, `src/features/table/deal-end-sheet.test.tsx`

**Steps:**
- [x] **CSS:** add `sheet-out` (180 ms ease-in, translateY down + fade, the reverse of `sheet-in`) applied by `dialog.sheet[data-closing]`, and `pop-out` (150 ms) for the popover. Both inside the existing `prefers-reduced-motion` override (animation: none).
- [x] **Sheet:** when `open` flips false while the dialog is open, set `data-closing`, listen once for `animationend` (matching the animation name), then remove the attribute and call `dialog.close()`. A 250 ms `setTimeout` fallback covers reduced-motion/happy-dom (clear both on cleanup and on reopen). Reopening mid-close cancels the closing phase. The user-dismissal path (`Esc`/backdrop) already goes through `onClose` → the caller flips `open` — the closing phase must not call `onClose` again (the existing `if (open)` guard keeps holding because the native `close` now fires when `open` is already false).
- [x] **Popover:** same phase with `pop-out`; hidePopover after.
- [x] **Tests (`overlays.test.tsx`):** closing a sheet keeps the dialog open with `data-closing`, then a dispatched `animationend` (or advancing fake timers past 250 ms) closes it; reopening mid-close ends up open without `data-closing`; `onClose` is NOT called during a programmatic close. Fix any existing tests that assumed the instant close.
- [x] **Title freeze:** `DealEndSheet` snapshots the deal number when `open` turns true (extend the existing adjust-on-open block) and builds `S.pointsTitle` from the snapshot, so the title holds while the sheet animates out after a save. Test: save a deal, flip `open` false, assert the rendered title still names the saved deal's number.
- [x] **Verify** `pnpm check`; **commit** `feat(ui): sheet and popover exit transitions with a stable closing title`.

### Task 3: Accessibility pass — radio groups, hit areas, landmarks, headings

**Files:**
- Modify: `src/ui/Chip.tsx`, `src/ui/controls.test.tsx`, `src/features/players/RegisterSheet.tsx` (+test), `src/features/settings/ThemeSheet.tsx` (+test), `src/features/table/ContractSheet.tsx` (+test), `src/features/table/DealEndSheet.tsx` (+test), `src/features/table/Seat.tsx`, `src/routes/table.test.tsx`, `src/routes/history.tsx` (+test), `src/routes/stats.tsx` (+test), `src/features/table/TableHeader.tsx`

**Steps (each converted group follows Segmented's pattern: container `role="radiogroup"` with an accessible name, options `role="radio"` + `aria-checked`, roving tabindex, arrow keys move selection and focus, wrapping):**
- [x] **Chip `choice` mode:** a new optional `choice?: boolean`; when set with `selected`, Chip renders `role="radio"` + `aria-checked` instead of `aria-pressed`. Keep the tri-state `selected` contract for the existing toggle callers. Hit area: `sm` chips gain `relative before:absolute before:-inset-[9px] before:content-['']` so the touch target reaches 44px while the visual size stays 26px. Tests in `controls.test.tsx`.
- [x] **Groups to convert:** the register sheet's emoji grid (name: `STRINGS.register.icon`), the theme sheet's theme and felt tile groups (keep the `fieldset`/`legend`, put the radiogroup on the inner grid), the contract sheet's game tiles (`STRINGS.contract.title`... use `pick`/existing legend text as the name — no new strings) and caller buttons (`STRINGS.contract.caller`), and the resolve cards' card chips (each row is its own radiogroup named by the card's label text via `aria-labelledby`). Update every affected test from `aria-pressed`/button queries to `radio`/`radiogroup` queries.
- [x] **Seats:** `Seat.tsx`'s `<section aria-label>` becomes `role="group"` (keep the element, add the role). Update `table.test.tsx`'s region queries to `group`.
- [x] **History link name:** in `TableHeader`, give the history `PreloadLink` `aria-label={S.history}` and mark the count badge `aria-hidden`, so it announces «История», not «История 1». Update the test that queries it by name.
- [x] **Headings:** history's deal cards and the in-progress card use `h2` (not `h3`); stats' row names likewise `h2`. Update their tests.
- [x] **Focus return:** picking a declaration or removing a chip returns focus to that seat's avatar button (`anchors[seat].current?.focus()` in `table.tsx`'s handlers). Tests: after `onPickDecl`/remove, `document.activeElement` is the avatar button.
- [x] **Verify** `pnpm check`; **commit** `feat(a11y): radio-group semantics, hit areas, landmarks and focus return`.

### Task 4: Save-error self-clear and the symbol-only step-2 pill

**Files:**
- Modify: `src/store/app-store.ts`, `src/store/app-store.test.ts`, `src/features/table/DealEndSheet.tsx` (the `StepPill`), `src/features/table/deal-end-sheet.test.tsx`, `docs/Backlog.md` (delete the two decided lines)

**Steps:**
- [x] **Self-clear (test first):** in the persist `setItem` wrapper, a successful write flips `saveError` back to false when it was true:
```ts
      try {
        await deps.storage.setItem(name, value);
        if (store.getState().saveError) store.setState({ saveError: false });
      } catch {
        if (!store.getState().saveError) store.setState({ saveError: true });
      }
```
  Test (`app-store.test.ts`, following its rejecting-storage harness): a write fails → `saveError` true; the next successful write → false. Mind the write-count assertions in the existing tests.
- [x] **Symbol-only pill (test first):** `StepPill` renders only `STRINGS.contracts[contract].sym` (♣/♦/♥/♠/БК/ВК) with the existing suit colouring, and carries `aria-label={`${sym} ${label}`}` so the accessible name keeps the full game. It no longer wraps under the title at 390px (product decision 2026-09-28). Update the tests that asserted the full label; add one asserting the accessible name.
- [x] **Verify** `pnpm check`; **commit** `feat(table): symbol-only contract pill; saves clear the error banner`.

### Task 5: Playwright specs (write only — never run)

**Files:**
- Create: `playwright.config.ts`, `e2e/happy-path.spec.ts`, `e2e/dev-ui.spec.ts`
- Modify: `package.json` (`"e2e": "playwright test"`, devDep), `.gitignore` (`playwright-report/`, `test-results/`)

**Steps:**
- [x] **Config:** chromium only, `workers: 1`, `webServer: { command: 'pnpm build && pnpm preview --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: !process.env.CI }`, `use: { baseURL, viewport: { width: 390, height: 844 } }`. `testDir: 'e2e'`.
- [x] **`happy-path.spec.ts`** (each test gets a fresh context; storage is per-context):
  1. Register four players, start a 1-match game, play two deals (one with a declaration resolved), end at the target → the end screen shows the winner; «Реванш» returns to the table; the leaderboard lists four players.
  2. Share → «Копирай линк» (stub `navigator.clipboard` via `context.addInitScript`) → open the link in a SECOND context → the import preview shows → «Добави и продължи мача тук» lands on `/table` with the same score.
  3. Reload mid-match resumes to `/table` (ADR 0011).
- [x] **`dev-ui.spec.ts` smoke** (dev-only route exists only in dev — run this spec against the DEV server instead: give it its own `test.describe` guarded by a `DEV_UI` env flag and document `DEV_UI=1 pnpm exec playwright test e2e/dev-ui.spec.ts --config …` in a comment; default runs skip it): switch every theme, open/close a sheet with Esc, open both popover placements.
- [x] **Verify WITHOUT running a browser:** give `e2e/` its own `e2e/tsconfig.json` (extending the root options, types `["@playwright/test", "node"]`) and typecheck it explicitly with `pnpm exec tsc --noEmit -p e2e` — do NOT add it to `pnpm check` or the root tsconfigs. Then `pnpm exec playwright test --list` (it only parses specs; it must not download or launch a browser — if it tries, abort it and note that in the report; the controller validates the run in Task 7).
- [x] **Commit** `test(e2e): playwright happy path and dev-ui smoke`.

### Task 6: Bundle budget

**Files:**
- Create: `scripts/bundle-check.mjs`
- Modify: `package.json` (`"bundle": "vite build && node scripts/bundle-check.mjs"`)

**Steps:**
- [x] `bundle-check.mjs` gzips every `dist/assets/*.{js,css}` with `node:zlib` and enforces: entry (`index-*.js`) ≤ 105 kB gz (baseline 92.35), CSS ≤ 10 kB gz, every lazy chunk ≤ 50 kB gz, total JS ≤ 210 kB gz. On breach: list offenders, exit 1; on pass: print a one-line table. No deps.
- [x] Run `pnpm bundle` once; paste the table into the report; remove `dist/`.
- [x] **Commit** `chore(build): bundle size budget`.

### Task 7: Controller — run e2e, PWA verification, browser polish check, vault

- [x] **e2e:** `pnpm exec playwright install chromium`, then `pnpm e2e`. Failures go back to the Task 5 implementer as fix rounds.
- [x] **PWA:** against `pnpm preview`: the manifest loads, the SW registers, and an offline reload of `/` still renders (Playwright `context.setOffline(true)`). The tab shows the new favicon; no console 404.
- [x] **Polish:** sheets visibly animate out; the step-2 pill stays beside the title for «Всичко коз» at 390px; radios arrow-navigate in the contract sheet; the leaderboard/history headings and the «История» link announce correctly (aria snapshot).
- [x] **Vault:** Status — Phase 7 done, v1 feature-complete; record the four 2026-09-28 decisions and CLOSE the corresponding open questions (they were accepted as built); known gaps updated (favicon 404 gone; real-device scan still pending). Backlog — delete every line Phase 7 fixed (the a11y section, the deal-end title line, the Playwright line, the two decided lines already removed by Task 4); keep what remains honestly. Roadmap — Phase 7 ✅ (all phases done). Tick this plan. `pnpm docs:check && pnpm check`; commit `docs: phase 7 vault update`.
