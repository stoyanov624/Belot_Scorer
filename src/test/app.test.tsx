// @vitest-environment happy-dom
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { appStore } from '../store/instance';
import { renderRoute, resetApp } from './app';

describe('renderRoute', () => {
  it('renders the home screen with an empty roster after resetApp', () => {
    resetApp();
    renderRoute('/');
    expect(screen.getByRole('heading', { name: 'Белот' })).toBeTruthy();
    expect(appStore.getState().roster).toEqual([]);
  });
});
