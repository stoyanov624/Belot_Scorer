// @vitest-environment happy-dom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Seats } from '../../core/model';
import { STRINGS } from '../../core/strings';
import { appStore } from '../../store/instance';
import { renderRoute, resetApp } from '../../test/app';

const S = STRINGS.table;
const CLEAR = STRINGS.clear;
const END = STRINGS.endMatch;
const NAMES = ['Иван', 'Петър', 'Мария', 'Гошо'] as const;

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

/** Saves a hearts deal called by North with the given card points for team A. */
function saveHeartsDeal(cardPointsA: number) {
  appStore.getState().setContract('hearts', 0);
  // Rounded points in, exact out (ADR 0020); 8 means an exact tie, 81 : 81, which hangs.
  const exact = cardPointsA === 8 ? 81 : cardPointsA * 10;
  const result = appStore.getState().saveDeal({ cardPointsA: exact, capo: null });
  if (!result.ok) throw new Error('saveDeal failed');
}

describe('Clear sheet', () => {
  it('opens «Изчистване» from "Изчисти" with the body text and "Изчисти раздаване 1"', async () => {
    startMatch();
    renderRoute('/table');

    await userEvent.click(screen.getByRole('button', { name: S.clear }));

    // README §7 and the prototype title the sheet «Изчистване» (the button reads «Изчисти»).
    const sheet = screen.getByRole('dialog', { name: 'Изчистване' });
    expect(within(sheet).getByText(CLEAR.body)).toBeTruthy();
    expect(within(sheet).getByRole('button', { name: CLEAR.current(1) })).toBeTruthy();
  });

  it('clears the current declarations and contract, and closes the sheet', async () => {
    startMatch();
    appStore.getState().setContract('hearts', 0);
    appStore.getState().addDeclaration(0, 'terca');
    renderRoute('/table');

    await userEvent.click(screen.getByRole('button', { name: S.clear }));
    const sheet = screen.getByRole('dialog', { name: CLEAR.title });
    await userEvent.click(within(sheet).getByRole('button', { name: CLEAR.current(1) }));

    expect(appStore.getState().match?.contract).toBe(null);
    expect(appStore.getState().match?.current).toEqual([]);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: CLEAR.title })).toBeNull());
  });

  it('closes on "Отказ" without touching the deal', async () => {
    startMatch();
    appStore.getState().setContract('hearts', 0);
    appStore.getState().addDeclaration(0, 'terca');
    renderRoute('/table');

    await userEvent.click(screen.getByRole('button', { name: S.clear }));
    const sheet = screen.getByRole('dialog', { name: CLEAR.title });
    await userEvent.click(within(sheet).getByRole('button', { name: CLEAR.cancel }));

    expect(appStore.getState().match?.contract).toBe('hearts');
    expect(appStore.getState().match?.current).toHaveLength(1);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: CLEAR.title })).toBeNull());
  });

  it('has no undo button with no saved deals', async () => {
    startMatch();
    renderRoute('/table');

    await userEvent.click(screen.getByRole('button', { name: S.clear }));
    const sheet = screen.getByRole('dialog', { name: CLEAR.title });

    expect(within(sheet).queryByText(/Изтрий последното записано раздаване/)).toBeNull();
  });

  it('undoes the last saved deal, restores the hanging points, and closes the sheet', async () => {
    startMatch();
    saveHeartsDeal(8);
    expect(appStore.getState().match?.hang).toBe(8);
    renderRoute('/table');

    await userEvent.click(screen.getByRole('button', { name: S.clear }));
    const sheet = screen.getByRole('dialog', { name: CLEAR.title });
    const undo = within(sheet).getByRole('button', { name: CLEAR.undo(1) });

    await userEvent.click(undo);

    expect(appStore.getState().match?.games).toEqual([]);
    expect(appStore.getState().match?.hang).toBe(0);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: CLEAR.title })).toBeNull());
  });
});

describe('End-match sheet', () => {
  it('opens from "Край на мач" with the score and warning', async () => {
    startMatch();
    saveHeartsDeal(10);
    renderRoute('/table');

    await userEvent.click(screen.getByRole('button', { name: S.endMatch }));

    const sheet = screen.getByRole('dialog', { name: END.title });
    expect(within(sheet).getByText(END.body(10, 6))).toBeTruthy();
  });

  it('closes the sheet on "Продължи" without ending the match', async () => {
    startMatch();
    renderRoute('/table');

    await userEvent.click(screen.getByRole('button', { name: S.endMatch }));
    const sheet = screen.getByRole('dialog', { name: END.title });
    await userEvent.click(within(sheet).getByRole('button', { name: END.keep }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: END.title })).toBeNull());
    expect(appStore.getState().match?.status).toBe('playing');
  });

  it('ends the match and navigates to /end on "Приключи мача"', async () => {
    startMatch();
    saveHeartsDeal(10);
    const { router } = renderRoute('/table');

    await userEvent.click(screen.getByRole('button', { name: S.endMatch }));
    const sheet = screen.getByRole('dialog', { name: END.title });
    await userEvent.click(within(sheet).getByRole('button', { name: END.end }));

    expect(appStore.getState().match?.status).toBe('ended');
    expect(await screen.findByRole('button', { name: STRINGS.end.rematch })).toBeTruthy();
    expect(router.state.location.pathname).toBe('/end');
  });

  it('does not record a match with no deals in stats', async () => {
    startMatch();
    renderRoute('/table');

    await userEvent.click(screen.getByRole('button', { name: S.endMatch }));
    await userEvent.click(screen.getByRole('button', { name: END.end }));

    expect(appStore.getState().stats).toEqual([]);
  });
});
