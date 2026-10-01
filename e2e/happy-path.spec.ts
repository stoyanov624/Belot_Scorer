import { expect, type Page, test } from '@playwright/test';
import { STRINGS } from '../src/core/strings';

/**
 * End-to-end happy path against the built app (see playwright.config.ts). Selectors use the
 * exact Bulgarian copy from src/core/strings.ts (the app's single source of UI text) by role and
 * accessible name, never CSS. Every sheet and popover here (ADR 0008) animates closed over
 * ~180ms, so any assertion that depends on one being fully gone — usually because the next step
 * clicks something the still-open native <dialog> would otherwise block — uses an auto-retrying
 * `expect(...).toBeHidden()` rather than an instant check.
 *
 * Each `test()` gets its own browser context (Playwright's default), so storage never leaks
 * between them.
 */

const PLAYERS = ['Иван', 'Мария', 'Петър', 'Елена'] as const;

/** Home → «Нов играч» → name → «Запази», waiting out the sheet's close animation. */
async function registerPlayer(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: STRINGS.home.newPlayer, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: STRINGS.register.titleNew, exact: true });
  await dialog.getByRole('textbox', { name: STRINGS.register.name }).fill(name);
  await dialog.getByRole('button', { name: STRINGS.register.save, exact: true }).click();
  await expect(dialog).toBeHidden();
}

async function registerPlayers(page: Page, names: readonly string[]): Promise<void> {
  for (const name of names) await registerPlayer(page, name);
}

/**
 * Home → «Нова игра» → assign every seat from the roster (North/East/South/West, in that order)
 * → «Раздавай!» (bestOf 1, the setup screen's own default). Lands on /table.
 */
async function startMatch(page: Page, names: readonly [string, string, string, string]) {
  await page.getByRole('link', { name: STRINGS.home.newGame, exact: true }).click();
  await expect(page).toHaveURL(/\/setup$/);

  const SEATS = [0, 1, 2, 3] as const;
  for (const seat of SEATS) {
    const seatLabel = STRINGS.seats[seat];
    // The seat row's accessible name is the seat label plus "Избери играч"; matched by content
    // rather than the exact concatenation, which depends on whitespace this test doesn't control.
    const row = page
      .getByRole('button', { name: STRINGS.setup.pickPlayer })
      .filter({ hasText: seatLabel });
    await row.click();
    const sheet = page.getByRole('dialog', {
      name: STRINGS.setup.seatTitle(seatLabel),
      exact: true,
    });
    await sheet.getByRole('button', { name: names[seat] }).click();
    await expect(sheet).toBeHidden();
  }

  await page.getByRole('button', { name: STRINGS.setup.deal, exact: true }).click();
  await expect(page).toHaveURL(/\/table$/);
}

/** The felt's pill → contract tile → caller → «Готово». Always opened from "Избери игра": the
 * contract resets to none at the start of every deal (src/core/match.ts's EMPTY_DEAL). */
async function pickContract(page: Page, contractLabel: string, callerName: string): Promise<void> {
  await page.getByRole('button', { name: STRINGS.table.pickContract, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: STRINGS.contract.title, exact: true });
  await dialog.getByRole('radio', { name: contractLabel, exact: true }).click();
  await dialog
    .getByRole('radiogroup', { name: STRINGS.contract.caller, exact: true })
    .getByRole('radio', { name: callerName, exact: true })
    .click();
  await dialog.getByRole('button', { name: STRINGS.contract.done, exact: true }).click();
  await expect(dialog).toBeHidden();
}

/** A seat's avatar → its declarations popover → the option whose label starts with `declKey`. */
async function declare(page: Page, playerName: string, declLabel: string): Promise<void> {
  await page.getByRole('button', { name: playerName, exact: true }).click();
  const popover = page.getByRole('dialog', {
    name: STRINGS.table.declares(playerName),
    exact: true,
  });
  await popover.getByRole('button', { name: new RegExp(`^${declLabel}`) }).click();
  await expect(popover).toBeHidden();
}

/** The deal-end sheet's points step: fill team A's card points and save. */
async function enterPoints(
  page: Page,
  dealNumber: number,
  cardPointsA: number,
  teamALabel: string,
): Promise<void> {
  const dialog = page.getByRole('dialog', {
    name: STRINGS.deal.pointsTitle(dealNumber),
    exact: true,
  });
  await dialog
    .getByRole('textbox', { name: teamALabel, exact: true })
    .fill(String(cardPointsA * 10)); // exact points (ADR 0020)
  await dialog.getByRole('button', { name: STRINGS.deal.save, exact: true }).click();
  await expect(dialog).toBeHidden();
}

