import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AdvanceFormPage } from '@/features/advances/AdvanceFormPage'
import { AdvancesPage } from '@/features/advances/AdvancesPage'
import { AboutPage } from '@/features/about/AboutPage'
import { CalendarPage } from '@/features/calendar/CalendarPage'
import { CreditFormPage } from '@/features/credits/CreditFormPage'
import { CreditsPage } from '@/features/credits/CreditsPage'
import { FlowsPage } from '@/features/flows/FlowsPage'
import { EntryPage } from '@/features/month/EntryPage'
import { MonthPage } from '@/features/month/MonthPage'
import { MorePage } from '@/features/more/MorePage'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { RecurrenceDetailPage } from '@/features/recurrences/RecurrenceDetailPage'
import { RecurrenceFormPage } from '@/features/recurrences/RecurrenceFormPage'
import { RecurrencesPage } from '@/features/recurrences/RecurrencesPage'
import { SavingsPage } from '@/features/savings/SavingsPage'
import { SplitPage } from '@/features/split/SplitPage'
import { t } from '@/i18n/strings'
import { useStore } from '@/store/store'
import { AppShell } from './AppShell'
import { PlainShell } from './PlainShell'
import {
  ABOUT_PATH,
  ADVANCES_PATH,
  ADVANCE_NEW_PATH,
  APPEARANCE_PATH,
  CATEGORIES_PATH,
  DATA_PATH,
  FAMILY_NEW_PATH,
  FLOWS_PATH,
  LANDING_PATH,
  LEGACY_PROJECTION_PATH,
  LEGACY_SETTINGS_PATH,
  LEGAL_NOTICE_PATH,
  MEMBER_NEW_PATH,
  MORE_PATH,
  ONBOARDING_PATH,
  PEOPLE_PATH,
  PRIVACY_PATH,
  PROJECTION_PATH,
  RECURRENCES_PATH,
  RECURRENCE_NEW_PATH,
  REVIEW_PATH,
  SAVINGS_ANALYSIS_PATH,
  SAVINGS_PATH,
  GOALS_PATH,
  GOAL_NEW_PATH,
  SAVINGS_MONTH_PATH,
  SAVINGS_SUPPORTS_PATH,
  STORAGE_PATH,
  SUPPORT_NEW_PATH,
  TERMS_PATH,
  VALUATIONS_PATH,
  legacySettingsTarget,
} from './routes'

/**
 * Les deux écrans qu'on n'ouvre pas tous les jours, et qui pèsent le plus.
 *
 * L'historique emporte avec lui les trois graphiques de `src/charts` — barres,
 * lignes cumulées, curseur. Les cinq vues que « Plus » ouvre emportent
 * l'import, l'export, les sauvegardes et le catalogue de catégories. Ni l'un ni
 * l'autre n'est sur le chemin du geste quotidien, qui est d'ouvrir son mois et
 * d'y saisir une ligne.
 *
 * L'écran de l'épargne se sert lui aussi des lignes cumulées, depuis qu'il trace
 * ce qu'on met de côté d'une année sur l'autre — mais lui **est** sur ce
 * chemin-là : il s'atteint d'un geste depuis la tuile Capacité du mois, et reste
 * donc chargé d'avance. C'est sa **section d'année** qui se découpe, chez elle
 * (`SavingsPage`), et non la route entière. Les deux morceaux se rejoignent
 * alors sur le même graphique, qui vit dans un troisième — sans qu'aucun ne pèse
 * sur l'entrée.
 *
 * Le reste ne se découpe pas : le mois, la saisie, le calendrier et les fiches
 * s'atteignent en un geste depuis n'importe où, et un aller-retour de réseau à
 * chaque fois coûterait plus que les quelques kilo-octets gagnés. Le service
 * worker précache de toute façon tous ces morceaux — un écran chargé à la
 * demande reste joignable hors ligne dès la seconde visite.
 *
 * **La revue s'est rangée du côté de l'historique, et c'est une mesure qui l'y a
 * mise.** Elle a d'abord été écrite en dur, au motif qu'elle s'ouvre d'une tuile
 * du mois — au milieu du geste quotidien — et qu'une attente posée là couperait
 * la tâche qu'elle sert à finir. L'argument était juste et il reste juste ; ce
 * qui manquait, c'est **quand** cette attente peut avoir lieu. Ses six vues et
 * son pavé pèsent 3,2 Kio compressés dans le morceau d'entrée, soit le
 * dépassement du budget à lui seul — et une première visite ne peut pas ouvrir
 * de revue : il n'y a ni règle, ni échéance, ni rien à confirmer. Le temps qu'un
 * mois se remplisse, le service worker a précaché le morceau. L'attente que
 * l'argument redoutait ne peut donc pas se produire.
 *
 * Elle ne s'y range pas seule pour autant : `features/review/ReviewTile` demande
 * le morceau **dès qu'elle s'affiche**, c'est-à-dire dès qu'il y a une revue à
 * faire, et non au moment du tap. C'est ce qui rend l'argument caduc plutôt que
 * simplement improbable, et ça ne coûte rien à qui n'a rien à confirmer.
 *
 * Le détail des flux, lui, reste en dur tant qu'il ne pèse rien. La question se
 * repose quand il portera ses sections, et elle se repose de la même façon : en
 * mesurant.
 */
