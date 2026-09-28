import { expect, test } from '@playwright/test';
import { STRINGS } from '../src/core/strings';

/**
 * Smoke test for the /dev/ui primitive gallery (src/screens/dev-ui.tsx). That route is
 * dev-build-only — `import.meta.env.DEV` gates it out of LAZY_ROUTES (src/app/routes.tsx) — so
 * it never exists on the production build the rest of this suite runs against
 * (playwright.config.ts's default `pnpm build && pnpm preview`).
 *
 * Run this file on its own, against the Vite dev server instead:
 *
 *   DEV_UI=1 pnpm exec playwright test e2e/dev-ui.spec.ts
 *
 * playwright.config.ts reads DEV_UI itself and points both `webServer` (to `pnpm dev`) and
 * `baseURL` at port 5173 when it's set. A default `pnpm exec playwright test` run (DEV_UI unset)
 * skips the whole describe block below, so it never needs the dev server up.
 */
const RUN_DEV_UI = process.env.DEV_UI === '1';

(RUN_DEV_UI ? test.describe : test.describe.skip)(
  '/dev/ui primitive gallery (dev server only)',
  () => {
    const THEME_KEYS = ['pub', 'home', 'casino', 'night'] as const;

    test.beforeEach(async ({ page }) => {
      await page.goto('/dev/ui');
    });

    test('switches every theme', async ({ page }) => {
      const html = page.locator('html');
      for (const key of THEME_KEYS) {
        await page.getByRole('button', { name: STRINGS.themes[key].name, exact: true }).click();
        await expect(html).toHaveAttribute('data-theme', key);
      }
    });

    test('opens and closes a sheet with Esc', async ({ page }) => {
      // The gallery's own "Sheet" section: a plain debug trigger, not app copy from STRINGS.
      await page.getByRole('button', { name: 'Open sheet', exact: true }).click();
      const sheet = page.getByRole('dialog', { name: 'Място: Север', exact: true });
      await expect(sheet).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(sheet).toBeHidden();
    });

    test('opens both popover placements', async ({ page }) => {
      // src/screens/dev-ui.tsx's PLACEMENTS: 'below' anchors on the "Север" avatar, 'above' on
      // "Юг" — every popover instance shares the same accessible name ("Иван обявява"), so the
      // one actually open is told apart by the placement the component itself stamps on it
      // (Popover.tsx's `data-placement`).
      await page.getByRole('button', { name: 'Север', exact: true }).click();
      const below = page.locator('[role="dialog"][data-placement="below"]');
      await expect(below).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(below).toBeHidden();

      await page.getByRole('button', { name: 'Юг', exact: true }).click();
      const above = page.locator('[role="dialog"][data-placement="above"]');
      await expect(above).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(above).toBeHidden();
    });
  },
);
