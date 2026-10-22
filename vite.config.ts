/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'vite.svg'],
      manifest: {
        name: 'Immersive Pomodoro Workspace',
        short_name: 'Pomodoro',
        description: 'Immersive Virtual Pomodoro Workspace inspired by LifeAt',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: 'vite.svg',
            sizes: '32x32',
            type: 'image/svg+xml'
          }
        ]
      },
      injectManifest: {
        maximumFileSizeToCacheInBytes: 3145728, // 3 MiB
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}']
      }
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom'
  }
});