/** Plays a deal with no declarations: contract → «Край на раздаване» → points → save. */
async function playDeal(
  page: Page,
  opts: {
    dealNumber: number;
    contractLabel: string;
    callerName: string;
    cardPointsA: number;
    teamALabel: string;
  },
): Promise<void> {
  await pickContract(page, opts.contractLabel, opts.callerName);
  await page.getByRole('button', { name: STRINGS.table.endDeal, exact: true }).click();
  await enterPoints(page, opts.dealNumber, opts.cardPointsA, opts.teamALabel);
}

/**
 * Plays a deal with one declaration: contract → declare → «Край на раздаване» opens the
 * "Уточнете обявите" resolve step (any sequence/kare declaration forces it, src/features/table
 * /DealEndSheet.tsx's `needsResolving`) → pick a card top → «Напред» → points → save.
 */
async function playDealWithDeclaration(
  page: Page,
  opts: {
    dealNumber: number;
    contractLabel: string;
    callerName: string;
    declarerName: string;
    declLabel: string;
    cardPointsA: number;
    teamALabel: string;
  },
): Promise<void> {
  await pickContract(page, opts.contractLabel, opts.callerName);
  await declare(page, opts.declarerName, opts.declLabel);
  await page.getByRole('button', { name: STRINGS.table.endDeal, exact: true }).click();

  const resolveDialog = page.getByRole('dialog', {
    name: STRINGS.deal.resolveTitle,
    exact: true,
  });
  await expect(resolveDialog).toBeVisible();
  await resolveDialog.getByRole('radio').first().click();
  await resolveDialog.getByRole('button', { name: STRINGS.deal.next, exact: true }).click();

  await enterPoints(page, opts.dealNumber, opts.cardPointsA, opts.teamALabel);
}

test('register, play a match, rematch, and show up on the leaderboard', async ({ page }) => {
  await page.goto('/');
  await registerPlayers(page, PLAYERS);
  const [north, east] = PLAYERS;

  await startMatch(page, PLAYERS);

  // Deal 1: hearts called by North (team A), with a resolved "Терца" declaration. North's team
  // ends up ahead (cards 9:7 + the 2-point decl), so this deal alone puts A ahead 11:7.
  await playDealWithDeclaration(page, {
    dealNumber: 1,
    contractLabel: STRINGS.contracts.hearts.label,
    callerName: north,
    declarerName: north,
    declLabel: STRINGS.decls.terca,
    cardPointsA: 9,
    teamALabel: STRINGS.setup.teamA,
  });

  // Deal 2: spades called by East (team B), no declarations. East's team falls short of A's
  // card points (6 vs 10), so the deal is "inside" and all 16 go to A: 27:7 overall — a clear,
  // non-tied lead for the manual end below.
  await playDeal(page, {
    dealNumber: 2,
    contractLabel: STRINGS.contracts.spades.label,
    callerName: east,
    cardPointsA: 10,
    teamALabel: STRINGS.setup.teamA,
  });

  // End the match by hand (short of the 151 target is fine — either path is deterministic; see
  // the task brief) rather than grinding out deals to the target score.
  await page.getByRole('button', { name: STRINGS.table.endMatch, exact: true }).click();
  const endMatchDialog = page.getByRole('dialog', { name: STRINGS.endMatch.title, exact: true });
  await endMatchDialog.getByRole('button', { name: STRINGS.endMatch.end, exact: true }).click();
  await expect(page).toHaveURL(/\/end$/);

  // Team A ("Ние") won: the end screen's title agrees with "Ние" in the first person.
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: STRINGS.end.wins(STRINGS.setup.teamA),
      exact: true,
    }),
  ).toBeVisible();

  // bestOf 1 (no series): "Реванш" is the rematch action back to a fresh table.
  await page.getByRole('button', { name: STRINGS.end.rematch, exact: true }).click();
  await expect(page).toHaveURL(/\/table$/);

  // Back Home, then the leaderboard lists every player from the finished match.
  await page.getByRole('link', { name: STRINGS.setup.back, exact: true }).click();
  await expect(page).toHaveURL('/');
  await page.getByRole('link', { name: STRINGS.home.stats, exact: true }).click();
  await expect(page).toHaveURL(/\/stats$/);

  for (const name of PLAYERS) {
    await expect(page.getByRole('heading', { level: 2, name, exact: true })).toBeVisible();
  }
});

