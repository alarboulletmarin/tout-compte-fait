/* ============================================================================
 * Ce qu'un objectif conclut — et surtout ce qu'il refuse de conclure.
 *
 * Le fichier tient trois choses. Que le verdict soit **juste** : l'écart avec
 * l'échéance est le seul chiffre que ni la banque ni un tableur ne produisent
 * sans travail, et un écart faux vaut moins que pas d'écart du tout. Qu'il ne
 * **flatte jamais** : un compte sans taux est projeté à 0 %, donc l'arrivée
 * annoncée est plus tardive que la réalité probable, et jamais l'inverse. Et
 * qu'il se **taise** quand il ne sait pas, au lieu d'écrire un nombre.
 * ==========================================================================*/

import { describe, expect, it } from 'vitest'
import {
  eur,
  makeEntry,
  makeRecurrence,
  makeSavingGoal,
  makeSavingRate,
  makeSavingSupport,
  makeSavingValuation,
} from './fixtures'
import { activeGoals, goalBasis, goalsOfMember, goalsUsingSupport, readGoal } from './goal'
import type { Entry, Recurrence, SavingRate, SavingSupport, SavingValuation } from './types'

const ON = '2026-01-15'

type Doc = {
  supports: SavingSupport[]
  valuations: SavingValuation[]
  entries: Entry[]
  recurrences: Recurrence[]
  rates: SavingRate[]
}

/** Un livret relevé à 10 000 €, alimenté de 200 € par mois, sans taux posé. */
function doc(over: Partial<Doc> = {}): Doc {
  return {
    supports: [makeSavingSupport({ id: 's-1', memberId: 'm-1', label: 'Livret A' })],
    valuations: [
      makeSavingValuation({ id: 'v-1', supportId: 's-1', amount: eur(1_000_000), date: '2026-01-01' }),
    ],
    entries: [],
    recurrences: [
      makeRecurrence({
        id: 'r-1',
        categoryId: 'passbook',
        savingSupportId: 's-1',
        memberId: 'm-1',
        direction: 'out',
        amount: eur(20_000),
        period: { unit: 'month', every: 1, anchorDay: 5 },
      }),
    ],
    rates: [],
    ...over,
  }
}

const goal = makeSavingGoal({ id: 'g-1', memberId: 'm-1', supportIds: ['s-1'] })

describe('ce qu’un objectif lit sur ses comptes', () => {
  it('reprend le capital relevé et les versements récurrents', () => {
    const basis = goalBasis(goal, doc(), ON)
    expect(basis.capital).toBe(1_000_000)
    expect(basis.monthly).toBe(20_000)
  })

  /* Le champ existe pour ce cas et pour lui seul : « je m'engage à 500 € »
     alors qu'aucune règle ne le pose encore. */
  it('laisse le versement engagé l’emporter sur les règles', () => {
    const basis = goalBasis({ ...goal, monthly: eur(50_000) }, doc(), ON)
    expect(basis.monthly).toBe(50_000)
  })

  /* Zéro est une information financière — un livret vidé —, l'absence de relevé
     n'en est pas une, et un objectif ne peut pas afficher 0 % d'avancement sur
     un compte dont il ne sait rien. */
  it('n’a pas de capital tant qu’aucun compte n’est relevé', () => {
    expect(goalBasis(goal, doc({ valuations: [] }), ON).capital).toBeNull()
  })

  it('n’a pas de capital du tout quand aucun compte n’est rattaché', () => {
    expect(goalBasis({ ...goal, supportIds: [] }, doc(), ON).capital).toBeNull()
  })

  /* Une règle qui s'éteint avant l'échéance n'est pas un rythme qu'on tient :
     la compter promettrait des versements que personne ne fera. */
  it('ne compte pas une règle qui s’arrête avant l’échéance', () => {
    const stopping = doc({
      recurrences: [
        makeRecurrence({
          id: 'r-1',
          categoryId: 'passbook',
          savingSupportId: 's-1',
          memberId: 'm-1',
          direction: 'out',
          amount: eur(20_000),
          period: { unit: 'month', every: 1, anchorDay: 5 },
          endedOn: '2026-06-30',
        }),
      ],
    })
    expect(goalBasis({ ...goal, targetOn: '2028-01' }, stopping, ON).monthly).toBe(0)
  })
})

