// @vitest-environment happy-dom
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { totals } from '../core/match';
import type { Seats } from '../core/model';
import { STRINGS } from '../core/strings';
import { appStore } from '../store/instance';
import { renderRoute, resetApp } from '../test/app';

const S = STRINGS.setup;

beforeEach(() => {
  resetApp();
});

/** Seeds `names.length` players and returns their ids, in the order saved. */
function seedPlayers(names: string[]): string[] {
  return names.map((name) => {
    const result = appStore.getState().savePlayer({ id: null, name, emoji: null, photo: null });
    if (!result.ok) throw new Error(`setup failed for ${name}`);
    return result.id;
  });
}

/** Renders /setup and waits for the lazy screen to mount. */
async function renderSetup() {
  const rendered = renderRoute('/setup');
  await screen.findByRole('heading', { name: S.title });
  return rendered;
}

/** Opens a seat's sheet and picks a player already listed there, by exact name. */
async function pickSeat(seatLabel: RegExp, playerName: string) {
  await userEvent.click(screen.getByRole('button', { name: seatLabel }));
  const dialog = screen.getByRole('dialog');
  await userEvent.click(within(dialog).getByText(playerName, { exact: true }));
}

describe('Setup', () => {
  it('shows an empty draft: heading, team cards, four empty seats, hint, and a disabled deal button', async () => {
    await renderSetup();

    expect(screen.getByRole('textbox', { name: S.teamAName })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: S.teamBName })).toBeTruthy();
    expect(screen.getByText(S.teamASeats)).toBeTruthy();
    expect(screen.getByText(S.teamBSeats)).toBeTruthy();
    expect(screen.getAllByText(S.pickPlayer)).toHaveLength(4);
    expect(screen.getByText(S.hintSeats)).toBeTruthy();

    // The hint explains why the deal button is inactive.
    const deal = screen.getByRole('button', { name: S.deal, description: S.hintSeats });
    expect(deal.getAttribute('aria-disabled')).toBe('true');
  });

  it('does nothing when "Раздавай!" is clicked with an incomplete draft', async () => {
    await renderSetup();

    await userEvent.click(screen.getByRole('button', { name: S.deal }));

    expect(appStore.getState().match).toBeNull();
  });

  it('opens the seat sheet for a tapped seat, titled by its name', async () => {
    seedPlayers(['Иво', 'Гери', 'Мария', 'Петър']);
    await renderSetup();

    await userEvent.click(screen.getByRole('button', { name: /Север/ }));

    expect(screen.getByRole('dialog', { name: 'Място: Север' })).toBeTruthy();
  });

  it('seats a chosen player and closes the sheet', async () => {
    seedPlayers(['Иво', 'Гери', 'Мария', 'Петър']);
    await renderSetup();

    await pickSeat(/Север/, 'Иво');

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: /Север.*Иво/ })).toBeTruthy();
  });

  it('swaps a player already seated when picked for another seat', async () => {
    seedPlayers(['Иво', 'Гери', 'Мария', 'Петър']);
    await renderSetup();

    await pickSeat(/Север/, 'Иво');
    await pickSeat(/Изток/, 'Иво');

    expect(screen.getByRole('button', { name: /Изток.*Иво/ })).toBeTruthy();
    const north = screen.getByRole('button', { name: /Север/ });
    expect(within(north).getByText(S.pickPlayer)).toBeTruthy();
  });

  it('registers a new player from the seat sheet and seats them', async () => {
    await renderSetup();

    await userEvent.click(screen.getByRole('button', { name: /Юг/ }));
    await userEvent.click(screen.getByRole('button', { name: S.newPlayer }));
    expect(screen.getByRole('dialog', { name: 'Нов играч' })).toBeTruthy();

    await userEvent.type(screen.getByRole('textbox', { name: 'Име или прякор' }), 'Нина');
    await userEvent.click(screen.getByRole('button', { name: 'Запази' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: /Юг.*Нина/ })).toBeTruthy();
    expect(appStore.getState().roster.some((p) => p.name === 'Нина')).toBe(true);
  });

  it('starts the match on "Раздавай!" once all four seats are filled', async () => {
    const [ivo, geri, maria, petar] = seedPlayers(['Иво', 'Гери', 'Мария', 'Петър']);
    await renderSetup();

    await pickSeat(/Север/, 'Иво');
    await pickSeat(/Изток/, 'Гери');
    await pickSeat(/Юг/, 'Мария');
    await pickSeat(/Запад/, 'Петър');

    expect(
      screen.getByText(S.hintTarget(appStore.getState().settings.rules.targetScore)),
    ).toBeTruthy();
    const deal = screen.getByRole('button', {
      name: S.deal,
      description: S.hintTarget(appStore.getState().settings.rules.targetScore),
    });
    expect(deal.getAttribute('aria-disabled')).toBe('false');

    const teamAInput = screen.getByRole('textbox', { name: S.teamAName });
    await userEvent.clear(teamAInput);
    await userEvent.type(teamAInput, 'Ние2');
    await userEvent.click(screen.getByRole('radio', { name: '2 от 3' }));

    const rules = appStore.getState().settings.rules;
    await userEvent.click(deal);

    const match = appStore.getState().match;
    expect(match).not.toBeNull();
    expect(match?.seats).toEqual([ivo, geri, maria, petar]);
    expect(match?.teamA).toBe('Ние2');
    expect(match?.teamB).toBe(S.teamB);
    expect(match?.bestOf).toBe(3);
    expect(match?.rules).toEqual(rules);

    expect(await screen.findByRole('heading', { name: STRINGS.table.deal(1) })).toBeTruthy();
  });

  it('starts with the default team name when the field is left blank', async () => {
    seedPlayers(['Иво', 'Гери', 'Мария', 'Петър']);
    await renderSetup();

    await pickSeat(/Север/, 'Иво');
    await pickSeat(/Изток/, 'Гери');
    await pickSeat(/Юг/, 'Мария');
    await pickSeat(/Запад/, 'Петър');

    const teamAInput = screen.getByRole('textbox', { name: S.teamAName });
    await userEvent.clear(teamAInput);

    await userEvent.click(screen.getByRole('button', { name: S.deal }));

    expect(appStore.getState().match?.teamA).toBe(S.teamA);
  });

  it('prefills seats, team names and series length from an existing match', async () => {
    const [ivo, geri, maria, petar] = seedPlayers(['Иво', 'Гери', 'Мария', 'Петър']);
    appStore.getState().startMatch({
      seats: [ivo, geri, maria, petar] as Seats,
      teamA: 'Стария',
      teamB: 'Другия',
      bestOf: 5,
    });

    await renderSetup();

    expect((screen.getByRole('textbox', { name: S.teamAName }) as HTMLInputElement).value).toBe(
      'Стария',
    );
    expect((screen.getByRole('textbox', { name: S.teamBName }) as HTMLInputElement).value).toBe(
      'Другия',
    );
    expect(screen.getByRole('radio', { name: '3 от 5' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('button', { name: /Север.*Иво/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Изток.*Гери/ })).toBeTruthy();
  });

  it('links "← Начало" to /', async () => {
    await renderSetup();

    expect(screen.getByRole('link', { name: S.back }).getAttribute('href')).toBe('/');
  });

  it('confirms before replacing a playing match that has a saved deal', async () => {
    const [ivo, geri, maria, petar] = seedPlayers(['Иво', 'Гери', 'Мария', 'Петър']);
    appStore.getState().startMatch({
      seats: [ivo, geri, maria, petar] as Seats,
      teamA: 'Стария',
      teamB: 'Другия',
      bestOf: 1,
    });
    appStore.getState().setContract('hearts', 0);
    const saved = appStore.getState().saveDeal({ cardPointsA: 10, capo: null });
    if (!saved.ok) throw new Error('setup failed');
    const before = appStore.getState().match;
    if (!before) throw new Error('setup failed');
    const t = totals(before);

    await renderSetup();
    await userEvent.click(screen.getByRole('button', { name: S.deal }));

    expect(screen.getByRole('dialog', { name: S.replaceTitle })).toBeTruthy();
    expect(screen.getByText(S.replaceBody(t.A, t.B))).toBeTruthy();

    // "Отказ" keeps the old match untouched.
    await userEvent.click(screen.getByRole('button', { name: S.replaceCancel }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(appStore.getState().match).toEqual(before);

    // "Започни нов мач" replaces it and goes to the table.
    await userEvent.click(screen.getByRole('button', { name: S.deal }));
    await userEvent.click(screen.getByRole('button', { name: S.replaceConfirm }));

    expect(appStore.getState().match?.games).toHaveLength(0);
    expect(appStore.getState().match?.status).toBe('playing');
    expect(await screen.findByRole('heading', { name: STRINGS.table.deal(1) })).toBeTruthy();
  });

  it('replaces a playing match with no saved deals without confirming', async () => {
    const [ivo, geri, maria, petar] = seedPlayers(['Иво', 'Гери', 'Мария', 'Петър']);
    appStore.getState().startMatch({
      seats: [ivo, geri, maria, petar] as Seats,
      teamA: 'Стария',
      teamB: 'Другия',
      bestOf: 1,
    });

    await renderSetup();
    await userEvent.click(screen.getByRole('button', { name: S.deal }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(appStore.getState().match?.games).toHaveLength(0);
    expect(await screen.findByRole('heading', { name: STRINGS.table.deal(1) })).toBeTruthy();
  });

  it('replaces an ended match without confirming', async () => {
    const [ivo, geri, maria, petar] = seedPlayers(['Иво', 'Гери', 'Мария', 'Петър']);
    appStore.getState().startMatch({
      seats: [ivo, geri, maria, petar] as Seats,
      teamA: 'Стария',
      teamB: 'Другия',
      bestOf: 1,
    });
    appStore.getState().setContract('hearts', 0);
    const saved = appStore.getState().saveDeal({ cardPointsA: 10, capo: null });
    if (!saved.ok) throw new Error('setup failed');
    appStore.getState().endMatch();

    await renderSetup();
    await userEvent.click(screen.getByRole('button', { name: S.deal }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(appStore.getState().match?.status).toBe('playing');
    expect(appStore.getState().match?.games).toHaveLength(0);
    expect(await screen.findByRole('heading', { name: STRINGS.table.deal(1) })).toBeTruthy();
  });
});
