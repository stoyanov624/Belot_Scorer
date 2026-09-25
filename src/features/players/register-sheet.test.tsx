// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AVATAR_EMOJI } from '../../core/avatars';
import { appStore } from '../../store/instance';
import { resetApp } from '../../test/app';
import { RegisterSheet } from './RegisterSheet';

beforeEach(() => {
  resetApp();
});

describe('RegisterSheet', () => {
  it('saves a new player with a name and a random emoji', async () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    render(<RegisterSheet open playerId={null} onClose={onClose} onSaved={onSaved} />);

    expect(screen.getByRole('heading', { name: 'Нов играч' })).toBeTruthy();
    await userEvent.type(screen.getByRole('textbox', { name: 'Име или прякор' }), 'Иво');
    await userEvent.click(screen.getByRole('button', { name: 'Запази' }));

    const roster = appStore.getState().roster;
    expect(roster).toHaveLength(1);
    expect(roster[0]?.name).toBe('Иво');
    expect(roster[0]?.emoji).not.toBeNull();
    expect(AVATAR_EMOJI).toContain(roster[0]?.emoji);
    expect(onSaved).toHaveBeenCalledWith(roster[0]?.id);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows an error and saves nothing for an empty name', async () => {
    render(<RegisterSheet open playerId={null} onClose={() => {}} />);

    await userEvent.click(screen.getByRole('button', { name: 'Запази' }));

    expect(screen.getByRole('alert').textContent).toBe('Въведете име.');
    expect(appStore.getState().roster).toHaveLength(0);
  });

  it('shows an error for a duplicate name (case-insensitive)', async () => {
    appStore.getState().savePlayer({ id: null, name: 'Иво', emoji: '🐻', photo: null });
    render(<RegisterSheet open playerId={null} onClose={() => {}} />);

    await userEvent.type(screen.getByRole('textbox', { name: 'Име или прякор' }), 'иво');
    await userEvent.click(screen.getByRole('button', { name: 'Запази' }));

    expect(screen.getByRole('alert').textContent).toBe('Вече има играч с това име.');
    expect(appStore.getState().roster).toHaveLength(1);
  });

  it('lets the user pick an emoji, saved with the player', async () => {
    const onSaved = vi.fn();
    render(<RegisterSheet open playerId={null} onClose={() => {}} onSaved={onSaved} />);

    await userEvent.type(screen.getByRole('textbox', { name: 'Име или прякор' }), 'Иво');
    const foxButton = screen.getByRole('button', { name: '🦊' });
    await userEvent.click(foxButton);
    expect(foxButton.getAttribute('aria-pressed')).toBe('true');

    await userEvent.click(screen.getByRole('button', { name: 'Запази' }));

    const roster = appStore.getState().roster;
    expect(roster[0]?.emoji).toBe('🦊');
  });

  it('edits an existing player, prefilled, and deletes them', async () => {
    const result = appStore
      .getState()
      .savePlayer({ id: null, name: 'Иво', emoji: '🐻', photo: null });
    if (!result.ok) throw new Error('setup failed');
    const onClose = vi.fn();

    render(<RegisterSheet open playerId={result.id} onClose={onClose} />);

    expect(screen.getByRole('heading', { name: 'Редакция на играч' })).toBeTruthy();
    const nameInput = screen.getByRole('textbox', { name: 'Име или прякор' }) as HTMLInputElement;
    expect(nameInput.value).toBe('Иво');

    await userEvent.click(screen.getByRole('button', { name: 'Изтрий играча' }));

    expect(appStore.getState().roster).toHaveLength(0);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows an in-match note instead of delete for a seated player', () => {
    const s = appStore.getState();
    s.savePlayer({ id: null, name: 'Иво', emoji: null, photo: null });
    s.savePlayer({ id: null, name: 'Гери', emoji: null, photo: null });
    s.savePlayer({ id: null, name: 'Мария', emoji: null, photo: null });
    s.savePlayer({ id: null, name: 'Петър', emoji: null, photo: null });
    const roster = appStore.getState().roster;
    const seats = roster.map((p) => p.id) as [string, string, string, string];
    appStore.getState().startMatch({ seats, teamA: 'Ние', teamB: 'Вие', bestOf: 1 });

    render(<RegisterSheet open playerId={roster[0]?.id ?? null} onClose={() => {}} />);

    expect(screen.getByText('Играчът е в текущия мач и не може да бъде изтрит.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Изтрий играча' })).toBeNull();
  });

  it('closes without saving on cancel', async () => {
    const onClose = vi.fn();
    render(<RegisterSheet open playerId={null} onClose={onClose} />);

    await userEvent.type(screen.getByRole('textbox', { name: 'Име или прякор' }), 'Иво');
    await userEvent.click(screen.getByRole('button', { name: 'Отказ' }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(appStore.getState().roster).toHaveLength(0);
  });
});
