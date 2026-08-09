/* Document initial. Deux questions au premier lancement suffisent : tout le
 * reste part de valeurs par défaut modifiables ensuite (cahier §1 et §4.1). */

import {
  type Category,
  type CategoryKind,
  DEFAULT_PALETTE,
  type Family,
  directionOfKind,
} from '@/domain/types'
import type { Data } from '@/domain/types'
import type { Strings } from '@/i18n/fr'
import { currentLocale, t } from '@/i18n/strings'
import { CURRENT_SCHEMA_VERSION } from './schema'

/** Les six teintes du DS §2.4, dans l'ordre, puis on recommence. */
const CATEGORY_COLORS = [
  'var(--cat-1)',
  'var(--cat-2)',
  'var(--cat-3)',
  'var(--cat-4)',
  'var(--cat-5)',
  'var(--cat-6)',
] as const

function colorAt(index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length] ?? 'var(--cat-1)'
}

/**
 * Le catalogue par défaut, en un seul endroit : une famille, sa nature, ses
 * catégories. L'ordre des familles fait foi — c'est celui des onglets, et
 * celui dans lequel les teintes sont distribuées.
 *
 * **La table porte des clés de catalogue, pas des libellés.** Elle en portait,
 * et elle figeait alors la langue du démarrage : les noms étaient lus à
 * l'évaluation du module, donc un foyer créé après un passage à l'anglais
 * héritait de quarante-six catégories françaises. Les libellés se résolvent
 * maintenant à l'appel, dans `defaultFamilies` et `defaultCategories`.
 *
 * Ce qui reste ici est ce qui ne dépend d'aucune langue — l'identifiant, la
 * nature, l'ordre —, et c'est aussi ce qui permet à `familyColor` de rester une
 * lecture de table : elle est appelée une fois par ligne de liste, elle n'a pas
 * à reconstruire quarante-six libellés pour trouver un rang.
 */
const SEED: {
  id: string
  label: keyof Strings['defaultFamilies']
  kind: CategoryKind
  categories: [string, keyof Strings['defaultCategories']][]
}[] = [
  {
    id: 'fam-resources',
    label: 'resources',
    kind: 'resource',
    categories: [
      ['salary', 'salary'],
      ['benefits', 'benefits'],
      ['family-benefits', 'familyBenefits'],
      ['alimony-in', 'alimonyIn'],
      ['housing-aid', 'housingAid'],
      ['rental-income', 'rentalIncome'],
    ],
  },
  {
    id: 'fam-housing',
    label: 'housing',
    kind: 'charge',
    categories: [
      ['rent', 'rent'],
      ['energy', 'energy'],
      ['home-insurance', 'homeInsurance'],
      ['housing-tax', 'housingTax'],
      ['property-tax', 'propertyTax'],
    ],
  },
  {
    id: 'fam-communication',
    label: 'communication',
    kind: 'charge',
    categories: [
      ['mobile', 'mobile'],
      ['internet', 'internet'],
      ['streaming', 'streaming'],
    ],
  },
  {
    id: 'fam-transport',
    label: 'transport',
    kind: 'charge',
    categories: [
      ['fuel', 'fuel'],
      ['car-insurance', 'carInsurance'],
      ['car-maintenance', 'carMaintenance'],
      ['public-transport', 'publicTransport'],
      ['tolls', 'tolls'],
    ],
  },
  {
    id: 'fam-daily',
    label: 'daily',
    kind: 'charge',
    categories: [
      ['groceries', 'groceries'],
      ['clothing', 'clothing'],
      ['household', 'household'],
      ['hygiene', 'hygiene'],
    ],
  },
  {
    id: 'fam-health',
    label: 'health',
    kind: 'charge',
    categories: [
      ['health-insurance', 'healthInsurance'],
      ['medical', 'medical'],
      ['pharmacy', 'pharmacy'],
    ],
  },
  {
    id: 'fam-family',
    label: 'family',
    kind: 'charge',
    categories: [
      ['childcare', 'childcare'],
      ['school', 'school'],
      ['alimony-out', 'alimonyOut'],
      ['child-activities', 'childActivities'],
    ],
  },
  {
    id: 'fam-taxes',
    label: 'taxes',
    kind: 'charge',
    categories: [
      ['income-tax', 'incomeTax'],
      ['other-taxes', 'otherTaxes'],
    ],
  },
  {
    id: 'fam-leisure',
    label: 'leisure',
    kind: 'charge',
    categories: [
      ['outings', 'outings'],
      ['culture', 'culture'],
      ['gifts', 'gifts'],
      ['misc', 'misc'],
    ],
  },
  {
    id: 'fam-credits',
    label: 'credits',
    kind: 'debt',
    categories: [
      ['car-loan', 'carLoan'],
      ['mortgage', 'mortgage'],
      ['leasing', 'leasing'],
      ['consumer-loan', 'consumerLoan'],
      ['other-loan', 'otherLoan'],
    ],
  },
  {
    id: 'fam-savings',
    label: 'savings',
    kind: 'saving',
    categories: [
      ['passbook', 'passbook'],
      ['plans', 'plans'],
      ['life-insurance', 'lifeInsurance'],
      ['retirement', 'retirement'],
      ['company-savings', 'companySavings'],
    ],
  },
]

