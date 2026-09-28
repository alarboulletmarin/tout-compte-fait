import { memberAccount } from './types'
import type { Charge, Frequency, Household } from './types'
import { at } from './at'

/** Un virement direct d'un membre à un autre, en centimes (> 0). */
export interface Reimbursement {
  from: number
  to: number
  amount: number
}

/** Tous les tableaux sont indexés comme `household.members`. */
export interface Split {
  /** T : total mensuel des charges. */
  total: number
  /** J : part de T payée par le compte joint. */
  joint: number
  /** Parts de chacun, entre 0 et 1, de somme 1. */
  shares: readonly number[]
  /** Vrai si un revenu manque ou vaut 0 : la répartition passe à parts égales. */
  equalFallback: boolean
  due: readonly number[]
  /** Payé en direct depuis le compte perso. */
  paid: readonly number[]
  /** v_i = dû_i − payé_i, négatif si le membre paie déjà plus que sa part (créditeur). Σ = J. */
  balance: readonly number[]
  /** Ce que chacun vire réellement sur le joint, jamais négatif. Σ = J. */
  toJoint: readonly number[]
  /** Ce que les débiteurs virent directement aux créditeurs. Σ = Σ|v créditeurs|. */
  reimbursements: readonly Reimbursement[]
}

export const MONTHS: Record<Frequency, number> = { monthly: 1, quarterly: 3, yearly: 12 }

/** Équivalent mensuel d'une charge, arrondi au centime : pour l'affichage d'une ligne seulement. */
export const monthlyAmount = (charge: Charge): number =>
  Math.round(charge.amount / MONTHS[charge.frequency])

/** Indices des membres qui paient déjà plus que leur part. */
export const creditors = (split: Split): number[] =>
  split.balance.flatMap((v, i) => (v < 0 ? [i] : []))

/** Indices de tous les autres : ceux qui virent au joint (et remboursent les créditeurs). */
export const debtors = (split: Split): number[] =>
  split.balance.flatMap((v, i) => (v >= 0 ? [i] : []))

export function computeSplit(household: Household, charges: readonly Charge[]): Split {
  const { members } = household
  // Seaux : 0 = joint, 1 + i = compte du membre i
  const bucket = new Map<string, number>([['joint', 0]])
  members.forEach((m, i) => bucket.set(memberAccount(m.id), i + 1))

  // En douzièmes de centime : exact pour les trois fréquences, un seul arrondi à la fin
  const twelfths: bigint[] = Array<bigint>(members.length + 1).fill(0n)
  for (const c of charges) {
    assertCents(c.amount, `montant de « ${c.label} »`)
    const index = bucket.get(c.paidFrom)
    if (index === undefined) throw new RangeError(`« ${c.label} » : compte inconnu ${c.paidFrom}`)
    twelfths[index] = at(twelfths, index) + BigInt(c.amount) * BigInt(12 / MONTHS[c.frequency])
  }
  const total = (twelfths.reduce((sum, n) => sum + n, 0n) + 6n) / 12n // au plus proche, demi vers le haut
  // Joint et comptes perso arrondis ensemble pour que J + Σ payé = T
  const [joint = 0, ...paid] = largestRemainder(twelfths, 12n, total)

  const incomes = members.map((m, i) => {
    if (m.income !== null) assertCents(m.income, `revenu du membre ${i + 1}`)
    return m.income ?? 0
  })
  const equalFallback = incomes.some((income) => income === 0)
  const weights = incomes.map((income) => (equalFallback ? 1n : BigInt(income)))
  const weightSum = weights.reduce((sum, w) => sum + w, 0n)
  const due = largestRemainder(
    weights.map((w) => total * w),
    weightSum,
    total,
  )
  const balance = due.map((d, i) => d - at(paid, i))

  return {
    total: Number(total),
    joint,
    shares: weights.map((w) => Number(w) / Number(weightSum)),
    equalFallback,
    due,
    paid,
    balance,
    ...settle(balance, joint),
  }
}

/**
 * Les v < 0 sont créditeurs. Les débiteurs virent J au total sur le joint et C = Σ|v créditeurs|
 * directement aux créditeurs. C est réparti entre débiteurs au prorata de leur v (plus fort reste),
 * puis versé aux créditeurs dans l'ordre des indices.
 */
function settle(balance: readonly number[], joint: number) {
  const owed = balance.map((v) => Math.max(0, -v)) // ce que chaque créditeur doit recevoir
  const credit = owed.reduce((sum, n) => sum + n, 0)
  if (credit === 0) return { toJoint: balance, reimbursements: [] }

  // Σ v des débiteurs = J + C > 0
  const debts = balance.map((v) => BigInt(Math.max(0, v)))
  const share = largestRemainder(
    debts.map((v) => BigInt(credit) * v),
    BigInt(joint + credit),
    BigInt(credit),
  )
  const toJoint = balance.map((v, i) => Math.max(0, v) - at(share, i))

  const reimbursements: Reimbursement[] = []
  const remaining = [...owed]
  let to = 0
  share.forEach((left, from) => {
    while (left > 0) {
      while (remaining[to] === 0) to++
      const amount = Math.min(left, at(remaining, to))
      reimbursements.push({ from, to, amount })
      remaining[to] = at(remaining, to) - amount
      left -= amount
    }
  })
  return { toJoint, reimbursements }
}

/**
 * Arrondit chaque n_i / d à l'entier, avec Σ = total exactement (plus fort reste).
 * À reste égal, le plus petit indice l'emporte : le joint, puis le membre 1.
 */
function largestRemainder(numerators: readonly bigint[], d: bigint, total: bigint): number[] {
  const leftover = total - numerators.reduce((sum, n) => sum + n / d, 0n)
  if (leftover < 0n || leftover > BigInt(numerators.length)) {
    throw new Error('largestRemainder : total incohérent')
  }
  const bumped = numerators
    .map((n, i) => ({ i, r: n % d }))
    .sort((a, b) => (a.r === b.r ? a.i - b.i : a.r > b.r ? -1 : 1))
    .slice(0, Number(leftover))
    .map(({ i }) => i)
  return numerators.map((n, i) => Number(n / d) + (bumped.includes(i) ? 1 : 0))
}

function assertCents(value: number, what: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${what} : centimes entiers positifs attendus, reçu ${value}`)
  }
}
