/* ============================================================================
 * Les écrans que l'audit visite, et sous quel nom il range leurs captures.
 *
 * Une seule table, lue par le script de capture comme par celui d'axe : deux
 * listes auraient divergé dès le premier écran ajouté, et l'audit aurait alors
 * mesuré l'accessibilité d'un ensemble et la mise en page d'un autre.
 *
 * `needsExample` distingue les écrans qui n'ont de sens qu'avec un document —
 * un calendrier vide ne dit rien d'une grille — de ceux qui vivent avant lui :
 * la présentation, les deux questions, les pages juridiques.
 * ==========================================================================*/

export type AuditRoute = {
  /** Le chemin, tel qu'il s'écrit dans la barre d'adresse. */
  path: string
  /** Le nom du dossier de captures. Sans slash, pour tenir dans un chemin. */
  slug: string
  /** Ce que l'écran attend d'avoir avant d'être pris en photo. */
  needsExample: boolean
  /** Ce qui prouve que l'écran est arrivé. Un titre, presque toujours. */
  ready?: { fr: RegExp; en: RegExp }
}

/* Les écrans d'avant le foyer : ils répondent sur un document vide. */
export const PUBLIC_ROUTES: AuditRoute[] = [
  { path: '/bienvenue', slug: 'landing', needsExample: false },
  { path: '/demarrer', slug: 'onboarding', needsExample: false },
  { path: '/a-propos', slug: 'about', needsExample: false },
  { path: '/mentions-legales', slug: 'legal-notice', needsExample: false },
  { path: '/confidentialite', slug: 'legal-privacy', needsExample: false },
  { path: '/conditions', slug: 'legal-terms', needsExample: false },
]

/* Les écrans du foyer. L'ordre suit la navigation : les trois lectures, puis
   ce que « Plus » range, puis les saisies et les fiches. */
export const APP_ROUTES: AuditRoute[] = [
  { path: '/', slug: 'month', needsExample: true },
  { path: '/calendrier', slug: 'calendar', needsExample: true },
  { path: '/historique', slug: 'history', needsExample: true },
  { path: '/plus', slug: 'more', needsExample: true },

  { path: '/recurrences', slug: 'recurrences', needsExample: true },
  { path: '/epargne', slug: 'savings', needsExample: true },
  { path: '/epargne/mois', slug: 'savings-month', needsExample: true },
  { path: '/epargne/supports', slug: 'savings-supports', needsExample: true },
  { path: '/epargne/analyse', slug: 'savings-analysis', needsExample: true },
  { path: '/epargne/objectifs', slug: 'savings-goals', needsExample: true },
  { path: '/repartition', slug: 'split', needsExample: true },
  { path: '/credits', slug: 'credits', needsExample: true },
  { path: '/avances', slug: 'advances', needsExample: true },
  { path: '/simulation', slug: 'projection', needsExample: true },

  { path: '/personnes', slug: 'people', needsExample: true },
  { path: '/categories', slug: 'categories', needsExample: true },
  { path: '/apparence', slug: 'appearance', needsExample: true },
  { path: '/stockage', slug: 'storage', needsExample: true },
  { path: '/donnees', slug: 'data', needsExample: true },

  /* Les saisies et les fiches : elles n'ont pas de porte dans la navigation,
     mais elles ont une URL, et c'est là que les formulaires débordent. */
  { path: '/depense', slug: 'entry-new', needsExample: true },
  { path: '/recurrences/nouveau', slug: 'recurrence-new', needsExample: true },
  { path: '/epargne/objectifs/ex-g-apport', slug: 'goal-detail', needsExample: true },
  { path: '/epargne/nouveau', slug: 'support-new', needsExample: true },
  { path: '/credits/nouveau', slug: 'credit-new', needsExample: true },
  { path: '/avances/nouveau', slug: 'advance-new', needsExample: true },
  { path: '/personnes/nouveau', slug: 'member-new', needsExample: true },

  { path: '/styleguide', slug: 'styleguide', needsExample: true },
]

export const ALL_ROUTES: AuditRoute[] = [...PUBLIC_ROUTES, ...APP_ROUTES]

/* Les huit largeurs de la grille d'audit. La hauteur suit la largeur : un
   téléphone n'a pas la hauteur d'un écran de bureau, et une capture prise à
   320×1080 mentirait sur ce qu'on voit sans défiler. */
export const WIDTHS = [320, 375, 414, 768, 1024, 1280, 1440, 1920] as const

export function viewportFor(width: number): { width: number; height: number } {
  if (width <= 414) return { width, height: 812 }
  if (width <= 768) return { width, height: 1024 }
  if (width <= 1024) return { width, height: 768 }
  return { width, height: 900 }
}

export const THEMES = ['light', 'dark'] as const
export const LOCALES = ['fr', 'en'] as const

export type Theme = (typeof THEMES)[number]
export type Locale = (typeof LOCALES)[number]

export const LOCALE_STORAGE_KEY = 'tout-compte-fait.locale'
export const THEME_STORAGE_KEY = 'tout-compte-fait.theme'
export const NOTICE_STORAGE_KEY = 'tout-compte-fait.notice'
