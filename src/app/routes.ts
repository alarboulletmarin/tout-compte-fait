import { fr } from '@/i18n/fr'
import {
  CreditsIcon,
  HistoryIcon,
  type IconComponent,
  NavCalendar,
  NavMonth,
  NavMore,
  RecurrencesIcon,
  SavingsIcon,
  SplitIcon,
} from '@/ui/Icons'

export type RouteDef = { path: string; label: string; icon: IconComponent }

/* Déclaré avant la table : un `const` ne remonte pas, et `NAV_ROUTES` le lit à
   l'évaluation du module. */
export const RECURRENCES_PATH = '/recurrences'
/* Le quatrième onglet : tout ce que la barre ne peut pas porter. Voir
   `MORE_PREFIXES` plus bas, qui dit ce qu'il range et pourquoi. La destination
   est déclarée une fois — la barre d'onglets et la colonne latérale la lisent
   toutes les deux, et deux littéraux auraient fini par diverger. */
export const MORE_PATH = '/plus'
const MORE_ROUTE: RouteDef = { path: MORE_PATH, label: fr.nav.more, icon: NavMore }
/* Segment fixe : React Router le classe avant `/recurrences/:id`, une
   récurrence ne peut donc pas éclipser le formulaire de création. */
export const RECURRENCE_NEW_PATH = `${RECURRENCES_PATH}/nouveau`
export const recurrencePath = (id: string): string => `${RECURRENCES_PATH}/${id}`
export const recurrenceEditPath = (id: string): string => `${RECURRENCES_PATH}/${id}/modifier`

/**
 * Les quatre onglets de la barre du bas, dans l'ordre.
 *
 * **Quatre et non cinq.** La barre en portait cinq — le mois, le calendrier,
 * les récurrences, l'historique, les réglages —, et cette liste-là n'était pas
 * une hiérarchie : elle mettait « Récurrences », qu'on écrit une fois, au même
 * rang que « Le mois », qu'on ouvre tous les jours, et surtout elle décidait
 * *par sa longueur* que quatre écrans réels de l'app — l'épargne, la
 * répartition, les crédits, les avances — n'auraient aucune porte de
 * navigation. On n'y arrivait que par une tuile du mois, laquelle s'efface
 * précisément quand il n'y a rien à y montrer : un écran atteignable seulement
 * quand on n'en a pas besoin.
 *
 * Restent donc les trois lectures qu'on ouvre pour regarder — ce mois, les
 * jours, les mois d'avant — et une quatrième porte, « Plus », qui range le
 * reste au lieu de le laisser sans adresse (`features/more/MorePage.tsx`).
 *
 * Le prix est assumé : les récurrences passent de un à deux appuis, et restent
 * à un appui depuis l'état vide du mois, qui est l'endroit où l'on va justement
 * en poser une. Les réglages, eux, en gagnent un : « Plus » ouvre directement ce
 * qui vivait derrière une page d'entrée.
 *
 * Chaque destination porte son glyphe ici, en un seul endroit, pour que les
 * deux navigations ne puissent pas diverger.
 */
export const NAV_ROUTES: RouteDef[] = [
  { path: '/', label: fr.nav.month, icon: NavMonth },
  { path: '/calendrier', label: fr.nav.calendar, icon: NavCalendar },
  { path: '/historique', label: fr.nav.history, icon: HistoryIcon },
  MORE_ROUTE,
]

export const STYLEGUIDE_ROUTE = { path: '/styleguide', label: fr.nav.styleguide }

/* La présentation et « à propos » ne parlent pas d'un foyer, elles parlent de
   l'app : elles répondent donc dans les deux états, avant comme après sa
   création. Les deux questions, elles, n'ont de sens que tant qu'il n'existe
   pas — d'où une URL à part, qui disparaît avec l'état qui la justifie. */
export const LANDING_PATH = '/bienvenue'
export const ONBOARDING_PATH = '/demarrer'
export const ABOUT_PATH = '/a-propos'

