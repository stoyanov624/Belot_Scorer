import '@fontsource-variable/nunito';
import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { routes } from './app/routes';
import { appStore, hydrateAppStore } from './store/instance';
import { syncTheme } from './ui/theme';

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');

const router = createBrowserRouter(routes);

// Render only after saved data has loaded, so no component ever sees the empty defaults
// and no write can overwrite stored data before it has been read.
void hydrateAppStore().then(() => {
  syncTheme(appStore, document.documentElement);
  createRoot(root).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
});
