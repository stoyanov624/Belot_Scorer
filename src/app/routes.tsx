import type { RouteObject } from 'react-router';
import { Home } from '../screens/home';
import { Table } from '../screens/table';
import { RootLayout } from './RootLayout';
import { RouteError } from './RouteError';

/** Secondary screens, loaded on first visit (or earlier via preloadRoute). */
export const LAZY_ROUTES: Record<string, () => Promise<{ Component: React.ComponentType }>> = {
  '/setup': () => import('../screens/setup'),
  '/history': () => import('../screens/history'),
  '/end': () => import('../screens/end'),
  '/stats': () => import('../screens/stats'),
  ...(import.meta.env.DEV ? { '/dev/ui': () => import('../screens/dev-ui') } : {}),
};

/** Starts downloading a lazy screen's code; no-op for eager or unknown paths. */
export function preloadRoute(path: string): void {
  void LAZY_ROUTES[path]?.();
}

const lazyRoute = (path: string): RouteObject => ({
  path: path.slice(1),
  lazy: {
    Component: async () => {
      const load = LAZY_ROUTES[path];
      if (!load) throw new Error(`no lazy route ${path}`);
      return (await load()).Component;
    },
  },
  ErrorBoundary: RouteError,
});

export const routes: RouteObject[] = [
  {
    Component: RootLayout,
    ErrorBoundary: RouteError,
    // Renders nothing for the moment a lazy screen's code loads on first visit (no flash of UI).
    HydrateFallback: () => null,
    children: [
      { index: true, Component: Home, ErrorBoundary: RouteError },
      { path: 'table', Component: Table, ErrorBoundary: RouteError },
      ...Object.keys(LAZY_ROUTES).map(lazyRoute),
    ],
  },
];
