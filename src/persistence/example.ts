/* ============================================================================
 * Le jeu d'exemple — un document complet, pour voir l'app pleine sans rien saisir.
 *
 * Une app neuve n'a rien à montrer : pas de courbe, pas de répartition, pas de
 * capital restant dû. Tout ce qui fait l'intérêt du produit demande des mois de
 * données, et personne ne saisit quinze mois d'historique pour décider s'il va
 * s'en servir.
 *
 * **Construit, jamais figé.** Le document est bâti à partir d'une date, donc il
 * est toujours à l'heure : le mois courant a ses échéances, l'historique remonte
 * derrière, les comparatifs ont deux années. Un fichier commité une fois pour
 * toutes serait vide du mois courant dès le mois suivant — c'est-à-dire
 * exactement l'écran que cet exemple existe pour éviter.
 *
 * **Bâti par le code de l'app, pas à côté.** Aucune `Entry` n'est écrite à la
 * main : les récurrences sont posées, puis chaque mois est *ouvert* par
 * `openMonth`, chiffré et confirmé comme l'utilisateur le ferait. L'exemple
 * n'est donc pas ressemblant, il est produit par les mêmes règles que l'usage
 * réel — une règle qui change le change avec elle. C'est aussi pour ça que les
 * mois se font du plus ancien au plus récent : `buildPlannedEntry` lit le
 * montant d'une récurrence variable sur les échéances déjà posées, et les
 * montants se propagent donc comme ils le font dans l'app.
 *
 * **Déterministe.** Identifiants séquentiels, montants lus dans des tables
 * d'entiers. Aucun `Math.random`, aucun flottant : deux appels à la même date
 * rendent le même octet, et le test peut donc comparer.
 * ==========================================================================*/

import {
  type ISODate,
  type YearMonth,
  addMonthsToYm,
  monthRange,
  startOfMonth,
  today,
  ymOf,
} from '@/domain/date'
import { money } from '@/domain/money'
import { clampToMonth } from '@/domain/recurrence'
import type {
  Category,
  Data,
  Debt,
  Direction,
  Entry,
  Family,
  Recurrence,
  SavingSupport,
} from '@/domain/types'
import {
  addCategory,
  addDebt,
  addFamily,
  addMember,
  addEntry,
  addSavingSupport,
  addSavingValuation,
  archiveCategory,
  archiveSavingSupport,
  confirmEntries,
  createAdvance,
  addRecurrence,
  openMonth,
  setHouseholdName,
  updateEntry,
  updateRecurrence,
} from '@/domain/updates'
import { emptyData, memberColorAt, nextCategoryColor } from './defaults'

/** Mois d'historique posés derrière le mois courant. Deux années civiles. */
const HISTORY_MONTHS = 15

/**
 * Aucun mois d'avance : afficher un mois non passé l'ouvre, donc naviguer vers
 * l'avant suffit à le peupler (cahier §4.3). En poser un ici ne montrerait rien
 * de plus, et fausserait le comparatif de mois — qui se cale sur les deux
 * derniers mois couverts, et opposerait alors un mois vécu à un mois entièrement
 * prévu.
 */
const FUTURE_MONTHS = 0

/* Deux parents, un jeune adulte en alternance, et un tout-petit à la crèche.
   Le troisième membre n'est pas là pour faire nombre : à deux revenus, le
   prorata est un miroir et la régularisation un aller-retour — on peut les lire
   sans les comprendre. À trois parts inégales, le reste de `largestRemainder`
   a quelque chose à placer, et « la somme des parts vaut exactement le total »
   cesse d'être une évidence arithmétique. */
const ALIX = 'ex-alix'
const CAMILLE = 'ex-camille'
const SACHA = 'ex-sacha'
const PETS_FAMILY = 'ex-fam-pets'
const PETS_CATEGORY = 'ex-cat-pets'

/* Les supports d'épargne. Chacun est à quelqu'un, et trois d'entre eux relèvent
   du même poste — c'est précisément ce que la catégorie seule ne savait pas
   dire : le livret d'Alix, celui de Camille et celui de Sacha ne sont pas le
   même compte. */
const LIVRET_ALIX = 'ex-s-livret-alix'
const LIVRET_CAMILLE = 'ex-s-livret-camille'
const LIVRET_SACHA = 'ex-s-livret-sacha'
const PEL_ALIX = 'ex-s-pel-alix'
const ASSURANCE_VIE = 'ex-s-assurance-vie'
/* Ouvert ce trimestre, aucun relevé reçu : sa valeur est **inconnue**, ce qui
   n'est pas zéro. Il est à Alix, qui est le premier membre du foyer et donc la
   personne que l'écran d'épargne pose d'office — c'est le seul endroit d'où
   « un support sans valeur renseignée » se voit sans rien filtrer. */
const PER_ALIX = 'ex-s-per-alix'
/* Le plan d'une entreprise qu'on a quittée : archivé, et pourtant plein. */
const PEE_CAMILLE = 'ex-s-pee-camille'

/** Compteur d'identifiants — séquentiel, pour que le document soit comparable. */
function counter(): () => string {
  let n = 0
  return () => {
    n += 1
    return `ex-${String(n)}`
  }
}

/* --- Les règles --------------------------------------------------*/

/**
 * Les récurrences, définies par leur décalage en mois par rapport au premier
 * mois d'historique — c'est ce qui rend le jeu ancrable à n'importe quelle date.
 */
type RecurrenceSeed = Omit<Recurrence, 'startedOn' | 'endedOn'> & {
  /** Rang du mois de la première échéance, 0 = début de l'historique. */
  from: number
  /** Rang du mois du dernier jour où elle peut tomber. Absent = toujours en cours. */
  until?: number
}

