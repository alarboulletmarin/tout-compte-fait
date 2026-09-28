/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // « prompt » : le toast « Nouvelle version disponible » décide du rechargement (phase 5)
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'robots.txt'],
      manifest: {
        name: 'Tout compte fait',
        short_name: 'Tout compte fait',
        description: 'Qui vire combien sur le compte joint, au prorata des revenus.',
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        background_color: '#F5F4F1',
        theme_color: '#F5F4F1',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
})
