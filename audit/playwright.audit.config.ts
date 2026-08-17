/* ============================================================================
 * La configuration du harnais d'audit — séparée de celle des scénarios.
 *
 * Deux raisons de ne pas la mêler à `playwright.config.ts` : l'audit n'est pas
 * une porte de sortie, il ne doit donc jamais faire échouer `npm run verify` ;
 * et il règle lui-même viewport, thème et langue par capture, alors que la
 * suite e2e fixe un téléphone et le français une fois pour toutes.
 *
 *   npx playwright test -c audit/playwright.audit.config.ts
 * ==========================================================================*/

import { defineConfig } from '@playwright/test'

const PORT = 4173

export default defineConfig({
  testDir: '.',
  /* Les quatre combinaisons langue × thème sont indépendantes : chacune a son
     contexte, son document et son fichier de mesures. */
  fullyParallel: true,
  workers: 2,
  retries: 0,
  timeout: 30 * 60_000,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    contextOptions: { reducedMotion: 'reduce' },
    /* Le Chrome installé sur la machine, et non le `headless_shell` de
       Playwright : c'est le moteur qui rend vraiment les pages, et un audit de
       mise en page n'a pas à mesurer un binaire allégé. La suite e2e, elle,
       garde le navigateur de Playwright — c'est une porte de sortie, elle doit
       donner le même résultat sur toutes les machines. */
    channel: 'chrome',
    trace: 'off',
    video: 'off',
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${String(PORT)} --strictPort`,
    url: `http://localhost:${String(PORT)}/`,
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
