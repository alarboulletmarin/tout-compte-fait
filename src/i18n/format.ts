/* ============================================================================
 * Mise en forme, dans la langue active. Les composants n'assemblent jamais un
 * montant ou une date à la main : ils passent par ici (ou par <Amount />).
 *
 * **Ce fichier porte les règles de langue, pas seulement des chiffres.** Une
 * traduction ne s'arrête pas aux mots : le français écrit « 1 284,50 € », pose
 * une espace fine devant le symbole et le pourcent, compte en octets et dit
 * « le 5 » ; l'anglais écrit « €1,284.50 », ne met aucune espace, compte en
 * bytes et dit « the 5th ». Aucune de ces différences ne tient dans un
 * catalogue de chaînes — ce sont des règles, elles vivent donc ici, à côté de
 * l'élision qui y vivait déjà.
 * ==========================================================================*/

import type { Money } from '@/domain/money'
import { type ISODate, type YearMonth, dayOfWeek, parseISO, parseYm } from '@/domain/date'
import { currentLocale, t } from './strings'

const english = (): boolean => currentLocale() === 'en'

/**
 * L'étiquette Intl de la langue active.
 *
 * `en-GB` et non `en-US` : l'app écrit ses dates dans l'ordre jour-mois partout
 * ailleurs — `formatDateCompact` rend « 12/07 » — et servir un anglais qui
 * lirait « 7/12 » ferait deux conventions dans le même écran. C'est la seule
 * des deux qui puisse se lire de travers sans que rien ne le signale.
 */
const intlTag = (): string => (english() ? 'en-GB' : 'fr-FR')

const NBSP_NARROW = ' '

/* Les formateurs Intl coûtent cher à construire et servent à chaque montant
   d'une liste : ils se gardent, mais **par langue** — un formateur français
   continuerait d'écrire « 1 284,50 » sous une app passée à l'anglais. */
const groupFormatters = new Map<string, Intl.NumberFormat>()

function groupFormatter(): Intl.NumberFormat {
  const tag = intlTag()
  const cached = groupFormatters.get(tag)
  if (cached !== undefined) return cached
  const made = new Intl.NumberFormat(tag, { useGrouping: true, maximumFractionDigits: 0 })
  groupFormatters.set(tag, made)
  return made
}

/** Le séparateur décimal de la langue : « , » ou « . ». */
export function decimalSeparator(): string {
  return english() ? '.' : ','
}

/**
 * Le symbole se pose-t-il avant le montant ?
 *
 * « €1,284.50 » en anglais, « 1 284,50 € » en français. Ce n'est pas une
 * coquetterie : c'est ce que rendent les deux `Intl.NumberFormat`, donc ce que
 * lit sans buter qui a l'habitude de l'un ou de l'autre. `<Amount />` est le
 * seul composant à s'en servir, parce qu'il est le seul à assembler un montant.
 */
export function symbolFirst(): boolean {
  return english()
}

/* La clé porte la langue : le symbole d'une même devise n'est pas écrit
   pareil d'une langue à l'autre — « US$ » en français, « $ » en anglais. */
const symbolCache = new Map<string, string>()

/** Symbole d'une devise ISO 4217. Retombe sur le code si la devise est inconnue. */
export function currencySymbol(currency: string): string {
  const key = `${intlTag()}/${currency}`
  const cached = symbolCache.get(key)
  if (cached !== undefined) return cached
  const symbol = readSymbol(currency)
  symbolCache.set(key, symbol)
  return symbol
}

