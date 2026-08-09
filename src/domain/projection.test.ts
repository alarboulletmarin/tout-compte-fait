import { describe, expect, it } from 'vitest'
import { eur } from './fixtures'
import { ZERO } from './money'
import { monthlyRate, projectSeries } from './projection'

/** Le dernier point d'une série — ce que l'écran appelle « à l'arrivée ». */
const at = (values: readonly number[], month: number): number => values[month] ?? Number.NaN

describe('taux mensuel', () => {
  it('est la racine douzième, jamais le douzième', () => {
    // 11 % annuels : 0,8735 % par mois, et non 0,9167 %.
    expect(monthlyRate(1100)).toBeCloseTo(0.008734593, 8)
    expect(monthlyRate(1100)).not.toBeCloseTo(0.11 / 12, 5)
  })

  it('redonne exactement le taux annoncé après douze capitalisations', () => {
    // C'est la définition, et c'est ce que `r/12` ne fait pas : à 11 %, le taux
    // proportionnel capitalisé douze fois rend 11,57 %.
    expect(Math.pow(1 + monthlyRate(1100), 12) - 1).toBeCloseTo(0.11, 12)
    expect(Math.pow(1 + 0.11 / 12, 12) - 1).toBeGreaterThan(0.115)
  })

  it('rend zéro sur un taux nul, sans cas particulier', () => {
    expect(monthlyRate(0)).toBe(0)
  })

  it('ne rend jamais NaN sous une saisie aberrante', () => {
    expect(Number.isFinite(monthlyRate(-999_999))).toBe(true)
  })
})

describe('projection', () => {
  /**
   * Le vecteur de référence du cahier, tiré d'un simulateur du marché :
   * 250 €/mois, 11 % annuels, 20 ans → ≈ 202 k€.
   *
   * Il vaut moins pour son chiffre que pour ce qu'il fixe : c'est lui qui
   * confirme la convention de fin de mois — un versement en début de mois
   * donnerait 203,9 k€ — et il se rejoue à la main,
   * `P·((1+i)²⁴⁰ − 1)/i` avec `i = 1,11^(1/12) − 1`, soit 25 000 × 808,545.
   */
  it('rejoint le vecteur de référence du marché', () => {
    const { balance } = projectSeries({
      initial: eur(0),
      monthly: eur(25_000),
      months: 240,
      rateBp: 1100,
    })
    expect(at(balance, 240)).toBeCloseTo(20_213_625, -1)
    // Ce que l'écran arrondira : « ≈ 202 k€ », jamais 202 136,25 €.
    expect(Math.round(at(balance, 240) / 100_000)).toBe(202)
  })

  it('reste très en dessous de ce que rendrait un taux proportionnel', () => {
    const { balance } = projectSeries({
      initial: eur(0),
      monthly: eur(25_000),
      months: 240,
      rateBp: 1100,
    })
    // Le même calcul mené en `r/12`, écrit ici pour que l'écart se voie.
    const naive = 25_000 * ((Math.pow(1 + 0.11 / 12, 240) - 1) / (0.11 / 12))
    expect(naive - at(balance, 240)).toBeGreaterThan(1_000_000)
  })

  it('porte un point par mois, le départ compris', () => {
    const { balance, contributed } = projectSeries({
      initial: eur(100_000),
      monthly: eur(10_000),
      months: 24,
      rateBp: 300,
    })
    expect(balance).toHaveLength(25)
    expect(contributed).toHaveLength(25)
    expect(at(balance, 0)).toBe(100_000)
    expect(at(contributed, 0)).toBe(100_000)
  })

  it('ne fait produire aucun intérêt au versement du mois où il tombe', () => {
    // La convention de fin de mois, prise sur le fait : après un mois, on a
    // exactement versé, et rien de plus.
    const { balance } = projectSeries({
      initial: eur(0),
      monthly: eur(10_000),
      months: 1,
      rateBp: 1000,
    })
    expect(at(balance, 1)).toBe(10_000)
  })

  it('fait en revanche capitaliser le capital initial dès le premier mois', () => {
    const { balance } = projectSeries({
      initial: eur(1_000_000),
      monthly: eur(0),
      months: 12,
      rateBp: 1000,
    })
    expect(at(balance, 12)).toBe(1_100_000)
  })

  it('à taux nul, n’est qu’une addition', () => {
    const { balance, contributed } = projectSeries({
      initial: eur(50_000),
      monthly: eur(20_000),
      months: 36,
      rateBp: 0,
    })
    expect(at(balance, 36)).toBe(50_000 + 20_000 * 36)
    expect(at(contributed, 36)).toBe(at(balance, 36))
  })

  it('sépare ce qu’on a mis de ce que le taux a produit', () => {
    const { balance, contributed } = projectSeries({
      initial: eur(0),
      monthly: eur(25_000),
      months: 240,
      rateBp: 1100,
    })
    expect(at(contributed, 240)).toBe(25_000 * 240)
    // Les intérêts, c'est-à-dire l'écart entre les deux séries.
    expect(at(balance, 240) - at(contributed, 240)).toBeGreaterThan(14_000_000)
  })

  it('ne rend que des entiers de centimes', () => {
    const { balance, contributed } = projectSeries({
      initial: eur(123_456),
      monthly: eur(7_891),
      months: 97,
      rateBp: 437,
    })
    expect(balance.every(Number.isInteger)).toBe(true)
    expect(contributed.every(Number.isInteger)).toBe(true)
  })
})

