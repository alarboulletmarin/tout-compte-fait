import { describe, expect, it } from 'vitest'
import { type Money, add, sub, sum } from '@/domain/money'
import { SAMPLE } from './sample'

/**
 * La présentation montre désormais le calcul, pas seulement son résultat : le
 * prorata, la déduction de ce qui a été avancé et la cascade de la capacité y
 * sont posés à côté de la grille qu'ils produisent. Des chiffres qui ne se
 * recomposent pas ne s'y verraient donc plus comme une approximation d'exemple,
 * mais comme une erreur de calcul — sur la page dont l'argument est justement
 * que le calcul se vérifie.
 *
 * Personne ne relira ces montants en diagonale le jour où l'un d'eux bougera.
 * Ce fichier-ci le fera.
 */
describe('Les chiffres du foyer d’exemple', () => {
  const shares = SAMPLE.shares
  const toPay = (share: (typeof shares)[number]): Money => sub(share.due, share.advanced)

  it('donne au mois prévu la somme de ses charges et de ses crédits', () => {
    expect(add(SAMPLE.charges, SAMPLE.debtMonthly)).toBe(SAMPLE.monthForecast)
  })

  /* La cascade que `LandingProof` affiche, terme par terme. Elle est aussi la
     lecture secondaire de la vraie tuile : « ressources − charges − crédits ». */
  it('dégage la capacité d’épargne annoncée', () => {
    const capacity = SAMPLE.income - SAMPLE.charges - SAMPLE.debtMonthly
    expect(capacity).toBe(SAMPLE.savingCapacity)
  })

  /* La tuile du prévisionnel, en tête de la présentation. Elle affiche un
     solde attendu, pas une capacité d'épargne : les deux valent le même
     chiffre sur ce foyer-ci — il n'y verse rien — et l'égalité doit rester une
     conséquence des termes, jamais une valeur recopiée. */
  it('laisse le prévisionnel valoir le revenu moins tout ce qui est prévu', () => {
    expect(SAMPLE.income - SAMPLE.monthForecast).toBe(SAMPLE.forecast)
  })

  /* La ligne du mécanisme est la seule de la page à ne se recomposer avec
     rien : c'est une ligne parmi les charges, pas un total. Ce qu'elle doit
     tenir est plus simple, et c'est tout ce que la tuile raconte — le réel
     dépasse le prévu, et il tient dans l'enveloppe des charges. */
  it('montre une ligne qui a coûté plus que prévu, sans sortir des charges', () => {
    expect(SAMPLE.electricityReal).toBeGreaterThan(SAMPLE.electricityPlanned)
    expect(SAMPLE.electricityReal).toBeLessThan(SAMPLE.charges)
  })

  it('répartit exactement le revenu du foyer entre ses membres', () => {
    expect(sum(shares.map((share) => share.income))).toBe(SAMPLE.income)
  })

  /* Le prorata affiché doit être celui des revenus affichés : c'est tout ce que
     la tuile prétend démontrer, et un pourcentage arrondi à la main ne le
     démontrerait pas. */
  it('donne à chacun la part que son revenu lui vaut', () => {
    for (const share of shares) {
      expect(share.income / SAMPLE.income).toBeCloseTo(share.percent / 100, 10)
    }
  })

  it('découpe le pot commun sans perdre ni inventer un centime', () => {
    expect(sum(shares.map((share) => share.due))).toBe(SAMPLE.shared)
  })

  /* L'invariant que la seconde ligne de vérification met à l'écran, et la
     seule raison pour laquelle elle prouve quelque chose : ce qui est déjà
     sorti se déduit des virements, donc leur somme vaut le pot moins ce qui a
     été avancé — qui a réglé la facture ne la paie pas deux fois. */
  it('laisse la somme des virements valoir le pot moins ce qui est avancé', () => {
    expect(sum(shares.map(toPay))).toBe(sub(SAMPLE.shared, SAMPLE.advanced))
  })

  /* La phrase sous la liste annonce le montant avancé : il doit être celui qui
     se déduit, en entier, du virement de qui l'a réglé — et de lui seul. */
  it('déduit tout ce qui a été avancé, du seul virement de qui l’a réglé', () => {
    expect(sum(shares.map((share) => share.advanced))).toBe(SAMPLE.advanced)
    expect(shares.filter((share) => share.advanced > 0)).toHaveLength(1)
    const advancer = shares.find((share) => share.advanced > 0)
    expect(add(toPay(advancer ?? shares[0]), SAMPLE.advanced)).toBe(advancer?.due)
  })
})
