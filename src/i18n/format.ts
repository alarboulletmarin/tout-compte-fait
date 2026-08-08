/* ============================================================================
 * Mise en forme française. Les composants n'assemblent jamais un montant ou
 * une date à la main : ils passent par ici (ou par <Amount />).
 * ==========================================================================*/

import type { Money } from '@/domain/money'
import { type ISODate, type YearMonth, dayOfWeek, parseISO, parseYm } from '@/domain/date'
import { fr } from './fr'

const NBSP_NARROW = ' '

const groupFormatter = new Intl.NumberFormat('fr-FR', {
  useGrouping: true,
  maximumFractionDigits: 0,
})

const symbolCache = new Map<string, string>()

/** Symbole d'une devise ISO 4217. Retombe sur le code si la devise est inconnue. */
export function currencySymbol(currency: string): string {
  const cached = symbolCache.get(currency)
  if (cached !== undefined) return cached
  const symbol = readSymbol(currency)
  symbolCache.set(currency, symbol)
  return symbol
}

function readSymbol(currency: string): string {
  try {
    const parts = new Intl.NumberFormat('fr-FR', {
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
    integer: groupFormatter.format(units),
    fraction: String(cents % 100).padStart(2, '0'),
    symbol: currencySymbol(currency),
  }
}

/** Montant en une seule chaîne — pour un `aria-label` ou un titre SVG. */
export function formatMoney(value: Money, currency: string, withCents = true): string {
  const p = moneyParts(value, currency, !withCents)
  const body = withCents ? `${p.integer},${p.fraction}` : p.integer
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
   ajoute qu'un zéro à lire. */
const compactFormatter = new Intl.NumberFormat('fr-FR', {
  useGrouping: true,
  maximumFractionDigits: 1,
})

/**
 * Un montant qui sort d'un modèle, arrondi à ce que ce modèle sait dire :
 * « 202 k€ », « 1,2 M€ », « 250 € ».
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
 * Le signe « ≈ » n'est pas ici : il dit *ce qu'est* le nombre, pas comment il
 * s'écrit, et il vit donc dans les gabarits de `i18n/projection.ts`, à côté des
 * phrases qui le nomment.
 */
export function formatRoundedMoney(value: Money, currency: string): string {
  const symbol = currencySymbol(currency)
  const sign = value < 0 ? '−' : ''
  const units = Math.abs(value) / 100
  const write = (body: string, prefix = ''): string =>
    `${sign}${body}${NBSP_NARROW}${prefix}${symbol}`

  if (units >= 1_000_000) return write(compactFormatter.format(units / 1_000_000), 'M')
  if (units >= 10_000) return write(groupFormatter.format(Math.round(units / 1000)), 'k')
  if (units >= 1_000) return write(compactFormatter.format(units / 1000), 'k')
  /* Le palier des centaines s'arrondit à la dizaine : personne ne programme un
     virement mensuel à 254,37 €, et c'est précisément le chiffre que le mode
     inverse produit. */
  if (units >= 100) return write(groupFormatter.format(Math.round(units / 10) * 10))
  return write(groupFormatter.format(Math.round(units)))
}

/** Pourcentage arrondi à l'entier : « 42 % ». */
export function formatPercent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits).replace('.', ',')}${NBSP_NARROW}%`
}

const decimalFormatter = new Intl.NumberFormat('fr-FR', {
  useGrouping: true,
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

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
  return decimalFormatter.format(value)
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
  return `${sign}${(Math.abs(value) * 100).toFixed(digits).replace('.', ',')}${NBSP_NARROW}%`
}

/**
 * Une taille de fichier, en unités décimales — c'est ce que le navigateur
 * rapporte, et c'est ce que l'explorateur de fichiers affichera à côté.
 * Une décimale au-delà du kilo, aucune en dessous : « 512 o », « 4,7 Mo ».
 */
export function formatBytes(bytes: number): string {
  const units = ['o', 'ko', 'Mo', 'Go', 'To']
  let value = Math.max(0, bytes)
  let unit = 0
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000
    unit += 1
  }
  const rounded = unit === 0 ? Math.round(value) : Math.round(value * 10) / 10
  return `${String(rounded).replace('.', ',')}${NBSP_NARROW}${units[unit] ?? 'o'}`
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
  return fr.calendarNames.months[month - 1] ?? ''
}

export function monthNameShort(month: number): string {
  return fr.calendarNames.monthsShort[month - 1] ?? ''
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

/** « 12 juillet 2026 » */
export function formatDate(iso: ISODate): string {
  const { y, m, d } = parseISO(iso)
  return `${d === 1 ? '1er' : String(d)} ${monthName(m)} ${String(y)}`
}

/**
 * « mardi 12 juillet 2026 » — le nom complet d'une case de calendrier.
 *
 * Le jour de la semaine se dit en toutes lettres parce que la grille, elle, ne
 * le dit qu'à l'œil : ses sept en-têtes sont `aria-hidden`, et « L M M J V S D »
 * annoncé sept fois ne vaudrait pas la colonne dans laquelle on se trouve.
 */
export function formatWeekdayDate(iso: ISODate): string {
  const weekday = fr.calendarNames.weekdays[dayOfWeek(iso) - 1] ?? ''
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
  const weekday = fr.calendarNames.weekdaysShort[dayOfWeek(iso) - 1] ?? ''
  return `${weekday} ${String(d)} ${monthNameShort(m)}`
}

/** Date compacte pour un sous-libellé mono : « 12/07 ». */
export function formatDateCompact(iso: ISODate): string {
  const { m, d } = parseISO(iso)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}

/** « dans 3 jours », « aujourd'hui », « il y a 2 jours ». */
export function formatRelativeDays(days: number): string {
  if (days === 0) return "aujourd'hui"
  if (days === 1) return 'demain'
  if (days === -1) return 'hier'
  if (days > 0) return `dans ${String(days)} jours`
  return `il y a ${String(-days)} jours`
}

/**
 * « de Camille », mais « d'Alice ». « de septembre », mais « d'octobre ».
 *
 * L'élision dépend du mot qui suit, et un gabarit de `fr.ts` ne peut pas la
 * décider : elle vit donc ici, avec les autres règles de la langue. Le h est
 * traité comme muet — « d'Hugo » se dit, « de Hugo » ne se dit pas.
 */
export function de(word: string): string {
  return /^[aeiouyàâäéèêëîïôöùûüh]/i.test(word) ? `d’${word}` : `de ${word}`
}
