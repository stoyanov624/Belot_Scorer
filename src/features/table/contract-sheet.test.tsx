// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Seats } from '../../core/model';
import { STRINGS } from '../../core/strings';
import { appStore } from '../../store/instance';
import { resetApp } from '../../test/app';
import { ContractSheet } from './ContractSheet';

const S = STRINGS.contract;
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

describe('ContractSheet', () => {
  it('opens with the title "Каква е играта?"', () => {
    startMatch();
    render(<ContractSheet open mode="set" onClose={() => {}} onConfirmed={() => {}} />);

    expect(screen.getByRole('dialog', { name: S.title })).toBeTruthy();
  });

  it('shows the six contract tiles, with ♦ and ♥ in text-suit-red, and 4 caller buttons', () => {
    startMatch();
    render(<ContractSheet open mode="set" onClose={() => {}} onConfirmed={() => {}} />);

    for (const label of ['Спатия', 'Каро', 'Купа', 'Пика', 'Без коз', 'Всичко коз']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
    const clubs = screen.getByRole('button', { name: 'Спатия' });
    const diamonds = screen.getByRole('button', { name: 'Каро' });
    const hearts = screen.getByRole('button', { name: 'Купа' });
    expect(within(clubs).getByText('♣').className).not.toContain('text-suit-red');
    expect(within(diamonds).getByText('♦').className).toContain('text-suit-red');
    expect(within(hearts).getByText('♥').className).toContain('text-suit-red');

    for (const name of NAMES) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
  });

  it("lays the callers out in 4 columns: avatar ringed in the seat's team colour above the name", () => {
    startMatch();
    render(<ContractSheet open mode="set" onClose={() => {}} onConfirmed={() => {}} />);

    const buttons = NAMES.map((name) => screen.getByRole('button', { name }));
    expect(buttons[0]?.parentElement?.className.split(' ')).toContain('grid-cols-4');
    buttons.forEach((button, seat) => {
      expect(button.className.split(' ')).toContain('flex-col');
      const avatar = button.querySelector('[aria-hidden="true"]');
      expect(avatar?.className.split(' ')).toContain(
        seat % 2 === 0 ? 'border-team-a' : 'border-team-b',
      );
      expect(button.lastElementChild?.textContent).toBe(NAMES[seat]);
    });
  });

  it('does nothing until both a contract and a caller are picked, then reads "Готово"', async () => {
    startMatch();
    render(<ContractSheet open mode="set" onClose={() => {}} onConfirmed={() => {}} />);

    const cta = screen.getByRole('button', { name: S.pick });
    expect(cta.getAttribute('aria-disabled')).toBe('true');

    await userEvent.click(cta);
    expect(appStore.getState().match?.contract ?? null).toBe(null);

    await userEvent.click(screen.getByRole('button', { name: 'Купа' }));
    // Still incomplete: no caller yet.
    expect(screen.getByRole('button', { name: S.pick })).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'Иван' }));

    const done = screen.getByRole('button', { name: S.done });
    expect(done.getAttribute('aria-disabled')).toBe('false');

    await userEvent.click(done);

    expect(appStore.getState().match?.contract).toBe('hearts');
    expect(appStore.getState().match?.caller).toBe(0);
  });

  it('pre-selects the current contract and caller', () => {
    startMatch();
    appStore.getState().setContract('spades', 2);
    render(<ContractSheet open mode="set" onClose={() => {}} onConfirmed={() => {}} />);

    expect(screen.getByRole('button', { name: 'Пика' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Мария' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('shows the warning when "Без коз" is picked and declarations exist, and clears them on confirm', async () => {
    startMatch();
    appStore.getState().setContract('hearts', 0);
    appStore.getState().addDeclaration(0, 'terca');
    expect(appStore.getState().match?.current.length).toBe(1);

    render(<ContractSheet open mode="set" onClose={() => {}} onConfirmed={() => {}} />);

    expect(screen.queryByText(S.ntWarning)).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Без коз' }));

    expect(screen.getByText(S.ntWarning)).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: S.done }));

    expect(appStore.getState().match?.contract).toBe('nt');
    expect(appStore.getState().match?.current).toEqual([]);
  });

  it('reads "Напред към точките" when opened in toPoints mode, and calls onConfirmed', async () => {
    startMatch();
    const onConfirmed = vi.fn();
    render(<ContractSheet open mode="toPoints" onClose={() => {}} onConfirmed={onConfirmed} />);

    await userEvent.click(screen.getByRole('button', { name: 'Пика' }));
    await userEvent.click(screen.getByRole('button', { name: 'Гошо' }));

    const cta = screen.getByRole('button', { name: S.toPoints });
    await userEvent.click(cta);

    expect(appStore.getState().match?.contract).toBe('spades');
    expect(onConfirmed).toHaveBeenCalledOnce();
  });
});
