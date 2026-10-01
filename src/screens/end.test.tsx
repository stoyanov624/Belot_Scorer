// @vitest-environment happy-dom
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import type { BestOf, Seats } from '../core/model';
import { STRINGS } from '../core/strings';
import { appStore } from '../store/instance';
import { renderRoute, resetApp } from '../test/app';

const S = STRINGS.end;
const NAMES = ['Иван', 'Петър', 'Мария', 'Гошо'] as const;

beforeEach(() => {
  resetApp();
});

/** Seeds the four players and starts a match with them seated N, E, S, W. */
function startMatch(bestOf: BestOf = 1) {
  const ids = NAMES.map((name) => {
    const result = appStore.getState().savePlayer({ id: null, name, emoji: null, photo: null });
    if (!result.ok) throw new Error(`setup failed for ${name}`);
    return result.id;
  });
  appStore
    .getState()
    .startMatch({ seats: ids as unknown as Seats, teamA: 'Ние', teamB: 'Вие', bestOf });
}

/** Lowers the target score so one hearts deal, called by North (team A), wins the match outright. */
function lowerTargetScore() {
  appStore
    .getState()
    .updateSettings({ rules: { ...appStore.getState().settings.rules, targetScore: 10 } });
}

/** Plays a hearts deal called by North with 10 card points for team A: totals become 10 : 6. */
function playWinningDeal() {
  appStore.getState().setContract('hearts', 0);
  const result = appStore.getState().saveDeal({ cardPointsA: 100, capo: null });
  if (!result.ok) throw new Error('saveDeal failed');
}

/** Renders /end and waits for the lazy screen to mount ("История" is present in every state). */
async function renderEnd() {
  const rendered = renderRoute('/end');
  await screen.findByRole('link', { name: S.history });
  return rendered;
}

describe('Match end', () => {
  it('redirects to Home without a match', async () => {
    renderRoute('/end');

    expect(await screen.findByRole('heading', { name: STRINGS.appName })).toBeTruthy();
  });

  it('redirects to the table for a match still playing', async () => {
    startMatch();
    renderRoute('/end');

    expect(await screen.findByText(STRINGS.table.headerSingle(151))).toBeTruthy();
  });

  describe('a single match won by Ние', () => {
    async function setUp() {
      lowerTargetScore();
      startMatch(1);
      playWinningDeal();
      return renderEnd();
    }

    it('shows the line, winner, names, pill, score and declaration totals', async () => {
      await setUp();

      expect(screen.getByText('Край на мача · 1 раздавания')).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Ние печелим' })).toBeTruthy();
      expect(screen.getByText('Иван и Мария')).toBeTruthy();
      expect(screen.getByText('🍻 Вие черпите следващия рунд')).toBeTruthy();
      expect(screen.getByText('10')).toBeTruthy();
      expect(screen.getByText('6')).toBeTruthy();
      expect(screen.getByText(S.decls('Ние'))).toBeTruthy();
      expect(screen.getByText(S.decls('Вие'))).toBeTruthy();
    });

    it('shows the home, history and rematch buttons', async () => {
      await setUp();

      expect(screen.getByRole('button', { name: S.home })).toBeTruthy();
      expect(screen.getByRole('link', { name: S.history })).toBeTruthy();
      expect(screen.getByRole('button', { name: S.rematch })).toBeTruthy();
    });

    it('"Към началния екран" leaves the match and goes Home, which shows no continue link', async () => {
      const { router } = await setUp();

      await userEvent.click(screen.getByRole('button', { name: S.home }));

      expect(appStore.getState().match).toBeNull();
      expect(router.state.location.pathname).toBe('/');
      expect(screen.queryByRole('link', { name: STRINGS.home.continueMatch })).toBeNull();
    });

    it('"Реванш" starts a new match with the same seats and a 0:0 series, then goes to the table', async () => {
      const { router } = await setUp();
      const seatsBefore = appStore.getState().match?.seats;

      await userEvent.click(screen.getByRole('button', { name: S.rematch }));

      const match = appStore.getState().match;
      expect(match?.status).toBe('playing');
      expect(match?.games).toEqual([]);
      expect(match?.series).toEqual({ A: 0, B: 0 });
      expect(match?.seats).toEqual(seatsBefore);
      expect(router.state.location.pathname).toBe('/table');
    });
  });

  describe('a series match, not yet over', () => {
    async function setUp() {
      lowerTargetScore();
      startMatch(3);
      playWinningDeal();
      return renderEnd();
    }

    it('shows "Ние печелим мача" and the series card, with next/history/stop buttons', async () => {
      await setUp();

      expect(screen.getByRole('heading', { name: 'Ние печелим мача' })).toBeTruthy();
      expect(screen.getByText('Серия · 2 от 3')).toBeTruthy();
      expect(screen.getByText('1 : 0')).toBeTruthy();
      expect(screen.getByRole('button', { name: S.next(2) })).toBeTruthy();
      expect(screen.getByRole('link', { name: S.history })).toBeTruthy();
      expect(screen.getByRole('button', { name: S.stop })).toBeTruthy();
    });

    it('"Мач 2 →" keeps the series and goes to the table, on match 2', async () => {
      const { router } = await setUp();

      await userEvent.click(screen.getByRole('button', { name: S.next(2) }));

      const match = appStore.getState().match;
      expect(match?.status).toBe('playing');
      expect(match?.series).toEqual({ A: 1, B: 0 });
      expect(router.state.location.pathname).toBe('/table');
      expect(screen.getByText('Мач 2 · серия 1:0 · 2 от 3')).toBeTruthy();
    });

    it('"Прекрати" leaves the match and goes Home', async () => {
      const { router } = await setUp();

      await userEvent.click(screen.getByRole('button', { name: S.stop }));

      expect(appStore.getState().match).toBeNull();
      expect(router.state.location.pathname).toBe('/');
    });
  });

  describe('a series match, decided', () => {
    it('shows "Ние печелим серията" with the home/history/rematch buttons', async () => {
      lowerTargetScore();
      startMatch(3);
      playWinningDeal(); // 1:0
      appStore.getState().nextMatch();
      playWinningDeal(); // 2:0, decides a best-of-3
      await renderEnd();

      expect(screen.getByRole('heading', { name: 'Ние печелим серията' })).toBeTruthy();
      expect(screen.getByRole('button', { name: S.home })).toBeTruthy();
      expect(screen.getByRole('link', { name: S.history })).toBeTruthy();
      expect(screen.getByRole('button', { name: S.rematch })).toBeTruthy();
    });
  });

  describe('a tie', () => {
    it('shows "Равенство" and no winner avatars or pill', async () => {
      startMatch(1);
      appStore.getState().endMatch();
      await renderEnd();

      expect(screen.getByRole('heading', { name: S.tie })).toBeTruthy();
      expect(screen.queryByText(STRINGS.end.names('Иван', 'Мария'))).toBeNull();
      expect(screen.queryByText('🍻 Вие черпите следващия рунд')).toBeNull();
    });
  });

  it('links "История" to /history, whose back link returns to /end', async () => {
    lowerTargetScore();
    startMatch(1);
    playWinningDeal();
    await renderEnd();

    expect(screen.getByRole('link', { name: S.history }).getAttribute('href')).toBe('/history');

    await userEvent.click(screen.getByRole('link', { name: S.history }));

    const backLink = await screen.findByRole('link', { name: STRINGS.history.back });
    expect(backLink.getAttribute('href')).toBe('/end');
  });
});
