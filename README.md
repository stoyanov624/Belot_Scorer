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

## Project layout

- `src/core/`: pure TypeScript game logic (scoring, match state). It has no DOM or React imports.
- `src/`: the React app.
- `test/prototype/`: parity tests against the original HTML prototype.
- `docs/`: product spec (`design-handoff/`), architecture decisions (`adr/`) and implementation plans (`superpowers/plans/`).
- `CONTEXT.md`: domain glossary. Use its terms in code.

See `CLAUDE.md` for the project conventions and invariants.
