// @vitest-environment happy-dom
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Seats } from '../core/model';
import { STRINGS } from '../core/strings';
import { appStore } from '../store/instance';
import { renderRoute, resetApp } from '../test/app';

const S = STRINGS.history;
const NAMES = ['Иван', 'Петър', 'Мария', 'Гошо'] as const;

/** Matches an element by its whole (descendant-inclusive) text, for text split across nodes. */
const wholeText = (text: string) => (_: string, element: Element | null) =>
  element?.textContent === text;

beforeEach(() => {
  resetApp();
});

/** Seeds the four players and starts a match with them seated N, E, S, W. */
function startMatch() {
  const ids = NAMES.map((name) => {
    const result = appStore.getState().savePlayer({ id: null, name, emoji: null, photo: null });
    if (!result.ok) throw new Error(`setup failed for ${name}`);
    return result.id;
  });
  appStore
    .getState()
    .startMatch({ seats: ids as unknown as Seats, teamA: 'Ние', teamB: 'Вие', bestOf: 1 });
}

/** The id of the declaration just added to the current deal. */
function lastDeclId(): string {
  const current = appStore.getState().match?.current ?? [];
  const last = current.at(-1);
  if (!last) throw new Error('no current declaration');
  return last.id;
}

/**
 * Three finished deals through the real store actions:
 * 1. clubs, called by Петър (seat 1), plain "ok" verdict, no declarations.
 * 2. hearts, called by Иван (seat 0); both teams call a tied-length terca, resolved by top
 *    card — Иван's (K) wins, Петър's (9) is dropped.
 * 3. spades, called by Мария (seat 2), an "inside" verdict.
 * Then a fourth deal starts (diamonds, Гошо declares belot) and is left unsaved, so it's
 * still "in progress".
 */
function buildHistory() {
  const s = appStore.getState();
  s.setContract('clubs', 1);
  const r1 = s.saveDeal({ cardPointsA: 6, capo: null }); // deal 1: a=6, b=10
  if (!r1.ok) throw new Error('saveDeal 1 failed');

  s.setContract('hearts', 0);
  s.addDeclaration(0, 'terca');
  s.updateDeclaration(lastDeclId(), { top: 'K' });
  s.addDeclaration(1, 'terca');
  s.updateDeclaration(lastDeclId(), { top: '9' });
  const r2 = s.saveDeal({ cardPointsA: 10, capo: null }); // deal 2: a=12, b=6
  if (!r2.ok) throw new Error('saveDeal 2 failed');

  s.setContract('spades', 2);
  const r3 = s.saveDeal({ cardPointsA: 5, capo: null }); // deal 3: inside, a=0, b=16
  if (!r3.ok) throw new Error('saveDeal 3 failed');

  s.setContract('diamonds', 3);
  s.addDeclaration(3, 'belot');
}

/** Renders /history and waits for the lazy screen to mount. */
async function renderHistory() {
  const rendered = renderRoute('/history');
  await screen.findByRole('heading', { name: S.title });
  return rendered;
}

describe('History', () => {
  it('redirects to Home without a match', async () => {
    renderRoute('/history');

    expect(await screen.findByRole('heading', { name: STRINGS.appName })).toBeTruthy();
  });

  it('shows the header with a back link to the table while playing', async () => {
    startMatch();
    await renderHistory();

    expect(screen.getByRole('heading', { name: S.title })).toBeTruthy();
    expect(screen.getByRole('link', { name: S.back }).getAttribute('href')).toBe('/table');
  });

  it('shows a back link to the end screen once the match has ended', async () => {
    startMatch();
    appStore.getState().endMatch();
    await renderHistory();

    expect(screen.getByRole('link', { name: S.back }).getAttribute('href')).toBe('/end');
  });

  it('shows the score bar with team names, totals and the target', async () => {
    startMatch();
    buildHistory();
    await renderHistory();

    expect(screen.getByText('Ние')).toBeTruthy();
    expect(screen.getByText('Вие')).toBeTruthy();
    expect(screen.getByText('18')).toBeTruthy();
    expect(screen.getByText('32')).toBeTruthy();
    expect(screen.getByText(S.to(151))).toBeTruthy();
  });

  it('shows three deal cards newest first, with the contract line, score and running total', async () => {
    startMatch();
    buildHistory();
    await renderHistory();

    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual([S.deal(3), S.deal(2), S.deal(1)]);
    expect(screen.getByText(wholeText('♠ Пика · Мария'))).toBeTruthy();
    expect(screen.getByText(wholeText('♥ Купа · Иван'))).toBeTruthy();
    expect(screen.getByText(wholeText('♣ Спатия · Петър'))).toBeTruthy();
    expect(screen.getByText(S.runningTotal(18, 32))).toBeTruthy();
    expect(screen.getByText(S.runningTotal(18, 16))).toBeTruthy();
    expect(screen.getByText(S.runningTotal(6, 10))).toBeTruthy();
  });

  it("marks the deal 2 dropped declaration struck through, with the deal's other one plain", async () => {
    startMatch();
    buildHistory();
    await renderHistory();

    const dropped = screen.getByText('Терца до 9');
    expect(dropped.tagName).toBe('DEL');
    const kept = screen.getByText('Терца до K');
    expect(kept.tagName).not.toBe('DEL');
  });

  it('shows "Без обяви" for a deal with no declarations', async () => {
    startMatch();
    buildHistory();
    await renderHistory();

    expect(screen.getAllByText(S.noDecls).length).toBeGreaterThan(0);
  });

  it('shows an inside note', async () => {
    startMatch();
    buildHistory();
    await renderHistory();

    expect(screen.getByText(S.inside('Ние'))).toBeTruthy();
  });

  it('shows a hanging note', async () => {
    startMatch();
    appStore.getState().setContract('clubs', 1);
    const r = appStore.getState().saveDeal({ cardPointsA: 8, capo: null });
    if (!r.ok) throw new Error('saveDeal failed');
    await renderHistory();

    expect(screen.getByText(S.hang)).toBeTruthy();
  });

  it('shows the in-progress card while current declarations exist', async () => {
    startMatch();
    buildHistory();
    await renderHistory();

    expect(screen.getByText(S.inProgress(4))).toBeTruthy();
    expect(screen.getByText(STRINGS.decls.belot)).toBeTruthy();
  });

  it('shows the empty message with no deals and no current declarations', async () => {
    startMatch();
    await renderHistory();

    expect(screen.getByText(S.empty)).toBeTruthy();
  });
});
