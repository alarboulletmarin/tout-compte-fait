import type { AccountRef, Charge, Frequency, Household, MemberIndex } from './types'

type Pair = readonly [number, number]

export interface Split {
  /** T : total mensuel des charges. */
  total: number
  /** J : part de T payée par le compte joint. */
  joint: number
  /** Parts de chacun, entre 0 et 1. */
  shares: Pair
  /** Vrai si un revenu manque ou vaut 0 : la répartition passe à 50 / 50. */
  equalFallback: boolean
  due: Pair
  /** Payé en direct depuis le compte perso. */
  paid: Pair
  /** v_i = dû_i − payé_i, négatif si le membre paie déjà plus que sa part. Σ = J. */
  balance: Pair
  /** Ce que chacun vire réellement sur le joint, jamais négatif. Σ = J. */
  toJoint: Pair
  /** Remboursement direct d'un membre à l'autre, quand un solde est négatif. */
  reimbursement: { from: MemberIndex; to: MemberIndex; amount: number } | null
}

export const MONTHS: Record<Frequency, number> = { monthly: 1, quarterly: 3, yearly: 12 }

const BUCKET = { joint: 0, member1: 1, member2: 2 } as const satisfies Record<AccountRef, number>

export function computeSplit(household: Household, charges: readonly Charge[]): Split {
  // En douzièmes de centime : exact pour les trois fréquences, un seul arrondi à la fin
  const twelfths: [bigint, bigint, bigint] = [0n, 0n, 0n]
  for (const c of charges) {
    assertCents(c.amount, `montant de « ${c.label} »`)
    twelfths[BUCKET[c.paidFrom]] += BigInt(c.amount) * BigInt(12 / MONTHS[c.frequency])
  }
  const total = (twelfths[0] + twelfths[1] + twelfths[2] + 6n) / 12n // au plus proche, demi vers le haut
  // Joint et comptes perso arrondis ensemble pour que J + payé_1 + payé_2 = T
  const [joint, paid1, paid2] = largestRemainder(twelfths, 12n, total)

  const [m1, m2] = household.members
  if (m1.income !== null) assertCents(m1.income, 'revenu du membre 1')
  if (m2.income !== null) assertCents(m2.income, 'revenu du membre 2')
  const i1 = m1.income ?? 0
  const i2 = m2.income ?? 0
  const equalFallback = i1 === 0 || i2 === 0
  const [w1, w2] = equalFallback ? [1n, 1n] : [BigInt(i1), BigInt(i2)]
  const [due1, due2] = largestRemainder([total * w1, total * w2] as const, w1 + w2, total)

  const due: Pair = [due1, due2]
  const paid: Pair = [paid1, paid2]
  const balance: Pair = [due1 - paid1, due2 - paid2]

  let toJoint: Pair = balance
  let reimbursement: Split['reimbursement'] = null
  // Σ balance = J ≥ 0 : au plus un solde est négatif
  if (balance[0] < 0) {
    toJoint = [0, joint]
    reimbursement = { from: 1, to: 0, amount: -balance[0] }
  } else if (balance[1] < 0) {
    toJoint = [joint, 0]
    reimbursement = { from: 0, to: 1, amount: -balance[1] }
  }

  return {
    total: Number(total),
    joint,
    shares: equalFallback ? [0.5, 0.5] : [i1 / (i1 + i2), i2 / (i1 + i2)],
    equalFallback,
    due,
    paid,
    balance,
    toJoint,
    reimbursement,
  }
}

/**
 * Arrondit chaque n_i / d à l'entier, avec Σ = total exactement (plus fort reste).
 * À reste égal, le premier indice l'emporte : le joint, puis le membre 1.
 */
function largestRemainder<T extends readonly bigint[]>(
  numerators: T,
  d: bigint,
  total: bigint,
): { -readonly [K in keyof T]: number } {
  const leftover = total - numerators.reduce((sum, n) => sum + n / d, 0n)
  if (leftover < 0n || leftover > BigInt(numerators.length)) {
    throw new Error('largestRemainder : total incohérent')
  }
  const bumped = numerators
    .map((n, i) => ({ i, r: n % d }))
    .sort((a, b) => (a.r === b.r ? a.i - b.i : a.r > b.r ? -1 : 1))
    .slice(0, Number(leftover))
    .map(({ i }) => i)
  return numerators.map((n, i) => Number(n / d) + (bumped.includes(i) ? 1 : 0)) as {
    -readonly [K in keyof T]: number
  }
}

function assertCents(value: number, what: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${what} : centimes entiers positifs attendus, reçu ${value}`)
  }
}