/* Les trois pages juridiques. Elles répondent dans les deux états, comme la
   présentation et « à propos » : elles parlent du site, pas d'un foyer, et
   l'obligation de se rendre identifiable ne commence pas à la création du
   premier foyer.
   Leurs libellés vivent ici et non dans `i18n/legal.ts`, qui porte la prose et
   se charge à la demande : le pied de page les nomme sur tous les écrans, il ne
   peut pas attendre un morceau chargé à la demande pour savoir quoi écrire. */
export const LEGAL_NOTICE_PATH = '/mentions-legales'
export const PRIVACY_PATH = '/confidentialite'
export const TERMS_PATH = '/conditions'

export const LEGAL_ROUTES: { path: string; label: string }[] = [
  { path: LEGAL_NOTICE_PATH, label: fr.legal.notice },
  { path: PRIVACY_PATH, label: fr.legal.privacy },
  { path: TERMS_PATH, label: fr.legal.terms },
]

/* Saisies et fiches sont des écrans pleins, pas des feuilles : elles ont donc
   une URL. Aucune ne figure dans la navigation, on n'y va que par une action. */
export const ENTRY_NEW_PATH = '/depense'
export const entryPath = (id: string): string => `${ENTRY_NEW_PATH}/${id}`

/* Le sens voyage dans l'URL, en clair : une saisie de revenu s'ouvre déjà
   réglée sur « Entrée » au lieu de demander de corriger un formulaire de
   dépense. `date` sert au calendrier, qui connaît déjà le jour visé. */
export const DIRECTION_PARAM = 'sens'
const DIRECTION_VALUE = { in: 'entree', out: 'sortie' } as const

export function directionFromParam(value: string | null): 'in' | 'out' {
  return value === DIRECTION_VALUE.in ? 'in' : 'out'
}

/* La nature voyage à côté du sens, et en clair elle aussi : un virement
   d'épargne s'ouvre déjà réglé dessus, depuis l'écran du mois comme depuis
   celui de l'épargne. Le sens reste utile même en épargne — il dit si l'on
   place ou si l'on reprend. */
export const NATURE_PARAM = 'nature'
const SAVING_NATURE = 'epargne'

export function natureFromParam(
  nature: string | null,
  direction: string | null,
): 'expense' | 'income' | 'saving' {
  if (nature === SAVING_NATURE) return 'saving'
  return directionFromParam(direction) === 'in' ? 'income' : 'expense'
}

export function entryNewPath(
  options: { direction?: 'in' | 'out'; date?: string; saving?: boolean } = {},
): string {
  const params = new URLSearchParams()
  if (options.direction !== undefined) params.set(DIRECTION_PARAM, DIRECTION_VALUE[options.direction])
  if (options.saving === true) params.set(NATURE_PARAM, SAVING_NATURE)
  if (options.date !== undefined) params.set('date', options.date)
  const query = params.toString()
  return query === '' ? ENTRY_NEW_PATH : `${ENTRY_NEW_PATH}?${query}`
}

export const CREDITS_PATH = '/credits'

/* La tuile Répartition de l'écran du mois y mène — mais elle s'efface tant
   qu'il n'y a rien à répartir, et c'est exactement le moment où l'on cherche
   comment répartir. D'où sa rangée dans « Gérer » (`MANAGE_ROUTES`). */
export const SPLIT_PATH = '/repartition'

/* Même porte, même raison : la tuile Capacité d'épargne du mois y mène, et
   elle, ne s'efface jamais — un mois sans versement est justement celui où la
   question « où je place » se pose. Sa rangée dans « Gérer » (`MANAGE_ROUTES`)
   lui donne l'adresse que la tuile seule ne donnait pas.

   L'écran porte deux lectures qui ne se remplacent pas : le **stock** — ce que
   valent les supports, et à qui ils sont — et le **flux** du mois, ce qu'on y a
   versé ou repris. Les fiches de support s'ouvrent sous lui : un support est un
   objet de l'épargne, pas un réglage. */
