import type { AppData, History, Snapshot } from './data'
import { computeSplit } from './split'
import type { Charge } from './types'

/** Les clés de l'historique : « AAAA-MM », de 2000 à 2999 (garde-fou contre un fichier absurde). */
export const MONTH_KEY = /^2\d{3}-(0[1-9]|1[0-2])$/

/** Le mois à l'horloge locale de l'appareil ; `now` sert aux tests. */
export const monthOf = (now = new Date()): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

/** Les mois de l'historique, du plus ancien au plus récent. */
export const sortedMonths = (history: History): string[] => Object.keys(history).sort()

/** L'état d'un mois, sans l'historique ni le drapeau « reconduit ». */
export const snapshotOf = ({ household, charges, categories }: AppData): Snapshot => ({
  household,
  charges,
  categories,
})

function nextMonth(key: string): string {
  const year = Number(key.slice(0, 4))
  const month = Number(key.slice(5))
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`
}

/**
 * Comble les mois sans ouverture de l'app, jusqu'à `month` inclus, avec le dernier instantané
 * marqué « reconduit ». Sans historique, le mois reçoit les données actuelles. Ne réécrit rien.
 */
export function carryForward(data: AppData, month: string): AppData {
  const [last, latest] =
    Object.entries(data.history)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .at(-1) ?? []
  if (!last || !latest) return { ...data, history: { [month]: snapshotOf(data) } }
  if (last >= month) return data
  const history = { ...data.history }
  const source = { ...latest, carried: true as const }
  for (let m = nextMonth(last); m <= month; m = nextMonth(m)) history[m] = source
  return { ...data, history }
}

/**
 * À chaque sauvegarde : le mois courant prend l'instantané des données (donc perd « reconduit »).
 * Les mois passés ne sont jamais réécrits ; ceux qui manquent sont reconduits d'abord.
 */
export function recordMonth(data: AppData, month: string): AppData {
  const filled = carryForward(data, month)
  return { ...filled, history: { ...filled.history, [month]: snapshotOf(filled) } }
}

/** Les champs d'une charge qui comptent pour une comparaison, dans l'ordre d'affichage. */
const CHARGE_FIELDS = ['label', 'amount', 'frequency', 'paidFrom', 'categoryId'] as const
export type ChargeField = (typeof CHARGE_FIELDS)[number]

export interface MonthDiff {
  /** T du mois − T du mois précédent, en centimes. */
  totalDelta: number
  added: Charge[]
  removed: Charge[]
  changed: { before: Charge; after: Charge; fields: ChargeField[] }[]
}

/** Ce qui change entre deux mois ; chaque T se calcule avec le foyer de son instantané. */
export function compareMonths(previous: Snapshot, month: Snapshot): MonthDiff {
  const before = new Map(previous.charges.map((c) => [c.id, c]))
  const after = new Map(month.charges.map((c) => [c.id, c]))
  return {
    totalDelta:
      computeSplit(month.household, month.charges).total -
      computeSplit(previous.household, previous.charges).total,
    added: month.charges.filter((c) => !before.has(c.id)),
    removed: previous.charges.filter((c) => !after.has(c.id)),
    changed: month.charges.flatMap((c) => {
      const old = before.get(c.id)
      const fields = old ? CHARGE_FIELDS.filter((f) => old[f] !== c[f]) : []
      return old && fields.length > 0 ? [{ before: old, after: c, fields }] : []
    }),
  }
}