export function defaultFamilies(): Family[] {
  return SEED.map((family) => ({
    id: family.id,
    label: t.defaultFamilies[family.label],
    kind: family.kind,
  }))
}

/**
 * La teinte est portée par la famille, pas par la catégorie : c'est au niveau
 * de la famille que se lit la répartition, et quarante-six pastilles toutes
 * différentes ne distinguent plus rien.
 */
export function familyColor(familyId: string): string {
  const index = SEED.findIndex((family) => family.id === familyId)
  return colorAt(index < 0 ? SEED.length : index)
}

export function defaultCategories(): Category[] {
  return SEED.flatMap((family) =>
    family.categories.map(([id, label]) => ({
      id,
      label: t.defaultCategories[label],
      familyId: family.id,
      icon: '',
      color: familyColor(family.id),
      direction: directionOfKind(family.kind),
      archived: false,
    })),
  )
}

/** La famille d'accueil d'une catégorie orpheline, par sens de trésorerie. */
export function fallbackFamilyId(direction: 'in' | 'out'): string {
  return direction === 'in' ? 'fam-resources' : 'fam-leisure'
}

/**
 * La catégorie d'accueil d'une ligne qui en désignait une inexistante.
 *
 * `Entry.categoryId` n'est pas facultatif : à la différence du membre ou de la
 * récurrence, on ne peut pas couper le lien, il faut le rediriger. Sans elle,
 * la ligne gardait un identifiant mort, et `kindOfCategory` retombait sur
 * « charge » par un double repli — la dépense devenait donc commune et partagée
 * entre les membres, en silence. Elle atterrit dans la même famille d'accueil,
 * donc avec la même nature qu'avant : ce qui change n'est pas le calcul, c'est
 * qu'on la voit, et qu'un clic la range où elle doit aller.
 *
 * Une par sens, parce qu'une catégorie porte un sens et qu'une seule
 * obligerait une recette à emprunter la catégorie d'une dépense.
 */
export function repairedCategory(direction: 'in' | 'out'): Category {
  const familyId = fallbackFamilyId(direction)
  return {
    id: direction === 'in' ? 'repaired-in' : 'repaired-out',
    label: t.defaults.repairedCategory,
    familyId,
    icon: '',
    color: familyColor(familyId),
    direction,
    archived: false,
  }
}

export function emptyData(): Data {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    household: { name: '', members: [] },
    families: defaultFamilies(),
    categories: defaultCategories(),
    recurrences: [],
    entries: [],
    debts: [],
    advances: [],
    savingSupports: [],
    savingValuations: [],
    savingRates: [],
    months: [],
    settings: {
      theme: 'system',
      palette: DEFAULT_PALETTE,
      /* La langue qu'on est en train de lire, et non une constante : c'est le
         seul endroit de l'app où la langue du navigateur devient une décision.
         Elle a été détectée au démarrage, faute de document à interroger
         (`i18n/locale.ts`) ; le document qui naît ici en prend acte, et c'est
         lui qui fera foi ensuite, sur tous les appareils qui l'ouvriront. */
      locale: currentLocale(),
      currency: 'EUR',
      monthStartsOn: 1,
    },
  }
}

/** Couleur d'une nouvelle catégorie : celle de sa famille. */
export function nextCategoryColor(familyId: string): string {
  return familyColor(familyId)
}

/**
 * Les teintes des membres — une palette à eux, et non celle des catégories.
 *
 * Le vert pomme en est absent : c'est `--accent`, donc le signal « actif » de
 * l'app et la couleur du commun. Le premier membre le portait, si bien que sa
 * pastille se lisait comme une sélection — on croyait ne lire que ses données —
 * et qu'elle disparaissait tout à fait dans une pilule de filtre active, qui
 * passe elle-même en `--accent`.
 */
export const MEMBER_COLORS = [
  'var(--member-1)',
  'var(--member-2)',
  'var(--member-3)',
  'var(--member-4)',
  'var(--member-5)',
] as const

export function memberColorAt(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length] ?? 'var(--member-1)'
}

export function nextMemberColor(count: number): string {
  return memberColorAt(count)
}