const RECURRENCES: RecurrenceSeed[] = [
  /* --- Ressources. Une par personne, sans quoi aucun prorata ne se calcule.
         Versées en tête de mois : c'est courant, et surtout c'est ce qui fait
         que le solde du mois dit quelque chose dès le 2 — sinon l'exemple
         s'ouvre sur un zéro les premiers jours, c'est-à-dire sur l'écran vide
         qu'il existe pour éviter. */
  {
    id: 'ex-r-salaire-alix',
    label: 'Salaire',
    categoryId: 'salary',
    memberId: ALIX,
    direction: 'in',
    amount: money(275000),
    period: { unit: 'month', every: 1, anchorDay: 1 },
    from: 0,
  },
  /* Un salaire à montant variable : c'est le cas que le prorata a le plus de mal
     à tenir, et celui qui montre `estimate` — l'ordre de grandeur qui fait
     exister le calcul avant la première échéance chiffrée. */
  {
    id: 'ex-r-salaire-camille',
    label: 'Salaire',
    categoryId: 'salary',
    memberId: CAMILLE,
    direction: 'in',
    amount: null,
    estimate: money(218000),
    period: { unit: 'month', every: 1, anchorDay: 2 },
    from: 0,
    note: 'Fixe plus commissions : le montant bouge chaque mois.',
  },
  {
    id: 'ex-r-allocations',
    label: 'Allocations familiales',
    categoryId: 'family-benefits',
    memberId: CAMILLE,
    direction: 'in',
    amount: money(14100),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: 0,
  },
  /* Le troisième revenu, très inférieur aux deux autres : c'est là que le
     prorata cesse d'être un miroir et devient un calcul qu'on a envie de
     vérifier. */
  {
    id: 'ex-r-salaire-sacha',
    label: 'Alternance',
    categoryId: 'salary',
    memberId: SACHA,
    direction: 'in',
    amount: money(95000),
    period: { unit: 'month', every: 1, anchorDay: 1 },
    from: 0,
  },
  /* Une seconde ressource sur la même personne. Le revenu qui pèse dans le
     prorata est la **somme** des récurrences de nature `resource` d'un membre,
     jamais une seule — et rien dans ce jeu ne le montrait. */
  {
    id: 'ex-r-prime-activite',
    label: 'Prime d’activité',
    categoryId: 'benefits',
    memberId: SACHA,
    direction: 'in',
    amount: money(8500),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: 0,
  },

  /* --- Crédits. Leurs mensualités sont des `Entry` comme les autres. */
  {
    id: 'ex-r-credit-immo',
    label: 'Crédit immobilier',
    categoryId: 'mortgage',
    direction: 'out',
    amount: money(108500),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: 0,
  },
  {
    id: 'ex-r-credit-auto',
    label: 'Crédit voiture',
    categoryId: 'car-loan',
    direction: 'out',
    amount: money(27900),
    period: { unit: 'month', every: 1, anchorDay: 10 },
    from: 0,
  },
  {
    id: 'ex-r-pret-travaux',
    label: 'Prêt travaux',
    categoryId: 'consumer-loan',
    direction: 'out',
    amount: money(16800),
    period: { unit: 'month', every: 1, anchorDay: 15 },
    from: 2,
  },
  /* Le seul crédit qui va jusqu'au bout, et qui se solde dans l'historique :
     douze mensualités de 200 € pour 2 400 € empruntés, sans taux — le capital
     décroît donc exactement de ce qui est versé, et tombe à zéro au douzième.
     Trois crédits en cours ne montrent jamais l'état « soldé », qui est
     pourtant celui où l'on finit. */
  {
    id: 'ex-r-credit-electro',
    label: 'Crédit électroménager',
    categoryId: 'other-loan',
    direction: 'out',
    amount: money(20000),
    period: { unit: 'month', every: 1, anchorDay: 12 },
    from: 0,
    until: 11,
  },

  /* --- Logement et énergie. L'électricité varie, le gaz tombe tous les deux
         mois, l'eau n'a pas encore de premier chiffre. */
  {
    id: 'ex-r-electricite',
    label: 'Électricité',
    categoryId: 'energy',
    direction: 'out',
    amount: null,
    estimate: money(9500),
    period: { unit: 'month', every: 1, anchorDay: 12 },
    from: 0,
  },
  {
    id: 'ex-r-gaz',
    label: 'Gaz',
    categoryId: 'energy',
    direction: 'out',
    amount: money(8200),
    period: { unit: 'month', every: 2, anchorDay: 18 },
    from: 0,
  },
  /* Variable, sans montant habituel et sans échéance chiffrée : c'est ce qui
     fait dire « montant variable » au total des récurrences au lieu d'un zéro. */
  {
    id: 'ex-r-eau',
    label: 'Eau',
    categoryId: 'energy',
    direction: 'out',
    amount: null,
    period: { unit: 'month', every: 3, anchorDay: 20 },
    from: HISTORY_MONTHS + 1,
    note: 'Contrat repris ce trimestre, on verra bien la première facture.',
  },
  {
    id: 'ex-r-assurance-habitation',
    label: 'Assurance habitation',
    categoryId: 'home-insurance',
    direction: 'out',
    amount: money(26400),
    period: { unit: 'year', every: 1, anchorDay: 3 },
    from: 3,
  },
  {
    id: 'ex-r-taxe-fonciere',
    label: 'Taxe foncière',
    categoryId: 'property-tax',
    direction: 'out',
    amount: money(98000),
    period: { unit: 'year', every: 1, anchorDay: 15 },
    from: 1,
  },
  {
    id: 'ex-r-ordures',
    label: 'Redevance ordures ménagères',
    categoryId: 'other-taxes',
    direction: 'out',
    amount: money(18600),
    period: { unit: 'year', every: 1, anchorDay: 20 },
    from: 4,
  },

  /* --- Communication. Les mobiles sont à chacun, l'internet en commun. */
  {
    id: 'ex-r-mobile-alix',
    label: 'Mobile Alix',
    categoryId: 'mobile',
    memberId: ALIX,
    direction: 'out',
    amount: money(1999),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: 0,
  },
  {
    id: 'ex-r-mobile-camille',
    label: 'Mobile Camille',
    categoryId: 'mobile',
    memberId: CAMILLE,
    direction: 'out',
    amount: money(1499),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: 0,
  },
  {
    id: 'ex-r-mobile-sacha',
    label: 'Mobile Sacha',
    categoryId: 'mobile',
    memberId: SACHA,
    direction: 'out',
    amount: money(1290),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: 0,
  },
  /* La ligne est au nom de Sacha, et le foyer la partage. C'est la troisième
     charge commune avancée par quelqu'un, et c'est ce qui fait de la
     régularisation autre chose qu'un aller-retour entre deux comptes : trois
     reports non nuls, dont la somme vaut toujours zéro. */
  {
    id: 'ex-r-internet',
    label: 'Internet',
    categoryId: 'internet',
    memberId: SACHA,
    direction: 'out',
    amount: money(3899),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    shared: true,
    from: 0,
  },
  /* Résiliée, et pourtant encore là : l'engagement court jusqu'à deux mois
     après le mois courant. C'est l'autre moitié de `endedOn`, que le jeu ne
     montrait pas — la seule règle arrêtée l'était dans le passé, si bien
     qu'« arrêtée, mais elle tombe encore » n'existait nulle part. */
  {
    id: 'ex-r-streaming',
    label: 'Abonnements TV',
    categoryId: 'streaming',
    memberId: ALIX,
    direction: 'out',
    amount: money(1798),
    period: { unit: 'month', every: 1, anchorDay: 8 },
    from: 0,
    until: HISTORY_MONTHS + 2,
    note: 'Résilié, mais l’engagement court encore deux mois.',
  },
  /* Un abonnement mensuel à montant fixe : c'était une « dépense ponctuelle »
     répétée seize fois au même centime, ce qu'aucun foyer ne saisit à la main. */
  {
    id: 'ex-r-transport-camille',
    label: 'Transports en commun',
    categoryId: 'public-transport',
    memberId: CAMILLE,
    direction: 'out',
    amount: money(8620),
    period: { unit: 'month', every: 1, anchorDay: 23 },
    from: 0,
  },

  /* --- Santé, famille, impôts. */
  {
    id: 'ex-r-mutuelle',
    label: 'Mutuelle',
    categoryId: 'health-insurance',
    direction: 'out',
    amount: money(12600),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: 0,
  },
  {
    id: 'ex-r-creche',
    label: 'Crèche',
    categoryId: 'childcare',
    direction: 'out',
    amount: money(32000),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: 0,
    until: HISTORY_MONTHS + 2,
    note: 'Dernière année : l’école prend le relais à la rentrée.',
  },
  /* Et ce qui la remplace, pas encore commencé : trois mois après le mois
     courant, soit exactement `RUNNING_HORIZON_MONTHS`. Elle n'a aucune
     échéance — aucun mois du document ne va si loin — et pèse pourtant déjà
     dans le total des récurrences, parce qu'elle a été déclarée. */
  {
    id: 'ex-r-cantine',
    label: 'Cantine',
    categoryId: 'school',
    direction: 'out',
    amount: money(9800),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: HISTORY_MONTHS + 3,
  },
  {
    id: 'ex-r-activites',
    label: 'Éveil musical',
    categoryId: 'child-activities',
    direction: 'out',
    amount: money(3500),
    period: { unit: 'month', every: 1, anchorDay: 13 },
    from: 0,
  },
  {
    id: 'ex-r-impots',
    label: 'Impôt sur le revenu',
    categoryId: 'income-tax',
    direction: 'out',
    amount: money(29500),
    period: { unit: 'month', every: 1, anchorDay: 15 },
    from: 0,
  },

  /* --- Les deux charges qu'une personne règle mais que les deux partagent : la
         case « à partager » est ici une exception à la règle, et c'est elle qui
         fait exister la régularisation du mois suivant. */
  {
    id: 'ex-r-courses',
    label: 'Courses',
    categoryId: 'groceries',
    memberId: CAMILLE,
    direction: 'out',
    amount: null,
    estimate: money(12000),
    period: { unit: 'week', every: 1, anchorDay: 6 },
    shared: true,
    from: 0,
  },
  {
    id: 'ex-r-carburant',
    label: 'Carburant',
    categoryId: 'fuel',
    memberId: ALIX,
    direction: 'out',
    amount: null,
    estimate: money(14000),
    period: { unit: 'month', every: 1, anchorDay: 22 },
    shared: true,
    from: 0,
  },

  /* --- La famille maison, pour montrer que le catalogue s'étend. */
  {
    id: 'ex-r-croquettes',
    label: 'Croquettes',
    categoryId: PETS_CATEGORY,
    direction: 'out',
    amount: money(4500),
    period: { unit: 'month', every: 1, anchorDay: 25 },
    from: 0,
  },

  /* --- Arrêtée sans être supprimée : la règle reste, et se reprend. */
  {
    id: 'ex-r-sport',
    label: 'Salle de sport',
    categoryId: 'culture',
    memberId: ALIX,
    direction: 'out',
    amount: money(3490),
    period: { unit: 'month', every: 1, anchorDay: 3 },
    from: 0,
    until: HISTORY_MONTHS - 4,
  },

  /* --- Versements. Le 31 montre la règle d'échéance : bornée, jamais
         reportée — le 31 janvier, le 28 février, puis de nouveau le 31 mars. */
  {
    id: 'ex-r-livret-alix',
    label: 'Virement livret',
    categoryId: 'passbook',
    memberId: ALIX,
    savingSupportId: LIVRET_ALIX,
    direction: 'out',
    amount: money(30000),
    period: { unit: 'month', every: 1, anchorDay: 31 },
    from: 0,
  },
  {
    id: 'ex-r-livret-camille',
    label: 'Virement livret',
    categoryId: 'passbook',
    memberId: CAMILLE,
    savingSupportId: LIVRET_CAMILLE,
    direction: 'out',
    amount: money(25000),
    period: { unit: 'month', every: 1, anchorDay: 31 },
    from: 0,
  },
  {
    id: 'ex-r-livret-sacha',
    label: 'Virement livret jeune',
    categoryId: 'passbook',
    memberId: SACHA,
    savingSupportId: LIVRET_SACHA,
    direction: 'out',
    amount: money(5000),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: 0,
  },
  {
    id: 'ex-r-pel',
    label: 'PEL',
    categoryId: 'plans',
    memberId: ALIX,
    savingSupportId: PEL_ALIX,
    direction: 'out',
    amount: money(15000),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: 0,
  },
  /* Un versement sur un support dont on ignore la valeur : le flux est connu au
     centime, le stock ne l'est pas du tout. Les deux se lisent côte à côte sans
     que l'un serve jamais à deviner l'autre. */
  {
    id: 'ex-r-per',
    label: 'PER',
    categoryId: 'retirement',
    memberId: ALIX,
    savingSupportId: PER_ALIX,
    direction: 'out',
    amount: money(10000),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: HISTORY_MONTHS - 2,
  },
  /* Arrêté avec le départ de l'entreprise, six mois en arrière. La règle
     s'éteint, le support s'archive, et le capital reste : c'est l'ensemble qui
     rend la situation lisible — un compte fermé qui continuerait de grossir
     serait l'état incohérent que l'archivage existe pour éviter. */
  {
    id: 'ex-r-pee',
    label: 'PEE',
    categoryId: 'company-savings',
    memberId: CAMILLE,
    savingSupportId: PEE_CAMILLE,
    direction: 'out',
    amount: money(9000),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: 0,
    until: HISTORY_MONTHS - 6,
  },
  /* Un support sans versement régulier : il vaut ce qu'il vaut, et c'est tout
     ce qu'on en sait. C'est le cas que la v1 ne pouvait pas représenter — une
     épargne existe même les mois où l'on n'y touche pas. */
]

