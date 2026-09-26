// @vitest-environment happy-dom
import { fireEvent, screen } from '@testing-library/react';
import { get, set } from 'idb-keyval';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERSIST_VERSION } from '../core/persisted';
import { STRINGS } from '../core/strings';
import { backupKey } from '../storage/document';
import { STORAGE_KEY } from '../store/app-store';
import { appStore } from '../store/instance';
import { renderRoute, resetApp } from '../test/app';

// idb-keyval's ESM namespace can't be spied on directly (its properties aren't
// configurable), so `set` is wrapped once here; the save-error test overrides its
// implementation for a single call, and the wrapping keeps every other call real.
const realSet = vi.hoisted(() => ({ fn: undefined as unknown as typeof import('idb-keyval').set }));
vi.mock('idb-keyval', async (importOriginal) => {
  const actual = await importOriginal<typeof import('idb-keyval')>();
  realSet.fn = actual.set;
  return { ...actual, set: vi.fn(actual.set) };
});

const S = STRINGS.recovery;

beforeEach(() => {
  resetApp();
  vi.mocked(set).mockImplementation(realSet.fn);
});

describe('RootLayout recovery', () => {
  it('shows the failed-load screen instead of Home, and resetData starts fresh', async () => {
    const bad = { version: PERSIST_VERSION, state: { roster: 'nope' } };
    await set(STORAGE_KEY, bad);
    await appStore.persist.rehydrate();
    expect(appStore.getState().hydration).toBe('failed');

    renderRoute('/');
    expect(await screen.findByRole('heading', { name: S.title })).toBeTruthy();
    expect(screen.getByText(S.body)).toBeTruthy();
    expect(screen.queryByRole('heading', { name: STRINGS.screens.home })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: S.reset }));

    expect(await screen.findByRole('heading', { name: STRINGS.screens.home })).toBeTruthy();
    expect(appStore.getState().hydration).toBe('ready');
    expect(appStore.getState().roster).toEqual([]);
  });

  it('keeps the backup after a failed load and after resetData', async () => {
    const bad = { version: PERSIST_VERSION, state: { roster: 'nope' } };
    await set(STORAGE_KEY, bad);
    await appStore.persist.rehydrate();

    renderRoute('/');
    await screen.findByRole('heading', { name: S.title });
    expect(await get(backupKey(STORAGE_KEY))).toEqual(bad);

    fireEvent.click(screen.getByRole('button', { name: S.reset }));
    await screen.findByRole('heading', { name: STRINGS.screens.home });

    expect(await get(backupKey(STORAGE_KEY))).toEqual(bad);
  });

  it('shows a save-error banner above the routes without hiding them', async () => {
    vi.mocked(set).mockRejectedValueOnce(new Error('quota'));

    renderRoute('/');
    expect(await screen.findByRole('heading', { name: STRINGS.screens.home })).toBeTruthy();

    appStore.getState().savePlayer({ id: null, name: 'Иво', emoji: null, photo: null });

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(S.saveError);
    // The banner sits above the outlet in normal flow; it doesn't cover the route.
    expect(screen.getByRole('heading', { name: STRINGS.screens.home })).toBeTruthy();
  });
});