describe('le verdict', () => {
  it('dit l’avancement sur le capital relevé', () => {
    const read = readGoal({ target: eur(4_000_000) }, goalBasis(goal, doc(), ON), ON)
    expect(read.progress).toBeCloseTo(0.25, 5)
    expect(read.left).toBe(3_000_000)
    expect(read.reached).toBe(false)
  })

  /* Dépasser sa cible est une bonne nouvelle, pas 118 % d'un cap — et une jauge
     qui déborderait de son cadre ne dirait plus rien. */
  it('borne l’avancement à 100 %, et dit que c’est atteint', () => {
    const read = readGoal({ target: eur(500_000) }, goalBasis(goal, doc(), ON), ON)
    expect(read.progress).toBe(1)
    expect(read.reached).toBe(true)
    expect(read.left).toBe(0)
    expect(read.reachOn).toBe('2026-01')
  })

  /* 10 000 € en poche, 200 €/mois, 0 % de rendement, 20 000 € visés :
     cinquante mois pile, donc mars 2030. */
  it('projette la date d’arrivée sur le rythme et les taux des comptes', () => {
    const read = readGoal({ target: eur(2_000_000) }, goalBasis(goal, doc(), ON), ON)
    expect(read.reachOn).toBe('2030-03')
  })

  /* Le chiffre de l'écran : ni la banque ni un tableur ne le produisent sans
     travail, et c'est la seule raison de rouvrir l'app quand rien n'a bougé. */
  it('rend l’écart avec le mois visé, dans les deux sens', () => {
    const basis = goalBasis(goal, doc(), ON)
    expect(readGoal({ target: eur(2_000_000), targetOn: '2030-03' }, basis, ON).drift).toBe(0)
    expect(readGoal({ target: eur(2_000_000), targetOn: '2029-03' }, basis, ON).drift).toBe(12)
    expect(readGoal({ target: eur(2_000_000), targetOn: '2031-03' }, basis, ON).drift).toBe(-12)
  })

  it('ne rend aucun écart sans échéance', () => {
    expect(readGoal({ target: eur(2_000_000) }, goalBasis(goal, doc(), ON), ON).drift).toBeNull()
  })

  /* Sans versement ni rendement, il n'existe pas de date d'arrivée : en
     inventer une serait pire que se taire. */
  it('se tait sur une arrivée hors d’atteinte', () => {
    const idle = goalBasis(goal, doc({ recurrences: [] }), ON)
    const read = readGoal({ target: eur(2_000_000), targetOn: '2030-03' }, idle, ON)
    expect(read.reachOn).toBeNull()
    expect(read.drift).toBeNull()
  })
})

describe('ce qu’il faudrait verser pour tenir la date', () => {
  /* 10 000 € en poche, 20 000 € visés dans 50 mois : à 0 % il faut 200 €/mois,
     ce qui est exactement le rythme actuel — rien à rattraper. */
  it('se tait quand la date est déjà tenue', () => {
    const read = readGoal(
      { target: eur(2_000_000), targetOn: '2030-03' },
      goalBasis(goal, doc(), ON),
      ON,
    )
    expect(read.neededMonthly).toBeNull()
  })

  /* La même cible douze mois plus tôt : 38 mois pour réunir 10 000 €, soit
     ~263 €/mois. Le montant rendu est celui qui **arrive**, au centime près sur
     le même moteur que la courbe affichée. */
  it('rend le versement qui fait arriver à l’heure', () => {
    const basis = goalBasis(goal, doc(), ON)
    const read = readGoal({ target: eur(2_000_000), targetOn: '2029-03' }, basis, ON)
    if (read.neededMonthly === null) throw new Error('aucun versement requis')

    expect(read.neededMonthly).toBeGreaterThan(basis.monthly)
    /* La vérification qui compte : reprojeté à ce versement, l'objectif est
       bien atteint à la date — et il ne l'est pas un centime en dessous. */
    const at = (monthly: number): number | null =>
      readGoal(
        { target: eur(2_000_000), targetOn: '2029-03' },
        { ...basis, monthly: eur(monthly) },
        ON,
      ).drift
    expect(at(read.neededMonthly)).toBeLessThanOrEqual(0)
    expect(at(read.neededMonthly - 200)).toBeGreaterThan(0)
  })

  /* Une date passée ne se rattrape par aucun versement : l'écran doit dire le
     retard, pas proposer un chiffre qui ne changerait rien. */
  it('se tait sur une échéance déjà passée', () => {
    const read = readGoal(
      { target: eur(2_000_000), targetOn: '2025-01' },
      goalBasis(goal, doc(), ON),
      ON,
    )
    expect(read.neededMonthly).toBeNull()
  })

  it('se tait sur un objectif déjà atteint', () => {
    const read = readGoal(
      { target: eur(500_000), targetOn: '2030-03' },
      goalBasis(goal, doc(), ON),
      ON,
    )
    expect(read.neededMonthly).toBeNull()
  })
})

