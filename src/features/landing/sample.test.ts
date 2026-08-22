import { describe, expect, it } from 'vitest'
import { type Money, add, sum } from '@/domain/money'
import { SAMPLE } from './sample'

/**
 * La présentation montre désormais le calcul, pas seulement son résultat : le
 * prorata, le report du mois précédent et la cascade de la capacité y sont posés
 * à côté de la grille qu'ils produisent. Des chiffres qui ne se recomposent pas
 * ne s'y verraient donc plus comme une approximation d'exemple, mais comme une
 * erreur de calcul — sur la page dont l'argument est justement que le calcul se
 * vérifie.
 *
 * Personne ne relira ces montants en diagonale le jour où l'un d'eux bougera.
 * Ce fichier-ci le fera.
 */
describe('Les chiffres du foyer d’exemple', () => {
  const shares = SAMPLE.shares
  const toPay = (share: (typeof shares)[number]): Money => add(share.due, share.adjustment)

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

  /* L'invariant que la ligne de vérification met à l'écran, et la seule raison
     pour laquelle elle prouve quelque chose : les reports se compensent d'un
     membre à l'autre, donc la somme des versements vaut encore le total malgré
     la régularisation. Un report unilatéral ferait mentir la ligne. */
  it('laisse la somme des versements égale au total, report compris', () => {
    expect(sum(shares.map(toPay))).toBe(SAMPLE.shared)
    expect(sum(shares.map((share) => share.adjustment))).toBe(0)
  })

  /* Ce qui change de poche est la part de l'*autre* : celui qui a avancé
     portait déjà la sienne. La phrase sous la liste annonce le montant avancé,
     et le report doit en découler. */
  it('ne rend que la part de l’autre sur ce qui a été avancé', () => {
    const advancer = shares.find((share) => share.adjustment < 0)
    expect(advancer).toBeDefined()
    const others = shares.filter((share) => share !== advancer)
    const owed = others.reduce((total, share) => total + SAMPLE.advanced * (share.percent / 100), 0)
    expect(owed + (advancer?.adjustment ?? 0)).toBe(0)
  })
})