export const SAVINGS_PATH = '/epargne'
/* Segment fixe avant `:id`, comme partout ailleurs : React Router le classe
   d'abord, un support ne peut donc pas éclipser le formulaire de création. */
export const SUPPORT_NEW_PATH = `${SAVINGS_PATH}/nouveau`
/* Relever tous ses supports d'un coup, sans passer par leurs fiches. Segment
   fixe lui aussi, et pluriel : `/valeur` sous un support ne vise qu'un compte,
   `/valeurs` sous l'écran les vise tous. */
export const VALUATIONS_PATH = `${SAVINGS_PATH}/valeurs`
export const supportPath = (id: string): string => `${SAVINGS_PATH}/${id}`
export const supportEditPath = (id: string): string => `${SAVINGS_PATH}/${id}/modifier`
/* La mise à jour de valeur a son URL, comme toute saisie de l'app : c'est ce
   qui rend le retour du navigateur et le bouton « retour » de l'écran
   identiques au reste, plutôt qu'un état de composant qu'aucun des deux ne
   connaît. Le second segment vise un relevé existant, pour le corriger. */
export const valuationNewPath = (supportId: string): string =>
  `${SAVINGS_PATH}/${supportId}/valeur`
export const valuationEditPath = (supportId: string, valuationId: string): string =>
  `${SAVINGS_PATH}/${supportId}/valeur/${valuationId}`

/**
 * Le simulateur de projections — à la racine, et sous l'écran Épargne.
 *
 * **Il n'est pas un cinquième rang de « Gérer », et il a deux portes.** « Gérer »
 * range ce qui *décide de ce que le budget calcule* ; un simulateur ne décide
 * de rien — il ne lit même pas le document. Il vit donc sous son propre titre,
 * « Simuler », qui est le cinquième groupe de « Plus »
 * (`features/more/MorePage.tsx`), et il garde en plus une rangée en fin d'écran
 * Épargne : c'est là qu'on se demande ce que deviendra ce qu'on place, et une
 * porte posée dans le contexte de la question vaut mieux qu'une porte
 * seulement rangée.
 *
 * La rangée de l'écran Épargne ne suffisait pas à elle seule, et c'est
 * l'argument qui a fait exister le groupe : un écran qu'on n'atteint qu'en
 * descendant tout un autre écran n'a pas d'adresse — c'est le défaut même que
 * `NAV_ROUTES` décrit pour les quatre écrans qui n'existaient qu'au bout d'une
 * tuile.
 *
 * **À la racine, et non sous `/epargne/`**, pour une raison qui n'est pas
 * cosmétique : `isFocusScreen` compte comme fiche *tout* ce qui vit sous
 * `/epargne/`, parce que tout ce qui y vit est un objet de l'épargne — un
 * support, un relevé, un formulaire. Le simulateur n'en est pas un : c'est une
 * destination pleine, qu'on ouvre pour elle-même et qu'on met en signet. La
 * ranger sous ce préfixe aurait demandé une exception à une règle qui n'en a
 * pas, ce qui coûte plus qu'un segment d'URL. `/avances` est déjà à la racine
 * pour la même raison.
 */
export const PROJECTION_PATH = '/projections'

/* Les avances ont leur écran, pour la raison qui donne le sien aux crédits :
   elles vivent sous les récurrences — leur mensualité en est une — mais ce
   qu'elles ajoutent est un suivi à part, qu'on ouvre quand on le cherche. En
   section sous la liste, elles posaient une tuile pleine par avance au bas d'un
   écran qui en avait déjà beaucoup, et une deuxième action « Ajouter » sans
   rapport avec la première. La liste des récurrences n'en garde qu'une rangée.

   Le segment fixe se déclare après le chemin qu'il prolonge, et React Router le
   classe de toute façon avant un paramètre — il n'y en a pas ici. */
export const ADVANCES_PATH = '/avances'
export const ADVANCE_NEW_PATH = `${ADVANCES_PATH}/nouveau`

/* --- Ce que « Réglages » rangeait ----------------------------------------*/

