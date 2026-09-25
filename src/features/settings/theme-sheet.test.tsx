// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { appStore } from '../../store/instance';
import { resetApp } from '../../test/app';
import { ThemeSheet } from './ThemeSheet';

beforeEach(() => {
  resetApp();
});

describe('ThemeSheet', () => {
  it('shows the dialog titled "Атмосфера" with 4 theme buttons and 4 felt buttons when open', () => {
    const onClose = vi.fn();
    render(<ThemeSheet open onClose={onClose} />);

    expect(screen.getByRole('dialog', { name: 'Атмосфера' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Тема' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Маса' })).toBeTruthy();
  });

  it('displays 4 theme buttons with theme names: Кръчма, Вкъщи, Сукно, Късна нощ', () => {
    render(<ThemeSheet open onClose={() => {}} />);
    const themeGroup = screen.getByRole('group', { name: 'Тема' });

    expect(within(themeGroup).getByRole('button', { name: /Кръчма/ })).toBeTruthy();
    expect(within(themeGroup).getByRole('button', { name: /Вкъщи/ })).toBeTruthy();
    expect(within(themeGroup).getByRole('button', { name: /Сукно/ })).toBeTruthy();
    expect(within(themeGroup).getByRole('button', { name: /Късна нощ/ })).toBeTruthy();
  });

  it('displays 4 felt buttons with felt names: Дърво, Сукно, Покривка, Камък', () => {
    render(<ThemeSheet open onClose={() => {}} />);
    const feltGroup = screen.getByRole('group', { name: 'Маса' });

    expect(within(feltGroup).getByRole('button', { name: 'Дърво' })).toBeTruthy();
    expect(within(feltGroup).getByRole('button', { name: 'Сукно' })).toBeTruthy();
    expect(within(feltGroup).getByRole('button', { name: 'Покривка' })).toBeTruthy();
    expect(within(feltGroup).getByRole('button', { name: 'Камък' })).toBeTruthy();
  });

  it('has "Кръчма" theme and "Дърво" felt with aria-pressed="true" by default', () => {
    render(<ThemeSheet open onClose={() => {}} />);

    const themeGroup = screen.getByRole('group', { name: 'Тема' });
    const feltGroup = screen.getByRole('group', { name: 'Маса' });

    expect(
      within(themeGroup)
        .getByRole('button', { name: /Кръчма/ })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      within(feltGroup).getByRole('button', { name: 'Дърво' }).getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('clicks "Късна нощ" to set theme to "night"', async () => {
    render(<ThemeSheet open onClose={() => {}} />);

    const themeGroup = screen.getByRole('group', { name: 'Тема' });
    const nightButton = within(themeGroup).getByRole('button', { name: /Късна нощ/ });

    await userEvent.click(nightButton);

    expect(appStore.getState().settings.theme).toBe('night');
  });

  it('clicks "Камък" to set felt to "stone"', async () => {
    render(<ThemeSheet open onClose={() => {}} />);

    const feltGroup = screen.getByRole('group', { name: 'Маса' });
    const stoneButton = within(feltGroup).getByRole('button', { name: 'Камък' });

    await userEvent.click(stoneButton);

    expect(appStore.getState().settings.felt).toBe('stone');
  });

  it('calls onClose when "Готово" button is clicked', async () => {
    const onClose = vi.fn();
    render(<ThemeSheet open onClose={onClose} />);

    const doneButton = screen.getByRole('button', { name: 'Готово' });

    await userEvent.click(doneButton);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('updates aria-pressed when theme is changed', async () => {
    render(<ThemeSheet open onClose={() => {}} />);

    const themeGroup = screen.getByRole('group', { name: 'Тема' });
    const pubButton = within(themeGroup).getByRole('button', { name: /Кръчма/ });
    const nightButton = within(themeGroup).getByRole('button', { name: /Късна нощ/ });

    expect(pubButton.getAttribute('aria-pressed')).toBe('true');
    expect(nightButton.getAttribute('aria-pressed')).toBe('false');

    await userEvent.click(nightButton);

    expect(pubButton.getAttribute('aria-pressed')).toBe('false');
    expect(nightButton.getAttribute('aria-pressed')).toBe('true');
  });

  it('updates aria-pressed when felt is changed', async () => {
    render(<ThemeSheet open onClose={() => {}} />);

    const feltGroup = screen.getByRole('group', { name: 'Маса' });
    const woodButton = within(feltGroup).getByRole('button', { name: 'Дърво' });
    const stoneButton = within(feltGroup).getByRole('button', { name: 'Камък' });

    expect(woodButton.getAttribute('aria-pressed')).toBe('true');
    expect(stoneButton.getAttribute('aria-pressed')).toBe('false');

    await userEvent.click(stoneButton);

    expect(woodButton.getAttribute('aria-pressed')).toBe('false');
    expect(stoneButton.getAttribute('aria-pressed')).toBe('true');
  });
});
