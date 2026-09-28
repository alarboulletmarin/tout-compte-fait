import { memberAccount, type AccountRef } from '../domain/types'
import { useI18n } from '../i18n/i18n'
import { useStore } from '../storage/store'
import { at } from '../domain/at'

/** Prénoms du foyer, avec « Membre 1 / 2… » tant qu'ils sont vides. */
export function useNames(): string[] {
  const { t } = useI18n()
  return useStore().data.household.members.map((m, i) => m.name.trim() || t.memberFallback(i))
}

/** Un compte où l'on peut payer une charge : le joint, puis celui de chaque membre. */
export interface Account {
  ref: AccountRef
  /** Pour la forme : « joint » ou l'indice du membre. */
  who: 'joint' | number
  /** Prénom du membre ; vide pour le joint. */
  name: string
}

export function useAccounts(): Account[] {
  const names = useNames()
  const { members } = useStore().data.household
  return [
    { ref: 'joint', who: 'joint', name: '' },
    ...members.map((m, i) => ({ ref: memberAccount(m.id), who: i, name: at(names, i) })),
  ]
}

/** Les comptes avec leur titre de liste (« Compte joint », « Compte de Sam ») et leur total mensuel. */
export function useAccountTotals() {
  const { t } = useI18n()
  const { split } = useStore()
  return useAccounts().map((a) => ({
    ...a,
    title: a.who === 'joint' ? t.charges.joint : t.charges.accountOf(a.name),
    subtotal: a.who === 'joint' ? split.joint : at(split.paid, a.who),
  }))
}

export const insertAt = <T>(items: readonly T[], index: number, item: T): T[] => [
  ...items.slice(0, index),
  item,
  ...items.slice(index),
]
