import { afterEach } from 'vitest';

// Vitest globals are off, so React Testing Library can't register its own auto-cleanup.
// Node-environment tests (src/core) have no document, so only DOM tests load it.
if (typeof document !== 'undefined') {
  const { cleanup } = await import('@testing-library/react');
  afterEach(() => cleanup());
}
