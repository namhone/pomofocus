/// <reference types="vitest" />
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

function apiDevServerPlugin(): Plugin {
  return {
    name: 'api-dev-server-plugin',
    configureServer(server) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url || !req.url.startsWith('/api/')) return next();

        try {
          const urlObj = new URL(req.url, 'http://localhost:5173');
          const pathname = urlObj.pathname;

          let targetFile: string | null = null;
          if (pathname === '/api/rooms') {
            targetFile = '/api/rooms.ts';
          } else if (pathname === '/api/coupons') {
            targetFile = '/api/coupons.ts';
          } else if (pathname === '/api/payment/create-order') {
            targetFile = '/api/payment/create-order.ts';
          } else if (pathname === '/api/payment/webhook' || pathname === '/api/payment/vcb-webhook') {
            targetFile = '/api/payment/webhook.ts';
          } else if (pathname === '/api/ai/companion') {
            targetFile = '/api/ai/companion.ts';
          }

          if (targetFile) {
            const mod = await server.ssrLoadModule(targetFile);
            if (mod && mod.default) {
              req.query = Object.fromEntries(urlObj.searchParams.entries());

              // Mock Express/Vercel response helpers
              res.status = (code: number) => {
                res.statusCode = code;
                return res;
              };
              res.json = (data: any) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              };

              if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
                let rawBody = '';
                req.on('data', (chunk: any) => {
                  rawBody += chunk;
                });
                req.on('end', async () => {
                  try {
                    req.body = JSON.parse(rawBody);
                  } catch {
                    req.body = rawBody;
                  }
                  await mod.default(req, res);
                });
                return;
              }

              await mod.default(req, res);
              return;
            }
          }
        } catch (err) {
          console.error('[apiDevServerPlugin error]:', err);
        }
        next();
      });
    }
  };
}

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  plugins: [
    apiDevServerPlugin(),
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
      workbox: {
        navigateFallbackDenylist: [/^\/downloads\/.*/, /^\/version\.json$/]
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
