import { render } from '@testing-library/react';
import { createMemoryRouter, type RouteObject } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { routes } from '../app/routes';
import { appStore } from '../store/instance';

/** Empty data, writes unlocked, hydration ready: the state a fresh install reaches. */
export function resetApp(): void {
  appStore.getState().resetData();
}

/**
 * React Router resolves an object-form `lazy` definition (e.g. `lazy: { Component: fn }`)
 * by mutating that object in place (it sets `route.lazy.Component = undefined` once
 * loaded). `convertRoutesToDataRoutes` only shallow-copies each route, so a route's
 * `.lazy` object is shared by reference with the static `routes` array — after one router
 * resolves a lazy route, the shared `routes` singleton can never load it again. Cloning
 * the tree (and each route's own `.lazy` object) before handing it to a router keeps that
 * mutation local to that one router, so `renderRoute` stays safe to call more than once
 * per test file.
 */
function cloneRoute(route: RouteObject): RouteObject {
  const { lazy } = route;
  const clonedLazy = lazy && typeof lazy === 'object' ? { ...lazy } : lazy;
  return route.index
    ? { ...route, lazy: clonedLazy }
    : { ...route, lazy: clonedLazy, children: route.children?.map(cloneRoute) };
}

/** Renders the real route table at `path` (lazy screens need `findBy…`). */
export function renderRoute(path: string) {
  const router = createMemoryRouter(routes.map(cloneRoute), { initialEntries: [path] });
  return { router, ...render(<RouterProvider router={router} />) };
}
