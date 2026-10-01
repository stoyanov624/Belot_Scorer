// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { appStore } from '../store/instance';
import { renderRoute, resetApp } from './app';

describe('renderRoute', () => {
  it('renders the home screen with an empty roster after resetApp', () => {
    resetApp();
    renderRoute('/');
    expect(screen.getByRole('heading', { name: 'Белотомания' })).toBeTruthy();
    expect(appStore.getState().roster).toEqual([]);
  });

  // Regression: React Router mutates an object-form `lazy` definition in place once it
  // resolves, and `routes` is a module-level singleton — reusing it for a second router
  // used to leave that lazy route permanently unloadable for the rest of the test file.
  it('renders the same lazy screen twice in one file', async () => {
    resetApp();
    renderRoute('/stats');
    expect(await screen.findByRole('heading', { name: 'Класация' })).toBeTruthy();
    cleanup();

    resetApp();
    renderRoute('/stats');
    expect(await screen.findByRole('heading', { name: 'Класация' })).toBeTruthy();
  });
});
