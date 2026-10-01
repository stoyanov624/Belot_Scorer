// @vitest-environment happy-dom
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import type { BestOf, Seats } from '../core/model';
import { STRINGS } from '../core/strings';
import { appStore } from '../store/instance';
import { renderRoute, resetApp } from '../test/app';

const S = STRINGS.table;
const CS = STRINGS.contract;
const DS = STRINGS.deal;
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
  const result = appStore.getState().saveDeal({ cardPointsA, capo: null, hangOnTie: true });
  if (!result.ok) throw new Error('saveDeal failed');
}

const seat = (name: string) => screen.getByRole('group', { name });

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

  it('shows the header buttons, and opens the share sheet from "Сподели"', async () => {
    startMatch();
    renderRoute('/table');

    expect(screen.getByRole('button', { name: S.clear })).toBeTruthy();
    expect(screen.getByRole('button', { name: S.theme })).toBeTruthy();
    expect(screen.getByRole('link', { name: S.history }).getAttribute('href')).toBe('/history');

    await userEvent.click(screen.getByRole('button', { name: S.share }));

    expect(await screen.findByRole('dialog', { name: STRINGS.share.title })).toBeTruthy();
  });

  it('opens the theme sheet from "Тема"', async () => {
    startMatch();
    renderRoute('/table');

    await userEvent.click(screen.getByRole('button', { name: S.theme }));

    expect(screen.getByRole('dialog', { name: 'Атмосфера' })).toBeTruthy();
  });

  it('shows the history count only once deals exist, as a hidden badge (name stays "История")', () => {
    startMatch();
    saveHeartsDeal(10);
    renderRoute('/table');

    const link = screen.getByRole('link', { name: S.history });
    const badge = within(link).getByText('1');
    expect(badge.getAttribute('aria-hidden')).toBe('true');
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
    expect(screen.getByText(S.declared(20, 0))).toBeTruthy();

    await userEvent.click(chip);

    expect(screen.queryByRole('button', { name: S.removeDecl('Терца') })).toBeNull();
    expect(appStore.getState().match?.current).toEqual([]);
  });

  it('shows "Избери игра" without a contract, then the contract and caller', async () => {
    startMatch();
    renderRoute('/table');
    const pill = screen.getByRole('button', { name: S.pickContract });
    // Never wraps: "Избери игра" stays on one line on the felt.
    expect(pill.className.split(' ')).toContain('whitespace-nowrap');

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
    for (const name of ['Белот 20', 'Терца 20', 'Кварта 50', 'Квинта 100', 'Каре 100+']) {
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
    await userEvent.click(within(dialog).getByRole('button', { name: 'Терца 20' }));

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
    await userEvent.click(within(openDialog()).getByRole('button', { name: 'Квинта 100' }));

    await userEvent.click(avatar);
    await userEvent.click(within(openDialog()).getByRole('button', { name: 'Терца 20' }));

    await userEvent.click(avatar);
    const dialog = openDialog();
    expect(within(dialog).getByRole('button', { name: 'Белот 20' })).toBeTruthy();
    expect(within(dialog).queryAllByRole('button')).toHaveLength(1);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Белот 20' }));
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

  it('returns focus to the seat avatar after picking a declaration', async () => {
    startMatch();
    appStore.getState().setContract('hearts', 0);
    renderRoute('/table');

    const avatar = within(seat('Север')).getByRole('button', { name: 'Иван' });
    await userEvent.click(avatar);
    const dialog = screen.getByRole('dialog', { name: S.declares('Иван') });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Терца 20' }));

    expect(document.activeElement).toBe(avatar);
  });

  it('returns focus to the seat avatar after removing a declaration chip', async () => {
    startMatch();
    appStore.getState().setContract('hearts', 0);
    appStore.getState().addDeclaration(0, 'terca');
    renderRoute('/table');

    const avatar = within(seat('Север')).getByRole('button', { name: 'Иван' });
    const chip = within(seat('Север')).getByRole('button', { name: S.removeDecl('Терца') });
    await userEvent.click(chip);

    expect(document.activeElement).toBe(avatar);
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

describe('Contract sheet', () => {
  it('opens from the contract pill with the "Готово" CTA once ready, and saves the contract', async () => {
    startMatch();
    renderRoute('/table');

    await userEvent.click(screen.getByRole('button', { name: S.pickContract }));
    const sheet = screen.getByRole('dialog', { name: CS.title });

    await userEvent.click(within(sheet).getByRole('radio', { name: 'Купа' }));
    await userEvent.click(within(sheet).getByRole('radio', { name: 'Иван' }));
    await userEvent.click(within(sheet).getByRole('button', { name: CS.done }));

    expect(appStore.getState().match?.contract).toBe('hearts');
    expect(appStore.getState().match?.caller).toBe(0);
  });

  it('opens the contract sheet from "Край на раздаване" when there is no contract, with the "Напред към точките" CTA', async () => {
    startMatch();
    renderRoute('/table');

    await userEvent.click(screen.getByRole('button', { name: S.endDeal }));

    const sheet = screen.getByRole('dialog', { name: CS.title });

    await userEvent.click(within(sheet).getByRole('radio', { name: 'Пика' }));
    await userEvent.click(within(sheet).getByRole('radio', { name: 'Гошо' }));
    await userEvent.click(within(sheet).getByRole('button', { name: CS.toPoints }));

    expect(appStore.getState().match?.contract).toBe('spades');
    expect(appStore.getState().match?.caller).toBe(3);
    // The deal-end sheet follows; with no sequences it starts at the points step.
    expect(screen.getByRole('dialog', { name: DS.pointsTitle(1) })).toBeTruthy();
    // The contract sheet is sequenced, not stacked: it's animating closed underneath.
    await waitFor(() => expect(screen.queryByRole('dialog', { name: CS.title })).toBeNull());
  });
});

describe('Deal-end sheet', () => {
  it('opens from "Край на раздаване" when a contract is set, resolving the declarations first', async () => {
    startMatch();
    appStore.getState().setContract('hearts', 0);
    appStore.getState().addDeclaration(0, 'terca');
    appStore.getState().addDeclaration(1, 'terca');
    renderRoute('/table');

    await userEvent.click(screen.getByRole('button', { name: S.endDeal }));

    const sheet = screen.getByRole('dialog', { name: DS.resolveTitle });
    expect(within(sheet).getAllByRole('listitem')).toHaveLength(2);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: CS.title })).toBeNull());

    await userEvent.click(within(sheet).getByRole('button', { name: DS.cancel }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: DS.resolveTitle })).toBeNull());
  });

  it('changes the contract from step 2: contract sheet in toPoints mode, then back to step 2', async () => {
    startMatch();
    appStore.getState().setContract('hearts', 0);
    renderRoute('/table');

    await userEvent.click(screen.getByRole('button', { name: S.endDeal }));
    const points = screen.getByRole('dialog', { name: DS.pointsTitle(1) });
    await userEvent.click(within(points).getByRole('button', { name: '♥ Купа' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: DS.pointsTitle(1) })).toBeNull(),
    );
    const sheet = screen.getByRole('dialog', { name: CS.title });
    await userEvent.click(within(sheet).getByRole('radio', { name: 'Без коз' }));
    await userEvent.click(within(sheet).getByRole('button', { name: CS.toPoints }));

    expect(appStore.getState().match?.contract).toBe('nt');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: CS.title })).toBeNull());
    const again = screen.getByRole('dialog', { name: DS.pointsTitle(1) });
    expect(within(again).getByText(DS.hintNt(13))).toBeTruthy();
  });

  it('leaves no sheet open when the contract change is cancelled', async () => {
    startMatch();
    appStore.getState().setContract('hearts', 0);
    renderRoute('/table');

    await userEvent.click(screen.getByRole('button', { name: S.endDeal }));
    await userEvent.click(screen.getByRole('button', { name: '♥ Купа' }));
    // An overlay tap dismisses the contract sheet (happy-dom has no native Esc handling).
    await userEvent.click(screen.getByRole('dialog', { name: CS.title }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: CS.title })).toBeNull());
    expect(screen.queryByRole('dialog', { name: DS.pointsTitle(1) })).toBeNull();
    expect(appStore.getState().match?.contract).toBe('hearts');
  });

  it('saves the deal, closes the sheet and shows the next deal with the new totals', async () => {
    startMatch();
    appStore.getState().setContract('hearts', 0);
    renderRoute('/table');

    await userEvent.click(screen.getByRole('button', { name: S.endDeal }));
    await userEvent.type(screen.getByLabelText('Ние'), '10');
    await userEvent.click(screen.getByRole('button', { name: DS.save }));

    // The sheet's title freezes at "1" (the saved deal) while it animates closed.
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: DS.pointsTitle(1) })).toBeNull(),
    );
    expect(screen.getByText('Раздаване 2')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
  });

  it('navigates to the match end after a winning save', async () => {
    appStore
      .getState()
      .updateSettings({ rules: { ...appStore.getState().settings.rules, targetScore: 10 } });
    startMatch();
    appStore.getState().setContract('hearts', 0);
    const { router } = renderRoute('/table');

    await userEvent.click(screen.getByRole('button', { name: S.endDeal }));
    await userEvent.type(screen.getByLabelText('Ние'), '10');
    await userEvent.click(screen.getByRole('button', { name: DS.save }));

    expect(await screen.findByRole('button', { name: STRINGS.end.rematch })).toBeTruthy();
    expect(router.state.location.pathname).toBe('/end');
    expect(appStore.getState().match?.status).toBe('ended');
  });
});

