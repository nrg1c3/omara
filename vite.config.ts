import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// base نسبي عشان التطبيق يشتغل على oa.nrg-egypt.com أو تحت مسار GitHub Pages
// وكمان جوه Capacitor بعدين.
export default defineConfig({
  base: './',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // بنسجّله بنفسنا في main.tsx
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'عمارتنا',
        short_name: 'عمارتنا',
        description: 'حساب العمارة: الاشتراكات والمصاريف والطلبات',
        lang: 'ar',
        dir: 'rtl',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F6F5F1',
        theme_color: '#0E6E66',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        // الـ API ما يتخزنش في الـ service worker: آخر شاشة بتتحفظ في localStorage.
        runtimeCaching: []
      }
    })
  ],
  build: { target: 'es2019' }
});
