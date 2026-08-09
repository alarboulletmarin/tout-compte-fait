/* ============================================================================
 * Dates — chaînes ISO « YYYY-MM-DD », en heure locale.
 *
 * Aucune conversion UTC nulle part. Toute l'arithmétique se fait sur le
 * calendrier civil en entiers (algorithme days_from_civil), jamais via un
 * objet Date : c'est la seule façon d'être immunisé au décalage d'un jour,
 * quel que soit le fuseau ou le changement d'heure.
 *
 * `new Date` n'apparaît qu'une fois, dans `today()`, et uniquement via ses
 * accesseurs locaux.
 * ==========================================================================*/

/** Une date au format « YYYY-MM-DD ». */
export type ISODate = string

/** Un mois au format « YYYY-MM ». */
export type YearMonth = string

export type CivilDate = { y: number; m: number; d: number }

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const YM_RE = /^(\d{4})-(\d{2})$/

/* --- Construction et lecture ---------------------------------------------*/

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function toISO(y: number, m: number, d: number): ISODate {
  return `${String(y).padStart(4, '0')}-${pad2(m)}-${pad2(d)}`
}

export function isValidISO(value: string): boolean {
  const match = ISO_RE.exec(value)
  if (!match) return false
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  if (m < 1 || m > 12) return false
  return d >= 1 && d <= daysInMonth(y, m)
}

export function parseISO(iso: ISODate): CivilDate {
  const match = ISO_RE.exec(iso)
  if (!match) throw new TypeError(`Date ISO invalide : ${iso}`)
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) }
}

/** Date du jour, en heure locale. */
export function today(): ISODate {
  const now = new Date()
  return toISO(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

/* --- Calendrier -----------------------------------------------------------*/

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const

export function daysInMonth(y: number, m: number): number {
  if (m === 2) return isLeapYear(y) ? 29 : 28
  return MONTH_LENGTHS[m - 1] ?? 30
}

/**
 * Jours écoulés depuis le 1970-01-01, en calendrier civil pur.
 * Howard Hinnant, « chrono-Compatible Low-Level Date Algorithms ».
 */
export function toEpochDay(iso: ISODate): number {
  const { y, m, d } = parseISO(iso)
  const yy = m <= 2 ? y - 1 : y
  const era = Math.floor(yy / 400)
  const yoe = yy - era * 400
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy
  return era * 146097 + doe - 719468
}

export function fromEpochDay(days: number): ISODate {
  const z = days + 719468
  const era = Math.floor(z / 146097)
  const doe = z - era * 146097
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365)
  const yy = yoe + era * 400
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100))
  const mp = Math.floor((5 * doy + 2) / 153)
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1
  const m = mp + (mp < 10 ? 3 : -9)
  return toISO(m <= 2 ? yy + 1 : yy, m, d)
}

/* --- Décalages ------------------------------------------------------------*/

export function addDays(iso: ISODate, n: number): ISODate {
  return fromEpochDay(toEpochDay(iso) + n)
}

/**
 * Décale de n mois en bornant au dernier jour du mois d'arrivée :
 * le 31 janvier + 1 mois donne le 28 (ou 29) février.
 */
export function addMonths(iso: ISODate, n: number): ISODate {
  const { y, m, d } = parseISO(iso)
  const total = y * 12 + (m - 1) + n
  const ny = Math.floor(total / 12)
  const nm = total - ny * 12 + 1
  return toISO(ny, nm, Math.min(d, daysInMonth(ny, nm)))
}

/** Nombre de jours de `from` à `to`. Négatif si `to` précède `from`. */
export function diffDays(from: ISODate, to: ISODate): number {
  return toEpochDay(to) - toEpochDay(from)
}

/* --- Comparaisons ---------------------------------------------------------*/

