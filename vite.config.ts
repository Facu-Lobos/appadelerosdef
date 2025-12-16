import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'APPadeleros',
        short_name: 'APPadeleros',
        description: 'La app definitiva para jugadores y clubes de pádel',
        theme_color: '#0F172A',
        background_color: '#0F172A',
        display: 'standalone',
        start_url: '/player',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ],
        screenshots: [
          {
            src: 'mobile_dashboard_final.png',
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'narrow'
          },
          {
            src: 'login-bg.png',
            sizes: '1920x1080',
            type: 'image/png',
            form_factor: 'wide'
          }
        ]
      }
    })
  ],
})