/**
 * Ce qui change en cours de route, appliqué avant l'ouverture du mois de rang
 * `at`. Les échéances déjà confirmées ne bougent pas : c'est ce qui fait exister
 * l'historique de prix, et l'alerte de la fiche — rouge sur une charge qui
 * monte, muette sur un salaire qui monte.
 */
const CHANGES: { at: number; id: string; patch: Partial<Recurrence> }[] = [
  { at: 9, id: 'ex-r-salaire-alix', patch: { amount: money(289000) } },
  { at: 11, id: 'ex-r-mutuelle', patch: { amount: money(13800) } },
]

/**
 * Les montants d'une récurrence variable, mois après mois. L'électricité suit
 * les saisons, les courses et le carburant flottent : c'est ce qui donne aux
 * courbes et aux comparatifs quelque chose à comparer.
 */
const VARIABLE: Record<string, number[]> = {
  'ex-r-electricite': [12400, 13100, 11200, 9600, 8200, 7400, 7100, 7600, 8900, 10300, 11800, 13500],
  'ex-r-carburant': [13500, 14800, 12900, 15600, 14100, 13200, 16400, 15100, 13800, 14500, 15900, 12700],
  'ex-r-courses': [11800, 13400, 10900, 12600, 14100, 11200, 12900, 13700, 10400, 12100, 13900, 11600, 12300],
  'ex-r-salaire-camille': [
    218000, 224500, 209000, 231000, 217500, 226000, 213000, 235000, 220500, 228000, 211500, 223000,
  ],
}

