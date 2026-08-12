import { NavLink, useLocation } from 'react-router-dom'
import { t } from '@/i18n/strings'
import { cn } from '@/lib/cn'
import { scrollToTop } from '@/lib/reveal'
import {
  ABOUT_PATH,
  MORE_PATH,
  navRoutes,
  sidebarGroups,
  styleguideRoute,
  isInMoreSection,
  isUnderMore,
} from './routes'

/* Un onglet ramène en haut de sa section, qu'on y soit déjà ou non — c'est ce
   que fait le logo d'un site. Sans ça, toucher l'onglet actif ne produisait
   rien, et changer d'onglet rouvrait l'écran suivant à la hauteur qu'on avait
   quittée sur le précédent. Le bouton « retour » du navigateur, lui, n'est pas
   concerné : il n'y a que la navigation par onglet qui remonte. */

const ITEM = cn(
  'flex items-center justify-center rounded-input px-3 text-[13px] font-medium',
  'transition-colors duration-[var(--dur)] ease-ds',
)

/**
 * Colonne latérale, à partir de 1024px — **en trois groupes**.
 *
 * Elle alignait cinq destinations à plat. Une liste plate n'est pas une
 * hiérarchie : elle donnait le même poids à « Le mois », qu'on ouvre tous les
 * jours, et à « Réglages », qu'on ouvre trois fois par an — et pendant ce
 * temps, quatre écrans de l'app n'y figuraient pas du tout, faute d'une place
 * que la barre d'onglets n'avait pas et que la colonne, elle, avait de reste.
 *
 * Ce qu'on ouvre pour regarder, puis ce qu'on tient, puis « Plus », qui range
 * le reste. Le premier groupe n'a pas de titre : la colonne doit s'ouvrir sur
 * les destinations quotidiennes, pas sur un mot à lire avant elles. Voir
 * `sidebarGroups()`, qui porte l'ordre et le rationale — dont celui du dernier
 * groupe, qui dépliait la section des réglages et nomme désormais l'écran qui
 * l'a remplacée.
 *
 * Le titre d'un groupe est un `t-eyebrow` atténué — exactement la classe du nom
 * de l'app juste au-dessus. Aucune convention visuelle nouvelle : c'est déjà
 * comme ça que cet écran nomme ce qui surplombe une liste.
 */
