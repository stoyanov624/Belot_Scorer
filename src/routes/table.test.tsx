// @vitest-environment happy-dom
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import type { BestOf, Seats } from '../core/model';
import { STRINGS } from '../core/strings';
import { appStore } from '../store/instance';
import { renderRoute, resetApp } from '../test/app';

const S = STRINGS.table;
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

/** Saves a hearts deal called by North with the given card points for team A. */
function saveHeartsDeal(cardPointsA: number) {
  appStore.getState().setContract('hearts', 0);
  const result = appStore.getState().saveDeal({ cardPointsA, capo: null });
  if (!result.ok) throw new Error('saveDeal failed');
}

const seat = (name: string) => screen.getByRole('region', { name });

describe('Table', () => {
  it('shows the header line and deal number', () => {
    startMatch();
    renderRoute('/table');

    expect(screen.getByText('Белот · до 151')).toBeTruthy();
    expect(screen.getByText('Раздаване 1')).toBeTruthy();
  });

  it('shows the series line during a series', () => {
    startMatch(3);
    renderRoute('/table');

    expect(screen.getByText('Мач 1 · серия 0:0 · 2 от 3')).toBeTruthy();
  });

  it('shows the header buttons, with "Сподели" disabled', () => {
    startMatch();
    renderRoute('/table');

    expect(screen.getByRole('button', { name: S.clear })).toBeTruthy();
    expect(screen.getByRole('button', { name: S.theme })).toBeTruthy();
    expect(screen.getByRole('link', { name: S.history }).getAttribute('href')).toBe('/history');
    expect((screen.getByRole('button', { name: S.share }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('opens the theme sheet from "Тема"', async () => {
    startMatch();
    renderRoute('/table');

    await userEvent.click(screen.getByRole('button', { name: S.theme }));

    expect(screen.getByRole('dialog', { name: 'Атмосфера' })).toBeTruthy();
  });

  it('shows the history count only once deals exist', () => {
    startMatch();
    saveHeartsDeal(10);
    renderRoute('/table');

    expect(screen.getByRole('link', { name: `${S.history} 1` })).toBeTruthy();
  });

  it('shows the four players at their seats', () => {
    startMatch();
    renderRoute('/table');

    STRINGS.seats.forEach((seatName, i) => {
      expect(within(seat(seatName)).getByRole('button', { name: NAMES[i] })).toBeTruthy();
      expect(within(seat(seatName)).getByText(NAMES[i] as string)).toBeTruthy();
    });
  });

  it('marks the dealer: North on deal 1, West after one saved deal', () => {
    startMatch();
    const { unmount } = renderRoute('/table');
    expect(within(seat('Север')).getByText(S.dealer)).toBeTruthy();
    expect(screen.getAllByText(S.dealer)).toHaveLength(1);
    unmount();

    saveHeartsDeal(10);
    renderRoute('/table');
    expect(within(seat('Запад')).getByText(S.dealer)).toBeTruthy();
    expect(screen.getAllByText(S.dealer)).toHaveLength(1);
  });

  it('hides the dealer badge when showDealer is off', () => {
    startMatch();
    appStore.getState().updateSettings({ showDealer: false });
    renderRoute('/table');

    expect(screen.queryByText(S.dealer)).toBeNull();
  });

  it('shows team names, totals and the declaration sum on the coaster', () => {
    startMatch();
    renderRoute('/table');

    expect(screen.getByText('Ние')).toBeTruthy();
    expect(screen.getByText('Вие')).toBeTruthy();
    expect(screen.getAllByText('0')).toHaveLength(2);
    expect(screen.getByText(S.declared(0, 0))).toBeTruthy();
    expect(screen.queryByText(/висят/)).toBeNull();
  });

  it('updates the totals after a saved deal', () => {
    startMatch();
    saveHeartsDeal(10);
    renderRoute('/table');

    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
  });

  it('shows hanging points', () => {
    startMatch();
    saveHeartsDeal(8);
    renderRoute('/table');

    expect(screen.getByText(S.hanging(8))).toBeTruthy();
  });

  it('shows a declaration chip that removes the declaration', async () => {
    startMatch();
    appStore.getState().setContract('hearts', 0);
    appStore.getState().addDeclaration(0, 'terca');
    renderRoute('/table');

    const chip = within(seat('Север')).getByRole('button', { name: S.removeDecl('Терца') });
    expect(chip.textContent).toContain('Терца');
    expect(screen.getByText(S.declared(2, 0))).toBeTruthy();

    await userEvent.click(chip);

    expect(screen.queryByRole('button', { name: S.removeDecl('Терца') })).toBeNull();
    expect(appStore.getState().match?.current).toEqual([]);
  });

  it('shows "Избери игра" without a contract, then the contract and caller', async () => {
    startMatch();
    renderRoute('/table');
    expect(screen.getByRole('button', { name: S.pickContract })).toBeTruthy();

    act(() => appStore.getState().setContract('hearts', 0));

    expect(await screen.findByRole('button', { name: /Купа · Иван/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: S.pickContract })).toBeNull();
  });

  it('shows the bottom buttons', () => {
    startMatch();
    renderRoute('/table');

    expect(screen.getByRole('button', { name: S.endDeal })).toBeTruthy();
    expect(screen.getByRole('button', { name: S.endMatch })).toBeTruthy();
  });

  it('redirects to Home without a match', async () => {
    renderRoute('/table');

    expect(await screen.findByRole('heading', { name: STRINGS.appName })).toBeTruthy();
  });
});
