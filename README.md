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

- **Frontend:** Vite + React 19 + TypeScript, React Router, Tailwind CSS v4
- **State:** Zustand, Zod
- **Storage:** IndexedDB (idb-keyval)
- **Sharing:** qrcode-generator, qr-scanner, CompressionStream
- **PWA:** vite-plugin-pwa + Workbox
- **Testing:** Vitest, Testing Library, Playwright
- **Tooling:** Biome, pnpm

### Mobile (`../Belot Scorer Mobile`)

- **Frontend:** Expo + React Native + React 19 + TypeScript, Expo Router, NativeWind
- **UI:** Reanimated, Gesture Handler, Gorhom Bottom Sheet, react-native-svg
- **State:** Zustand, Zod
- **Storage:** MMKV, expo-file-system
- **Sharing:** pako + js-base64, expo-sharing, expo-clipboard, expo-document-picker, expo-camera
- **Testing:** Vitest, Jest + React Native Testing Library
- **Tooling:** Biome, pnpm

Both apps share the same `src/core` (game logic, copied verbatim and checked by `pnpm core:sync` in the mobile repo) and the same share format, so links, QR codes and `.belot` files work across web and mobile.

## Project layout

- `src/core/`: pure TypeScript game logic (scoring, match state). It has no DOM or React imports.
- `src/`: the React app.
- `test/prototype/`: parity tests against the original HTML prototype.
- `docs/`: product spec (`design-handoff/`), architecture decisions (`adr/`) and implementation plans (`superpowers/plans/`).
- `CONTEXT.md`: domain glossary. Use its terms in code.

See `CLAUDE.md` for the project conventions and invariants.
