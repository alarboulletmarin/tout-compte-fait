/* ============================================================================
 * Le modèle de données du cahier des charges §3, à l'identique.
 *
 * Tout est stocké dans un document unique versionné. Une `Entry` est la seule
 * source de vérité pour les statistiques : une récurrence ne produit jamais un
 * chiffre directement, elle produit des `Entry`.
 * ==========================================================================*/

import { type ISODate, type YearMonth, addMonthsToYm, startOfMonth, ymOf } from './date'
import type { Money } from './money'

export type Direction = 'in' | 'out'

/**
 * La nature d'un flux, au-delà de son sens de trésorerie.
 *
 * `direction` dit si l'argent entre ou sort du compte. `CategoryKind` dit ce
 * qu'il devient, ce que le sens seul ne sait pas exprimer : un versement sur
 * un livret sort du compte exactement comme un plein d'essence, mais l'un est
 * consommé et l'autre simplement déplacé. Les confondre fausse la lecture —
 * un camembert où « Épargne 30 % » côtoie « Courses 12 % » compare deux choses
 * qui ne se comparent pas.
 */
export type CategoryKind = 'resource' | 'charge' | 'debt' | 'saving'

/** Le sens de trésorerie découle de la nature, jamais l'inverse. */
export function directionOfKind(kind: CategoryKind): Direction {
  return kind === 'resource' ? 'in' : 'out'
}

/** Ce qui quitte le foyer pour de bon — par opposition à ce qu'on met de côté. */
export function isSpending(kind: CategoryKind): boolean {
  return kind === 'charge' || kind === 'debt'
}

/**
 * Le premier niveau des catégories : l'onglet sous lequel on va chercher.
 * Une famille porte la nature, ses catégories n'ont plus à la répéter.
 */
export type Family = {
  id: string
  label: string
  kind: CategoryKind
}

/**
 * Une étiquette, et rien de plus. Le revenu qui sert à répartir les charges
 * n'est pas ici : il se lit sur les récurrences de nature `resource` que le
 * membre porte (voir `domain/split.ts`). Le stocker à côté en ferait une
 * seconde vérité, et la première augmentation les ferait diverger.
 */
export type Member = {
  id: string
  name: string
  color: string
}

export type Category = {
  id: string
  label: string
  /** La famille dont elle relève. C'est elle qui porte la nature du flux. */
  familyId: string
  /** Présent au modèle mais jamais rendu : le DS §9 n'admet pas l'icône ici. */
  icon: string
  color: string
  direction: Direction
  archived: boolean
}

export type PeriodUnit = 'week' | 'month' | 'year'

/**
 * `anchorDay` se lit selon l'unité :
 * - `week`  → jour de la semaine, 1 = lundi … 7 = dimanche (ISO 8601) ;
 * - `month` → jour du mois, 1 à 31, borné au dernier jour des mois courts ;
 * - `year`  → jour du mois, le mois étant celui de `startedOn`.
 */
export type Period = {
  unit: PeriodUnit
  every: number
  anchorDay: number
}

/**
 * À quel rythme un support demande d'être relevé.
 *
 * Le réflexe comptable : une entreprise ne réévalue pas ses actifs tous les
 * mois, elle fait un inventaire à la clôture et vit sur les flux le reste de
 * l'année. L'épargne suit la même cadence, et elle n'est pas la même partout.
 *
 * - **Un livret réglementé** — A, LDDS, LEP — a une valeur *déterministe* entre
 *   deux relevés : elle ne bouge que des versements, que l'app connaît déjà,
 *   plus des intérêts, capitalisés une seule fois au 31 décembre. Un relevé par
 *   an suffit, et il est exact à l'euro.
 * - **Un PEA, un compte-titres, une assurance-vie en unités de compte** sont
 *   imprévisibles entre deux relevés, mais consulter son PEA tous les mois n'est
 *   pas du budget : le trimestre est large.
 *
 * C'est le seul classement que `categoryId` ne peut pas porter — non par
 * exception à la règle qui suit, mais parce que le catalogue est **libre** : une
 * catégorie se crée et se renomme, et rien ne garantit qu'un « Livret A » soit
 * rangé ailleurs que sous « Divers ». Une cadence déduite du classement se
 * tromperait silencieusement, ce qui est exactement le défaut qu'elle existe
 * pour corriger.
 *
 * Et ce n'est pas un rendement déguisé : elle ne sert à projeter aucune valeur,
 * seulement à savoir **quand se taire**.
 */
