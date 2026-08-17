import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/* La version se lit sur le manifeste npm, jamais recopiée dans le source : deux
   copies finissent toujours par diverger, et celle du source serait la fausse
   dès la première publication. Vitest lit ce même fichier, donc la constante
   existe aussi en test — la page « à propos » n'a pas de garde à porter. */
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string }

/**
 * La notice que porte le JavaScript servi.
 *
 * C'est le raisonnement des licences de fontes, appliqué au code : ce qui
 * voyage porte sa licence. Le fichier `LICENSE` reste sur GitHub, la
 * minification efface tous les commentaires du source, et l'article 13 de
 * l'AGPL demande justement qu'un programme accessible par le réseau offre sa
 * source à qui s'en sert. Sans ces quatre lignes, le code servi est anonyme.
 *
 * **Un plugin et non `build.rollupOptions.output.banner`.** Cette option-là a
 * été essayée d'abord : elle ne survit pas au minifieur de Rolldown, qui
 * supprime les commentaires — y compris ceux marqués `/*!` — et le bundle
 * sortait sans un octet de notice. `generateBundle` passe après lui.
 *
 * Le seul morceau d'entrée, pas les sept du graphe initial : la notice se lit
 * en tête du fichier qu'on ouvre, la recopier dans chaque morceau ne la rendrait
 * pas plus vraie et coûterait sept fois. Elle y arrive juste après la table
 * `__vite__mapDeps`, que Vite pose lui-même en tête ; `enforce: 'post'` a été
 * essayé pour passer devant, sans effet. Une ligne de plomberie au-dessus n'a
 * jamais empêché personne de lire la suivante.
 */
function noticeAGPL(): Plugin {
  const notice = [
    `/*! Tout compte fait v${version} — Copyright (C) 2026 Andréa Larboullet Marin`,
    ' * Licence : GNU AGPL-3.0-or-later <https://www.gnu.org/licenses/agpl-3.0.html>',
    ' * Source complète : https://github.com/alarboulletmarin/tout-compte-fait',
    ' * Fourni SANS AUCUNE GARANTIE, dans les limites permises par la loi. */',
  ].join('\n')

  return {
    name: 'tcf:notice-agpl',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type === 'chunk' && output.isEntry) output.code = `${notice}\n${output.code}`
      }
    },
  }
}

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    noticeAGPL(),
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        /* L'identité de l'app aux yeux du navigateur, indépendante de
           `start_url` : sans elle, changer un jour la page d'arrivée ferait de
           l'app une seconde app, à installer à côté de la première — et les
           données de la première, qui vivent dans son origine, resteraient
           là où plus personne ne va les chercher. */
        id: '/',
        name: 'Tout compte fait — finances du foyer',
        short_name: 'Tout compte fait',
        description: 'Suivi des finances du foyer. Tout reste sur ton appareil.',
        lang: 'fr',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        /* Pas `portrait` : la grille bento passe à quatre colonnes dès 768px et
           à six dès 1024, ce qu'une tablette n'atteint qu'en paysage. Verrouiller
           l'orientation annulait ces deux paliers pour la seule app installée —
           c'est-à-dire pour celle qui a le plus de raisons de les avoir. */
        orientation: 'any',
        background_color: '#F0F5F2',
        theme_color: '#2F5D4C',
        categories: ['finance', 'productivity'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        /* Les deux gestes qu'on vient faire sans passer par l'écran d'accueil.
           Saisir une dépense d'abord : c'est le geste le plus fréquent, celui
           que le raccourci « n » et le bouton flottant portent déjà à l'intérieur
           de l'app. Le sens voyage dans l'URL en clair (`src/app/routes.ts`) —
           le raccourci ne fait que la poser. */
        shortcuts: [
          {
            name: 'Ajouter une dépense',
            short_name: 'Dépense',
            url: '/depense?sens=sortie',
            icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Le mois',
            short_name: 'Le mois',
            url: '/',
            icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
        /* La fiche d'installation d'Android montre l'app avant de la proposer.
           Sans capture, elle se réduit à une icône et une phrase — pour une app
           dont l'argument est un écran. Les fichiers sont ceux du `README`, et
           il n'y en a qu'un exemplaire (voir `docs/CAPTURES.md`) : les `sizes`
           doivent suivre le jour où on les refait, Chrome écartant en silence
           une capture dont les dimensions ne correspondent pas. */
        screenshots: [
          {
            src: 'captures/mois-mobile.png',
            sizes: '780x1688',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'L’écran du mois sur téléphone',
          },
          {
            src: 'captures/mois-clair.png',
            sizes: '2560x1640',
            type: 'image/png',
            form_factor: 'wide',
            label: 'L’écran du mois sur ordinateur',
          },
        ],
      },
      workbox: {
        /* `txt` pour les notices de licences : elles couvrent des fontes que le
           service worker précache, et une licence joignable seulement en ligne
           n'accompagne pas vraiment ce qui, lui, part hors ligne. */
        globPatterns: ['**/*.{js,css,html,svg,png,txt,woff,woff2}'],
        /* Les captures sont servies pour le manifest et le partage, jamais
           affichées par l'app : 400 Ko dans le cache hors ligne pour des images
           que personne n'ouvrira sans réseau. */
        globIgnores: ['**/captures/*'],
        /* Workbox exclut en silence tout fichier au-delà de sa borne — 2 Mio par
           défaut. Un jour où un chunk la dépasserait, l'app resterait
           installable et cesserait de fonctionner hors ligne sans que rien ne le
           dise. La borne est relevée à 4 Mio, ce qu'aucun fichier n'atteint
           aujourd'hui : elle est là pour que la construction crie avant que le
           hors-ligne ne mente. */
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        /* Ce qui n'est pas une route de l'app ne doit pas recevoir sa coquille.
           Une requête vers `/robots.txt` hors ligne vaut mieux en échec franc
           qu'en page HTML servie sous un nom de fichier texte. Les notices de
           licences y sont pour une raison plus forte : on y arrive par un lien
           de l'app, donc par une navigation — sans cette ligne, le lien rendait
           `index.html` sous le nom du fichier, et la licence des fontes ne
           s'affichait jamais. */
        navigateFallbackDenylist: [
          /^\/captures\//,
          /^\/robots\.txt$/,
          /^\/licences-tierces\.txt$/,
        ],
      },
      /* Le service worker ne s'enregistre pas en développement : il resservirait
         du code figé à chaque rechargement, ce qui est exactement le contraire
         de ce qu'on attend d'un serveur de dev. Mais on ne pouvait alors pas
         l'essayer du tout sans construire. `PWA_DEV=1 npm run dev` l'allume pour
         la session où c'est lui qu'on regarde. */
      devOptions: { enabled: process.env.PWA_DEV === '1' },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