/* --- Ce qui n'est pas une règle : les dépenses ponctuelles ----------------*/

type AdHocSeed = {
  day: number
  label: string
  categoryId: string
  memberId?: string
  /** Sur un mouvement d'épargne : le compte versé ou repris. */
  savingSupportId?: string
  direction: Direction
  /** Repris en boucle sur les mois : chaque mois a les siens, et ils diffèrent. */
  amounts: number[]
  note?: string
}

const AD_HOC: AdHocSeed[] = [
  /* Tôt dans le mois, quand la paie vient de tomber : c'est réaliste, et ça
     donne au mois courant de quoi se lire dès ses premiers jours. */
  {
    day: 2,
    label: 'Restaurant',
    categoryId: 'outings',
    direction: 'out',
    amounts: [4200, 6800, 3400, 5600, 7900, 4700],
  },
  {
    day: 11,
    label: 'Pharmacie',
    categoryId: 'pharmacy',
    memberId: CAMILLE,
    direction: 'out',
    amounts: [1840, 2260, 940, 3120, 1560, 2780],
  },
  {
    day: 14,
    label: 'Habillement',
    categoryId: 'clothing',
    memberId: ALIX,
    direction: 'out',
    amounts: [5900, 0, 8400, 0, 4300, 0],
  },
  {
    day: 17,
    label: 'Produits d’entretien',
    categoryId: 'household',
    direction: 'out',
    amounts: [2340, 1890, 2670, 1450, 3010, 2120],
  },
  {
    day: 19,
    label: 'Coiffeur',
    categoryId: 'hygiene',
    memberId: CAMILLE,
    direction: 'out',
    amounts: [0, 4500, 0, 3800, 0, 4500],
  },
  {
    day: 21,
    label: 'Cinéma',
    categoryId: 'culture',
    direction: 'out',
    amounts: [2400, 0, 3600, 1800, 0, 2400],
  },
  {
    day: 23,
    label: 'Stationnement',
    categoryId: 'tolls',
    memberId: ALIX,
    direction: 'out',
    amounts: [1800, 2400, 1200, 3000, 1500, 2100],
  },
  {
    day: 26,
    label: 'Cadeaux',
    categoryId: 'gifts',
    memberId: ALIX,
    direction: 'out',
    amounts: [0, 3500, 0, 0, 6200, 0],
  },
  /* Le poste où finit ce qui ne se range nulle part. Un catalogue sans lui
     force à mentir sur une ligne par mois. */
  {
    day: 27,
    label: 'Divers',
    categoryId: 'misc',
    direction: 'out',
    amounts: [1250, 890, 2140, 0, 1670, 940],
  },
]