export type SavingPace = 'yearly' | 'quarterly'

/**
 * Un support d'épargne — le livret, le plan, le contrat : **où** l'argent est
 * placé, et **à qui** il est.
 *
 * C'est la seule réponse de l'app à « où va l'argent ». La catégorie répondait
 * jusqu'ici aux deux questions à la fois : « Livrets » disait la nature du
 * mouvement *et* tenait lieu de support, si bien que le livret d'Andrea et
 * celui de Marie étaient le même objet. Elles se séparent ici — la catégorie
 * dit de quelle **nature** est ce qu'on place (un livret, un plan, une
 * assurance-vie), le support dit **lequel** et **à qui**.
 *
 * `categoryId` porte donc le classement, et il n'y a pas de second champ
 * `type` à côté : le catalogue de catégories fait déjà ce travail — il a un
 * libellé, une teinte, une famille, et l'utilisateur peut l'étendre. Un
 * énuméré parallèle serait une seconde classification à tenir d'accord avec la
 * première.
 *
 * Aucun rendement, aucun objectif, aucune échéance : le stock se photographie
 * (`SavingValuation`), il ne se projette pas encore. `pace` ne fait pas
 * exception — il dit à quel rythme la photographie est attendue, pas ce que le
 * support rapportera entre-temps.
 */
export type SavingSupport = {
  id: string
  /** Libre, et c'est le champ qui compte : « Livret A », « PEA Boursorama ». */
  label: string
  /**
   * Jamais facultatif : une épargne est toujours à quelqu'un, exactement comme
   * pour une `Advance`. L'épargne ne se répartit pas comme une charge — il n'y
   * a donc pas de support « commun ».
   */
  memberId: string
  /** La catégorie de nature `saving` sous laquelle ses mouvements se rangent. */
  categoryId: string
  /** Fermé, mais conservé : ses valorisations et ses mouvements restent. */
  archived: boolean
  /** Absent sur un document d'avant le champ : voir `DEFAULT_PACE`. */
  pace?: SavingPace
  note?: string
}

/**
 * Ce que vaut un support à une date — une **photographie du stock**, jamais un
 * mouvement.
 *
 * « PEA, 18 320 € le 1er août » ne dit pas qu'une opération de 18 320 € a eu
 * lieu ce jour-là : c'est une observation de valeur. Elle n'entre donc dans
 * aucun total du mois — ni solde, ni revenus, ni charges, ni capacité, ni
 * versements. Ceux-là se lisent sur les `Entry`, et sur elles seules.
 *
 * Les valorisations s'empilent plutôt que de s'écraser : le capital courant est
 * la plus récente, et les précédentes font l'historique — sans quoi la courbe,
 * et plus tard la comparaison d'une projection au réel, n'auraient rien à lire.
 */
export type SavingValuation = {
  id: string
  supportId: string
  amount: Money
  date: ISODate
}

export type Recurrence = {
  id: string
  label: string
  categoryId: string
  memberId?: string
  /**
   * Le support alimenté ou repris, sur une règle de nature `saving`. Absent
   * ailleurs, et absent aussi sur une règle d'épargne d'avant les supports :
   * le lien se coupe comme celui d'un membre plutôt que d'écarter la ligne.
   */
  savingSupportId?: string
  direction: Direction
  /** null = montant à saisir à chaque échéance. */
  amount: Money | null
  /**
   * Ordre de grandeur d'un montant variable, facultatif et sans effet sur un
   * montant fixe.
   *
   * Ce n'est pas une seconde vérité à côté de `amount` : c'est la seule qu'un
   * récurrence variable puisse porter avant sa première échéance. Un salaire
   * qui varie n'a aucun chiffre tant que rien n'est tombé, et il ne pouvait
   * donc peser dans aucun prorata — le foyer entier restait sans répartition
   * parce qu'une personne venait d'arriver. Dès qu'une échéance est chiffrée,
   * elle l'emporte : l'estimation ne recouvre jamais un fait (voir `amountOn`).
   */
  estimate?: Money
  period: Period
  startedOn: ISODate
  /** Dernier jour où la récurrence peut encore tomber, borne incluse. */
  endedOn?: string
  /** Voir `Entry.shared` : les échéances en héritent. */
  shared?: boolean
  note?: string
}

export type EntryStatus = 'planned' | 'confirmed'

