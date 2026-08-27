import { Fragment, Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { onPageHidden } from '@/persistence/lifecycle'
import { useApplyLocale } from '@/i18n/useLocale'
import { useStore } from '@/store/store'
import { useApplyAppearance } from '@/theme/useTheme'
import { Toaster } from '@/ui/Toaster'
import { CurrencyContext } from '@/ui/currency'
import { BootScreen } from './BootScreen'
import { ScrollMemory } from './ScrollMemory'
import { PrivacyNotice } from './PrivacyNotice'
import { AppRoutes, OnboardingRoutes } from './Routes'
import { LANDING_PATH } from './routes'
import { UpdatePrompt } from './UpdatePrompt'

/**
 * Les deux écrans qui ne servent pas au foyer qui s'en sert tous les jours.
 *
 * Le nuancier est une route de développement : neuf cents lignes qui rendent
 * chaque token et chaque composant dans les deux thèmes, importées jusqu'ici
 * par tout le monde — pour un écran que personne n'ouvre depuis l'app. Il n'a
 * aucune raison de voyager avec elle.
 *
 * La présentation, elle, ne se voit qu'avant que le foyer n'existe : c'est le
 * seul écran dont le chargement à la demande se paie, et il se paie chez qui
 * arrive pour la première fois. Le compte reste bon — celui qui revient ouvre
 * son mois sans emporter la page qui explique l'app, et celui qui arrive
 * attend un aller-retour de moins que ce que lui coûtait la coquille entière.
 */
const StyleguidePage = lazy(async () => ({
  default: (await import('@/styleguide/StyleguidePage')).StyleguidePage,
}))
const LandingPage = lazy(async () => ({
  default: (await import('@/features/landing/LandingPage')).LandingPage,
}))

function Booted() {
  const status = useStore((s) => s.status)
  if (status === 'loading') return <BootScreen />
  if (status === 'onboarding') return <OnboardingRoutes />
  return <AppRoutes />
}

export function App() {
  const hydrate = useStore((s) => s.hydrate)
  const theme = useStore((s) => s.data.settings.theme)
  const palette = useStore((s) => s.data.settings.palette)
  const currency = useStore((s) => s.data.settings.currency)
  const locale = useStore((s) => s.data.settings.locale)
  useApplyAppearance(theme, palette)
  const activeLocale = useApplyLocale(locale)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  /* Le writer débounce à 400 ms : sans ce geste, fermer l'onglet dans la
     seconde qui suit une saisie la perdait, en silence. `pageHidden` pose
     d'abord le filet synchrone puis vide la file — le vidage seul ne suffisait
     pas, sa transaction IndexedDB mourant avec la page (voir `rescue.ts`). Le
     store est lu par `getState` plutôt que par un sélecteur — l'effet ne doit
     se réabonner à rien, il doit vivre aussi longtemps que la page. */
  useEffect(() => onPageHidden(() => useStore.getState().pageHidden()), [])

  return (
    <CurrencyContext value={currency}>
      <BrowserRouter>
        {/* Au-dessus de la `key` de langue, et pour la même raison que le
            routeur : sa mémoire des positions ne doit pas se perdre quand
            l'arbre se remonte. */}
        <ScrollMemory />
        {/* Changer de langue remonte tout ce qui est en dessous.

            Les chaînes sont lues sur une liaison de module (`i18n/strings.ts`),
            qui ne prévient pas React : un composant qui ne se rend pas garderait
            ses mots d'avant, et l'app se retrouverait à moitié traduite jusqu'à
            ce qu'on la recharge. Une `key` remonte l'arbre d'un coup, ce qui
            garantit qu'il n'en reste aucun — sans faire dépendre la justesse de
            cent vingt-quatre abonnements posés à la main.

            Le prix est l'état local des écrans : un accordéon replié, un champ à
            moitié rempli. Il se paie une fois, depuis l'écran des réglages, sur un
            geste qu'on fait rarement et jamais au milieu d'une saisie. Le routeur
            est au-dessus de la `key` : l'URL, elle, ne bouge pas — et la position
            de défilement non plus, que `useApplyLocale` relève avant le remontage
            pour la reposer après. Sans elle, on choisissait sa langue en bas de
            l'écran « Plus » pour se retrouver en haut.

            La clé est la langue **affichée** et non celle qui est demandée : le
            catalogue anglais arrive par le réseau, et remonter avant qu'il soit
            là ferait deux remontages au lieu d'un. */}
        <Fragment key={activeLocale}>
          {/* L'écran d'attente est déjà celui de la relecture du document : ces
              deux-là arrivent par le réseau plutôt que d'IndexedDB, mais c'est la
              même attente, et elle se dit pareil. */}
          <Suspense fallback={<BootScreen />}>
            <Routes>
              {/* Livrable permanent, joignable à tout moment — y compris avant
                  que le foyer ne soit créé. */}
              <Route path="/styleguide" element={<StyleguidePage />} />
              {/* La présentation ne parle pas d'un foyer, elle parle de l'app :
                  elle répond donc dans les deux états, et surtout avant que
                  l'hydratation ait dit lequel — c'est le premier écran, il n'a pas
                  à attendre une lecture d'IndexedDB pour s'afficher. */}
              <Route path={LANDING_PATH} element={<LandingPage />} />
              <Route path="*" element={<Booted />} />
            </Routes>
          </Suspense>
          <Toaster />
          <UpdatePrompt />
          {/* Hors des routes, comme ses deux voisins, et pour une raison de plus :
              elle doit répondre pendant que `hydrate` lit encore la base, donc
              au-dessus du `Booted` qui attend le statut. Elle recouvre aussi le
              nuancier, une fois, et c'est assumé : le drapeau vaut pour le
              navigateur, et une exemption de route qu'aucun écran ne montre est
              une règle que personne ne peut vérifier.
              Aucun `z-index` à accorder avec le bandeau de mise à jour ni avec les
              messages : une modale `<dialog>` vit dans la couche supérieure. */}
          <PrivacyNotice />
        </Fragment>
      </BrowserRouter>
    </CurrencyContext>
  )
}