/** Ce qui n'arrive qu'une fois, posé au rang de mois indiqué. */
const ONE_OFFS: (AdHocSeed & { at: number })[] = [
  /* --- Les trois charges que les avances financent.

     `createAdvance` pose la reprise sur le livret et les mensualités, mais pas
     la dépense : « l'app ne l'invente pas à la place de qui l'a faite ». Sans
     elles, le mois du paiement affichait une rentrée d'argent venue de nulle
     part — l'épargne reprise, et rien en face. Avec elles, les deux se
     compensent au centime et le solde du mois ne bouge pas : c'est exactement
     ce que l'avance existe pour produire, et ça ne se voyait pas.

     Elles restent attribuées à qui a payé, sans `shared` : le partage passe par
     les mensualités, et le compter ici aussi le ferait deux fois. */
  {
    at: 1,
    day: 18,
    label: 'Réparation boîte de vitesses',
    categoryId: 'car-maintenance',
    memberId: ALIX,
    direction: 'out',
    amounts: [126000],
    note: 'Réglée depuis le livret : la reprise du même jour la compense.',
  },
  {
    at: 10,
    day: 14,
    label: 'Assurance auto',
    categoryId: 'car-insurance',
    memberId: ALIX,
    direction: 'out',
    amounts: [67200],
  },
  {
    at: 13,
    day: 6,
    label: 'Lunettes',
    categoryId: 'medical',
    memberId: CAMILLE,
    direction: 'out',
    amounts: [48000],
  },

  {
    at: 4,
    day: 8,
    label: 'Vacances',
    categoryId: 'outings',
    direction: 'out',
    amounts: [145000],
    note: 'Une semaine à quatre. Personne ne se l’attribue : c’est en commun.',
  },
  {
    at: 8,
    day: 16,
    label: 'Reprise livret',
    categoryId: 'passbook',
    memberId: CAMILLE,
    savingSupportId: LIVRET_CAMILLE,
    direction: 'in',
    amounts: [62000],
    note: 'Le lave-linge a rendu l’âme. L’épargne se compte en net : ceci s’en retranche.',
  },
  {
    at: 10,
    day: 28,
    label: 'Prime annuelle',
    categoryId: 'salary',
    memberId: ALIX,
    direction: 'in',
    amounts: [120000],
    note: 'Une prime a lieu, mais elle ne dit rien de ce qu’on gagne : le prorata ne bouge pas.',
  },
  {
    at: 7,
    day: 22,
    label: 'Pneus hiver',
    categoryId: 'car-maintenance',
    direction: 'out',
    amounts: [38900],
  },
  {
    at: 12,
    day: 9,
    label: 'Frais médicaux',
    categoryId: 'medical',
    memberId: ALIX,
    direction: 'out',
    amounts: [8500],
  },
  {
    at: 13,
    day: 4,
    label: 'Vétérinaire',
    categoryId: PETS_CATEGORY,
    direction: 'out',
    amounts: [13400],
  },
]

/* --- Assemblage -----------------------------------------------------------*/

const at = <T,>(table: readonly T[], index: number): T => table[index % table.length] as T

/** La date du rang `day` dans un mois, bornée à son dernier jour. */
const dayOf = (ym: YearMonth, day: number): ISODate => clampToMonth(ym, day)

/**
 * Deux personnes, quinze mois d'historique, le mois courant à
 * moitié confirmé et le suivant déjà prévu.
 */
export function exampleData(on: ISODate = today()): Data {
  const ids = counter()
  const anchor = ymOf(on)
  const first = addMonthsToYm(anchor, -HISTORY_MONTHS)
  const months = monthRange(first, addMonthsToYm(anchor, FUTURE_MONTHS))

  let data = setHouseholdName(emptyData(), 'Maison')
  data = addMember(data, { id: ALIX, name: 'Alix', color: memberColorAt(0) })
  data = addMember(data, { id: CAMILLE, name: 'Camille', color: memberColorAt(1) })
  data = addMember(data, { id: SACHA, name: 'Sacha', color: memberColorAt(2) })

  data = withCatalogue(data)
  data = withSupports(data)
  data = withRules(data, first)
  data = withDebts(data, first)
  data = withValuations(data, anchor, ids)
  data = withAdvances(data, anchor, ids)

  months.forEach((ym, index) => {
    for (const change of CHANGES) {
      if (change.at === index) data = updateRecurrence(data, change.id, change.patch)
    }
    data = openMonth(data, ym, ids, openedOn(ym, anchor, on)).data
    data = priceVariables(data, ym, index)
    data = withAdHoc(data, ym, index, on, anchor, ids)
    data = confirmWhatHappened(data, ym, anchor, on)
  })

  return data
}

/**
 * Une famille maison et sa catégorie, et une catégorie du catalogue archivée.
 *
 * Sept catégories du jeu par défaut restent inemployées, et c'est un choix
 * plutôt qu'un oubli : `rent` et `housing-aid` supposent un foyer locataire, qui
 * ne paierait pas les mensualités d'un crédit immobilier ; `housing-tax` ne
 * s'applique plus à une résidence principale, dont `property-tax` porte déjà
 * l'impôt ; `rental-income` demanderait un second bien, donc un second crédit et
 * une seconde charge, pour beaucoup de lisibilité en moins ; `alimony-in` et
 * `alimony-out` trancheraient une histoire familiale qu'un jeu d'exemple n'a pas
 * à raconter ; et `leasing` est justement celle qu'on archive ci-dessous. Un
 * catalogue exhaustif ne fait pas un foyer cohérent, et c'est la cohérence que
 * cet exemple doit enseigner.
 */
