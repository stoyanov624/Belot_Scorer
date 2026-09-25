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

describe('Declarations popover', () => {
  it('opens with a blocking message and no buttons when there is no contract', async () => {
    startMatch();
    renderRoute('/table');

    await userEvent.click(within(seat('Север')).getByRole('button', { name: 'Иван' }));

    const dialog = screen.getByRole('dialog', { name: S.declares('Иван') });
    expect(within(dialog).getByText(S.declares('Иван'))).toBeTruthy();
    expect(within(dialog).getByText(S.blocked['no-contract'])).toBeTruthy();
    expect(within(dialog).queryAllByRole('button')).toHaveLength(0);
  });

  it('opens with a blocking message when the contract is no-trumps', async () => {
    startMatch();
    appStore.getState().setContract('nt', 0);
    renderRoute('/table');

    await userEvent.click(within(seat('Север')).getByRole('button', { name: 'Иван' }));

    const dialog = screen.getByRole('dialog', { name: S.declares('Иван') });
    expect(within(dialog).getByText(S.blocked['no-trumps'])).toBeTruthy();
  });

  it('lists the allowed declarations, named by option and points', async () => {
    startMatch();
    appStore.getState().setContract('hearts', 0);
    renderRoute('/table');

    await userEvent.click(within(seat('Север')).getByRole('button', { name: 'Иван' }));

    const dialog = screen.getByRole('dialog', { name: S.declares('Иван') });
    for (const name of ['Белот 2', 'Терца 2', 'Кварта 5', 'Квинта 10', 'Каре 10+']) {
      expect(within(dialog).getByRole('button', { name })).toBeTruthy();
    }
  });

  it('picking a declaration adds it, closes the popover, and shows the chip', async () => {
    startMatch();
    appStore.getState().setContract('hearts', 0);
    renderRoute('/table');

    // happy-dom has no Popover API, so a closed popover can't be asserted by DOM absence;
    // `aria-expanded` on the avatar (plain React state) is the reliable open/closed signal here.
    const avatar = within(seat('Север')).getByRole('button', { name: 'Иван' });
    await userEvent.click(avatar);
    const dialog = screen.getByRole('dialog', { name: S.declares('Иван') });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Терца 2' }));

    expect(avatar.getAttribute('aria-expanded')).toBe('false');
    expect(appStore.getState().match?.current).toEqual([
      expect.objectContaining({ seat: 0, key: 'terca' }),
    ]);
    expect(within(seat('Север')).getByRole('button', { name: S.removeDecl('Терца') })).toBeTruthy();
  });

  it('narrows to Белот once 8 of 8 cards are used, then blocks with the 8-card message', async () => {
    startMatch();
    appStore.getState().setContract('hearts', 0);
    renderRoute('/table');

    const avatar = within(seat('Север')).getByRole('button', { name: 'Иван' });
    const openDialog = () => screen.getByRole('dialog', { name: S.declares('Иван') });

    // Квинта (5 cards), then Терца (3 more): exactly the seat's 8 cards, the real legal path to
    // the boundary (a quinte plus a quarte, 9 cards, is illegal and the store already refuses it).
    await userEvent.click(avatar);
    await userEvent.click(within(openDialog()).getByRole('button', { name: 'Квинта 10' }));

    await userEvent.click(avatar);
    await userEvent.click(within(openDialog()).getByRole('button', { name: 'Терца 2' }));

    await userEvent.click(avatar);
    const dialog = openDialog();
    expect(within(dialog).getByRole('button', { name: 'Белот 2' })).toBeTruthy();
    expect(within(dialog).queryAllByRole('button')).toHaveLength(1);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Белот 2' }));
    await userEvent.click(avatar);

    expect(within(openDialog()).getByText(S.blocked['no-cards'])).toBeTruthy();
  });

  it('places the popover below N, above S, right of W and left of E', async () => {
    startMatch();
    appStore.getState().setContract('hearts', 0);
    renderRoute('/table');

    const cases: [string, string, string][] = [
      ['Север', 'Иван', 'below'],
      ['Юг', 'Мария', 'above'],
      ['Запад', 'Гошо', 'right'],
      ['Изток', 'Петър', 'left'],
    ];
    for (const [seatName, playerName, placement] of cases) {
      await userEvent.click(within(seat(seatName)).getByRole('button', { name: playerName }));
      const dialog = screen.getByRole('dialog', { name: S.declares(playerName) });
      expect(dialog.getAttribute('data-placement')).toBe(placement);
    }
  });

  it('has aria-haspopup and reflects the open state via aria-expanded', async () => {
    startMatch();
    appStore.getState().setContract('hearts', 0);
    renderRoute('/table');

    const avatar = within(seat('Север')).getByRole('button', { name: 'Иван' });
    expect(avatar.getAttribute('aria-haspopup')).toBe('dialog');
    expect(avatar.getAttribute('aria-expanded')).toBe('false');

    await userEvent.click(avatar);
    expect(avatar.getAttribute('aria-expanded')).toBe('true');
  });
});
