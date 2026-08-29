import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true 
      },
      manifest: {
        name: 'PhosGuard',
        short_name: 'PhosGuard',
        description: 'A renal diet and fluid tracker for hemodialysis patients.',
        theme_color: '#007bff',
        background_color: '#f4f7f6',
        display: 'standalone', 
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'], 
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/world\.openfoodfacts\.org\/api\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'food-facts-api-cache',
              expiration: {
                maxEntries: 100, 
                maxAgeSeconds: 60 * 60 * 24 * 30 
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ]
});