const HistoryPage = lazy(async () => ({
  default: (await import('@/features/history/HistoryPage')).HistoryPage,
}))

/**
 * La revue, chargée à la demande et demandée d'avance.
 *
 * Le raisonnement est au-dessus. Le même spécificateur que celui de
 * `ReviewTile.preloadReview` : c'est ce qui garantit un seul morceau pour les
 * deux, et donc que le préchargement serve bien cette route-ci.
 */
const ReviewPage = lazy(async () => ({
  default: (await import('@/features/review/ReviewPage')).ReviewPage,
}))

/**
 * Les écrans que « Plus » ouvre, en un seul morceau.
 *
 * Toutes ces vues passent par le même spécificateur, donc par le même chunk :
 * en ouvrir une les amène toutes, et descendre vers les catégories puis vers
 * une famille n'attend plus le réseau à chaque pas. Un `import()` par vue aurait
 * rendu sept morceaux dont six se chargent toujours à la suite du premier —
 * c'est-à-dire six allers-retours au lieu d'un, sur les écrans où l'on fait
 * justement des allers-retours.
 */
const settings = () => import('@/features/settings/pages')
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
const RateFormPage = lazy(async () => ({ default: (await savings()).RateFormPage }))
const ValuationsFormPage = lazy(async () => ({ default: (await savings()).ValuationsFormPage }))
const SupportsPage = lazy(async () => ({ default: (await savings()).SupportsPage }))
const AnalysisPage = lazy(async () => ({ default: (await savings()).AnalysisPage }))
const SavingMonthPage = lazy(async () => ({ default: (await savings()).SavingMonthPage }))
const GoalPage = lazy(async () => ({ default: (await savings()).GoalPage }))
const GoalFormPage = lazy(async () => ({ default: (await savings()).GoalFormPage }))

/**
 * Le simulateur, à la demande.
 *
 * Il emporte son propre tracé SVG, sa prose — qui est longue, parce que ce
 * qu'il refuse de calculer demande plus de mots que ce qu'il calcule — et son
 * tableau de jalons, dont aucun autre écran ne se sert. Et il n'est sur le
 * chemin de personne : on l'ouvre quand on se pose la question, pas tous les
 * jours comme on ouvre son mois. C'est exactement le profil de l'historique.
 */
const ProjectionPage = lazy(async () => ({
  default: (await import('@/features/projection/ProjectionPage')).ProjectionPage,
}))

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
  return <p className="t-label">{t.shell.loading}</p>
}

/**
 * Les anciennes adresses de la section « Réglages », rendues à leurs écrans.
 *
 * Les cinq vues ont remonté à la racine — elles n'étaient pas toutes des
 * réglages, et « Plus » les range désormais par intention (`routes.ts`) — mais
 * aucune n'a changé de nom au passage, et c'est ce qui rend la redirection
 * exacte plutôt qu'approximative : il suffit de retirer le préfixe.
 * `/reglages/categories/fam-1/nouvelle` retrouve donc le formulaire de création
 * d'une catégorie, et pas seulement l'écran d'accueil de la section. `/reglages`
 * seul retombe sur « Plus », qui l'a remplacé.
 *
 * Le splat de la route porte le reste du chemin, mais on lit `pathname` : le
 * paramètre `*` est décodé, et un identifiant qui contiendrait un caractère
 * encodé rentrerait alors dans l'URL sous une forme que le routeur ne reconnaît
 * plus. Un signet ne se répare pas en le réécrivant à moitié.
 */