function withCatalogue(data: Data): Data {
  const family: Family = { id: PETS_FAMILY, label: 'Animaux', kind: 'charge' }
  const category: Category = {
    id: PETS_CATEGORY,
    label: 'Chien',
    familyId: PETS_FAMILY,
    icon: '',
    color: nextCategoryColor(PETS_FAMILY),
    direction: 'out',
    archived: false,
  }
  /* Archiver n'efface rien et se défait : la location longue durée n'a jamais
     servi ici, elle sort des listes de saisie sans quitter le document. */
  return archiveCategory(addCategory(addFamily(data, family), category), 'leasing')
}

/**
 * Les sept supports d'épargne — où l'argent est placé, et à qui.
 *
 * Trois d'entre eux relèvent du même poste (« Livrets ») et appartiennent à
 * trois personnes : c'est exactement ce qu'une catégorie seule ne savait pas
 * dire, et la raison d'être de cette entité. L'assurance-vie ne reçoit aucun
 * versement régulier — une épargne existe aussi les mois où l'on n'y touche
 * pas. Les cinq catégories d'épargne du catalogue sont ainsi toutes servies.
 *
 * Deux d'entre eux sont là pour un état, et non pour un montant : le PER n'a
 * aucun relevé — sa valeur est inconnue, ce que l'app compte à part plutôt que
 * d'additionner à zéro —, et le PEE est archivé sans cesser d'être lisible,
 * parce qu'il porte une valeur.
 *
 * Aucun capital n'est écrit ici : il vit dans les valorisations, et nulle part
 * ailleurs.
 */
function withSupports(data: Data): Data {
  const supports: SavingSupport[] = [
    {
      id: LIVRET_ALIX,
      label: 'Livret A',
      memberId: ALIX,
      categoryId: 'passbook',
      archived: false,
    },
    {
      id: LIVRET_CAMILLE,
      label: 'Livret A',
      memberId: CAMILLE,
      categoryId: 'passbook',
      archived: false,
      note: 'C’est lui qui encaisse les coups durs : l’avance des lunettes en vient.',
    },
    {
      id: LIVRET_SACHA,
      label: 'Livret jeune',
      memberId: SACHA,
      categoryId: 'passbook',
      archived: false,
    },
    { id: PEL_ALIX, label: 'PEL', memberId: ALIX, categoryId: 'plans', archived: false },
    {
      id: ASSURANCE_VIE,
      label: 'Assurance-vie',
      memberId: CAMILLE,
      categoryId: 'life-insurance',
      archived: false,
      note: 'Aucun versement programmé : sa valeur bouge avec les marchés.',
    },
    {
      id: PER_ALIX,
      label: 'PER',
      memberId: ALIX,
      categoryId: 'retirement',
      archived: false,
      note: 'Ouvert ce trimestre. Aucun relevé reçu : sa valeur est inconnue, pas nulle.',
    },
    {
      id: PEE_CAMILLE,
      label: 'PEE',
      memberId: CAMILLE,
      categoryId: 'company-savings',
      archived: false,
      note: 'Entreprise quittée : le plan est fermé, l’épargne reste.',
    },
  ]
  /* Archivé par la mutation, jamais par le littéral — comme `archiveCategory`
     pour « leasing » juste au-dessus. La règle qui l'alimentait est déjà
     arrêtée par son `until` : archiver un support que rien n'arrête laisserait
     un compte invisible grossir tout seul. */
  return archiveSavingSupport(supports.reduce(addSavingSupport, data), PEE_CAMILLE)
}

/**
 * L'historique de valeur : ce que chaque support valait, aux dates relevées.
 *
 * Trois relevés espacés de trois mois, plus celui du jour : de quoi une courbe,
 * et de quoi voir la différence entre la valeur **renseignée** et la valeur
 * **estimée** — l'assurance-vie ne reçoit aucun versement et progresse quand
 * même, le livret progresse de ce qu'on y verse. Les deux se lisent au même
 * endroit, sans que le second écrase jamais le premier.
 *
 * Les montants sont des paliers écrits en dur, jamais dérivés des versements :
 * un capital relevé est une observation, pas un calcul — le déduire des `Entry`
 * reviendrait à effacer la distinction que ce jeu d'exemple existe pour montrer.
 */
const VALUATIONS: { supportId: string; at: number; amount: number }[] = [
  { supportId: LIVRET_ALIX, at: -9, amount: 980000 },
  { supportId: LIVRET_ALIX, at: -6, amount: 1070000 },
  { supportId: LIVRET_ALIX, at: -3, amount: 1160000 },
  { supportId: LIVRET_ALIX, at: 0, amount: 1245000 },

  { supportId: LIVRET_CAMILLE, at: -9, amount: 640000 },
  { supportId: LIVRET_CAMILLE, at: -6, amount: 715000 },
  { supportId: LIVRET_CAMILLE, at: -3, amount: 728000 },
  { supportId: LIVRET_CAMILLE, at: 0, amount: 803000 },

  { supportId: PEL_ALIX, at: -6, amount: 1740000 },
  { supportId: PEL_ALIX, at: -3, amount: 1786000 },
  { supportId: PEL_ALIX, at: 0, amount: 1832000 },

  { supportId: LIVRET_SACHA, at: -6, amount: 120000 },
  { supportId: LIVRET_SACHA, at: -3, amount: 145000 },
  { supportId: LIVRET_SACHA, at: 0, amount: 168000 },

  /* Sans versement, et pourtant en mouvement : le seul support dont la valeur
     ne s'explique que par le marché. Il recule une fois — une courbe qui ne
     ferait que monter ne dirait pas ce qu'est un placement. */
  { supportId: ASSURANCE_VIE, at: -9, amount: 960000 },
  { supportId: ASSURANCE_VIE, at: -6, amount: 1005000 },
  { supportId: ASSURANCE_VIE, at: -3, amount: 988000 },
  { supportId: ASSURANCE_VIE, at: 0, amount: 1020000 },

  /* Le PEE s'arrête six mois en arrière : c'est le dernier relevé reçu, et
     c'est lui qui le garde visible à l'écran malgré l'archivage. Ses versements
     cessent le 5 du même mois, le relevé tombe le 8 : rien n'a bougé après lui,
     et le total n'annonce donc aucune estimation sur un compte fermé. */
  { supportId: PEE_CAMILLE, at: -9, amount: 340000 },
  { supportId: PEE_CAMILLE, at: -6, amount: 358000 },

  /* Le PER n'a aucune ligne ici, et c'est tout ce qu'il vient dire : un support
     sans relevé vaut « inconnu », jamais zéro. */
]