describe('Leaving the table', () => {
  it('sends an ended match at /table on to /end', async () => {
    startMatch();
    saveHeartsDeal(10);
    appStore.getState().endMatch();
    const { router } = renderRoute('/table');

    expect(await screen.findByRole('button', { name: STRINGS.end.rematch })).toBeTruthy();
    expect(router.state.location.pathname).toBe('/end');
  });

  it('replaces the table in history after the manual end, so Back skips it', async () => {
    startMatch();
    saveHeartsDeal(10);
    const { router } = renderRoute('/');
    await userEvent.click(await screen.findByRole('link', { name: STRINGS.home.continueMatch }));
    expect(router.state.location.pathname).toBe('/table');

    await userEvent.click(screen.getByRole('button', { name: S.endMatch }));
    await userEvent.click(screen.getByRole('button', { name: STRINGS.endMatch.end }));
    await screen.findByRole('button', { name: STRINGS.end.rematch });

    await act(() => router.navigate(-1));

    expect(router.state.location.pathname).toBe('/');
  });

  it('replaces the table in history after a winning save, so Back skips it', async () => {
    appStore
      .getState()
      .updateSettings({ rules: { ...appStore.getState().settings.rules, targetScore: 10 } });
    startMatch();
    appStore.getState().setContract('hearts', 0);
    const { router } = renderRoute('/');
    await userEvent.click(await screen.findByRole('link', { name: STRINGS.home.continueMatch }));

    await userEvent.click(screen.getByRole('button', { name: S.endDeal }));
    await userEvent.type(screen.getByLabelText('Ние'), '10');
    await userEvent.click(screen.getByRole('button', { name: DS.save }));
    await screen.findByRole('button', { name: STRINGS.end.rematch });

    await act(() => router.navigate(-1));

    expect(router.state.location.pathname).toBe('/');
  });

  it('saves a capot deal without ending the match, even past the target', async () => {
    appStore
      .getState()
      .updateSettings({ rules: { ...appStore.getState().settings.rules, targetScore: 10 } });
    startMatch();
    appStore.getState().setContract('hearts', 0);
    const { router } = renderRoute('/table');

    await userEvent.click(screen.getByRole('button', { name: S.endDeal }));
    const [capoA] = screen.getAllByRole('button', { name: DS.capo });
    if (!capoA) throw new Error('no capo button');
    await userEvent.click(capoA);
    await userEvent.click(screen.getByRole('button', { name: DS.save }));

    const match = appStore.getState().match;
    expect(match?.games).toHaveLength(1);
    expect(match?.games[0]?.capo).toBe('A');
    expect(match?.status).toBe('playing');
    expect(screen.getByText('Раздаване 2')).toBeTruthy();
    expect(router.state.location.pathname).toBe('/table');
  });

  it('links "← Начало" to Home, where «Продължи мача» returns to the table', async () => {
    startMatch();
    const { router } = renderRoute('/table');

    const back = screen.getByRole('link', { name: STRINGS.setup.back });
    expect(back.getAttribute('href')).toBe('/');
    await userEvent.click(back);

    await userEvent.click(await screen.findByRole('link', { name: STRINGS.home.continueMatch }));

    expect(router.state.location.pathname).toBe('/table');
    expect(screen.getByText('Раздаване 1')).toBeTruthy();
  });
});
