import { afterEach } from 'vitest';

// Only configure cleanup in DOM environments (e.g., happy-dom), not in node environment.
// Vitest globals are off, so React Testing Library can't register its own auto-cleanup.
if (typeof document !== 'undefined') {
  // Use dynamic import to load cleanup in DOM environments only
  void import('@testing-library/react').then(({ cleanup }) => {
    afterEach(() => cleanup());
  });
}
