import '@fontsource-variable/nunito';
import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { resumePath } from './app/resume';
import { routes } from './app/routes';
import { appStore, hydrateAppStore } from './store/instance';
import { syncTheme } from './ui/theme';

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
  const path = resumePath(appStore.getState().match);
  if (path && window.location.pathname === '/') void router.navigate(path, { replace: true });

  createRoot(root).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
});
