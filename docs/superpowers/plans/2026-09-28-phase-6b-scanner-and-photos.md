# Phase 6b: Camera Scanner and Photos in the File Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Finish Phase 6: «📷 Сканирай QR код» in the import sheet reads single and multi-part QR codes with the back camera, and «Включи снимките във файла» carries the players' photos inside the `.belot` file, which import saves into the photo store.

**Architecture:**
- **Scan assembly is pure core.** A reducer in `src/core/share.ts` turns each scanned text into "a complete code", "progress k of n", or "ignored", holding the `BELOT|sid|i|n|chunk` state. The camera layer stays a thin shell around it.
- **The camera uses `qr-scanner@1.4.2`** (the roadmap's pick), dynamically imported inside the already-lazy `ImportSheet` chunk when scanning starts. It owns `getUserMedia`, the decode worker and the video wiring; we own start/stop/destroy and the reducer.
- **Photos travel only in the file** (DATA_MODEL §4: «линкът и QR са без снимки»). The payload schema gets an optional `photos` map of photo id → data URL. `buildPayload` gains a `withPhotos` flag that keeps the roster's photo ids; the platform layer (`src/share/photos.ts`) attaches the blobs as data URLs. Import resolves them back into the photo store before `applyImport`, so core only ever sees photo ids that are valid on this device. This revisits ADR 0013's "photos never travel in 6a".
- A 6b file imported by a 6a build degrades gracefully: Zod strips the unknown `photos` key and 6a's import ignores foreign photo ids.

**Tech Stack:** React 19 + React Compiler, Tailwind v4 tokens, Zustand, Zod v4, Vitest + happy-dom + RTL, `qr-scanner@1.4.2` (new dependency, ~16 kB gzipped + worker).

**Spec:**
- `docs/design-handoff/DATA_MODEL.md` §4 («QR», «Файл», «Внос» — scanning with `facingMode: environment`, «Прочетени k от n части»).
- `docs/design-handoff/README.md` §13 (the scan block and the photos checkbox).
- Mockups `docs/design-handoff/screens/png/15-spodeli.png` (checkbox) and `16-vnos.png` (scan button).
- Prototype `docs/design-handoff/prototype/Belot v3.dc.html`: scan markup ~610–619, `startScan`/`stopScan`/`onScanText` ~1004–1032, the photos checkbox ~598, `payload(scope, photos)` ~970–979.
- ADRs 0003 (photos are store ids), 0005 (payload v2), 0013 (import rules; this phase updates its photo bullet).

## Global Constraints

- **Copy is verbatim** from the handoff/prototype, in `src/core/strings.ts`:
  - scan button `📷 Сканирай QR код`; stop `Спри камерата`; progress `Прочетени ${k} от ${n} части`; camera error `Няма достъп до камерата. Разрешете го или поставете линка ръчно.`
  - checkbox `Включи снимките във файла (линкът и QR са без снимки)`
- **Core purity (ADR 0001):** `src/core` gets only the pure reducer and schema changes — no `Date`, no DOM, no `atob`/`btoa`, no camera types.
- **Part format** (DATA_MODEL §4): `BELOT|<sid>|<i>|<n>|<chunk>`, `i` 1-based; the receiver groups by `sid` and joins parts in order. Match with `/^BELOT\|(\w+)\|(\d+)\|(\d+)\|([A-Za-z0-9_-]+)$/`.
- **Camera:** back camera (`preferredCamera: 'environment'`), started only on the user's press; always stopped and destroyed on stop, on sheet close and on unmount. A rejected start shows the camera error and returns to the scan-off state. Scanning never blocks the paste/file paths, which stay visible below «или».
- **Photos:** link and QR payloads keep `photo: null` everywhere (unchanged). Only «Изпрати файл» with the checkbox ticked embeds photos. Import saves each embedded photo as a NEW local id via the photo store, strips photo ids that have no blob and aren't local, and drops local blobs an import overwrote. `applyImport`'s contract: any non-null incoming photo id is already valid locally.
- **Bundle:** `qr-scanner` must not appear in the entry chunk (check like 6a's `qrcode-generator`: `pnpm build && grep -l <marker> dist/assets/*.js`).
- **UI rules:** hooks are plain top-level statements; no conflicting Button classes; theme tokens only (the video overlay's white text is `text-[#fff]` — the palette is reset, `text-white` does not exist); sheets stay sequenced; content mounts only while open.
- **Tests:** store-only seeding; `vi.mock('qr-scanner')` — never a real camera; every stub restored. No Playwright for implementers.
- **Workflow:** `pnpm check` green per task; core/test-first; Conventional Commits, one commit per task, subject + blank line + `Co-Authored-By` trailer; stage by explicit path; never `package-lock.json`.

---

### Task 1: Core scan assembly

**Files:**
- Modify: `src/core/share.ts`, `src/core/share.test.ts`

**Interfaces:**
- Produces:
  - `interface ScanProgress { sid: string; total: number; parts: ReadonlyMap<number, string> }`
  - `type ScanStep = { kind: 'code'; code: string } | { kind: 'progress'; progress: ScanProgress } | { kind: 'ignored' }`
  - `readScanText(text: string, progress: ScanProgress | null): ScanStep`
- Consumes: `extractCode` (already in `share.ts`).

- [x] **Step 1: Write the failing tests** (append to `share.test.ts`):

```ts
describe('readScanText', () => {
  const part = (sid: string, i: number, n: number, chunk: string) => `BELOT|${sid}|${i}|${n}|${chunk}`;

  it('returns the code from a scanned link or bare code, ignoring progress', () => {
    expect(readScanText('https://x.app/#belot=zAbc', null)).toEqual({ kind: 'code', code: 'zAbc' });
    const p = readScanText(part('k3f9', 1, 2, 'zAA'), null);
    expect(readScanText('  jQQ  ', p.kind === 'progress' ? p.progress : null)).toEqual({ kind: 'code', code: 'jQQ' });
  });

  it('collects parts by sid, in any order, and joins them 1..n', () => {
    const s1 = readScanText(part('k3f9', 2, 3, 'BBB'), null);
    expect(s1).toEqual({ kind: 'progress', progress: { sid: 'k3f9', total: 3, parts: new Map([[2, 'BBB']]) } });
    const s2 = readScanText(part('k3f9', 3, 3, 'CCC'), (s1 as { progress: ScanProgress }).progress);
    expect(s2.kind).toBe('progress');
    const s3 = readScanText(part('k3f9', 1, 3, 'zAA'), (s2 as { progress: ScanProgress }).progress);
    expect(s3).toEqual({ kind: 'code', code: 'zAABBBCCC' });
  });

  it('ignores duplicates and keeps the progress', () => {
    const s1 = readScanText(part('k3f9', 1, 2, 'zAA'), null);
    const s2 = readScanText(part('k3f9', 1, 2, 'zAA'), (s1 as { progress: ScanProgress }).progress);
    expect(s2).toEqual(s1);
  });

  it('a part from a different session (sid or total) restarts the collection', () => {
    const s1 = readScanText(part('k3f9', 1, 3, 'zAA'), null);
    const s2 = readScanText(part('m001', 1, 2, 'zXX'), (s1 as { progress: ScanProgress }).progress);
    expect(s2).toEqual({ kind: 'progress', progress: { sid: 'm001', total: 2, parts: new Map([[1, 'zXX']]) } });
    const s3 = readScanText(part('k3f9', 1, 2, 'zAA'), (s1 as { progress: ScanProgress }).progress);
    expect((s3 as { progress: ScanProgress }).progress.total).toBe(2);
  });

  it('ignores junk, malformed parts and out-of-range indexes', () => {
    const s1 = readScanText(part('k3f9', 1, 2, 'zAA'), null);
    const progress = (s1 as { progress: ScanProgress }).progress;
    for (const text of ['hello', 'BELOT|x|1|2', part('k3f9', 0, 2, 'zAA'), part('k3f9', 3, 2, 'zAA'), 'BELOT|k3f9|1|2|***']) {
      expect(readScanText(text, progress)).toEqual({ kind: 'ignored' });
    }
  });

  it('a single-part session completes at once', () => {
    expect(readScanText(part('k3f9', 1, 1, 'zAll'), null)).toEqual({ kind: 'code', code: 'zAll' });
  });
});
```

- [x] **Step 2: Run** `pnpm vitest run src/core/share.test.ts`. Expected: FAIL (`readScanText` not exported).

- [x] **Step 3: Implement** in `share.ts`:

```ts
/** A multi-part QR session being collected: `BELOT|sid|i|n|chunk` parts seen so far. */
export interface ScanProgress {
  sid: string;
  total: number;
  parts: ReadonlyMap<number, string>;
}

export type ScanStep =
  | { kind: 'code'; code: string }
  | { kind: 'progress'; progress: ScanProgress }
  | { kind: 'ignored' };

const PART = /^BELOT\|(\w+)\|(\d+)\|(\d+)\|([A-Za-z0-9_-]+)$/;

/**
 * One scanned text against the collection so far (DATA_MODEL §4): a link or bare code wins
 * outright; a part joins its session (a different sid or total restarts it); anything else
 * is ignored. Returns the full code once every part is in.
 */
export function readScanText(text: string, progress: ScanProgress | null): ScanStep {
  const code = extractCode(text);
  if (code) return { kind: 'code', code };

  const m = text.match(PART);
  if (!m) return { kind: 'ignored' };
  const [, sid, iRaw, nRaw, chunk] = m as unknown as [string, string, string, string, string];
  const i = Number(iRaw);
  const total = Number(nRaw);
  if (i < 1 || i > total) return { kind: 'ignored' };

  const same = progress !== null && progress.sid === sid && progress.total === total;
  if (same && progress.parts.has(i)) return { kind: 'progress', progress };
  const parts = new Map(same ? progress.parts : []);
  parts.set(i, chunk);

  if (parts.size === total) {
    let joined = '';
    for (let k = 1; k <= total; k++) joined += parts.get(k) as string;
    return { kind: 'code', code: joined };
  }
  return { kind: 'progress', progress: { sid, total, parts } };
}
```

- [x] **Step 4: Run the file's tests, then `pnpm check`.** Expected: PASS.
- [x] **Step 5: Commit** `feat(core): assemble multi-part QR scans`.

---

### Task 2: Photos in the payload and the import rule

**Files:**
- Modify: `src/core/share.ts`, `src/core/share.test.ts`, `src/core/import.ts`, `src/core/import.test.ts`, `docs/adr/0013-import-merge-take-replace.md`

**Interfaces:**
- Produces:
  - `SharePayloadSchema` gains `photos: z.record(z.string(), z.string()).optional()` (photo id → data URL). `SharePayload['photos']` is `Record<string, string> | undefined`.
  - `buildPayload(state, scope, at, withPhotos = false)`: with `withPhotos`, the roster keeps its photo ids (it never sets `photos` — the platform layer does).
  - `applyImport` (contract change): any non-null incoming `photo` is a photo id that is ALREADY valid on this device (the store guarantees it, Task 3). A non-null imported photo wins and drops the emoji; a null imported photo keeps the local one as in 6a.
- Consumes: nothing new.

- [x] **Step 1: Failing tests.**
  - `share.test.ts`:
    - `buildPayload(state, 'all', 1, true)` keeps `roster[i].photo` ids; without the flag they're null (existing tests must stay green).
    - `SharePayloadSchema` accepts a payload with `photos: { ph1: 'data:image/jpeg;base64,AAAA' }` and one without.
    - Scope `match` with `withPhotos` keeps only the seated players' ids.
  - `import.test.ts` (update the 6a photo tests to the new contract, keeping their names accurate):
    - By-id: imported `photo: 'phNew'` wins over local `'phOld'`, and the emoji is null; imported `photo: null` keeps `'phOld'` (unchanged 6a behaviour).
    - By-name link: imported non-null photo is taken (`{ ...local, photo: 'phNew', emoji: null }`); null leaves the local player untouched.
    - Append: the pushed player keeps its non-null photo with `emoji: null`; with `photo: null` the emoji stays.
    - Replace: imported non-null wins; null keeps the local photo of a player kept by id.
    - The "never both photo and emoji" tests still pass for every path.

- [x] **Step 2: Run both test files.** Expected: FAIL.

- [x] **Step 3: Implement.**
  - `share.ts`: add the optional `photos` field to the schema; `buildPayload` takes `withPhotos = false` and maps `photo: withPhotos ? p.photo : null`.
  - `import.ts`: in pass 1 (by-id) `photo: p.photo ?? current.photo` with `emoji` null when the kept photo is non-null, else the imported emoji; in pass 2 by-name, when `p.photo` is non-null replace the local player's photo (`{ ...current, photo: p.photo, emoji: null }`), else leave untouched; append pushes `{ ...p, emoji: p.photo ? null : p.emoji }`; replace `photo: p.photo ?? localById.get(p.id)?.photo ?? null` with the same emoji rule.
  - `docs/adr/0013-import-merge-take-replace.md`: replace the 6a photo bullet with: photos travel only in the `.belot` file (6b); the store resolves embedded photos to new local ids and strips unresolvable ids before `applyImport`, so core trusts non-null ids; a non-null imported photo wins and drops the emoji; a null one keeps the local photo.

- [x] **Step 4: Run the tests and `pnpm check`, then `pnpm docs:check`.** Expected: PASS.
- [x] **Step 5: Commit** `feat(core): photos in the file payload win on import`.

---

### Task 3: Platform photo codec and store ingestion

**Files:**
- Create: `src/share/photos.ts`, `src/share/photos.test.ts`
- Modify: `src/store/app-store.ts` (AppDeps), `src/store/instance.ts`, `src/store/roster-actions.ts`, `src/store/roster-actions.test.ts`

**Interfaces:**
- Produces:
  - `attachPhotos(payload: SharePayload, get: (id: string) => Promise<Blob | undefined>): Promise<SharePayload>` — collects the roster's distinct non-null photo ids, encodes each blob as `data:<type>;base64,…`, returns `{ ...payload, photos }` (ids whose blob is missing are nulled on the player and left out of the map; `photos` omitted when empty).
  - `dataUrlToBlob(url: string): Blob | null` (null for a malformed data URL).
  - `AppDeps.putPhoto: (blob: Blob) => Promise<string>`, wired to `photoStore.put` in `instance.ts`.
  - Store `importShared(data: SharePayload, mode: ImportMode): Promise<ImportResult>` — **now async**:
    1. Resolve photos: for each roster entry with a non-null `photo` — if `data.photos?.[photo]` decodes, `putPhoto` the blob and use the new id; otherwise, keep the id only if a LOCAL player already has that photo id (a same-device share), else null it.
    2. `applyImport` with the resolved payload.
    3. One `set`.
    4. Drop every old local photo id no longer referenced by the result roster (the 6a replace-only cleanup now runs for every mode — in a photo-less merge nothing changes, so nothing is dropped).
- Consumes: `SharePayload.photos` (Task 2), `PhotoStore.put/get` (`src/storage/photos.ts`).

- [x] **Step 1: Failing tests.**
  - `photos.test.ts` (node env): `attachPhotos` embeds a blob as a data URL and leaves `photos` off when no ids; a missing blob nulls that player's photo; `dataUrlToBlob` round-trips bytes and type with `attachPhotos`'s output, and returns null for `'nope'` and `'data:;base64,***'`.
  - `roster-actions.test.ts` (extend the existing harness with a `putPhoto` fake that records blobs and returns `phL1`, `phL2`, …):
    - Import with `photos`: the merged player's photo is the NEW local id, the blob landed in the fake store, and the overwritten old local blob id is in `removed`.
    - A payload photo id with no entry in `photos` and no local owner → the player lands with `photo: null`.
    - A photo-less merge still drops nothing.
    - The existing replace-cleanup tests stay green with the awaited call.
- [x] **Step 2: Run.** Expected: FAIL.
- [x] **Step 3: Implement.** Base64 without `FileReader` (works in node and happy-dom): encode via `new Uint8Array(await blob.arrayBuffer())` → binary string → `btoa`; decode via `atob` → `Uint8Array` → `new Blob([bytes as BlobPart], { type })` (comment the cast — TS DOM lib quirk, see `codec.ts`). Update every `importShared` caller (`ImportSheet` already awaits inside async handlers; fix its type if needed).
- [x] **Step 4: `pnpm check`.** Expected: PASS.
- [x] **Step 5: Commit** `feat(share): embed and ingest photos through the photo store`.

---

### Task 4: The photos checkbox in the share sheet

**Files:**
- Modify: `src/core/strings.ts`, `src/features/share/ShareSheet.tsx`, `src/features/share/share-sheet.test.tsx`

**Interfaces:**
- Produces: `STRINGS.share.photos = 'Включи снимките във файла (линкът и QR са без снимки)'`.
- Consumes: `buildPayload(..., withPhotos)` (Task 2), `attachPhotos` (Task 3), `photoStore` (`src/store/instance.ts`).

- [x] **Step 1: Failing tests.**
  - The checkbox renders unticked on open (reset with the rest of the form state), toggles its ✓ mark, and has the exact label.
  - «Изпрати файл» unticked: the downloaded JSON has all-null roster photos and no `photos` key (parse the Blob handed to `File`).
  - Ticked, with a seeded player photo (`savePlayer` with a photo id and `photoStore.put`'s kv faked — or stub `photoStore.get` per the file's mock patterns): the JSON's roster keeps the id and `photos` holds its data URL.
  - The link and QR stay photo-free: «Копирай линк» after ticking still yields a code whose payload has null photos (decode with `readShared` in the test).
- [x] **Step 2: Implement.** Prototype ~598: a borderless `<button type="button">` row — a 24px `rounded-lg border-2 border-team-a` box (filled `bg-team-a text-on` with ✓ when on) + the 14/700 label, left-aligned, placed under the copy/file buttons as in mockup 15. State lives in `ShareForm`, so it resets on reopen. Only `onFile` consults it: `let data = buildPayload(state, scope, Date.now(), photos); if (photos) data = await attachPhotos(data, (id) => photoStore.get(id));`. The build effect (link/QR) keeps `withPhotos` false.
- [x] **Step 3: Run the file's tests, then `pnpm check`.** Expected: PASS.
- [x] **Step 4: Commit** `feat(share): photos checkbox for the .belot file`.

---

### Task 5: The camera scanner in the import sheet

**Files:**
- Modify: `package.json` (`pnpm add qr-scanner@1.4.2`), `src/core/strings.ts`, `src/features/share/ImportSheet.tsx`, `src/features/share/import-sheet.test.tsx`

**Interfaces:**
- Produces: `STRINGS.import.scan/stop/scanned(k, n)/cameraError` (Global Constraints has the exact texts).
- Consumes: `readScanText`, `ScanProgress` (Task 1); `readShared`; the sheet's existing `show`/`fail`/`requestId` read path.

- [x] **Step 1: Failing tests.** Mock the library once at the top:

```ts
const scanner = vi.hoisted(() => ({
  instances: [] as Array<{ onDecode: (r: { data: string }) => void; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> }>,
  failStart: false,
}));
vi.mock('qr-scanner', () => ({
  default: class {
    start = vi.fn(() => (scanner.failStart ? Promise.reject(new Error('denied')) : Promise.resolve()));
    stop = vi.fn();
    destroy = vi.fn();
    constructor(_v: HTMLVideoElement, onDecode: (r: { data: string }) => void) {
      scanner.instances.push({ onDecode, start: this.start, stop: this.stop, destroy: this.destroy });
    }
  },
}));
```

  (Reset `scanner.instances`/`failStart` in `beforeEach`.) Cases:
  - «📷 Сканирай QR код» shows in the open sheet; pressing it shows the video area and «Спри камерата», and hides the scan button.
  - A decoded link (`onDecode({ data: link })` in `act`) stops and destroys the scanner, leaves scanning mode, and shows the «Намерено» preview (build the link with `encodeShare` as the file already does).
  - Three parts: after the first two `onDecode`s the overlay shows «Прочетени 1 от 3 части» then «Прочетени 2 от 3 части»; the third completes to the preview and stops the camera.
  - `failStart: true`: pressing scan shows «Няма достъп до камерата. Разрешете го или поставете линка ръчно.» and returns to the scan-off state (the scan button is back).
  - «Спри камерата» stops and destroys, back to scan-off, no error.
  - Closing the sheet mid-scan (the content unmounts) destroys the scanner (`destroy` called).
  - The paste flow still works while the scan button is shown.
- [x] **Step 2: Implement.** Per the prototype ~610–619 and mockup 16:
  - Scan-off: the primary 56px scan button sits above «или» (`Button variant="primary"` with a matching size).
  - Scan-on replaces the button with: a square `relative aspect-square w-full max-w-[320px] self-center overflow-hidden rounded-3xl bg-black` holding `<video playsInline muted class="size-full object-cover">`, an `absolute inset-[18%] rounded-[20px] border-[3px] border-team-a` aiming frame (aria-hidden), and — only while collecting parts — an absolute bottom strip `text-[#fff]` 14/900 centred with `S.scanned(k, n)`; below it «Спри камерата» (secondary, 48px).
  - Start: `const { default: QrScanner } = await import('qr-scanner');` then `new QrScanner(video, onResult, { returnDetailedScanResult: true, preferredCamera: 'environment', onDecodeError: () => {} })` and `await s.start()`; a rejection destroys it, sets the camera error via the existing error state and leaves scanning mode.
  - `onResult({ data })` runs the Task 1 reducer against a `useRef<ScanProgress | null>`; `'code'` → stop+destroy, leave scanning, feed the code through the same guarded read path as `initialCode`/`onRead`; `'progress'` → update a `{ got, total }` state; `'ignored'` → nothing.
  - Lifecycle: the scanner instance lives in a ref; one cleanup used by the stop button, the success path, the error path and the effect cleanup on unmount. Hooks stay top-level; the dynamic `import()` keeps the library out of the sheet's initial chunk.
- [x] **Step 3: Run the tests, then `pnpm check`.** Then `pnpm build` and confirm `qr-scanner` is outside the entry chunk: `grep -l "No QR code found" dist/assets/*.js` must not match `index-*.js`. Remove `dist/`.
- [x] **Step 4: Commit** `feat(share): camera QR scanner in the import sheet`.

---

### Task 6: Browser check and vault update (controller)

- [x] **Step 1: Browser check** (Playwright at 390×844, two ports as two devices):
  1. Photos round trip: on A register a player with an uploaded photo (a tiny generated PNG), share the file with the checkbox ticked, import it on B (merge) — B's Home shows the photo avatar; B's photo store holds a new blob. Untick → the file carries no `photos` key.
  2. Scanner UI without a camera: pressing «📷 Сканирай QR код» in the headless browser shows the camera error and returns to scan-off. (Real decoding is covered by unit tests; a phone-to-phone scan needs real hardware — note it for the product owner's testing.)
  3. The paste and file flows still work; console clean except the favicon 404.
- [x] **Step 2: Vault.**
  - **Status:** 6b done (Phase 6 complete — the app shares by link, QR, scanner and file with photos); next: Phase 7 (PWA & polish); open questions: none new (the scanner copy is verbatim from the handoff); note that real-device scanning and the iOS `.belot` accept filter still need a phone test.
  - **Backlog:** delete the 6b lines (scanner, photos, «или»); keep the iOS accept-filter line, rewritten as a phone-test item; add anything deferred by reviews.
  - **Architecture/Overview:** the share bullet gains the scanner (pure `readScanText` + `qr-scanner` in the lazy chunk) and the photo pipeline (`attachPhotos`/ingestion via `putPhoto`).
  - **Roadmap:** phase 6 fully ✅. Tick this plan's boxes.
  - `pnpm docs:check && pnpm check`, commit `docs: phase 6b vault update`.