/**
 * Cinq écrans qui n'étaient pas des réglages, et qui vivaient sous ce mot.
 *
 * `/reglages` réunissait les personnes, le catalogue des catégories,
 * l'apparence, la devise, le stockage, l'export/import et « à propos ». Six
 * natures de tâches derrière un seul intitulé, et deux d'entre elles ne réglent
 * rien du tout : **qui compose le foyer et sous quelles étiquettes on range**
 * sont la structure du budget, pas une préférence d'application — on les
 * modifie parce qu'on a déménagé ou changé de vie, pas parce qu'on veut que
 * l'app se présente autrement. Les données non plus : sauvegarder et restaurer
 * n'est pas un goût, c'est ce qui décide si l'on retrouve ses comptes après une
 * casse d'appareil.
 *
 * Chacun de ces cinq écrans remonte donc à la racine, comme les quatre écrans
 * de « Gérer », et « Plus » les range par intention plutôt que par un mot
 * fourre-tout (voir `features/more/MorePage.tsx`). L'URL suit : un écran rangé
 * sous un parent qui n'existe plus n'aurait gardé de la hiérarchie que ce
 * qu'elle avait de faux.
 */
export const PEOPLE_PATH = '/personnes'
/* Segment fixe avant `:id`, comme pour les récurrences : React Router le classe
   d'abord, un membre ne peut donc pas éclipser le formulaire de création. */
export const MEMBER_NEW_PATH = `${PEOPLE_PATH}/nouveau`
export const memberPath = (id: string): string => `${PEOPLE_PATH}/${id}`

export const CATEGORIES_PATH = '/categories'
export const FAMILY_NEW_PATH = `${CATEGORIES_PATH}/nouvelle`
export const familyPath = (id: string): string => `${CATEGORIES_PATH}/${id}`
/* La création d'une catégorie vit sous sa famille : celle-ci porte la nature et
   la teinte, et l'écran n'a donc plus à redemander ce qu'on vient de choisir en
   ouvrant la famille. */
export const categoryNewPath = (familyId: string): string =>
  `${CATEGORIES_PATH}/${familyId}/nouvelle`

/* L'apparence a sa vue, contrairement à la devise qui se règle sur place :
   trois positions de thème y tenaient, six aperçus de palette non — et une
   palette ne se choisit pas à la lecture de son nom. Le thème l'y suit, parce
   que les deux réglages se regardent ensemble : « Sombre » ne veut rien dire
   sans savoir de quelle palette il est le sombre. */
export const APPEARANCE_PATH = '/apparence'

export const STORAGE_PATH = '/stockage'
export const DATA_PATH = '/donnees'

/**
 * L'ancienne section, gardée pour ce qui pointe encore dessus.
 *
 * Un signet, une icône posée sur l'écran d'accueil, un lien envoyé à quelqu'un :
 * les cinq vues ont changé d'adresse, pas de nom. `/reglages/personnes` devient
 * `/personnes` par simple retrait du préfixe — c'est la raison pour laquelle
 * aucun segment n'a été renommé au passage — et `/reglages` seul retombe sur
 * l'écran qui l'a remplacé. Même filet que `/abonnements`, et même motif : une
 * URL qu'on a pu enregistrer ne se supprime pas, elle se redirige.
 */
export const LEGACY_SETTINGS_PATH = '/reglages'

/**
 * Où mène une ancienne adresse `/reglages/…`.
 *
 * Un simple retrait de préfixe, et c'est ce qui rend la redirection exacte
 * plutôt qu'approximative : `/reglages/categories/fam-1/nouvelle` retrouve le
 * formulaire de création d'une catégorie, pas seulement l'accueil de la section.
 * Une fonction pure plutôt qu'un calcul dans le composant — c'est la promesse
 * faite aux signets, et une promesse s'éprouve.
 */
export function legacySettingsTarget(pathname: string): string {
  const rest = pathname.slice(LEGACY_SETTINGS_PATH.length)
  return rest === '' || rest === '/' ? MORE_PATH : rest
}