describe('le rendement n’est jamais deviné', () => {
  /* Un compte qui porte son taux le garde ; un compte muet est projeté à 0 %.
     Le prix est assumé : l'arrivée annoncée est plus tardive que la réalité
     probable, et jamais l'inverse. */
  it('avance la date d’arrivée quand un taux est posé sur le compte', () => {
    const muted = readGoal({ target: eur(2_000_000) }, goalBasis(goal, doc(), ON), ON)
    const rated = readGoal(
      { target: eur(2_000_000) },
      goalBasis(
        goal,
        doc({
          rates: [makeSavingRate({ id: 'tx-1', supportId: 's-1', rateBp: 300, from: '2020-01-01' })],
        }),
        ON,
      ),
      ON,
    )
    if (muted.reachOn === null || rated.reachOn === null) throw new Error('pas d’arrivée')
    expect(rated.reachOn < muted.reachOn).toBe(true)
  })

  /* Le plafond du contrat tient ici comme partout : verser plus sur un livret
     plein ne remplit pas l'objectif plus vite. */
  it('respecte le plafond de versements du compte', () => {
    const full = doc({
      supports: [
        makeSavingSupport({
          id: 's-1',
          memberId: 'm-1',
          label: 'Livret A',
          depositCap: eur(1_000_000),
        }),
      ],
    })
    const read = readGoal({ target: eur(2_000_000) }, goalBasis(goal, full, ON), ON)
    expect(read.reachOn).toBeNull()
  })
})

describe('lectures élémentaires', () => {
  const goals = [
    makeSavingGoal({ id: 'g-1', memberId: 'm-1', supportIds: ['s-1'] }),
    makeSavingGoal({ id: 'g-2', memberId: 'm-2', supportIds: ['s-2'] }),
    makeSavingGoal({ id: 'g-3', memberId: 'm-1', supportIds: [], archived: true }),
  ]

  it('range les objectifs abandonnés sans les effacer', () => {
    expect(activeGoals(goals).map((one) => one.id)).toEqual(['g-1', 'g-2'])
  })

  it('ne mélange pas deux personnes', () => {
    expect(goalsOfMember(goals, 'm-1').map((one) => one.id)).toEqual(['g-1', 'g-3'])
  })

  it('retrouve ce qu’un compte alimente', () => {
    expect(goalsUsingSupport(goals, 's-1').map((one) => one.id)).toEqual(['g-1'])
  })
})

describe('les mouvements confirmés comptent, les prévus non', () => {
  /* La même règle que `supportValue` : une échéance encore prévue n'a bougé
     aucun livret, et l'avancement d'un objectif ne peut pas la compter. */
  it('ajoute au capital ce qui est tombé depuis le relevé', () => {
    const moved = doc({
      entries: [
        makeEntry({
          id: 'e-1',
          date: '2026-01-10',
          direction: 'out',
          amount: eur(20_000),
          categoryId: 'passbook',
          savingSupportId: 's-1',
          status: 'confirmed',
        }),
        makeEntry({
          id: 'e-2',
          date: '2026-01-12',
          direction: 'out',
          amount: eur(20_000),
          categoryId: 'passbook',
          savingSupportId: 's-1',
          status: 'planned',
        }),
      ],
    })
    expect(goalBasis(goal, moved, ON).capital).toBe(1_020_000)
  })
})
