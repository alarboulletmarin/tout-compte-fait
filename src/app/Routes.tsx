import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AdvanceFormPage } from '@/features/advances/AdvanceFormPage'
import { AdvancesPage } from '@/features/advances/AdvancesPage'
import { AboutPage } from '@/features/about/AboutPage'
import { CalendarPage } from '@/features/calendar/CalendarPage'
import { CreditFormPage } from '@/features/credits/CreditFormPage'
import { CreditsPage } from '@/features/credits/CreditsPage'
import { EntryPage } from '@/features/month/EntryPage'
import { MonthPage } from '@/features/month/MonthPage'
import { MorePage } from '@/features/more/MorePage'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { RecurrenceDetailPage } from '@/features/recurrences/RecurrenceDetailPage'
import { RecurrenceFormPage } from '@/features/recurrences/RecurrenceFormPage'
import { RecurrencesPage } from '@/features/recurrences/RecurrencesPage'
import { SavingsPage } from '@/features/savings/SavingsPage'
import { SplitPage } from '@/features/split/SplitPage'
import { fr } from '@/i18n/fr'
import { useStore } from '@/store/store'
import { AppShell } from './AppShell'
import { PlainShell } from './PlainShell'
import {
  ABOUT_PATH,
  ADVANCES_PATH,
  ADVANCE_NEW_PATH,
  LANDING_PATH,
  LEGAL_NOTICE_PATH,
  MORE_PATH,
  ONBOARDING_PATH,
  PRIVACY_PATH,
  RECURRENCES_PATH,
  RECURRENCE_NEW_PATH,
  SAVINGS_PATH,
  SUPPORT_NEW_PATH,
  SETTINGS_APPEARANCE_PATH,
  SETTINGS_CATEGORIES_PATH,
  SETTINGS_DATA_PATH,
  SETTINGS_FAMILY_NEW_PATH,
  SETTINGS_MEMBER_NEW_PATH,
  SETTINGS_PATH,
  SETTINGS_PEOPLE_PATH,
  SETTINGS_STORAGE_PATH,
  TERMS_PATH,
  VALUATIONS_PATH,
} from './routes'

/**
 * Les deux écrans qu'on n'ouvre pas tous les jours, et qui pèsent le plus.
 *
 * L'historique emporte avec lui les trois graphiques de `src/charts` — barres,
 * lignes cumulées, curseur. L'écran de l'épargne se sert des lignes cumulées
 * depuis qu'il trace ce qu'on met de côté d'une année sur l'autre, mais lui est
 * sur le chemin quotidien : il reste chargé d'avance, et c'est **sa section
 * d'année** qui est découpée, chez elle (`SavingsPage`). Les deux morceaux se
 * rejoignent alors sur le même graphique, sans qu'il pèse sur l'entrée.
 * Les réglages, eux,
 * emportent l'import, l'export, les sauvegardes et le catalogue de catégories.
 * Ni l'un ni l'autre n'est sur le chemin du geste quotidien, qui est d'ouvrir
 * son mois et d'y saisir une ligne.
 *
 * Le reste ne se découpe pas : le mois, la saisie, le calendrier et les fiches
 * s'atteignent en un geste depuis n'importe où, et un aller-retour de réseau à
 * chaque fois coûterait plus que les quelques kilo-octets gagnés. Le service
 * worker précache de toute façon tous ces morceaux — un écran chargé à la
 * demande reste joignable hors ligne dès la seconde visite.
 */
const HistoryPage = lazy(async () => ({
  default: (await import('@/features/history/HistoryPage')).HistoryPage,
}))

/**
 * Les réglages, en un seul morceau — pour sept écrans.
 *
 * Toutes les vues de la section passent par le même spécificateur, donc par le
 * même chunk : ouvrir « Réglages » amène la section entière, et descendre vers
 * les catégories puis vers une famille n'attend plus le réseau à chaque pas.
 * Un `import()` par vue aurait rendu sept morceaux dont six se chargent
 * toujours à la suite du premier — c'est-à-dire six allers-retours au lieu
 * d'un, sur les écrans où l'on fait justement des allers-retours.
 */
const settings = () => import('@/features/settings/pages')
const SettingsPage = lazy(async () => ({ default: (await settings()).SettingsPage }))
const AppearancePage = lazy(async () => ({ default: (await settings()).AppearancePage }))
const PeoplePage = lazy(async () => ({ default: (await settings()).PeoplePage }))
const MemberPage = lazy(async () => ({ default: (await settings()).MemberPage }))
const CategoriesPage = lazy(async () => ({ default: (await settings()).CategoriesPage }))
const FamilyPage = lazy(async () => ({ default: (await settings()).FamilyPage }))
const FamilyNewPage = lazy(async () => ({ default: (await settings()).FamilyNewPage }))
const CategoryNewPage = lazy(async () => ({ default: (await settings()).CategoryNewPage }))
const StoragePage = lazy(async () => ({ default: (await settings()).StoragePage }))
const DataPage = lazy(async () => ({ default: (await settings()).DataPage }))