function withValuations(data: Data, anchor: YearMonth, ids: () => string): Data {
  return VALUATIONS.reduce(
    (acc, seed) =>
      addSavingValuation(acc, {
        id: ids(),
        supportId: seed.supportId,
        amount: money(seed.amount),
        date: dayOf(addMonthsToYm(anchor, seed.at), 8),
      }),
    data,
  )
}

function withRules(data: Data, first: YearMonth): Data {
  return RECURRENCES.reduce((acc, seed) => {
    const { from, until, ...rest } = seed
    const startedOn = startOfMonth(addMonthsToYm(first, from))
    const recurrence: Recurrence = {
      ...rest,
      startedOn:
        rest.period.unit === 'year' ? dayOf(addMonthsToYm(first, from), rest.period.anchorDay) : startedOn,
      ...(until === undefined ? {} : { endedOn: dayOf(addMonthsToYm(first, until), 28) }),
    }
    return addRecurrence(acc, recurrence)
  }, data)
}

/**
 * Quatre crédits, dont deux sans taux et un déjà soldé.
 *
 * Tous démarrent dans l'historique : le capital restant dû ne se dérive que des
 * mensualités **confirmées**, et un crédit ouvert avant le premier mois du
 * document annoncerait un capital qu'aucune échéance n'a amorti.
 */
function withDebts(data: Data, first: YearMonth): Data {
  const debts: Debt[] = [
    {
      id: 'ex-d-immo',
      label: 'Crédit immobilier',
      categoryId: 'mortgage',
      recurrenceId: 'ex-r-credit-immo',
      principal: money(21000000),
      startedOn: startOfMonth(first),
      endsOn: endOfSpan(first, 300),
      rateBp: 385,
      note: 'Vingt-cinq ans. La somme des mensualités ne dit pas ce qu’il reste à devoir.',
    },
    {
      id: 'ex-d-auto',
      label: 'Crédit voiture',
      categoryId: 'car-loan',
      recurrenceId: 'ex-r-credit-auto',
      principal: money(1450000),
      startedOn: startOfMonth(first),
      endsOn: endOfSpan(first, 60),
      rateBp: 490,
    },
    /* Sans taux, le capital décroît exactement de ce qui a été versé. C'est
       l'autre branche du calcul, et la seule où le raccourci serait juste. */
    {
      id: 'ex-d-travaux',
      label: 'Prêt travaux',
      categoryId: 'consumer-loan',
      recurrenceId: 'ex-r-pret-travaux',
      principal: money(500000),
      startedOn: startOfMonth(addMonthsToYm(first, 2)),
      endsOn: endOfSpan(addMonthsToYm(first, 2), 30),
    },
    /* Éteint. Douze mensualités de 200 € pour 2 400 € empruntés, la dernière
       tombée il y a quatre mois : le capital restant dû vaut exactement zéro, et
       c'est le seul état que les trois autres ne montrent pas. `endsOn` se cale
       sur le jour de la dernière mensualité, et non sur le 5 comme les autres —
       un crédit dont la dernière échéance tomberait après sa fin annoncée
       n'aurait pas de sens. */
    {
      id: 'ex-d-electro',
      label: 'Crédit électroménager',
      categoryId: 'other-loan',
      recurrenceId: 'ex-r-credit-electro',
      principal: money(240000),
      startedOn: startOfMonth(first),
      endsOn: dayOf(addMonthsToYm(first, 11), 12),
      note: 'Sans intérêt, et arrivé à son terme : ce qu’on a versé est exactement ce qu’on devait.',
    },
  ]
  return debts.reduce(addDebt, data)
}

const endOfSpan = (from: YearMonth, months: number): ISODate =>
  dayOf(addMonthsToYm(from, months - 1), 5)

/**
 * Trois avances — une charge payée en une fois depuis le livret, remboursée à
 * soi-même mois par mois. Deux sont partagées, une non : les premières entrent
 * dans le pot commun, la dernière reste à qui l'a avancée. Et l'une des trois
 * est entièrement reconstituée, ce qu'aucune des deux autres ne montrait : une
 * avance finit par se solder, et cet état-là avait sa page sans jamais de ligne
 * pour l'occuper.
 */