/* --- Le rangement de la navigation ---------------------------------------*/

/**
 * Ce qu'on tient, par opposition à ce qu'on regarde.
 *
 * Les quatre écrans du foyer qu'on ouvre quand on les cherche : la règle qui
 * écrit les mois, le support où l'on place, le partage du pot, ce qu'on doit
 * encore. Trois d'entre eux n'avaient aucune adresse dans la navigation, et
 * n'existaient qu'au bout d'une tuile qui s'efface — voir `NAV_ROUTES`.
 *
 * **Les avances n'y sont pas**, et c'est délibéré : elles vivent sous les
 * récurrences, dont leur mensualité est une, et la liste des récurrences porte
 * leur rangée. Une seconde porte au même rang que les quatre autres défferait
 * ce rangement pour ne rien raccourcir.
 *
 * Déclaré ici et non en tête du fichier : un `const` ne remonte pas, et cette
 * table lit quatre chemins déclarés au-dessus.
 */
export const MANAGE_ROUTES: RouteDef[] = [
  { path: RECURRENCES_PATH, label: fr.nav.subscriptions, icon: RecurrencesIcon },
  { path: SAVINGS_PATH, label: fr.nav.savings, icon: SavingsIcon },
  { path: SPLIT_PATH, label: fr.nav.split, icon: SplitIcon },
  { path: CREDITS_PATH, label: fr.nav.credits, icon: CreditsIcon },
]

export type NavGroup = { title?: string; routes: RouteDef[] }

/**
 * La colonne latérale, en trois groupes.
 *
 * Elle alignait cinq entrées à plat, ce qui donnait le même poids à « Le mois »
 * et à « Réglages » — et laissait 224px de colonne à moitié vides pendant que
 * quatre écrans n'y figuraient pas du tout. Le premier groupe est ce qu'on
 * ouvre pour regarder, le deuxième ce qu'on tient, le troisième range le reste.
 *
 * **Seul celui du milieu porte un titre.** Le premier n'en a pas parce que la
 * colonne doit s'ouvrir sur les destinations quotidiennes, pas sur un mot à
 * lire avant elles ; le dernier n'en a pas parce qu'il ne contient qu'une
 * destination, et qu'un titre posé au-dessus d'un lien unique est une étiquette
 * qui ne sépare rien de ce qu'elle nomme. Un titre dit qu'on descend d'un cran ;
 * sur un groupe d'un seul, il n'y a pas de cran.
 *
 * **Elle montre « Plus », et c'est un revirement.** Elle ne le montrait pas, et
 * l'argument tenait tant que « Plus » était le repli d'une barre trop courte :
 * la colonne avait la place de déplier ses deux groupes, et un lien vers une
 * page qui l'aurait redite aurait été un tour sur soi-même. Il ne tient plus
 * depuis que « Plus » range cinq groupes au lieu de deux — les douze
 * destinations doubleraient la colonne — et surtout depuis qu'il porte un
 * **contrôle** : la devise se règle sur place, dans un sélecteur, et une
 * colonne de navigation n'a pas à héberger un champ de formulaire. Le déplier
 * ne serait donc plus le déplier tout à fait.
 *
 * Aucune porte n'est perdue au change : ce que la colonne montrait d'un clic,
 * elle le montre encore, et ce qui vivait derrière « Réglages » vit derrière
 * « Plus », au même rang qu'avant.
 */
export const SIDEBAR_GROUPS: NavGroup[] = [
  { routes: NAV_ROUTES.filter((route) => route.path !== MORE_PATH) },
  { title: fr.nav.manage, routes: MANAGE_ROUTES },
  { routes: [MORE_ROUTE] },
]

/* Ce que « Plus » range et que la colonne ne déplie pas : les cinq vues dont il
   est la seule porte, quelle que soit la largeur, plus le simulateur. Son lien doit rester allumé
   quand on y descend, sans quoi la colonne n'aurait plus rien d'allumé du tout.
   « À propos » n'y figure pas — la colonne porte son propre lien en pied, et
   deux entrées allumées à la fois ne diraient plus où l'on est. */
