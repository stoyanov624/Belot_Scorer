# React Native handover

How to build the React Native version of Belot Scorer on top of what exists. The web app is v1-complete (all roadmap phases ✅); this document says what ports untouched, what needs a thin adapter, what must be rebuilt, and which contracts and gotchas must survive the port. It was written at commit `34d8201` (2026-09-28).

**Read first:** [Home](Home.md) → [Status](Status.md) → `CONTEXT.md` (the domain vocabulary — use its names) → the [ADR list](Home.md). The architecture rationale is in [Architecture/Overview](Architecture/Overview.md); this document doesn't repeat it.

## The one-sentence architecture

Everything that *is* Belot lives in pure, platform-free TypeScript (`src/core`, [ADR 0001](adr/0001-single-vite-app-with-isolated-core.md), [ADR 0002](adr/0002-pure-core-transitions-thin-zustand-store.md)); the platform layers around it are thin and were built to be swapped. The RN port keeps the middle and replaces the edges.

## Ports untouched (copy the files, run the tests)

| What | Where | Notes |
|---|---|---|
| The whole domain | `src/core/` | Schemas (Zod v4), rules, declarations, resolution, scoring, match/series lifecycle, roster, leaderboard, share payload v2 + QR chunking + scan assembly (`readScanText`), import merge/take/replace, settings, persisted-document format + migrations, theme tokens (`tokens.ts`), ALL Bulgarian copy (`strings.ts`). Imports only `zod` and core modules; no `Date`, no DOM, no randomness — ids and timestamps are passed in. |
| Core tests | `src/core/*.test.ts` | Node-environment Vitest; they run under any JS runner. The golden scoring cases (`src/core/testing/golden-deals.ts`, reviewed in [golden-deals](golden-deals.md)) are the scoring authority — port them first and keep them green forever. |
| Copy formatters | `src/features/*/copy.ts` (+ tests) | Pure functions over core results (table verdicts, history entries, end summary, leaderboard sub lines, share/import lines). They import only core. The UI never words anything itself. |
| Id generation | `src/lib/id.ts` | `nanoid(10)`; nanoid works in RN (use `nanoid/non-secure` or polyfill `crypto.getRandomValues` via `react-native-get-random-values`). |
| QR generation | `qrcode-generator` | Pure JS. On RN, skip `createDataURL` and render the matrix yourself (`make()` + `getModuleCount()`/`isDark()` into SVG rects via `react-native-svg`), or use any QR component fed the same `qrTexts(...)` strings. |

## Ports with a thin adapter (keep the interface, swap the implementation)

- **`src/storage/kv.ts` — the `Kv` interface** (`get/set/del` of `unknown` by string key) is the single storage seam. Web implements it with `idb-keyval`; RN implements it with MMKV, expo-sqlite/kv-store, or files. `memoryKv` (tests) ports as-is.
- **`src/storage/document.ts`** — the versioned document store with the **write gate** ([ADR 0006](adr/0006-gate-persistence-writes-until-load.md): no write before a successful load; a corrupt document is backed up under `backupKey`, loads fail into the recovery screen). It's generic over `Kv` — port unchanged.
- **`src/storage/photos.ts` — `PhotoStore`** (`put/get/remove`, [ADR 0003](adr/0003-indexeddb-with-photo-blobs.md)) is typed around web `Blob`s. On RN, re-type the same three-method interface around file URIs or base64 strings and store photos as files; `Player.photo` stays an opaque id either way. This is the one interface whose *types* change.
- **`src/store/` — the Zustand store** works on RN as-is (`zustand` is platform-neutral). Its only platform knowledge is injected through `AppDeps`: `{ storage, newId, now, putPhoto, removePhoto }` (`src/store/app-store.ts`) — rebuild `src/store/instance.ts` for RN wiring and nothing else. The persist wrapper's save-error semantics (flag on failure, self-clear on the next success) live here and port with it. Store tests port with a `memoryKv`-backed harness exactly like `roster-actions.test.ts`.
- **`src/share/codec.ts` — the payload codec** is the deliberate platform seam for encoding ([DATA_MODEL §4](design-handoff/DATA_MODEL.md)): JSON → deflate-raw → base64url with a `z` prefix (`j` = uncompressed). Web uses `CompressionStream`/`btoa`; RN reimplements the same four functions (`encodeShare`, `decodeShare`, `readShared`, `parseSharedFile`) with `pako` (`deflateRaw`/`inflateRaw`) and a base64 lib; the module's fifth export, `shareFileName`, is pure date formatting and ports as-is. **Keep the prefixes and the exact pipeline — this is the wire format that makes web↔RN links interoperable.** `src/share/photos.ts` (`attachPhotos`/`dataUrlToBlob`) adapts alongside `PhotoStore`'s types.

## Rebuild per platform (web-only by design)

