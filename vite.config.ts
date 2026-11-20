import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'apple-touch-icon.png', 'animals.json', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          id: './',
          name: 'B2KS Daily Routines - RPG Gia Đình',
          short_name: 'B2KS Game',
          description: 'Webgame RPG gia đình B2KS: Nhiệm vụ hằng ngày, Sở thú ảo, Trung tâm giao dịch, Chợ trời và Phòng thí nghiệm sáng tạo.',
          theme_color: '#2C3E50',
          background_color: '#2C3E50',
          display: 'standalone',
          start_url: './',
          scope: './',
          icons: [
            {
              src: './pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: './pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: './pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff,woff2}'],
          globIgnores: ['**/b2ks-source-bundle.json', '**/assets/aistudio/**'],
          navigateFallbackDenylist: [/\.zip$/i, /b2ks-source-bundle\.json$/i],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
      {
        name: 'copy-unbundled-src-assets-and-sync-docs',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
          const docsDir = path.resolve(__dirname, 'docs');
          if (fs.existsSync(distDir)) {
            fs.rmSync(docsDir, {recursive: true, force: true});
            fs.cpSync(distDir, docsDir, {
              recursive: true,
              force: true,
              filter: (srcPath) => {
                const normalized = srcPath.replace(/\\/g, '/');
                if (
                  normalized.endsWith('/b2ks-daily-routines-github.zip') ||
                  normalized.endsWith('/b2ks-source-bundle.json') ||
                  normalized.includes('/assets/aistudio')
                ) {
                  return false;
                }
                return true;
              },
            });
            fs.writeFileSync(path.join(docsDir, '.nojekyll'), '');
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