const MORE_ONLY_PREFIXES = [
  MORE_PATH,
  /* Le simulateur en fait partie **du point de vue de la colonne**, et non de
     celui de la barre : la colonne ne montre pas l'écran Épargne assez loin
     pour porter sa rangée de fin, donc « Plus » est la seule chose qu'elle
     puisse allumer quand on lit une projection. Sur la barre d'onglets, c'est
     la même conclusion par un autre chemin — voir `MORE_PREFIXES`. */
  PROJECTION_PATH,
  PEOPLE_PATH,
  CATEGORIES_PATH,
  APPEARANCE_PATH,
  STORAGE_PATH,
  DATA_PATH,
]

/* Ce que l'onglet « Plus » recouvre, lui : les cinq ci-dessus, plus les écrans
   de « Gérer » que la colonne déplie mais que la barre, elle, ne peut pas
   porter. Sans cette liste, descendre dans l'une de ces sections éteignait les
   quatre onglets d'un coup, sans rien pour dire d'où l'on venait — c'est le
   défaut que le cas particulier d'« à propos » corrigeait déjà à la main pour
   l'onglet des réglages. `NavLink` apparie par préfixe, cette table dit
   lesquels. */
const MORE_PREFIXES = [
  ...MORE_ONLY_PREFIXES,
  RECURRENCES_PATH,
  SAVINGS_PATH,
  SPLIT_PATH,
  CREDITS_PATH,
  ADVANCES_PATH,
  ABOUT_PATH,
]

function under(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/** L'onglet « Plus » est-il celui de l'écran affiché ? */
export function isInMoreSection(pathname: string): boolean {
  return under(pathname, MORE_PREFIXES)
}

/** Le lien « Plus » de la colonne latérale l'est-il ? */
export function isUnderMore(pathname: string): boolean {
  return under(pathname, MORE_ONLY_PREFIXES)
}

/* Les cinq vues que « Plus » ouvre et que rien d'autre n'ouvre. Elles n'ont
   qu'un sujet, leur propre retour, et le plus souvent leur propre action
   principale — « Ajouter un membre », « Ajouter une famille », « Ajouter une
   catégorie ». Voir `isFocusScreen`, juste dessous. */
const MORE_VIEWS = [PEOPLE_PATH, CATEGORIES_PATH, APPEARANCE_PATH, STORAGE_PATH, DATA_PATH]

/**
 * Écrans qui n'ont qu'une chose à montrer — une saisie, une fiche. Aucune
 * bannière ne s'y intercale au-dessus du titre.
 */
export function isFocusScreen(pathname: string): boolean {
  return (
    pathname.startsWith(ENTRY_NEW_PATH) ||
    pathname.startsWith(ADVANCE_NEW_PATH) ||
    /* Les fiches et saisies de l'épargne, et non la page qui les liste : celle-
       ci reste une destination pleine, avec son bouton d'ajout et son rappel
       d'export. */
    (pathname.startsWith(`${SAVINGS_PATH}/`) && pathname !== `${SAVINGS_PATH}/`) ||
    (pathname.startsWith(`${RECURRENCES_PATH}/`) && pathname !== `${RECURRENCES_PATH}/`) ||
    (pathname.startsWith(`${CREDITS_PATH}/`) && pathname !== `${CREDITS_PATH}/`) ||
    /* Les cinq vues que « Plus » ouvre, et non « Plus » lui-même. Le bouton
       flottant y poserait une seconde action principale sur le même écran, à
       trois centimètres de la première et sans rapport avec elle ; et le rappel
       d'export s'intercalerait au-dessus d'un titre qui, sur la vue des
       données, mène justement à l'export. « Plus » reste, lui, une destination
       de la barre d'onglets : il garde les deux. */
    under(pathname, MORE_VIEWS)
  )
}

export const CREDIT_NEW_PATH = `${CREDITS_PATH}/nouveau`
export const creditEditPath = (id: string): string => `${CREDITS_PATH}/${id}`