test('share the match and import it into a second device, at the same score', async ({
  browser,
}) => {
  const senderContext = await browser.newContext();
  // Stubbed before any page script runs: no native share sheet, and writeText captured on a
  // window global instead of touching the real OS clipboard.
  await senderContext.addInitScript(() => {
    Object.defineProperty(window.navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (text: string) => {
          (window as unknown as { __copiedText?: string }).__copiedText = text;
          return Promise.resolve();
        },
      },
    });
  });
  const sender = await senderContext.newPage();

  await sender.goto('/');
  await registerPlayers(sender, PLAYERS);
  const [north] = PLAYERS;
  await startMatch(sender, PLAYERS);
  await playDeal(sender, {
    dealNumber: 1,
    contractLabel: STRINGS.contracts.clubs.label,
    callerName: north,
    cardPointsA: 9,
    teamALabel: STRINGS.setup.teamA,
  });
  // cards 9:7, no declarations, caller's team (A) ahead → match total 9:7.

  await sender.getByRole('button', { name: STRINGS.table.share, exact: true }).click();
  const shareDialog = sender.getByRole('dialog', { name: STRINGS.share.title, exact: true });
  await shareDialog.getByRole('button', { name: STRINGS.share.copyLink, exact: true }).click();
  await expect(shareDialog.getByText(STRINGS.share.copied, { exact: true })).toBeVisible();

  const link = await sender.evaluate(
    () => (window as unknown as { __copiedText?: string }).__copiedText,
  );
  expect(link).toBeTruthy();

  // A second device: a fresh context, isolated storage, no clipboard stub needed.
  const receiverContext = await browser.newContext();
  const receiver = await receiverContext.newPage();
  // biome-ignore lint/style/noNonNullAssertion: asserted truthy above
  await receiver.goto(link!);

  const importDialog = receiver.getByRole('dialog', { name: STRINGS.import.title, exact: true });
  await expect(importDialog.getByText(STRINGS.import.found, { exact: true })).toBeVisible();
  // Same score, before it's even imported: the preview line the sheet builds from the shared
  // match's own totals (src/features/share/copy.ts's importLines).
  await expect(
    importDialog.getByText(
      STRINGS.import.currentMatch(STRINGS.setup.teamA, 9, 7, STRINGS.setup.teamB),
      { exact: true },
    ),
  ).toBeVisible();

  await importDialog.getByRole('button', { name: STRINGS.import.take, exact: true }).click();
  await expect(receiver).toHaveURL(/\/table$/);

  // The coaster (src/features/table/Coaster.tsx) shows the imported match's own totals, not a
  // fresh 0:0 — the take really landed with the sender's score.
  const main = receiver.getByRole('main');
  await expect(main.getByText('9', { exact: true })).toBeVisible();
  await expect(main.getByText('7', { exact: true })).toBeVisible();

  await receiverContext.close();
  await senderContext.close();
});

/**
 * `persist` (zustand/middleware) calls `storage.setItem` on every `setState` and drops the
 * promise (src/store/app-store.ts) — writing the just-started match to IndexedDB happens
 * asynchronously, off the click that triggered it. A `page.reload()` right after `startMatch`'s
 * last action can beat that write, hydrating from an empty document and landing on Home instead
 * of resuming (ADR 0011 only kicks in once a match is actually persisted). Poll the real
 * document instead of guessing at a timeout: idb-keyval's default store (database
 * "keyval-store", object store "keyval") under the app's storage key (`STORAGE_KEY` in
 * src/store/app-store.ts, "belot-state"), shaped `{ version, state: { roster, stats, match,
 * settings } }` per src/core/persisted.ts's `PersistedStateSchema` — wait until `state.match`
 * is there.
 */
async function waitForPersistedMatch(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            new Promise<boolean>((resolve) => {
              const open = indexedDB.open('keyval-store');
              open.onerror = () => resolve(false);
              open.onsuccess = () => {
                const db = open.result;
                // A bare `indexedDB.open('keyval-store')` CREATES an empty v1 database (with no
                // `keyval` object store) if it doesn't exist yet, poisoning idb-keyval's own
                // future upgrade; only read from it once the store idb-keyval actually creates
                // is there.
                if (!db.objectStoreNames.contains('keyval')) {
                  db.close();
                  resolve(false);
                  return;
                }
                const get = db.transaction('keyval').objectStore('keyval').get('belot-state');
                get.onerror = () => {
                  db.close();
                  resolve(false);
                };
                get.onsuccess = () => {
                  const doc = get.result as { state?: { match?: unknown } } | undefined;
                  db.close();
                  // `!= null`, not `!== null`: an absent `match` key reads back as `undefined`,
                  // not `null`, and both mean "no match persisted yet".
                  resolve(Boolean(doc?.state && doc.state.match != null));
                };
              };
            }),
        ),
      { timeout: 5000 },
    )
    .toBe(true);
}

test('reloading mid-match resumes straight to the table', async ({ page }) => {
  await page.goto('/');
  await registerPlayers(page, PLAYERS);
  await startMatch(page, PLAYERS);

  // See waitForPersistedMatch: avoids racing the store's own async persistence write.
  await waitForPersistedMatch(page);
  await page.reload();

  await expect(page).toHaveURL(/\/table$/);
  await expect(
    page.getByRole('heading', { level: 1, name: STRINGS.table.deal(1), exact: true }),
  ).toBeVisible();
});
