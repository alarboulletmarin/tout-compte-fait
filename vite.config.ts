/// <reference types="vitest/config" />
import { defineConfig, type Connect, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }
import vercel from './vercel.json' with { type: 'json' }

/**
 * Deux pages : la landing à la racine, l'app sous /app.
 * Un lien profond de l'app (/app/charges) doit servir app/index.html, comme le fera
 * la réécriture de vercel.json en production.
 */
const appFallback: Connect.NextHandleFunction = (req, _res, next) => {
  const path = req.url?.split('?')[0] ?? ''
  if (path.startsWith('/app/') && !path.includes('.')) req.url = '/app/index.html'
  next()
}
const appRoutes: Plugin = {
  name: 'app-routes',
  configureServer: (server) => void server.middlewares.use(appFallback),
  configurePreviewServer: (server) => void server.middlewares.use(appFallback),
}

// L'aperçu local sert les mêmes en-têtes que la production (CSP comprise)
const productionHeaders = Object.fromEntries(
  vercel.headers[0]?.headers.map((h) => [h.key, h.value]) ?? [],
)

export default defineConfig({
  appType: 'mpa',
  preview: { headers: productionHeaders },
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    // Jamais de police en data: dans le CSS : la CSP (font-src 'self') la bloquerait
    assetsInlineLimit: (file) => (file.endsWith('.woff2') ? false : undefined),
    rolldownOptions: {
      input: { landing: 'index.html', app: 'app/index.html' },
    },
  },
  plugins: [
    appRoutes,
    react(),
    VitePWA({
      // « prompt » : le toast « Nouvelle version disponible » décide du rechargement
      registerType: 'prompt',
      // Le service worker ne gère que l'app : la landing reste une page web ordinaire
      scope: '/app/',
      workbox: {
        // Polices : seuls les sous-ensembles latins sont mis en cache pour le hors-ligne
        globPatterns: ['**/*.{js,css,html,svg,png,txt}', '**/*-latin-*.woff2'],
        globIgnores: ['index.html', 'landing/**', 'boot/landing.js', 'og.png'],
        navigateFallback: '/app/index.html',
        navigateFallbackAllowlist: [/^\/app\//],
      },
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'robots.txt'],
      manifest: {
        id: '/app/',
        name: 'Tout compte fait',
        short_name: 'Tout compte fait',
        description: 'Qui vire combien sur le compte joint, au prorata des revenus.',
        lang: 'fr',
        start_url: '/app/',
        scope: '/app/',
        display: 'standalone',
        background_color: '#F5F4F1',
        theme_color: '#F5F4F1',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icon-maskable-512.png',
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