function withAdvances(data: Data, anchor: YearMonth, ids: () => string): Data {
  const gearbox = addMonthsToYm(anchor, -14)
  const car = addMonthsToYm(anchor, -5)
  const glasses = addMonthsToYm(anchor, -2)

  /* Six mensualités pour un montant divisible par six : la mensualité tombe
     juste, et le reste dû arrive à zéro au centime plutôt qu'à un arrondi
     qu'il faudrait expliquer. */
  let next = createAdvance(
    data,
    {
      label: 'Réparation boîte de vitesses',
      categoryId: 'car-maintenance',
      memberId: ALIX,
      amount: money(126000),
      paidOn: dayOf(gearbox, 18),
      from: gearbox,
      to: addMonthsToYm(gearbox, 5),
      savingSupportId: LIVRET_ALIX,
      shared: true,
      note: 'La voiture sert à tout le monde : la charge entre dans le pot commun. Entièrement remise depuis.',
    },
    ids,
    startOfMonth(gearbox),
  ).data

  next = createAdvance(
    next,
    {
      label: 'Assurance auto',
      categoryId: 'car-insurance',
      memberId: ALIX,
      amount: money(67200),
      paidOn: dayOf(car, 14),
      from: car,
      to: addMonthsToYm(car, 11),
      savingSupportId: LIVRET_ALIX,
      shared: true,
      note: 'Réglée en une fois depuis le livret, remise 56 € par mois.',
    },
    ids,
    startOfMonth(car),
  ).data

  next = createAdvance(
    next,
    {
      label: 'Lunettes',
      categoryId: 'medical',
      memberId: CAMILLE,
      amount: money(48000),
      paidOn: dayOf(glasses, 6),
      from: glasses,
      to: addMonthsToYm(glasses, 9),
      savingSupportId: LIVRET_CAMILLE,
    },
    ids,
    startOfMonth(glasses),
  ).data

  return next
}

/** Le jour où le mois a été ouvert : le premier du mois, sauf pour l'à-venir. */
const openedOn = (ym: YearMonth, anchor: YearMonth, on: ISODate): ISODate =>
  ym > anchor ? on : startOfMonth(ym)

/**
 * Chiffre les échéances à montant variable du mois.
 *
 * Elles arrivent déjà valorisées — `openMonth` propose ce que la récurrence vaut
 * à cette date — mais toutes au même montant. La table leur donne le mouvement
 * qui fait exister les courbes, les comparatifs et la détection de changement de
 * prix.
 */
function priceVariables(data: Data, ym: YearMonth, index: number): Data {
  const seen = new Map<string, number>()
  return data.entries.reduce((acc, entry) => {
    if (entry.recurrenceId === undefined || ymOf(entry.date) !== ym) return acc
    const table = VARIABLE[entry.recurrenceId]
    if (table === undefined || entry.status === 'confirmed') return acc
    const rank = seen.get(entry.recurrenceId) ?? 0
    seen.set(entry.recurrenceId, rank + 1)
    return updateEntry(acc, entry.id, { amount: money(at(table, index * 5 + rank)) })
  }, data)
}

/** Les dépenses ponctuelles du mois — celles qu'aucune règle ne pose. */
function withAdHoc(
  data: Data,
  ym: YearMonth,
  index: number,
  on: ISODate,
  anchor: YearMonth,
  ids: () => string,
): Data {
  if (ym > anchor) return data
  const seeds: AdHocSeed[] = [
    ...AD_HOC.map((seed) => ({ ...seed, amounts: [at(seed.amounts, index)] })),
    ...ONE_OFFS.filter((seed) => seed.at === index),
  ]

  return seeds.reduce((acc, seed) => {
    const amount = seed.amounts[0] ?? 0
    const date = dayOf(ym, seed.day)
    // Un ponctuel est un fait : il ne se pose pas dans un jour qui n'est pas
    // encore arrivé, et un montant nul veut dire qu'il n'a pas eu lieu ce mois.
    if (amount === 0 || date > on) return acc
    const entry: Entry = {
      id: ids(),
      label: seed.label,
      categoryId: seed.categoryId,
      ...(seed.memberId === undefined ? {} : { memberId: seed.memberId }),
      ...(seed.savingSupportId === undefined
        ? {}
        : { savingSupportId: seed.savingSupportId }),
      direction: seed.direction,
      amount: money(amount),
      date,
      status: 'confirmed',
      ...(seed.note === undefined ? {} : { note: seed.note }),
    }
    return addEntry(acc, entry)
  }, data)
}

/**
 * Confirme ce qui a eu lieu, laisse prévu ce qui reste à venir.
 *
 * Le mois courant garde une échéance passée **non confirmée** — la plus légère,
 * pour que l'exemple ne s'ouvre pas sur un loyer impayé : une échéance que
 * personne n'a confirmée est la plus proche de toutes, et « Prochaines
 * échéances » la compte en jours négatifs. C'est le seul endroit de l'app où un
 * retard se voit, et il n'existe pas sans une ligne pour le porter.
 */
function confirmWhatHappened(data: Data, ym: YearMonth, anchor: YearMonth, on: ISODate): Data {
  if (ym > anchor) return data

  const due = data.entries.filter(
    (entry) => ymOf(entry.date) === ym && entry.status === 'planned' && entry.date <= on,
  )
  if (ym < anchor) return confirmEntries(data, due.map((entry) => entry.id))

  /* Un retard ne se met en scène que s'il reste un mois à côté de lui. Les
     premiers jours d'un mois, deux ou trois échéances seulement sont tombées :
     en retenir une laisserait un solde à zéro, et le retard qu'on voulait
     montrer aurait mangé tout ce qu'il y avait à voir. */
  const overdue =
    due.length < MIN_CONFIRMED_FOR_OVERDUE
      ? undefined
      : due
          .filter((entry) => entry.direction === 'out' && entry.date < on)
          .sort((a, b) => a.amount - b.amount || a.date.localeCompare(b.date))
          .at(0)

  return confirmEntries(
    data,
    due.filter((entry) => entry.id !== overdue?.id).map((entry) => entry.id),
  )
}

/** En deçà, tout se confirme : le mois n'a pas encore de quoi porter un retard. */
const MIN_CONFIRMED_FOR_OVERDUE = 4

/** Les bornes couvertes par le jeu, pour que le test n'ait pas à les recopier. */
export function exampleBounds(on: ISODate = today()): { first: YearMonth; last: YearMonth } {
  const anchor = ymOf(on)
  return { first: addMonthsToYm(anchor, -HISTORY_MONTHS), last: addMonthsToYm(anchor, FUTURE_MONTHS) }
}
