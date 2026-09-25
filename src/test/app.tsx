import { render } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { routes } from '../app/routes';
import { appStore } from '../store/instance';

/** Empty data, writes unlocked, hydration ready: the state a fresh install reaches. */
export function resetApp(): void {
  appStore.getState().resetData();
}

/** Renders the real route table at `path` (lazy screens need `findBy…`). */
export function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return { router, ...render(<RouterProvider router={router} />) };
}
