// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { describe, expect, it, vi } from 'vitest';
import { STRINGS } from '../core/strings';
import { RouteError } from './RouteError';
import { LAZY_ROUTES, preloadRoute, routes } from './routes';

const renderAt = (path: string) =>
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />);

describe('router', () => {
  it('renders the home screen eagerly', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: STRINGS.screens.home })).toBeTruthy();
  });

  it('lazy-loads a secondary screen', async () => {
    renderAt('/stats');
    expect(await screen.findByRole('heading', { name: STRINGS.screens.stats })).toBeTruthy();
  });

  it('shows the error boundary for an unknown path', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderAt('/nope');
    expect(await screen.findByText(STRINGS.routeError.title)).toBeTruthy();
  });

  it('catches a render error in a route with its own boundary', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Boom = () => {
      throw new Error('boom');
    };
    render(
      <RouterProvider
        router={createMemoryRouter([{ path: '/', Component: Boom, ErrorBoundary: RouteError }])}
      />,
    );
    expect(await screen.findByText(STRINGS.routeError.title)).toBeTruthy();
    expect(screen.getByRole('link', { name: STRINGS.routeError.home }).getAttribute('href')).toBe(
      '/',
    );
  });

  it('lays the root-level error out in the page column and logs the error once', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const boom = new Error('boom');
    const Boom = () => {
      throw boom;
    };
    render(
      <RouterProvider
        router={createMemoryRouter([{ path: '/', Component: Boom, ErrorBoundary: RouteError }])}
      />,
    );
    const alert = await screen.findByRole('alert');
    expect(alert.className).toContain('max-w-[780px]');
    expect(alert.className).toContain('mx-auto');
    const own = log.mock.calls.filter((call) => call.length === 1 && call[0] === boom);
    expect(own).toHaveLength(1);
  });

  it('preloads only lazy routes', () => {
    const load = vi.spyOn(LAZY_ROUTES, '/stats');
    preloadRoute('/stats');
    preloadRoute('/table'); // eager: nothing to preload
    expect(load).toHaveBeenCalledOnce();
  });
});