describe('euros constants', () => {
  it('laisse un capital immobile quand le taux ne fait que suivre l’inflation', () => {
    const { balance } = projectSeries({
      initial: eur(1_000_000),
      monthly: eur(0),
      months: 120,
      rateBp: 200,
      inflationBp: 200,
    })
    expect(at(balance, 120)).toBe(1_000_000)
    expect(at(balance, 60)).toBe(1_000_000)
  })

  it('déflate chaque versement à sa date, jamais leur somme à la fin', () => {
    const nominal = projectSeries({
      initial: eur(0),
      monthly: eur(10_000),
      months: 120,
      rateBp: 0,
    })
    const constant = projectSeries({
      initial: eur(0),
      monthly: eur(10_000),
      months: 120,
      rateBp: 0,
      inflationBp: 200,
    })

    const paid = at(nominal.contributed, 120)
    expect(at(constant.contributed, 120)).toBeLessThan(paid)
    /* La déflation de la somme entière serait bien plus sévère : elle
       traiterait le versement du premier mois comme s'il avait attendu dix ans
       pour être fait. */
    expect(at(constant.contributed, 120)).toBeGreaterThan(paid / Math.pow(1.02, 10))
  })

  it('ne change rien quand l’inflation est nulle', () => {
    const input = { initial: eur(200_000), monthly: eur(15_000), months: 60, rateBp: 400 }
    expect(projectSeries({ ...input, inflationBp: 0 })).toEqual(projectSeries(input))
  })
})