/**
 * Les écrans qui s'ouvrent **sous** la page Épargne, dans un seul morceau.
 *
 * La page elle-même reste ici — elle s'atteint d'un geste depuis la tuile
 * Capacité du mois, comme la Répartition et les Crédits. La fiche d'un support,
 * ses deux formulaires et la courbe de son historique, non : ils se demandent,
 * et ils emportent avec eux le tracé SVG dont aucun autre écran de cette route
 * ne se sert.
 */
const savings = () => import('@/features/savings/pages')
const SupportPage = lazy(async () => ({ default: (await savings()).SupportPage }))
const SupportFormPage = lazy(async () => ({ default: (await savings()).SupportFormPage }))
const ValuationFormPage = lazy(async () => ({ default: (await savings()).ValuationFormPage }))
const ValuationsFormPage = lazy(async () => ({ default: (await savings()).ValuationsFormPage }))

/**
 * Les trois pages juridiques, dans un seul morceau.
 *
 * Elles sortent du même module, donc `lazy` n'en produit qu'un : leur prose —
 * plusieurs kilo-octets que personne ne lit deux fois — ne pèse sur le premier
 * chargement de personne, et ouvrir l'une des trois les amène toutes, ce qui est
 * exactement l'usage (on arrive sur les mentions et on va lire la
 * confidentialité).
 */
const LegalNoticePage = lazy(async () => ({
  default: (await import('@/features/legal/LegalPage')).LegalNoticePage,
}))
const PrivacyPage = lazy(async () => ({
  default: (await import('@/features/legal/LegalPage')).PrivacyPage,
}))
const TermsPage = lazy(async () => ({
  default: (await import('@/features/legal/LegalPage')).TermsPage,
}))

/**
 * L'attente d'un écran qui arrive par le réseau.
 *
 * Discrète, et sans anneau : la coquille est déjà là — navigation, bandeau,
 * titre —, et seul le contenu manque. Un écran de chargement pleine page à sa
 * place ferait clignoter tout ce qui n'a pas bougé. La région live de la
 * coquille, elle, a déjà annoncé le titre de l'écran où l'on arrive.
 */
function RouteFallback() {
  return <p className="t-label">{fr.shell.loading}</p>
}

/** Les routes de l'app, une fois le foyer créé. */
export function AppRoutes() {
  return (
    <AppShell>
      {/* Autour des routes et non dans chacune : le repli remplace le contenu
          de la coquille, qui reste en place. */}
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<MonthPage />} />
          <Route path="/depense" element={<EntryPage />} />
          <Route path="/depense/:id" element={<EntryPage />} />
          <Route path="/calendrier" element={<CalendarPage />} />
          <Route path={RECURRENCES_PATH} element={<RecurrencesPage />} />
          <Route path={RECURRENCE_NEW_PATH} element={<RecurrenceFormPage />} />
          <Route path={`${RECURRENCES_PATH}/:id`} element={<RecurrenceDetailPage />} />
          <Route path={`${RECURRENCES_PATH}/:id/modifier`} element={<RecurrenceFormPage />} />
          {/* L'écran s'appelait « Abonnements », et son URL le disait. Un lien
              partagé, un signet ou une icône posée sur l'écran d'accueil pointent
              encore là : ils atterrissent sur la liste plutôt que sur le mois. */}
          <Route path="/abonnements/*" element={<Navigate to={RECURRENCES_PATH} replace />} />
          <Route path="/credits" element={<CreditsPage />} />
          <Route path="/credits/nouveau" element={<CreditFormPage />} />
          <Route path="/credits/:id" element={<CreditFormPage />} />
          <Route path="/repartition" element={<SplitPage />} />
          <Route path={SAVINGS_PATH} element={<SavingsPage />} />
          {/* Le segment fixe est classé avant `:id` par React Router : un
              support ne peut donc pas éclipser le formulaire de création. */}
          <Route path={SUPPORT_NEW_PATH} element={<SupportFormPage />} />
          <Route path={VALUATIONS_PATH} element={<ValuationsFormPage />} />
          <Route path={`${SAVINGS_PATH}/:id`} element={<SupportPage />} />
          <Route path={`${SAVINGS_PATH}/:id/modifier`} element={<SupportFormPage />} />
          <Route path={`${SAVINGS_PATH}/:id/valeur`} element={<ValuationFormPage />} />
          <Route
            path={`${SAVINGS_PATH}/:id/valeur/:valuationId`}
            element={<ValuationFormPage />}
          />
          <Route path={ADVANCES_PATH} element={<AdvancesPage />} />
          <Route path={ADVANCE_NEW_PATH} element={<AdvanceFormPage />} />
          <Route path="/historique" element={<HistoryPage />} />
          {/* Le quatrième onglet. Pas de découpage à la demande : l'écran n'est
              qu'une liste de rangées, et il est sur le chemin de la navigation
              — un aller-retour de réseau pour l'atteindre coûterait plus que
              les quelques octets qu'il pèse. */}
          <Route path={MORE_PATH} element={<MorePage />} />
          {/* Les réglages et leurs vues. L'ordre d'écriture n'y fait rien —
              React Router classe les segments fixes avant les paramètres —,
              mais il dit la hiérarchie : une page d'entrée, puis ce qu'elle
              ouvre, dans l'ordre où elle le propose. */}
          <Route path={SETTINGS_PATH} element={<SettingsPage />} />
          <Route path={SETTINGS_APPEARANCE_PATH} element={<AppearancePage />} />
          <Route path={SETTINGS_PEOPLE_PATH} element={<PeoplePage />} />
          <Route path={SETTINGS_MEMBER_NEW_PATH} element={<MemberPage />} />
          <Route path={`${SETTINGS_PEOPLE_PATH}/:id`} element={<MemberPage />} />
          <Route path={SETTINGS_CATEGORIES_PATH} element={<CategoriesPage />} />
          <Route path={SETTINGS_FAMILY_NEW_PATH} element={<FamilyNewPage />} />
          <Route path={`${SETTINGS_CATEGORIES_PATH}/:id`} element={<FamilyPage />} />
          <Route path={`${SETTINGS_CATEGORIES_PATH}/:id/nouvelle`} element={<CategoryNewPage />} />
          <Route path={SETTINGS_STORAGE_PATH} element={<StoragePage />} />
          <Route path={SETTINGS_DATA_PATH} element={<DataPage />} />
          {/* Déclarée ici *et* dans les routes d'avant le foyer, pour qu'elle
              hérite de la navigation quand celle-ci existe. La hisser au niveau de
              `/styleguide` l'en aurait privée une fois le foyer créé : pas de
              barre d'onglets sous 1024px, donc plus de sortie. */}
          <Route path={ABOUT_PATH} element={<AboutPage />} />
          {/* Mêmes raisons que « à propos » : elles parlent du site et non d'un
              foyer, et elles héritent ici de la navigation. */}
          <Route path={LEGAL_NOTICE_PATH} element={<LegalNoticePage />} />
          <Route path={PRIVACY_PATH} element={<PrivacyPage />} />
          <Route path={TERMS_PATH} element={<TermsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  )
}