function LegacySettingsRoute() {
  const { pathname, search } = useLocation()
  return <Navigate to={`${legacySettingsTarget(pathname)}${search}`} replace />
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
          {/* Les deux écrans qu'on n'ouvre que depuis une tuile du mois. Ils
              ne sont dans aucune navigation — voir `REVIEW_PATH` — mais ils ont
              leur URL, parce qu'ils prennent l'écran entier et qu'en sortir doit
              être un retour. */}
          <Route path={REVIEW_PATH} element={<ReviewPage />} />
          <Route path={FLOWS_PATH} element={<FlowsPage />} />
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
          {/* Les deux sous-vues, en segments fixes classés avant `:id` par
              React Router — comme `/nouveau` juste dessous. */}
          <Route path={SAVINGS_SUPPORTS_PATH} element={<SupportsPage />} />
          <Route path={SAVINGS_ANALYSIS_PATH} element={<AnalysisPage />} />
          <Route path={SAVINGS_MONTH_PATH} element={<SavingMonthPage />} />
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
          <Route path={`${SAVINGS_PATH}/:id/taux`} element={<RateFormPage />} />
          <Route path={`${SAVINGS_PATH}/:id/taux/:rateId`} element={<RateFormPage />} />
          {/* Les objectifs. Sous `/epargne/` parce qu'un objectif est un objet
              de l'épargne, et les segments fixes avant `:id` — React Router les
              classe d'abord, un objectif ne peut donc pas éclipser son
              formulaire de création. */}
          <Route path={GOAL_NEW_PATH} element={<GoalFormPage />} />
          <Route path={`${GOALS_PATH}/:id`} element={<GoalPage />} />
          <Route path={`${GOALS_PATH}/:id/modifier`} element={<GoalFormPage />} />
          <Route path={ADVANCES_PATH} element={<AdvancesPage />} />
          <Route path={ADVANCE_NEW_PATH} element={<AdvanceFormPage />} />
          {/* Sous l'épargne par l'intention, à la racine par l'URL — voir
              `PROJECTION_PATH` dans `routes.ts`. L'ancienne adresse, au pluriel,
              se redirige plutôt que de disparaître : elle a pu être mise en
              signet, exactement comme `/abonnements`. */}
          <Route path={PROJECTION_PATH} element={<ProjectionPage />} />
          <Route
            path={`${LEGACY_PROJECTION_PATH}/*`}
            element={<Navigate to={PROJECTION_PATH} replace />}
          />
          <Route path="/historique" element={<HistoryPage />} />
          {/* Le quatrième onglet. Pas de découpage à la demande : l'écran n'est
              qu'une liste de rangées, et il est sur le chemin de la navigation
              — un aller-retour de réseau pour l'atteindre coûterait plus que
              les quelques octets qu'il pèse. */}
          <Route path={MORE_PATH} element={<MorePage />} />
          {/* Les cinq vues que « Plus » ouvre. L'ordre d'écriture n'y fait rien
              — React Router classe les segments fixes avant les paramètres —,
              mais il dit le rangement : les deux d'« Organiser », puis celles de
              « Données » et d'« Application », dans l'ordre où l'écran les
              propose. */}
          <Route path={PEOPLE_PATH} element={<PeoplePage />} />
          <Route path={MEMBER_NEW_PATH} element={<MemberPage />} />
          <Route path={`${PEOPLE_PATH}/:id`} element={<MemberPage />} />
          <Route path={CATEGORIES_PATH} element={<CategoriesPage />} />
          <Route path={FAMILY_NEW_PATH} element={<FamilyNewPage />} />
          <Route path={`${CATEGORIES_PATH}/:id`} element={<FamilyPage />} />
          <Route path={`${CATEGORIES_PATH}/:id/nouvelle`} element={<CategoryNewPage />} />
          <Route path={STORAGE_PATH} element={<StoragePage />} />
          <Route path={DATA_PATH} element={<DataPage />} />
          <Route path={APPEARANCE_PATH} element={<AppearancePage />} />
          {/* Ce qui pointe encore sur `/reglages`. Même filet que
              `/abonnements`, et même motif : une URL qu'on a pu mettre en
              signet ne se supprime pas, elle se redirige. */}
          <Route path={`${LEGACY_SETTINGS_PATH}/*`} element={<LegacySettingsRoute />} />
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
