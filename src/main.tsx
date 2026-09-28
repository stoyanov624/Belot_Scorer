import '@fontsource-variable/nunito';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { routes } from './app/routes';
import { startPath } from './app/share-link';
import { appStore, hydrateAppStore } from './store/instance';
import { syncTheme } from './ui/theme';

// autoUpdate needs no prompt UI: the new service worker takes over on its own.
registerSW();

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');

const router = createBrowserRouter(routes);

// Paint the default theme at once (no white page while IndexedDB loads); the subscription
// switches to the stored theme when hydration sets it.
syncTheme(appStore, document.documentElement);

// Render only after saved data has loaded, so no component ever sees the empty defaults
// and no write can overwrite stored data before it has been read.
void hydrateAppStore().then(() => {
  // A stored match resumes straight to its screen (ADR 0011), but only when the app was
  // opened at the root: a deep link (e.g. a shared table) must not be redirected away.
  // A `#belot=` link wins over resume and opens import instead (DATA_MODEL §4).
  const path = startPath(window.location, appStore.getState().match);
  // The hash is cleared once it has been read, so it never lingers in the address bar or
  // gets re-read on a later navigation (DATA_MODEL §4).
  if (window.location.hash.includes('belot='))
    history.replaceState(null, '', window.location.pathname + window.location.search);
  if (path) void router.navigate(path, { replace: true });

  createRoot(root).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
});
