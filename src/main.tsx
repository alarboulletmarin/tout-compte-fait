/* ============================================================================
 * Tout compte fait — suivi des finances du foyer, sans compte ni serveur.
 * Copyright (C) 2026 Andréa Larboullet Marin
 *
 * Ce programme est un logiciel libre : vous pouvez le redistribuer et/ou le
 * modifier selon les termes de la GNU Affero General Public License, telle que
 * publiée par la Free Software Foundation, en version 3 ou — à votre choix —
 * toute version ultérieure.
 *
 * Il est distribué dans l'espoir qu'il sera utile, mais SANS AUCUNE GARANTIE ;
 * sans même la garantie implicite de QUALITÉ MARCHANDE ou d'ADÉQUATION À UN
 * USAGE PARTICULIER. Voir la GNU Affero General Public License pour plus de
 * détails. Vous devriez en avoir reçu une copie avec ce programme ; sinon, voir
 * <https://www.gnu.org/licenses/>.
 *
 * **La notice est ici et nulle part ailleurs.** La FSF recommande de la poser
 * en tête de chaque fichier source ; ce n'est pas une condition de validité, et
 * cent cinquante en-têtes identiques diraient *quoi* et jamais *pourquoi* — la
 * règle de commentaire de ce dépôt les refuse. Ce fichier-ci est le point
 * d'entrée : c'est le seul dont la lecture est garantie.
 *
 * Le texte intégral est dans `LICENSE`, et la source du programme tel qu'il
 * tourne est à l'adresse que `src/app/meta.ts` porte — ce que l'article 13
 * exige d'une app servie par le réseau.
 * ==========================================================================*/

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { readStoredLocale } from './i18n/locale'
import { applyLocale } from './i18n/strings'
import { ErrorBoundary } from './app/ErrorBoundary'
/* Importé pour son effet de bord, et importé ici pour qu'il ait lieu avant le
   premier rendu : `beforeinstallprompt` se déclenche une fois, tôt, et ne se
   rejoue pas — un écouteur posé dans un effet React arriverait après lui. */
import './lib/install'
import './styles/index.css'

const container = document.getElementById('root')
if (!container) throw new Error('Élément #root introuvable')

const root = createRoot(container)

/* La barrière est au-dessus de tout, y compris du routeur : une exception dans
   la coquille elle-même doit encore trouver un écran pour s'afficher. */
const render = (): void => {
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
}

/**
 * Le catalogue avant le premier rendu.
 *
 * `settings.locale` fait autorité, mais il vit dans IndexedDB : le miroir
 * localStorage est la seule chose lisible avant que l'hydratation ait répondu
 * (`i18n/locale.ts`). Sans cette attente, une app réglée en anglais s'ouvrirait
 * une frame en français, puis se remonterait — l'écran de démarrage clignoterait
 * dans la mauvaise langue à chaque lancement à froid.
 *
 * En français elle ne coûte rien : le catalogue est déjà là, statique, et
 * `applyLocale` rend la main sans rien télécharger. La promesse ne rejette
 * jamais — un morceau qui n'arrive pas laisse simplement le français en place —,
 * et le second `render` est là quand même : rien dans ce fichier ne doit pouvoir
 * empêcher l'app de s'afficher.
 */
void applyLocale(readStoredLocale()).then(render, render)