/**
 * Les routes d'avant le foyer. Deux destinations, et un filet.
 *
 * Le filet ne mène pas aux questions mais à la présentation. Un signet vers
 * `/calendrier` ouvert sur un appareil neuf — ou juste après « Tout effacer » —
 * y atterrissait sans qu'aucune URL ne change : l'app affichait le formulaire à
 * l'adresse d'un écran qui n'existait pas encore. C'est aussi ce qui fait qu'une
 * remise à zéro depuis les réglages retombe sur ce qui explique l'app, et non
 * sur un formulaire nu.
 */
export function OnboardingRoutes() {
  /* Un document illisible n'ouvre pas les deux questions. La garde ne peut pas
     vivre seulement dans le bouton de l'arrivée : cette URL est un signet, et
     `finishOnboarding` écraserait là ce qu'on n'a pas su lire. Elle refuse deux
     fois — ici pour ne pas montrer le formulaire, dans le store pour ne pas
     écrire — parce qu'un seul des deux verrous se contourne. */
  const unreadable = useStore((s) => s.error?.kind === 'read')

  return (
    /* Les trois pages juridiques arrivent par le réseau ici aussi : sans ce
       `Suspense`, l'attente remonterait jusqu'à la racine, qui n'en a pas. */
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route
          path={ONBOARDING_PATH}
          element={unreadable ? <Navigate to={LANDING_PATH} replace /> : <OnboardingPage />}
        />
        {/* Sans coquille : la colonne latérale mènerait à cinq écrans qui
            n'existent pas encore. */}
        <Route
          path={ABOUT_PATH}
          element={
            <PlainShell>
              <AboutPage />
            </PlainShell>
          }
        />
        {/* L'obligation de se rendre identifiable ne commence pas à la création
            du premier foyer : ces trois-là répondent avant, sans quoi le pied de
            la présentation — le seul écran que voit un visiteur qui ne crée
            rien — pointerait vers des adresses qui redirigent. */}
        <Route
          path={LEGAL_NOTICE_PATH}
          element={
            <PlainShell>
              <LegalNoticePage />
            </PlainShell>
          }
        />
        <Route
          path={PRIVACY_PATH}
          element={
            <PlainShell>
              <PrivacyPage />
            </PlainShell>
          }
        />
        <Route
          path={TERMS_PATH}
          element={
            <PlainShell>
              <TermsPage />
            </PlainShell>
          }
        />
        <Route path="*" element={<Navigate to={LANDING_PATH} replace />} />
      </Routes>
    </Suspense>
  )
}