export function Sidebar({ householdName }: { householdName: string }) {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label={t.nav.label}
      className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-1 overflow-y-auto p-5 lg:flex"
    >
      {/* Le nom est facultatif — il ne se demande plus au premier lancement.
          Vide, la seconde ligne ne s'affiche pas plutôt que de tenir une place
          blanche : le nom de l'app est au-dessus, et il suffit à dire où l'on
          est. Aucun repli à inventer. */}
      <div className="mb-6 flex flex-col gap-0.5 px-3">
        <span className="t-eyebrow text-muted">{t.app.name}</span>
        {householdName.trim() !== '' && (
          <span className="t-section truncate">{householdName}</span>
        )}
      </div>

      {sidebarGroups().map((group, index) => (
        /* La clé est le titre quand il y en a un, et le rang sinon : le premier
           groupe n'en a pas, et c'est le seul dans ce cas. */
        <div key={group.title ?? index} className="flex flex-col gap-1">
          {group.title !== undefined && (
            /* `aria-hidden` : le groupe n'est pas une région, c'est une suite de
               liens que l'étiquette sépare à l'œil. L'annoncer en ferait un
               titre sans niveau au milieu d'une navigation. */
            <span aria-hidden="true" className="t-eyebrow mt-5 mb-1 px-3 text-muted">
              {group.title}
            </span>
          )}
          {group.routes.map((route) => {
            const Icon = route.icon
            /* « Plus » reste allumé dans les cinq vues dont il est la seule
               porte — les personnes, les catégories, l'apparence, le stockage,
               les données. `NavLink` n'apparie que son propre préfixe, et sans
               ce complément la colonne n'aurait plus rien d'allumé dès le
               premier pas à l'intérieur. Le prédicat est plus étroit que celui
               de la barre d'onglets : la colonne déplie « Gérer », dont les
               écrans s'allument donc eux-mêmes. */
            const inSection = route.path === MORE_PATH && isUnderMore(pathname)
            return (
              <NavLink
                key={route.path}
                to={route.path}
                end={route.path === '/'}
                onClick={scrollToTop}
                className={({ isActive }) =>
                  cn(
                    ITEM,
                    'h-11 justify-start gap-3',
                    isActive || inSection ? 'bg-accent text-accent-fg' : 'hover:bg-surface-2',
                  )
                }
              >
                <Icon size={18} className="shrink-0" />
                {route.label}
              </NavLink>
            )
          })}
        </div>
      ))}

      {/* Les deux liens secondaires se groupent, et c'est le groupe qui porte
          le `mt-auto`. « À propos » au-dessus : c'est le seul des deux qui
          s'adresse à qui utilise l'app. Le `pt-6` est le sien et non une marge
          du groupe précédent : la colonne défile maintenant qu'elle porte neuf
          liens, et une marge qui s'effondre laisserait les deux se toucher en
          bas de course. */}
      <div className="mt-auto flex flex-col gap-1 pt-6">
        {[
          { path: ABOUT_PATH, label: t.nav.about },
          styleguideRoute(),
        ].map((route) => (
          <NavLink
            key={route.path}
            to={route.path}
            className={({ isActive }) =>
              cn(
                ITEM,
                'h-11 justify-start text-muted',
                isActive ? 'bg-surface-2 text-text' : 'hover:bg-surface-2',
              )
            }
          >
            {route.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

/**
 * Barre d'onglets mobile. Cible tactile de 56px, au-delà du minimum du DS.
 *
 * **Quatre onglets et non cinq** : les trois lectures qu'on ouvre pour regarder,
 * puis « Plus », qui range le reste. Le rationale du découpage est dans
 * `navRoutes()` ; ce qui change ici est mécanique — quatre `flex-1` rendent 25 %
 * de largeur chacun au lieu de 20, ce qui détend les libellés à 320px, où
 * « Récurrences » se tronquait.
 *
 * **Et la barre s'ouvre en son milieu**, sur 72px, parce que le bouton de saisie
 * y descend (`QuickEntry`). C'est une fente et non un simple recouvrement, et la
 * différence est tout le sujet : un disque de 56px posé au centre d'une barre à
 * quatre onglets tombe sur la frontière entre le deuxième et le troisième, donc
 * mange une part des deux — l'app a déjà perdu les appuis d'un coin entier une
 * fois, et le scénario qui l'a rattrapé vérifie précisément Calendrier et
 * Historique. La fente rend au disque la place qu'il prend, au lieu de la lui
 * laisser voler.
 *
 * Deux onglets de chaque côté, dans l'ordre inchangé : les `flex-1` se partagent
 * ce qui reste, donc la fente est centrée sans qu'on ait à la positionner. Le
 * cadran de séparation est un `<li>` vide, retiré de l'arbre d'accessibilité —
 * la liste continue d'annoncer quatre destinations, parce qu'il y en a quatre.
 */
const TAB_SPLIT = 2

export function TabBar() {
  const { pathname } = useLocation()
  const routes = navRoutes()

  /* Un seul rendu d'onglet pour les deux groupes : recopié de part et d'autre
     de la fente, l'un des deux aurait fini par ne plus s'allumer comme
     l'autre. */
  const tab = (route: ReturnType<typeof navRoutes>[number]) => {
    const Icon = route.icon
    /* « Plus » reste allumé dans tout ce qu'il range — les récurrences,
       l'épargne, la répartition, les crédits, les avances, les réglages,
       « à propos ». `NavLink` n'apparie que son propre préfixe, et sans
       cette table on quittait « Plus » dès le premier pas à l'intérieur :
       quatre onglets éteints, sans rien pour dire d'où l'on venait.
       C'est le défaut que le cas particulier d'« à propos » corrigeait
       déjà à la main pour l'onglet des réglages, et qui vaut maintenant
       pour six sections — d'où la table, dans `routes.ts`.
       La colonne latérale n'a pas ce trou : elle déplie ces destinations
       et porte son propre lien « À propos ». */
    const inSection = route.path === MORE_PATH && isInMoreSection(pathname)
    return (
      <li key={route.path} className="min-w-0 flex-1">
        <NavLink
          to={route.path}
          end={route.path === '/'}
          onClick={scrollToTop}
          className={({ isActive }) =>
            cn(
              /* `px-0.5` et non `px-1` : la fente reprend 64px à la rangée, et
                 les quatre onglets se les partagent. Mesuré à 320 points, ces
                 quatre pixels rendus sont ce qui sépare « Calendrier » de sa
                 troncature — le cadre ne servait qu'à empêcher deux libellés de
                 se toucher, et il reste 7px entre eux au pire cas. */
              'flex h-14 flex-col items-center justify-center gap-0.5 px-0.5 text-center',
              'text-[11px] leading-tight',
              isActive || inSection ? 'text-text' : 'text-muted',
            )
          }
        >
          {({ isActive }) => (
            <>
              {/* L'onglet actif est une pilule lime derrière le glyphe.
                  Le DS interdit lime en `color` — faute de contraste sur
                  les deux fonds — mais pas en remplissage, et c'est
                  justement là que la marque doit se voir. */}
              <span
                className={cn(
                  'flex h-7 w-12 items-center justify-center rounded-chip',
                  'transition-colors duration-[var(--dur)] ease-ds',
                  (isActive || inSection) && 'bg-accent text-accent-fg',
                )}
              >
                <Icon size={18} />
              </span>
              <span className="w-full truncate">{route.label}</span>
            </>
          )}
        </NavLink>
      </li>
    )
  }

  return (
    <nav
      aria-label={t.nav.label}
      className={cn(
        'fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface lg:hidden',
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <ul className="flex">
        {routes.slice(0, TAB_SPLIT).map(tab)}
        {/* La fente : 64px, et c'est la corde et non le diamètre qui la mesure.
            Le disque a beau faire 56px, il ne descend que de 20px dans la barre
            et son centre est 8px au-dessus d'elle : ce qu'il occupe *dans* la
            rangée est un arc large de 54px au ras du filet, qui se referme à
            zéro vingt pixels plus bas. Les libellés, eux, vivent trente pixels
            plus bas encore — le disque ne les approche jamais. Réserver son
            diamètre entier aurait coûté huit pixels à chaque onglet pour
            dégager un espace que rien n'occupe.

            `aria-hidden` la retire de l'arbre : un cinquième élément de liste
            qui ne mène nulle part se compterait à voix haute. */}
        <li aria-hidden="true" className="w-16 shrink-0" />
        {routes.slice(TAB_SPLIT).map(tab)}
      </ul>
    </nav>
  )
}
