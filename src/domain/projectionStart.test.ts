/* ============================================================================
 * Ce que la projection a le droit de reprendre de l'épargne — et ce qu'elle
 * n'a pas le droit d'inventer.
 *
 * Deux règles y sont tenues plus que les autres : un support sans relevé ne vaut
 * pas zéro, et aucun rendement ne se déduit d'un support. La première évite un
 * patrimoine faux présenté comme exact ; la seconde est la raison d'être de tout
 * l'écran (cahier §4.6 ter).
 * ==========================================================================*/

import { describe, expect, it } from 'vitest'
import {
  eur,
  makeCategory,
  makeEntry,
  makeFamily,
  makeRecurrence,
  makeSavingSupport,
  makeSavingValuation,
} from './fixtures'
import { memberStart, supportStart } from './projectionStart'
import type { CategoryKind, Recurrence } from './types'

const ON = '2026-08-09'
const MONTHLY = { unit: 'month', every: 1, anchorDay: 5 } as const

const families = [makeFamily({ id: 'fam-saving', kind: 'saving' })]
const categories = [makeCategory({ id: 'passbook', familyId: 'fam-saving' })]
const kindOf = (categoryId: string): CategoryKind => {
  const family = categories.find((one) => one.id === categoryId)?.familyId
  return families.find((one) => one.id === family)?.kind ?? 'charge'
}

const livret = makeSavingSupport({ id: 's-1', memberId: 'm-1', label: 'Livret A' })
const pea = makeSavingSupport({ id: 's-2', memberId: 'm-1', label: 'PEA' })

const valued = makeSavingValuation({
  id: 'v-1',
  supportId: 's-1',
  amount: eur(420_000),
  date: '2026-07-01',
})

const paysIn = (over: Partial<Recurrence> = {}): Recurrence =>
  makeRecurrence({
    id: 'r-1',
    categoryId: 'passbook',
    savingSupportId: 's-1',
    memberId: 'm-1',
    direction: 'out',
    amount: eur(35_000),
    period: MONTHLY,
    ...over,
  })

/** La même règle, mais sans support : un versement d'avant les supports. */
function unlinked(over: Partial<Recurrence> = {}): Recurrence {
  const { savingSupportId: _drop, ...rest } = paysIn(over)
  return rest
}

describe('ce qu’un support apporte à une projection', () => {
  it('reprend le capital estimé et le versement récurrent', () => {
    const start = supportStart('s-1', [valued], [], [paysIn()], ON)
    expect(start.capital).toBe(420_000)
    expect(start.monthly).toBe(35_000)
  })

  it('compte les mouvements confirmés depuis le dernier relevé', () => {
    // La même règle que la fiche du support : deux réponses à « combien j'ai
    // aujourd'hui » d'un écran à l'autre seraient indéfendables.
    const paid = makeEntry({
      date: '2026-07-20',
      categoryId: 'passbook',
      savingSupportId: 's-1',
      direction: 'out',
      amount: eur(10_000),
    })
    expect(supportStart('s-1', [valued], [paid], [], ON).capital).toBe(430_000)
  })

  it('rend un capital inconnu plutôt qu’un capital nul', () => {
    // Zéro est une information financière — un livret vidé ; l'absence de
    // relevé n'en est pas une, et les additionner donnerait un faux exact.
    const start = supportStart('s-1', [], [], [paysIn()], ON)
    expect(start.capital).toBe(null)
    expect(start.unvalued).toBe(1)
    // Les versements, eux, restent vrais : on sait ce qui part chaque mois.
    expect(start.monthly).toBe(35_000)
  })

  it('compte les versements en net, reprises déduites', () => {
    const takesOut = paysIn({ id: 'r-2', direction: 'in', amount: eur(10_000) })
    expect(supportStart('s-1', [valued], [], [paysIn(), takesOut], ON).monthly).toBe(25_000)
  })

  it('amortit une règle annuelle au mois', () => {
    const yearly = paysIn({
      amount: eur(120_000),
      period: { unit: 'year', every: 1, anchorDay: 5 },
    })
    expect(supportStart('s-1', [valued], [], [yearly], ON).monthly).toBe(10_000)
  })

  it('signale une règle au montant variable au lieu de la compter pour zéro', () => {
    const start = supportStart('s-1', [valued], [], [paysIn({ amount: null })], ON)
    expect(start.variable).toBe(true)
    expect(start.monthly).toBe(0)
  })

  it('ignore une règle arrêtée : elle ne posera plus d’échéance', () => {
    const stopped = paysIn({ endedOn: '2026-06-30' })
    expect(supportStart('s-1', [valued], [], [stopped], ON).monthly).toBe(0)
  })

  it('ne reprend que les règles de ce support', () => {
    const elsewhere = paysIn({ id: 'r-3', savingSupportId: 's-2' })
    expect(supportStart('s-1', [valued], [], [elsewhere], ON).monthly).toBe(0)
  })
})

describe('ce que toute l’épargne d’une personne apporte', () => {
  it('additionne ses supports relevés, et compte ceux qui ne le sont pas', () => {
    const start = memberStart('m-1', [livret, pea], [valued], [], [], kindOf, ON)
    expect(start.capital).toBe(420_000)
    expect(start.unvalued).toBe(1)
  })

  it('n’additionne jamais l’épargne de deux personnes', () => {
    // Deux personnes qui ont 4 200 € et 8 000 € de côté n'ont pas 12 200 €.
    const hers = makeSavingSupport({ id: 's-3', memberId: 'm-2' })
    const valuedToo = makeSavingValuation({
      id: 'v-2',
      supportId: 's-3',
      amount: eur(800_000),
      date: '2026-07-01',
    })
    const start = memberStart('m-1', [livret, hers], [valued, valuedToo], [], [], kindOf, ON)
    expect(start.capital).toBe(420_000)
  })

  it('compte une règle d’épargne sans support, si elle est à la personne', () => {
    // Un versement d'avant les supports désigne un poste et pas un compte, mais
    // il part bien tous les mois : le taire annoncerait un effort inférieur.
    const loose = unlinked({ id: 'r-4' })
    expect(memberStart('m-1', [livret], [valued], [], [loose], kindOf, ON).monthly).toBe(35_000)
  })

  it('ne compte pas une règle qui n’est pas de nature épargne', () => {
    const rent = unlinked({ id: 'r-5', categoryId: 'rent' })
    expect(memberStart('m-1', [livret], [valued], [], [rent], kindOf, ON).monthly).toBe(0)
  })

  it('laisse le capital inconnu quand aucun support n’a de relevé', () => {
    expect(memberStart('m-1', [livret, pea], [], [], [], kindOf, ON).capital).toBe(null)
  })

  it('écarte les supports archivés', () => {
    const closed = makeSavingSupport({ id: 's-1', memberId: 'm-1', archived: true })
    expect(memberStart('m-1', [closed], [valued], [], [], kindOf, ON).capital).toBe(null)
  })
})

describe('ce qu’une projection ne reprend jamais', () => {
  it('ne rend aucun taux, sous aucune forme', () => {
    // La règle qui tient tout l'écran : un capital et un versement sont des
    // faits, un rendement futur n'en est pas un. Un support n'en porte pas, et
    // ce module n'a pas le droit d'en inventer un.
    const start = supportStart('s-1', [valued], [], [paysIn()], ON)
    expect(Object.keys(start).sort()).toEqual(['capital', 'monthly', 'unvalued', 'variable'])
  })
})
