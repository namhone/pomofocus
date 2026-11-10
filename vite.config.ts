/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg', 'favicon.svg'],
      manifest: {
        name: 'PomoFocus — Không Gian Làm Việc & Học Tập Tập Trung',
        short_name: 'PomoFocus',
        description: 'Ứng dụng Pomodoro, phòng học nhóm WebRTC, âm thanh ambient và quản lý học tập tối ưu.',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        icons: [
          {
            src: '/logo.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ]
      },
      injectManifest: {
        maximumFileSizeToCacheInBytes: 3145728, // 3 MiB
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}']
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-katex': ['katex', 'react-markdown', 'remark-math', 'rehype-katex'],
          'vendor-webrtc': ['dexie'],
          'vendor-icons': ['lucide-react']
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'tests/unit/**/*.test.{ts,tsx}', 'tests/e2e/**/*.test.{ts,tsx}']
  }
});