describe('cadence des versements', () => {
  /* Le même effort annuel, versé de trois façons : mensuellement, par trimestre,
     une fois l'an. Les trois mettent 1 200 € par an et n'arrivent pas au même
     endroit — c'est exactement ce qu'on vient vérifier en changeant la cadence,
     et ce qu'un amortissement au mois (cahier §4.2) effacerait. */
  const decade = { initial: eur(0), months: 120, rateBp: 400 }

  it('verse la même chose en tout, quelle que soit la cadence', () => {
    const monthly = projectSeries({ ...decade, monthly: eur(10_000) })
    const quarterly = projectSeries({ ...decade, monthly: eur(30_000), everyMonths: 3 })
    const yearly = projectSeries({ ...decade, monthly: eur(120_000), everyMonths: 12 })

    expect(at(monthly.contributed, 120)).toBe(1_200_000)
    expect(at(quarterly.contributed, 120)).toBe(1_200_000)
    expect(at(yearly.contributed, 120)).toBe(1_200_000)
  })

  it('rend moins à mesure que la cadence s’espace, à effort égal', () => {
    const monthly = projectSeries({ ...decade, monthly: eur(10_000) })
    const quarterly = projectSeries({ ...decade, monthly: eur(30_000), everyMonths: 3 })
    const yearly = projectSeries({ ...decade, monthly: eur(120_000), everyMonths: 12 })

    /* 1 200 € posés au douzième mois n'ont produit d'intérêts sur rien pendant
       onze mois : la cadence annuelle arrive donc en dessous, et jamais
       au-dessus. */
    expect(at(quarterly.balance, 120)).toBeLessThan(at(monthly.balance, 120))
    expect(at(yearly.balance, 120)).toBeLessThan(at(quarterly.balance, 120))
  })

  it('ne verse rien avant la première échéance, et le capital croît quand même', () => {
    const yearly = projectSeries({
      initial: eur(1_000_000),
      monthly: eur(120_000),
      months: 12,
      rateBp: 400,
      everyMonths: 12,
    })

    // Onze rangs sans versement : le versé ne bouge pas du capital de départ.
    expect(at(yearly.contributed, 11)).toBe(1_000_000)
    // Le capital, lui, a couru : c'est toute la différence avec une pause.
    expect(at(yearly.balance, 11)).toBeGreaterThan(1_000_000)
    expect(at(yearly.contributed, 12)).toBe(1_120_000)
  })

  it('lit une cadence absente, nulle ou fractionnaire comme le mois', () => {
    const base = { initial: eur(0), monthly: eur(10_000), months: 24, rateBp: 300 }
    const plain = projectSeries(base)
    expect(projectSeries({ ...base, everyMonths: 1 })).toEqual(plain)
    expect(projectSeries({ ...base, everyMonths: 0 })).toEqual(plain)
    expect(projectSeries({ ...base, everyMonths: 1.6 })).toEqual(plain)
  })

  it('respecte le plafond du contrat sur une cadence espacée', () => {
    /* La place restante s'écrête au versement, pas au mois : trois échéances de
       500 € sur une place de 1 200 € en laissent passer deux pleines et une
       rognée. */
    const capped = projectSeries({
      initial: eur(0),
      monthly: eur(50_000),
      months: 36,
      rateBp: 0,
      everyMonths: 12,
      room: 120_000,
    })
    expect(at(capped.contributed, 36)).toBe(120_000)
  })
})

/* ============================================================================
 * Le barème — un taux par mois, quand il change en cours de route.
 *
 * Un scalaire est le cas particulier d'un barème plat, et c'est ce que ces
 * tests protègent : il n'y a pas deux moteurs, il y en a un dont l'un des
 * arguments peut varier (cahier §4.6 ter).
 * ==========================================================================*/