/** Les chaînes ISO se comparent lexicographiquement : c'est voulu. */
export function compareISO(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function isBefore(a: ISODate, b: ISODate): boolean {
  return a < b
}

export function isAfter(a: ISODate, b: ISODate): boolean {
  return a > b
}

/** Vrai si `iso` est dans [from, to], bornes incluses. */
export function isWithin(iso: ISODate, from: ISODate, to: ISODate): boolean {
  return iso >= from && iso <= to
}

export function clampISO(iso: ISODate, from: ISODate, to: ISODate): ISODate {
  return iso < from ? from : iso > to ? to : iso
}

/**
 * Une pile de faits datés, du plus récent au plus ancien.
 *
 * Écrit ici et employé deux fois — les valorisations d'un support et ses
 * paliers de taux (`saving.ts`, `savingRate.ts`) —, parce que ce sont deux fois
 * la même question et qu'y répondre deux fois finirait par y répondre
 * différemment.
 *
 * `rank` est l'indice d'origine, c'est-à-dire l'**ordre d'arrivée** dans le
 * document : c'est lui qui départage deux faits du même jour, le dernier posé
 * d'abord. Il faut un ordre total et déterministe, faute de quoi deux lectures
 * du même document pourraient ne pas désigner le même « dernier ».
 *
 * Par l'ordre d'arrivée, et pas par l'identifiant : les identifiants sont des
 * UUID aléatoires, donc départager une saisie de sa correction par leur id,
 * c'est tirer à pile ou face — déterministe, mais faux une fois sur deux. Ces
 * collections ne sont qu'empilées, rien ne les réordonne à la lecture du
 * document, et leur rang dans le tableau *est* leur chronologie : il survit à
 * l'export.
 */
export function stackedByDate<T>(rows: readonly T[], dateOf: (row: T) => ISODate): T[] {
  return rows
    .map((row, rank) => ({ row, rank }))
    .sort((a, b) => {
      const left = dateOf(a.row)
      const right = dateOf(b.row)
      return left === right ? b.rank - a.rank : compareISO(right, left)
    })
    .map((entry) => entry.row)
}

/* --- Jour de la semaine ---------------------------------------------------*/

/** 1 = lundi … 7 = dimanche (convention ISO 8601). */
export function dayOfWeek(iso: ISODate): number {
  return ((toEpochDay(iso) + 3) % 7 + 7) % 7 + 1
}

/* --- Mois -----------------------------------------------------------------*/

export function ymOf(iso: ISODate): YearMonth {
  return iso.slice(0, 7)
}

export function ym(y: number, m: number): YearMonth {
  return `${String(y).padStart(4, '0')}-${pad2(m)}`
}

export function isValidYm(value: string): boolean {
  const match = YM_RE.exec(value)
  if (!match) return false
  const m = Number(match[2])
  return m >= 1 && m <= 12
}

export function parseYm(value: YearMonth): { y: number; m: number } {
  const match = YM_RE.exec(value)
  if (!match) throw new TypeError(`Mois invalide : ${value}`)
  return { y: Number(match[1]), m: Number(match[2]) }
}

export function startOfMonth(value: YearMonth): ISODate {
  const { y, m } = parseYm(value)
  return toISO(y, m, 1)
}

export function endOfMonth(value: YearMonth): ISODate {
  const { y, m } = parseYm(value)
  return toISO(y, m, daysInMonth(y, m))
}

export function addMonthsToYm(value: YearMonth, n: number): YearMonth {
  const { y, m } = parseYm(value)
  const total = y * 12 + (m - 1) + n
  const ny = Math.floor(total / 12)
  return ym(ny, total - ny * 12 + 1)
}

/** Nombre de mois de `from` à `to`. Négatif si `to` précède `from`. */
export function diffMonths(from: YearMonth, to: YearMonth): number {
  const a = parseYm(from)
  const b = parseYm(to)
  return (b.y - a.y) * 12 + (b.m - a.m)
}

/** Suite continue de mois, bornes incluses. */
export function monthRange(from: YearMonth, to: YearMonth): YearMonth[] {
  const span = diffMonths(from, to)
  if (span < 0) return []
  return Array.from({ length: span + 1 }, (_, i) => addMonthsToYm(from, i))
}

/** Tous les jours du mois, du 1er au dernier. */
export function daysOfMonth(value: YearMonth): ISODate[] {
  const { y, m } = parseYm(value)
  const length = daysInMonth(y, m)
  return Array.from({ length }, (_, i) => toISO(y, m, i + 1))
}

export function currentYm(): YearMonth {
  return ymOf(today())
}
