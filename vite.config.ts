import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      injectRegister: null, // Disable auto registration to avoid conflict with OneSignal
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],
      // workbox: { ... } Removed to Ensure OneSignal Full Control
      manifest: {
        name: 'APPadeleros',
        short_name: 'APPadeleros',
        description: 'La app definitiva para jugadores y clubes de pádel',
        theme_color: '#0F172A',
        background_color: '#0F172A',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
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