describe('un taux qui change en cours de route', () => {
  const base = { initial: eur(1_000_000), monthly: eur(20_000), months: 24 }

  it('rend exactement la série du scalaire quand le barème est plat', () => {
    const flat = Array.from({ length: base.months }, () => 400)
    expect(projectSeries({ ...base, rateBp: flat })).toEqual(
      projectSeries({ ...base, rateBp: 400 }),
    )
  })

  it('ne touche aucun point avant le rang où le taux change', () => {
    /* La propriété qui a fait exister le taux daté : poser un palier pour
       l'an prochain ne réécrit pas l'année en cours. */
    const changing = Array.from({ length: base.months }, (_, month) => (month < 12 ? 400 : 100))
    const constant = projectSeries({ ...base, rateBp: 400 })
    const stepped = projectSeries({ ...base, rateBp: changing })

    expect(stepped.balance.slice(0, 13)).toEqual(constant.balance.slice(0, 13))
    expect(stepped.balance[24]).toBeLessThan(constant.balance[24] ?? 0)
  })

  it('équivaut à deux projections enchaînées', () => {
    const first = projectSeries({ ...base, months: 12, rateBp: 400 })
    const second = projectSeries({
      initial: first.balance[12] ?? ZERO,
      monthly: base.monthly,
      months: 12,
      rateBp: 100,
    })
    const stepped = projectSeries({
      ...base,
      rateBp: Array.from({ length: 24 }, (_, month) => (month < 12 ? 400 : 100)),
    })
    /* À l'euro près : la chaîne arrondit une fois de plus que le barème, qui
       garde ses flottants d'un bout à l'autre. */
    expect(Math.abs((stepped.balance[24] ?? 0) - (second.balance[12] ?? 0))).toBeLessThanOrEqual(1)
  })

  it('tient son dernier terme jusqu’au bout de l’horizon', () => {
    const short = projectSeries({ ...base, rateBp: [400] })
    expect(short).toEqual(projectSeries({ ...base, rateBp: 400 }))
  })

  it('lit un barème vide comme un taux nul, sans casser la série', () => {
    const empty = projectSeries({ ...base, rateBp: [] })
    expect(empty).toEqual(projectSeries({ ...base, rateBp: 0 }))
  })
})

/* ============================================================================
 * Le plafond de versements.
 *
 * Il porte sur ce qui est **versé**, jamais sur le solde : un Livret A plein
 * continue de rapporter, et une courbe qui s'arrêterait à plat au plafond
 * dirait l'inverse de ce qui se passe.
 * ==========================================================================*/

describe('un plafond de versements', () => {
  const base = { initial: eur(0), monthly: eur(10_000), months: 12, rateBp: 0 }

  it('ne borne rien tant qu’il n’est pas posé', () => {
    expect(projectSeries(base).balance.at(-1)).toBe(120_000)
  })

  it('arrête les versements quand la place est faite', () => {
    // 100 €/mois, 350 € de place : trois versements pleins, puis un écrêté.
    const capped = projectSeries({ ...base, room: 35_000 })
    expect(capped.balance.at(-1)).toBe(35_000)
    expect(capped.contributed.at(-1)).toBe(35_000)
  })

  it('écrête le dernier versement au lieu de le refuser en entier', () => {
    const capped = projectSeries({ ...base, months: 1, room: 4_000 })
    expect(capped.balance.at(-1)).toBe(4_000)
  })

  it('laisse le capital croître une fois le plafond atteint', () => {
    /* La règle qui fait tout : les versements s'arrêtent, le capital non. */
    const capped = projectSeries({ ...base, initial: eur(100_000), rateBp: 1_000, room: 0 })
    expect(capped.balance.at(-1)).toBeGreaterThan(100_000)
    // Et rien n'a été versé : le versé cumulé reste le capital de départ.
    expect(capped.contributed.at(-1)).toBe(100_000)
  })

  it('lit une place nulle comme un compte plein, sans cas particulier', () => {
    expect(projectSeries({ ...base, room: 0 }).contributed.at(-1)).toBe(0)
  })

  it('ne borne pas une reprise : on ne plafonne pas ce qui sort', () => {
    const draining = projectSeries({ ...base, initial: eur(1_000_000), monthly: eur(-10_000), room: 0 })
    expect(draining.balance.at(-1)).toBe(1_000_000 - 12 * 10_000)
  })

  it('ne se déflate pas avec l’inflation : un plafond est un nombre de contrat', () => {
    /* Le plafond vaut 22 950 € dans le contrat, quels que soient les euros dans
       lesquels on lit la courbe. */
    const courants = projectSeries({ ...base, room: 35_000 })
    const constants = projectSeries({ ...base, room: 35_000, inflationBp: 200 })
    // Même nombre de versements écrêtés : seule la lecture change.
    expect(constants.contributed.at(-1)).toBeLessThan(courants.contributed.at(-1) ?? 0)
    expect(constants.balance.at(-1)).toBeLessThan(courants.balance.at(-1) ?? 0)
  })
})