function readSymbol(currency: string): string {
  try {
    const parts = new Intl.NumberFormat(intlTag(), {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0)
    return parts.find((p) => p.type === 'currency')?.value ?? currency
  } catch {
    return currency
  }
}

export type MoneyParts = {
  /** « - » uniquement, jamais « + » : le signe positif est décidé par l'appelant. */
  sign: string
  integer: string
  fraction: string
  symbol: string
}

/**
 * Découpe un montant pour l'affichage. La partie décimale est rendue à part
 * parce que le DS la réduit à 0.5em sur un chiffre héros.
 *
 * `rounded` sert aux lectures sans centimes : l'unité y est arrondie, jamais
 * tronquée. Tronquer ferait lire « reste 56 € à payer » sur 56,69 € — une
 * erreur systématiquement en faveur de qui la lit, ce qui est la mauvaise
 * direction pour un reste à payer.
 */
export function moneyParts(value: Money, currency: string, rounded = false): MoneyParts {
  const negative = value < 0
  const cents = Math.abs(value)
  const units = rounded ? Math.round(cents / 100) : Math.trunc(cents / 100)
  return {
    sign: negative ? '−' : '',
    integer: groupFormatter().format(units),
    fraction: String(cents % 100).padStart(2, '0'),
    symbol: currencySymbol(currency),
  }
}

/**
 * Montant en une seule chaîne — pour un `aria-label` ou un titre SVG.
 *
 * « −1 284,50 € » ou « −€1,284.50 » : le signe reste en tête dans les deux
 * langues, y compris quand le symbole passe devant. C'est ce que rend
 * `Intl.NumberFormat` en anglais, et c'est la seule place où un « moins » ne
 * peut pas se lire comme un tiret.
 */
export function formatMoney(value: Money, currency: string, withCents = true): string {
  const p = moneyParts(value, currency, !withCents)
  const body = withCents ? `${p.integer}${decimalSeparator()}${p.fraction}` : p.integer
  if (symbolFirst()) return `${p.sign}${p.symbol}${body}`
  return `${p.sign}${body}${NBSP_NARROW}${p.symbol}`
}

/** Montant signé explicitement : « +1 200,00 € ». Pour les écarts. */
export function formatSignedMoney(value: Money, currency: string): string {
  const prefix = value > 0 ? '+' : ''
  return prefix + formatMoney(value, currency)
}

/* Une décimale au plus, et jamais imposée : `formatDecimal` en force une pour
   que « 4 mois » ne se lise pas comme un compte exact, mais ici le nombre est
   déjà annoncé comme approché — « 7,0 k€ » posé sous « 14 k€ » sur un axe n'y
   ajoute qu'un zéro à lire.
   Par langue, comme les deux autres : un formateur français continuerait
   d'écrire « 1,2 » là où l'anglais écrit « 1.2 ». */
const compactFormatters = new Map<string, Intl.NumberFormat>()

function compactFormatter(): Intl.NumberFormat {
  const tag = intlTag()
  const cached = compactFormatters.get(tag)
  if (cached !== undefined) return cached
  const made = new Intl.NumberFormat(tag, { useGrouping: true, maximumFractionDigits: 1 })
  compactFormatters.set(tag, made)
  return made
}

/**
 * Un montant qui sort d'un modèle, arrondi à ce que ce modèle sait dire :
 * « 202 k€ », « 1,2 M€ », « 250 € » — « €202k », « €1.2M », « €250 ».
 *
 * Il existe pour les projections, et pour la règle qui les tient : **la
 * précision affichée ne doit pas dépasser celle du calcul**. Une projection à
 * taux constant sur vingt ans est juste à quelques milliers d'euros près — le
 * taux réel varie tous les ans, l'inflation aussi —, et l'annoncer « 202 136,25 € »
 * en ferait un relevé de compte. C'est le défaut central des simulateurs
 * bancaires : le centime affiché est ce qui fait passer une hypothèse pour une
 * mesure.
 *
 * L'échelle garde deux à trois chiffres significatifs à chaque palier, et
 * jamais un centime. Sous cent euros, l'euro entier n'est pas une fausse
 * précision — c'est déjà l'ordre de grandeur du bruit du modèle.
 *
 * Les deux langues ne posent pas le multiplicateur au même endroit, et ce n'est
 * pas un détail de ponctuation : le français écrit « 202 k€ », où le « k »
 * multiplie l'**unité** — un kilo-euro — et se colle donc au symbole ; l'anglais
 * écrit « €202k », où il multiplie le **nombre**. Les mettre du même côté
 * donnerait « 202k € » ou « €202 k », qui ne se lisent ni dans une langue ni
 * dans l'autre.
 *
 * Le signe « ≈ » n'est pas ici : il dit *ce qu'est* le nombre, pas comment il
 * s'écrit, et il vit donc dans les gabarits de `i18n/projection.ts`, à côté des
 * phrases qui le nomment.
 */
export function formatRoundedMoney(value: Money, currency: string): string {
  const symbol = currencySymbol(currency)
  const sign = value < 0 ? '−' : ''
  const units = Math.abs(value) / 100
  const write = (body: string, scale = ''): string =>
    english()
      ? `${sign}${symbol}${body}${scale}`
      : `${sign}${body}${NBSP_NARROW}${scale}${symbol}`

  if (units >= 1_000_000) return write(compactFormatter().format(units / 1_000_000), 'M')
  if (units >= 10_000) return write(groupFormatter().format(Math.round(units / 1000)), 'k')
  if (units >= 1_000) return write(compactFormatter().format(units / 1000), 'k')
  /* Le palier des centaines s'arrondit à la dizaine : personne ne programme un
     virement mensuel à 254,37 €, et c'est précisément le chiffre que le mode
     inverse produit. */
  if (units >= 100) return write(groupFormatter().format(Math.round(units / 10) * 10))
  return write(groupFormatter().format(Math.round(units)))
}

/**
 * Le pourcent, avec l'espace que sa langue lui donne : « 42 % », « 42% ».
 *
 * Le français en met une, fine et insécable ; l'anglais n'en met aucune. Le
 * séparateur suit la même règle que partout ailleurs.
 */
function percentBody(value: number, digits: number): string {
  return value.toFixed(digits).replace('.', decimalSeparator())
}

const PERCENT_GAP = (): string => (english() ? '' : NBSP_NARROW)

/** Pourcentage arrondi à l'entier : « 42 % ». */
export function formatPercent(value: number, digits = 0): string {
  return `${percentBody(value * 100, digits)}${PERCENT_GAP()}%`
}

const decimalFormatters = new Map<string, Intl.NumberFormat>()

function decimalFormatter(): Intl.NumberFormat {
  const tag = intlTag()
  const cached = decimalFormatters.get(tag)
  if (cached !== undefined) return cached
  const made = new Intl.NumberFormat(tag, {
    useGrouping: true,
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  decimalFormatters.set(tag, made)
  return made
}

/**
 * Un nombre qui n'est pas un montant : « 4,2 », « 1 240,0 ».
 *
 * Une décimale, toujours — y compris sur un entier. « 4 mois » se lirait comme
 * un compte exact quand c'est un quotient, et l'écart entre « 4 » et « 4,9 »
 * est justement ce qu'on vient chercher. C'est aussi ce qui empêche le chiffre
 * de changer de longueur d'un mois à l'autre, donc de sauter à l'œil.
 *
 * Il ne porte **aucune unité** : le mot vit dans `fr.ts`, comme partout.
 */
export function formatDecimal(value: number): string {
  return decimalFormatter().format(value)
}

/**
 * Ce qui s'écrit là où il n'y a pas de chiffre à écrire.
 *
 * Un cadratin, et surtout pas un zéro : une période sans donnée n'est pas une
 * période à zéro (cahier §4.7), et c'est la règle que tout le reste applique
 * déjà — un trait de graphique s'y coupe au lieu de plonger sur la ligne de
 * base. Nommé ici plutôt que recopié, pour que la même absence se lise partout
 * du même signe.
 */
export const NO_VALUE = '—'

/** Écart relatif signé : « +12 % », « −4 % », « — » si la base est nulle. */
export function formatDelta(value: number | null, digits = 0): string {
  if (value === null || !Number.isFinite(value)) return NO_VALUE
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${percentBody(Math.abs(value) * 100, digits)}${PERCENT_GAP()}%`
}

/**
 * Une taille de fichier, en unités décimales — c'est ce que le navigateur
 * rapporte, et c'est ce que l'explorateur de fichiers affichera à côté.
 * Une décimale au-delà du kilo, aucune en dessous : « 512 o », « 4,7 Mo ».
 */
export function formatBytes(bytes: number): string {
  /* L'octet est un mot français, et il ne se traduit pas par « octet » en
     anglais : « 4,7 Mo » se dit « 4.7 MB ». Ce sont les mêmes unités décimales
     de part et d'autre — seule la lettre change. */
  const units = english() ? ['B', 'kB', 'MB', 'GB', 'TB'] : ['o', 'ko', 'Mo', 'Go', 'To']
  let value = Math.max(0, bytes)
  let unit = 0
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000
    unit += 1
  }
  const rounded = unit === 0 ? Math.round(value) : Math.round(value * 10) / 10
  /* Une espace normale en anglais : l'espace fine est une convention
     typographique française, et elle n'a rien à faire devant « MB ». */
  const gap = english() ? ' ' : NBSP_NARROW
  return `${String(rounded).replace('.', decimalSeparator())}${gap}${units[unit] ?? units[0] ?? ''}`
}

/** Remplit les « %s » d'un gabarit de `fr.ts`, dans l'ordre. */
export function tpl(template: string, ...values: (string | number)[]): string {
  let index = 0
  return template.replace(/%s/g, () => {
    const value = values[index]
    index += 1
    return value === undefined ? '' : String(value)
  })
}

/* --- Dates ----------------------------------------------------------------*/

export function monthName(month: number): string {
  return t.calendarNames.months[month - 1] ?? ''
}

export function monthNameShort(month: number): string {
  return t.calendarNames.monthsShort[month - 1] ?? ''
}

/** « juillet 2026 » */
export function formatYearMonth(value: YearMonth): string {
  const { y, m } = parseYm(value)
  return `${monthName(m)} ${String(y)}`
}

/**
 * « juil. 2026 » — le mois et son année, sur une largeur de sélecteur.
 *
 * Pour les contrôles que la largeur d'un téléphone divise en deux. À 320px, une
 * demi-colonne de tuile laisse une soixantaine de pixels de texte à un `Select`
 * — son cadre et sa réserve de chevron en prennent cinquante à eux seuls — et
 * « novembre 2026 » s'y fait trancher au milieu du mot. La forme courte est
 * celle que les axes de graphique tiennent déjà (`monthNameShort`) : on ne
 * l'invente pas ici, on l'étend d'un an.
 */
export function formatYearMonthShort(value: YearMonth): string {
  const { y, m } = parseYm(value)
  return `${monthNameShort(m)} ${String(y)}`
}

/**
 * « juillet » — le mois seul.
 *
 * Pour les endroits où l'année ne tient pas et où elle n'apprend rien : un
 * report vient toujours du mois précédent, donc « de décembre » lu en janvier
 * ne peut désigner qu'un seul décembre.
 */
export function formatMonthName(value: YearMonth): string {
  return monthName(parseYm(value).m)
}

/**
 * « 12 juillet 2026 », « 12 July 2026 ».
 *
 * L'ordre est le même dans les deux langues — c'est celui de `en-GB`, retenu
 * pour tout le fichier —, et seul le premier du mois diverge : le français
 * écrit « 1er juillet », l'anglais écrit « 1 July » et garde l'ordinal pour
 * les tournures qui en demandent un (`formatMonthDay`).
 */
export function formatDate(iso: ISODate): string {
  const { y, m, d } = parseISO(iso)
  const day = !english() && d === 1 ? '1er' : String(d)
  return `${day} ${monthName(m)} ${String(y)}`
}

/**
 * Le jour du mois tel qu'une phrase le porte : « 5 », mais « 5th ».
 *
 * Le français dit « le 5 de chaque mois » et se contente du chiffre ; l'anglais
 * dit « on the 5th », et un « on the 5 » se lit comme une faute. C'est une
 * règle de langue et non un libellé : elle ne peut pas vivre dans le catalogue,
 * qui ne connaît pas le nombre qu'on lui passera.
 */
export function formatMonthDay(day: number): string {
  if (!english()) return String(day)
  /* 11, 12 et 13 sont les trois exceptions de l'anglais : « eleventh », et non
     « eleven-first ». Au-delà, c'est le dernier chiffre qui décide. */
  const teens = day % 100
  if (teens >= 11 && teens <= 13) return `${String(day)}th`
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] ?? 'th'
  return `${String(day)}${suffix}`
}

/**
 * « mardi 12 juillet 2026 » — le nom complet d'une case de calendrier.
 *
 * Le jour de la semaine se dit en toutes lettres parce que la grille, elle, ne
 * le dit qu'à l'œil : ses sept en-têtes sont `aria-hidden`, et « L M M J V S D »
 * annoncé sept fois ne vaudrait pas la colonne dans laquelle on se trouve.
 */
export function formatWeekdayDate(iso: ISODate): string {
  const weekday = t.calendarNames.weekdays[dayOfWeek(iso) - 1] ?? ''
  return `${weekday} ${formatDate(iso)}`
}

/** « 12 juil. » */
export function formatDayMonthShort(iso: ISODate): string {
  const { m, d } = parseISO(iso)
  return `${String(d)} ${monthNameShort(m)}`
}

/** « mar. 12 juil. » */
export function formatDayFull(iso: ISODate): string {
  const { m, d } = parseISO(iso)
  const weekday = t.calendarNames.weekdaysShort[dayOfWeek(iso) - 1] ?? ''
  return `${weekday} ${String(d)} ${monthNameShort(m)}`
}

/** Date compacte pour un sous-libellé mono : « 12/07 ». */
export function formatDateCompact(iso: ISODate): string {
  const { m, d } = parseISO(iso)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}

/** « dans 3 jours », « aujourd'hui », « il y a 2 jours ». */
export function formatRelativeDays(days: number): string {
  if (english()) {
    if (days === 0) return 'today'
    if (days === 1) return 'tomorrow'
    if (days === -1) return 'yesterday'
    if (days > 0) return `in ${String(days)} days`
    return `${String(-days)} days ago`
  }
  if (days === 0) return "aujourd'hui"
  if (days === 1) return 'demain'
  if (days === -1) return 'hier'
  if (days > 0) return `dans ${String(days)} jours`
  return `il y a ${String(-days)} jours`
}

/**
 * « de Camille », mais « d'Alice ». « de septembre », mais « d'octobre ».
 * En anglais, « of Camille » — sans exception à gérer.
 *
 * L'élision dépend du mot qui suit, et un gabarit de catalogue ne peut pas la
 * décider : elle vit donc ici, avec les autres règles de la langue. Le h est
 * traité comme muet — « d'Hugo » se dit, « de Hugo » ne se dit pas.
 *
 * Les gabarits qui reçoivent cette forme portent donc le complément **sans sa
 * préposition**, dans les deux langues : « Somme des derniers relevés %s », et
 * « Sum of the latest valuations %s ». Une traduction qui écrirait « Sum of
 * %s’s valuations » rendrait « of of Andrea » — c'est le seul piège de cette
 * fonction, et il se voit à la relecture du catalogue.
 */
export function de(word: string): string {
  if (english()) return `of ${word}`
  return /^[aeiouyàâäéèêëîïôöùûüh]/i.test(word) ? `d’${word}` : `de ${word}`
}

/**
 * « Alix », « Alix et Camille », « Alix, Camille et Sacha ».
 *
 * La conjonction est une règle de langue, et la virgule de série en est une
 * autre : l'anglais accepte « Alix, Camille and Sacha » sans virgule d'Oxford,
 * ce qui garde la même forme qu'en français à un mot près.
 */
export function enumerate(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  const last = names.at(-1) ?? ''
  return `${names.slice(0, -1).join(', ')} ${english() ? 'and' : 'et'} ${last}`
}