export type Entry = {
  id: string
  /** Absent = ponctuel. */
  recurrenceId?: string
  label: string
  categoryId: string
  memberId?: string
  /**
   * Le support versé ou repris, sur un mouvement de nature `saving`. C'est le
   * lien par **identifiant** qui remplace la déduction par catégorie : une
   * échéance ne cherche plus son support par libellé ni par poste.
   */
  savingSupportId?: string
  direction: Direction
  amount: Money
  date: ISODate
  status: EntryStatus
  /**
   * Force le partage entre les membres, ou l'exclut. Absent, la règle tranche :
   * une sortie de nature charge ou crédit que personne ne s'est attribuée est
   * commune. Le champ est une exception, jamais une copie de la règle — c'est
   * ce qui évite d'avoir à requalifier tout ce qui a déjà été saisi.
   */
  shared?: boolean
  note?: string
}

/**
 * Un crédit en cours. Il ne produit aucun chiffre de trésorerie par lui-même :
 * c'est la récurrence liée qui pose les mensualités, comme n'importe quel
 * récurrence. Ce que le crédit ajoute, c'est le capital — ce qu'on doit encore,
 * qu'aucune somme de mensualités ne dit lorsqu'il y a des intérêts.
 */
export type Debt = {
  id: string
  label: string
  categoryId: string
  /** La mensualité qui l'amortit. Sans elle, le capital ne bouge pas. */
  recurrenceId?: string
  /** Capital emprunté, à l'origine. */
  principal: Money
  startedOn: ISODate
  /** Dernière mensualité prévue. */
  endsOn: ISODate
  /**
   * Taux annuel en points de base — 450 = 4,50 %. Un entier, comme les
   * montants : aucun flottant ne touche un calcul financier.
   * Absent ou zéro, le prêt est sans intérêt et le capital décroît du montant
   * versé, exactement.
   */
  rateBp?: number
  note?: string
}

/**
 * Une charge payée en une fois, depuis l'épargne, et remboursée à soi-même mois
 * par mois.
 *
 * L'assurance auto se règle en un versement de 600 € qui couvre douze mois. La
 * payer depuis un livret et se reverser 50 € chaque mois est le montage le plus
 * courant d'un foyer qui n'encaisse pas un tel coup sur un seul mois — et
 * jusqu'ici l'app ne savait le dire d'aucune manière : soit le mois du paiement
 * portait 600 € de charges et les onze suivants rien, soit la mensualité était
 * saisie à la main comme une charge, ce qu'elle n'est pas.
 *
 * Car la mensualité n'est pas une dépense : la dépense a eu lieu, une fois. Ce
 * qui se passe ensuite est un retour d'épargne — on remet sur le livret ce
 * qu'on lui a pris. C'est pour ça qu'elle ne pèse pas dans les charges du mois
 * mais dans ce qu'on place, et qu'elle réduit le reste à placer plutôt que la
 * capacité.
 *
 * Comme un `Debt`, une avance ne produit aucun chiffre de trésorerie par
 * elle-même : c'est la récurrence liée qui pose les mensualités, sur le support
 * d'épargne à reconstituer. Ce que l'avance ajoute, c'est ce qui a été avancé —
 * donc ce qu'il reste à se rembourser, qu'aucune somme de mensualités ne dit.
 */
export type Advance = {
  id: string
  label: string
  /** La catégorie de la charge avancée — assurance véhicule, taxe foncière. */
  categoryId: string
  /**
   * Qui a avancé, et qui se rembourse. Jamais facultatif : une épargne est
   * toujours à quelqu'un, et une avance que personne ne porte ne se reconstitue
   * sur le livret de personne.
   */
  memberId: string
  /**
   * Le support repris, puis reconstitué. La reprise du jour du paiement et
   * chaque mensualité pointent vers lui — c'est la même épargne, désignée par
   * le même identifiant, de l'avance jusqu'à la dernière échéance.
   *
   * Facultatif au modèle seulement : une avance d'avant les supports n'en
   * désigne aucun tant que la migration n'a pas su le déduire, et son lien se
   * coupe plutôt que de la faire disparaître.
   */
  savingSupportId?: string
  /** Ce qui a été payé, en une fois. */
  amount: Money
  /** Le jour du paiement — celui où l'épargne a été reprise. */
  paidOn: ISODate
  /** Premier et dernier mois couverts, inclus. La mensualité en découle. */
  from: YearMonth
  to: YearMonth
  /** La mensualité qui reconstitue l'épargne. Sans elle, rien ne revient. */
  recurrenceId?: string
  note?: string
}

