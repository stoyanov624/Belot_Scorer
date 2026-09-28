import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

// sRGB of the pub theme's bg, oklch(0.19 0.03 50) — src/core/tokens.ts (also in index.html's
// static <meta name="theme-color">, since the manifest and the initial paint must agree).
const PUB_BG_HEX = '#1f1007';

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Белот',
        short_name: 'Белот',
        description: 'Записва обявите и точките, докато вие играете.',
        lang: 'bg',
        start_url: '/',
        display: 'standalone',
        background_color: PUB_BG_HEX,
        theme_color: PUB_BG_HEX,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'test/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['src/test-setup.ts'],
    // Undo every vi.spyOn after each test, so a spy on console or URL never leaks into the next.
    restoreMocks: true,
  },
});
