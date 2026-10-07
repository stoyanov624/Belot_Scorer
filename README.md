# Belot Scorer

Scorekeeping web app for the Bulgarian card game Belot. It records declarations and points at the table. There is no backend.

## Requirements

- Node.js 22+ (nanoid 6 requires `^22 || ^24 || >=26`; Vite 8 also runs there)
- pnpm 10 (`npm install -g pnpm` or `corepack enable pnpm`)

## Getting started

```sh
pnpm install
pnpm start
```

This starts the dev server and opens the app in your browser (usually http://localhost:5173). Edits reload in the browser automatically, and there's no need to restart it.

## Scripts

| Command           | What it does                                             |
| ----------------- | -------------------------------------------------------- |
| `pnpm start`      | Start the dev server and open the app in the browser     |
| `pnpm dev`        | Start the Vite dev server with hot reload                |
| `pnpm build`      | Typecheck and build a production bundle into `dist/`     |
| `pnpm preview`    | Serve the built `dist/` locally                          |
| `pnpm test`       | Run the Vitest suite once                                |
| `pnpm test:watch` | Run Vitest in watch mode                                 |
| `pnpm lint`       | Run Biome lint and format checks                         |
| `pnpm format`     | Apply Biome fixes and formatting                         |
| `pnpm typecheck`  | Typecheck the app and the platform-free core separately  |
| `pnpm check`      | Lint, typecheck and test. Run this before every commit   |

## Tech stack

### Web (this repo)

| Layer               | Tech                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| Language            | TypeScript 6                                                                                           |
| UI                  | React 19 with React Compiler                                                                           |
| Build               | Vite 8                                                                                                 |
| Routing             | React Router 8 (lazy routes)                                                                           |
| State               | Zustand 5, a thin store over pure core functions (ADR 0002)                                            |
| Schemas             | Zod 4                                                                                                  |
| Styling             | Tailwind CSS v4; tokens in `src/core/tokens.ts` become CSS variables (ADR 0004); Nunito font           |
| Overlays            | The browser's own `<dialog>` and popover APIs (ADR 0008)                                               |
| Storage             | IndexedDB via `idb-keyval`, photos stored as blobs (ADR 0003)                                          |
| Share/QR            | `qrcode-generator`, `qr-scanner`; payload is deflate-raw + base64url via `CompressionStream`           |
| PWA                 | `vite-plugin-pwa` + Workbox                                                                            |
| Tests               | Vitest + happy-dom + Testing Library + fake-indexeddb; Playwright e2e                                  |
| Lint/format         | Biome 2                                                                                                |
| Package manager     | pnpm 10 (ADR 0007)                                                                                     |

### Mobile (`../Belot Scorer Mobile`)

| Layer               | Tech                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| Framework           | Expo SDK 57, React Native 0.86, React 19, New Architecture; native projects via `expo prebuild`        |
| Routing             | Expo Router; `belot://` scheme for deep links                                                          |
| State/schemas       | Zustand 5 + Zod 4 (same as web)                                                                        |
| Styling             | NativeWind 4 (Tailwind v3); `oklch` tokens converted to a hex table by `scripts/gen-token-hex.mjs`     |
| UI libs             | `@gorhom/bottom-sheet`, Reanimated 4, Gesture Handler, react-native-svg (QR rendering)                 |
| Storage             | `react-native-mmkv` for key-value data; photos as files via `expo-file-system`                         |
| Share/import        | `pako` + `js-base64` codec, `expo-sharing`, `expo-clipboard`, `expo-document-picker`, `expo-camera`    |
| Tests               | Vitest for core; Jest + jest-expo + React Native Testing Library for UI                                |
| Lint/format         | Biome 2; pnpm 10                                                                                       |

### How they relate

- `src/core`, the copy formatters (`src/features/*/copy.ts`) and `src/lib/id.ts` are copied verbatim into the mobile repo. Its `pnpm core:sync` fails when they drift.
- Both apps use the same share payload v2 and codec pipeline, so links, QR codes and `.belot` files work across web and mobile.
- Storage, screens, overlays, navigation, camera and packaging are rebuilt per platform. See `docs/React Native handover.md`.

## Project layout

- `src/core/`: pure TypeScript game logic (scoring, match state). It has no DOM or React imports.
- `src/`: the React app.
- `test/prototype/`: parity tests against the original HTML prototype.
- `docs/`: product spec (`design-handoff/`), architecture decisions (`adr/`) and implementation plans (`superpowers/plans/`).
- `CONTEXT.md`: domain glossary. Use its terms in code.

See `CLAUDE.md` for the project conventions and invariants.