export type MonthState = {
  ym: YearMonth
  openedAt: ISODate
  /**
   * Réservé, sans effet en v1 : écrit à `false`, jamais lu.
   *
   * Conservé plutôt que retiré — le retirer demanderait une migration pour un
   * champ qu'une clôture de mois, le jour où elle existera, redemandera aussitôt.
   * Mais `schemaDoc` le **dit** désormais : un document donné à un assistant
   * enseignait trois champs sans effet comme s'ils réglaient quelque chose,
   * ce qui est exactement l'erreur que ce document existe pour éviter.
   */
  closed: boolean
}

export type ThemeSetting = 'light' | 'dark' | 'system'

/**
 * L'identité colorimétrique de l'app, distincte du thème.
 *
 * Le thème dit clair ou sombre, la palette dit avec quelles couleurs — et
 * chaque palette tient dans les deux thèmes. Purement cosmétique : aucune valeur
 * de ce champ ne change un calcul. Les teintes elles-mêmes ne sont pas ici mais
 * dans `styles/palettes.css` ; ce qui est stocké sur une catégorie ou un membre
 * est un nom de token (`"var(--cat-3)"`), donc changer de palette recolore ce
 * qui existe déjà, sans rien réécrire.
 */
export type PaletteSetting =
  | 'classique'
  | 'monochrome'
  | 'douce'
  | 'vive'
  | 'neutre'
  | 'contrastee'

/** L'ordre fait foi : c'est celui des vignettes de l'écran d'apparence. */
export const PALETTES: readonly PaletteSetting[] = [
  'classique',
  'monochrome',
  'douce',
  'vive',
  'neutre',
  'contrastee',
]

export const DEFAULT_PALETTE: PaletteSetting = 'classique'

export function isPaletteSetting(value: unknown): value is PaletteSetting {
  return PALETTES.includes(value as PaletteSetting)
}

/**
 * La langue dans laquelle l'app se dit — et rien de plus.
 *
 * Une langue, pas une région : `fr` et `en`, sans `fr-CA` ni `en-US`. Ce que
 * l'app aurait à faire d'une région, c'est une mise en forme — et celle-là est
 * déjà décidée ailleurs, par `i18n/format.ts`, qui n'a besoin que de savoir
 * laquelle des deux prose il accompagne. Multiplier les variantes coûterait un
 * catalogue par variante pour un écart qui, entre `fr-FR` et `fr-CA`, tient
 * dans le séparateur décimal.
 *
 * **Purement cosmétique, comme le thème et la palette.** Aucune valeur de ce
 * champ ne change un calcul : ni un montant, ni une échéance, ni un prorata.
 * Ce qui est *saisi* ne bouge pas non plus — le nom d'une catégorie créée en
 * français reste écrit en français quand l'app passe à l'anglais, parce que
 * c'est une donnée du foyer et non une chaîne de l'app. Seul le catalogue par
 * défaut d'un document *neuf* suit la langue du moment (`persistence/defaults.ts`).
 */
export type Locale = 'fr' | 'en'

/** L'ordre fait foi : c'est celui du réglage de langue. */
export const LOCALES: readonly Locale[] = ['fr', 'en']

/**
 * Le français, et non la langue du navigateur.
 *
 * La détection a lieu une fois, au tout premier lancement, et elle est le
 * travail de `i18n/locale.ts` : ici on nomme ce sur quoi retombe un document
 * qui ne dit rien — un fichier importé d'avant le champ, par exemple. Répondre
 * « la langue du navigateur » à cet endroit-là ferait changer de langue un
 * document existant selon l'appareil qui l'ouvre, ce qui est exactement ce
 * qu'un réglage écrit dans le document sert à empêcher.
 */
export const DEFAULT_LOCALE: Locale = 'fr'

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale)
}

export type Settings = {
  theme: ThemeSetting
  palette: PaletteSetting
  /** La langue de l'interface. Voir `Locale` : elle ne change aucun calcul. */
  locale: Locale
  /** Le symbole sous lequel les montants se lisent. Aucune conversion : ce
   *  n'est pas la multi-devise, que le cahier §2 laisse hors v1. */
  currency: string
  /**
   * Réservé, sans effet en v1 : validé entre 1 et 28, jamais lu.
   *
   * L'app raisonne en mois calendaire — les `ym` du cahier §3 sont de la forme
   * « 2026-07 ». Conservé plutôt que retiré : « mon mois va du 27 au 27 » est
   * un chantier borné qui redemanderait ce champ, et le retirer coûterait une
   * migration pour le remettre ensuite. Comme `MonthState.closed`, il est
   * désormais annoncé comme réservé dans le schéma donné à un assistant.
   */
  monthStartsOn: number
}

