import { useI18n } from '../i18n/i18n'
import { useStore } from '../storage/store'

/** Prénoms du foyer, avec « Membre 1 / 2 » tant qu'ils sont vides. */
export function useNames(): [string, string] {
  const { t } = useI18n()
  const [m1, m2] = useStore().data.household.members
  return [m1.name.trim() || t.memberFallback(0), m2.name.trim() || t.memberFallback(1)]
}

export const insertAt = <T>(items: readonly T[], index: number, item: T): T[] => [
  ...items.slice(0, index),
  item,
  ...items.slice(index),
]

export const MEMBERS = [0, 1] as const
