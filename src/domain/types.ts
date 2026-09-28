// Tous les montants sont en centimes entiers.

export type Frequency = 'monthly' | 'quarterly' | 'yearly'

export const MIN_MEMBERS = 2
export const MAX_MEMBERS = 6

/** « joint » ou « m:<id du membre> » : le compte perso d'un membre. */
export type AccountRef = 'joint' | `m:${string}`

export const memberAccount = (memberId: string): AccountRef => `m:${memberId}`

export interface Member {
  /** Stable : les charges y font référence. */
  id: string
  name: string
  /** Revenu net mensuel ; null tant qu'il n'est pas renseigné. */
  income: number | null
}

export interface Household {
  /** De MIN_MEMBERS à MAX_MEMBERS. */
  members: readonly Member[]
}

export interface Category {
  id: string
  name: string
}

export interface Charge {
  id: string
  label: string
  amount: number
  frequency: Frequency
  paidFrom: AccountRef
  /** null = « Sans catégorie ». */
  categoryId: string | null
}