| Web | RN counterpart |
|---|---|
| `src/ui/Sheet.tsx`/`Popover.tsx` (native `<dialog>`/popover, [ADR 0008](adr/0008-native-dialog-and-popover-over-vaul.md), closing phase per [ADR 0012](adr/0012-scale-with-viewport-height.md) era) | RN `Modal` / a bottom-sheet library. Keep the **overlay contract** ([Overview](Architecture/Overview.md)): the caller owns `open`, `onClose` fires only for user dismissal, sheets are sequenced never stacked, content resets by remounting after the close completes. |
| Tailwind classes + `src/ui/theme.ts` CSS variables | RN `StyleSheet`s consuming the SAME `src/core/tokens.ts` ([ADR 0004](adr/0004-theme-tokens-in-typescript.md)). The token values are `oklch(...)` strings, which RN can't parse — add a small core-side or build-time oklch→hex table (the web manifest already hardcodes one conversion, `#1f1007`, as precedent). |
| React Router 8 (`src/app/routes.tsx`, lazy routes, `resumePath`, `startPath`) | React Navigation. `resumePath`/`startPath` (`src/app/resume.ts`, `src/app/share-link.ts`) are pure — port the functions, remap their outputs to screen names. Deep links: register the `#belot=`/link scheme with the navigator; keep "a share link opens import, hash/param cleared" ([ADR 0011](adr/0011-resume-and-replace-matches.md) + DATA_MODEL §4). |
| `src/routes/*` + `src/features/*` screen components | Rebuild against the same store selectors and copy helpers. The handoff (`docs/design-handoff/`, mockups `screens/png/`) remains the visual spec; ADR 0012's height-scaling is web-only (RN lays out natively). |
| Web APIs in features: `navigator.share`/clipboard (ShareSheet), download anchors, file input, `qr-scanner` camera, `FileReader`-free base64 | RN `Share`, `@react-native-clipboard/clipboard`, expo-sharing/document-picker for `.belot` files, `react-native-vision-camera` (or expo-camera) feeding **core's `readScanText` reducer verbatim** for single and multi-part scans. |
| PWA (manifest, service worker, icons) | App-store packaging; `scripts/icon.svg` is the icon source of truth. |
| Playwright e2e (`e2e/`) | Detox/Maestro equivalents of the same three journeys: happy path, share→import across two instances, resume. |

## Contracts both platforms must keep (the interop surface)

1. **Share payload v2** ([ADR 0005](adr/0005-share-format-v2-no-prototype-compat.md)): `{ app: 'belot', v: 2, at, roster, stats, match, photos? }`, validated by `SharePayloadSchema`. Links/QR never carry photos; only the `.belot` file may (`photos`: id → data URL, [ADR 0013](adr/0013-import-merge-take-replace.md)).
2. **The codec pipeline and prefixes** (above), the link form `<root>#belot=<code>`, QR thresholds `QR_LINK_MAX = 1400` / `QR_CHUNK = 1100`, and the multi-part format `BELOT|sid|i|n|chunk` — all constants live in `src/core/share.ts`.
3. **Import semantics** ([ADR 0013](adr/0013-import-merge-take-replace.md)): two-pass merge (by-id first, then by-name) so a rename can't seat one player twice; take confirms when the local match is playing with saved deals; replace is two-press and clears the local match; photo ids are resolved to local ids by the store before core sees them; no two players ever share a photo id; a failed photo write costs the photo, not the import.
4. **The persisted document** (`src/core/persisted.ts`): `PERSIST_VERSION`, `MIGRATIONS`, and the backup-on-corruption behaviour. If RN ever reads a web export (a `.belot` file is the supported path; raw documents are not), it goes through `loadPersisted`.
5. **A match snapshots its rules** at start ([ADR 0009](adr/0009-match-snapshots-rules.md)) — every scoring call passes `match.rules`, never the current settings, with one documented exception: the leaderboard is knowingly scored with live `settings.rules`, because `MatchRecord` doesn't carry rules (ADR 0009 → Consequences). Changing settings retroactively changes leaderboard totals; that's by design.
6. **Copy**: `STRINGS` is the single Bulgarian source; core returns codes, never text. Team-name verb agreement («Ние печелим»/«Вие печелите»/third person otherwise) is inside `strings.ts` and travels free.

## Gotchas that will bite again (hard-won; don't relearn them)

- **React Compiler** (RN supports it too): a hook call inside an object literal, a dynamic `import()` expression, a `try/finally`, or a destructured prop default inside a component body silently bails the WHOLE component out of memoization — plain consts then churn identity and effects re-fire (this restarted the web camera per keystroke). Hoist dynamic imports to module scope; keep effect deps primitive. See Overview → Gotchas.
- **Deletion semantics assume sole photo ownership**: `savePlayer`/`removePlayer` drop blobs without reference counting — that's WHY import guarantees unique photo ids per player.
- **Seating rules**: seats 0/2 are team A, 1/3 team B — only via `seatsOf`/`teamOf` (`src/core/rules.ts`); three past bugs came from re-encoding it.
- **`Card`/`KareRank` Zod enums are not rank-ordered** (integer-like keys hoist); use `CARDS`/`KARE_RANKS` for order.
- **Persistence is async**: the e2e resume test had to wait for the write to land before "reloading"; any RN test that kills the app right after an action needs the same discipline.
- **A capot never ends the match** — one more deal is always played; the end screen's match number uses `matchNumber` (ties don't advance the count; the prototype got this wrong).
- **`toLocaleLowerCase('bg')`** underpins name matching in merges (`core/roster.ts`, `core/import.ts`) and the team-name verb agreement (`core/strings.ts`). Its behaviour depends on the JS engine's ICU data — Hermes ships partial Intl support unless configured — so verify Cyrillic case folding matches web (run the core tests on-device) before trusting name-merge behaviour.
- When the handoff spec and the prototype disagree, **stop and ask the product owner** — decisions to date are recorded in [Status](Status.md) and the ADRs; don't re-decide them.

## Suggested porting order

1. **Core + its tests** under the RN toolchain (jest or vitest) — everything green, golden deals included, before any UI exists.
2. **Storage adapters** (`Kv` on MMKV/files, `PhotoStore` on files) + `document.ts` + the store with RN `AppDeps` — prove persistence, the write gate and recovery with the ported store tests.
3. **Screens in the web's phase order** (home/players/setup → table → history/end/stats → share/import), reusing the copy helpers; each phase's plan in `superpowers/plans/` documents intent and edge cases.
4. **The codec + share/scan** last, verifying a link produced on web imports on RN and back.
5. Port the **Backlog**'s open lines knowingly ([Backlog](Backlog.md)) — some are web-only, most are not.