export type Household = {
  name: string
  members: Member[]
}

export type Data = {
  schemaVersion: number
  household: Household
  families: Family[]
  categories: Category[]
  recurrences: Recurrence[]
  entries: Entry[]
  debts: Debt[]
  advances: Advance[]
  /** Où l'épargne est placée, et à qui elle est. */
  savingSupports: SavingSupport[]
  /** Ce que chaque support valait, aux dates où on l'a relevé. */
  savingValuations: SavingValuation[]
  months: MonthState[]
  settings: Settings
}

/* --- Petits utilitaires de lecture, sans logique métier -------------------*/

export function isActiveOn(recurrence: Recurrence, date: ISODate): boolean {
  if (date < recurrence.startedOn) return false
  return recurrence.endedOn === undefined || date <= recurrence.endedOn
}

/**
 * Jusqu'où une récurrence encore à venir décrit le mois qu'on regarde.
 *
 * L'asymétrie ci-dessous — une règle arrêtée sort, une règle à venir compte —
 * est voulue, mais elle était sans limite : un salaire déclaré pour janvier
 * 2030 pesait dans le prorata d'aujourd'hui, et le déplacer d'autant. Un
 * trimestre est le plus loin qu'une déclaration puisse porter sans cesser de
 * parler du mois en cours : c'est l'ordre de grandeur d'une embauche annoncée
 * ou d'une augmentation datée, au-delà duquel on décrit une autre année.
 */
export const RUNNING_HORIZON_MONTHS = 3

/**
 * La récurrence décrit-elle la situation du foyer sur ce mois-là ?
 *
 * Une récurrence arrêtée avant le mois ne la décrit plus. Une récurrence dont la
 * première échéance est encore à venir, si : il a été déclaré, il va tomber.
 * L'asymétrie est voulue, et c'est déjà celle du total des récurrences, qui
 * compte une récurrence à venir et exclut une récurrence arrêtée — un foyer qui
 * pose ses salaires au 1er du mois prochain n'a pas à attendre ce 1er pour
 * savoir dans quelle proportion il partage ses charges.
 *
 * Elle est bornée, en revanche, et c'est le seul ajout : « à venir » veut dire
 * bientôt, pas un jour. Sans borne, une ressource déclarée pour dans cinq ans
 * pesait dès aujourd'hui dans la part de chacun — un chiffre juste au centime
 * et faux sur le fond, que rien à l'écran ne pouvait expliquer.
 *
 * La question se pose sur un mois, jamais sur un jour : la répartition d'août
 * se lit avec les revenus d'août, y compris quand on la consulte en juillet.
 * Répondre « aujourd'hui » ferait dépendre le chiffre du moment où on regarde.
 */
export function isRunningIn(recurrence: Recurrence, month: YearMonth): boolean {
  if (ymOf(recurrence.startedOn) > addMonthsToYm(month, RUNNING_HORIZON_MONTHS)) return false
  return recurrence.endedOn === undefined || recurrence.endedOn >= startOfMonth(month)
}

export function isStopped(recurrence: Recurrence, on: ISODate): boolean {
  return recurrence.endedOn !== undefined && recurrence.endedOn < on
}

/** Une récurrence à montant variable demande une saisie à chaque échéance. */
export function isVariable(recurrence: Recurrence): boolean {
  return recurrence.amount === null
}

export function findCategory(
  categories: readonly Category[],
  id: string,
): Category | undefined {
  return categories.find((c) => c.id === id)
}

export function findMember(members: readonly Member[], id: string): Member | undefined {
  return members.find((m) => m.id === id)
}

export function findFamily(families: readonly Family[], id: string): Family | undefined {
  return families.find((f) => f.id === id)
}

export function findSavingSupport(
  supports: readonly SavingSupport[],
  id: string | undefined,
): SavingSupport | undefined {
  return id === undefined ? undefined : supports.find((s) => s.id === id)
}

/**
 * La nature d'une catégorie, lue par sa famille. Rendue par une fonction et
 * non par un champ : dupliquer la nature sur la catégorie, c'est s'exposer à
 * ce que les deux divergent.
 */
export function kindOfCategory(
  families: readonly Family[],
  categories: readonly Category[],
  categoryId: string,
): CategoryKind {
  const category = findCategory(categories, categoryId)
  if (category === undefined) return 'charge'
  return findFamily(families, category.familyId)?.kind ?? 'charge'
}
