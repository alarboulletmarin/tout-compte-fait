// Tous les montants sont en centimes entiers.

export type Frequency = 'monthly' | 'quarterly' | 'yearly'

export type MemberIndex = 0 | 1

export type AccountRef = 'joint' | 'member1' | 'member2'

export interface Member {
  name: string
  /** Revenu net mensuel ; null tant qu'il n'est pas renseigné. */
  income: number | null
}

export interface Household {
  members: readonly [Member, Member]
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
