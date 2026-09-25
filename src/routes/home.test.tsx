// @vitest-environment happy-dom
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { STRINGS } from '../core/strings';
import { renderRoute, resetApp } from '../test/app';

const S = STRINGS.home;

beforeEach(() => {
  resetApp();
});

describe('Home', () => {
  it('shows the header, theme label, subtitle, and empty players state', () => {
    renderRoute('/');

    expect(screen.getByRole('heading', { name: STRINGS.appName })).toBeTruthy();
    expect(screen.getByText('Кръчма')).toBeTruthy();
    expect(screen.getByText(S.subtitle)).toBeTruthy();
    expect(screen.getByText(S.empty)).toBeTruthy();

    const playersSection = screen.getByRole('heading', { name: S.players }).closest('section');
    expect(playersSection).not.toBeNull();
    expect(within(playersSection as HTMLElement).getByText('0')).toBeTruthy();
  });

  it('links "Нова игра" to /setup and "Класация" to /stats', () => {
    renderRoute('/');

    expect(screen.getByRole('link', { name: S.newGame }).getAttribute('href')).toBe('/setup');
    expect(screen.getByRole('link', { name: S.stats }).getAttribute('href')).toBe('/stats');
  });

  it('opens the register sheet from "Нов играч" and shows the saved player in the grid', async () => {
    renderRoute('/');

    await userEvent.click(screen.getByRole('button', { name: S.newPlayer }));
    expect(screen.getByRole('dialog', { name: 'Нов играч' })).toBeTruthy();

    await userEvent.type(screen.getByRole('textbox', { name: 'Име или прякор' }), 'Иво');
    await userEvent.click(screen.getByRole('button', { name: 'Запази' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('Иво')).toBeTruthy();
  });

  it('opens the register sheet prefilled when tapping a player', async () => {
    renderRoute('/');
    await userEvent.click(screen.getByRole('button', { name: S.newPlayer }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Име или прякор' }), 'Иво');
    await userEvent.click(screen.getByRole('button', { name: 'Запази' }));

    await userEvent.click(screen.getByRole('button', { name: /Иво/ }));

    expect(screen.getByRole('dialog', { name: 'Редакция на играч' })).toBeTruthy();
    const nameInput = screen.getByRole('textbox', { name: 'Име или прякор' }) as HTMLInputElement;
    expect(nameInput.value).toBe('Иво');
  });

  it('opens the theme sheet from "Тема"', async () => {
    renderRoute('/');

    await userEvent.click(screen.getByRole('button', { name: S.theme }));

    expect(screen.getByRole('dialog', { name: 'Атмосфера' })).toBeTruthy();
  });

  it('disables "Сподели / Внос"', () => {
    renderRoute('/');

    const button = screen.getByRole('button', { name: S.share }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
