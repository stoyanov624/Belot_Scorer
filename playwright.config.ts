import { defineConfig, devices } from '@playwright/test';

/**
 * Default run: chromium against the production build, served by `pnpm preview` (port 4173).
 * `pnpm exec playwright test --list` only parses these files; it never launches a browser or
 * downloads one (that belongs to the controller, Task 7 — see e2e/dev-ui.spec.ts's header for
 * the one exception, which targets the Vite dev server instead).
 *
 * `DEV_UI=1` switches both `webServer` and `baseURL` to the Vite dev server (port 5173), whose
 * build alone serves the dev-only `/dev/ui` route (`import.meta.env.DEV`, see src/app/routes.tsx).
 * `e2e/dev-ui.spec.ts`'s own describe block still skips unless `DEV_UI=1` is set, so a default
 * `pnpm exec playwright test` run never needs the dev server up.
 */
const DEV_UI = process.env.DEV_UI === '1';
const PORT = DEV_UI ? 5173 : 4173;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL,
    viewport: { width: 390, height: 844 },
    // Deterministic runs: the app's service worker (registerSW() in src/main.tsx) registers on
    // every load regardless, which is harmless for these specs but adds a background network
    // actor we don't need while asserting UI state.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: DEV_UI
      ? 'pnpm dev --port 5173 --strictPort'
      : 'pnpm build && pnpm preview --port 4173 --strictPort',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
