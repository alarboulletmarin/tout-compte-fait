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
  makeSavingRate,
  makeSavingSupport,
  makeSavingValuation,
} from './fixtures'
import { memberStart, supportStart } from './projectionStart'
import type { CategoryKind, Recurrence } from './types'

const ON = '2026-08-09'
/* Le dernier jour d'un horizon de dix ans : c'est lui qui décide quelles règles
   sont assez durables pour entrer dans un versement constant. */
const UNTIL = '2036-08-31'
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
    const start = supportStart(livret, [valued], [], [paysIn()], [], ON, UNTIL)
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
    expect(supportStart(livret, [valued], [paid], [], [], ON, UNTIL).capital).toBe(430_000)
  })

  it('rend un capital inconnu plutôt qu’un capital nul', () => {
    // Zéro est une information financière — un livret vidé ; l'absence de
    // relevé n'en est pas une, et les additionner donnerait un faux exact.
    const start = supportStart(livret, [], [], [paysIn()], [], ON, UNTIL)
    expect(start.capital).toBe(null)
    expect(start.unvalued).toBe(1)
    // Les versements, eux, restent vrais : on sait ce qui part chaque mois.
    expect(start.monthly).toBe(35_000)
  })

  it('compte les versements en net, reprises déduites', () => {
    const takesOut = paysIn({ id: 'r-2', direction: 'in', amount: eur(10_000) })
    expect(supportStart(livret, [valued], [], [paysIn(), takesOut], [], ON, UNTIL).monthly).toBe(25_000)
  })

  it('amortit une règle annuelle au mois', () => {
    const yearly = paysIn({
      amount: eur(120_000),
      period: { unit: 'year', every: 1, anchorDay: 5 },
    })
    expect(supportStart(livret, [valued], [], [yearly], [], ON, UNTIL).monthly).toBe(10_000)
  })

  it('signale une règle au montant variable au lieu de la compter pour zéro', () => {
    const start = supportStart(livret, [valued], [], [paysIn({ amount: null })], [], ON, UNTIL)
    expect(start.variable).toBe(true)
    expect(start.monthly).toBe(0)
  })

  it('ignore une règle arrêtée : elle ne posera plus d’échéance', () => {
    const stopped = paysIn({ endedOn: '2026-06-30' })
    expect(supportStart(livret, [valued], [], [stopped], [], ON, UNTIL).monthly).toBe(0)
  })

  it('ne reprend que les règles de ce support', () => {
    const elsewhere = paysIn({ id: 'r-3', savingSupportId: 's-2' })
    expect(supportStart(livret, [valued], [], [elsewhere], [], ON, UNTIL).monthly).toBe(0)
  })

  it('écarte une règle qui s’arrête avant la fin de l’horizon, et la compte', () => {
    /* Le piège du module. Une reconstitution d'avance court six mois ; le
       moteur ne sait projeter qu'un versement constant, donc la compter la
       multiplierait par cent vingt — des milliers d'euros que personne n'a
       l'intention de verser, et qui ne sont même pas un effort d'épargne : on
       remet de l'argent là où on l'avait pris. */
    const advance = paysIn({ id: 'r-6', amount: eur(6_600), endedOn: '2027-02-28' })
    const start = supportStart(livret, [valued], [], [paysIn(), advance], [], ON, UNTIL)
    expect(start.monthly).toBe(35_000)
    expect(start.ending).toBe(1)
    expect(start.rules).toBe(1)
  })

  it('garde une règle qui court au-delà de l’horizon', () => {
    const long = paysIn({ endedOn: '2040-01-31' })
    const start = supportStart(livret, [valued], [], [long], [], ON, UNTIL)
    expect(start.monthly).toBe(35_000)
    expect(start.ending).toBe(0)
  })

  it('ne signale pas une règle déjà éteinte : elle n’est plus du présent', () => {
    const stopped = paysIn({ endedOn: '2026-06-30' })
    expect(supportStart(livret, [valued], [], [stopped], [], ON, UNTIL).ending).toBe(0)
  })

  it('raccourcir l’horizon peut suffire à reprendre une règle bornée', () => {
    // La même règle, deux horizons : à dix ans elle est écartée, à six mois
    // elle est comptée. C'est ce qui rend la lecture dépendante de la durée.
    const advance = paysIn({ id: 'r-7', endedOn: '2027-02-28' })
    expect(supportStart(livret, [valued], [], [advance], [], ON, UNTIL).monthly).toBe(0)
    expect(supportStart(livret, [valued], [], [advance], [], ON, '2026-12-31').monthly).toBe(35_000)
  })

  it('compte les supports et les règles qui composent chaque chiffre', () => {
    // C'est ce qui permet à l'écran de dire d'où sortent ses deux nombres, au
    // lieu de les faire croire sur parole.
    const start = supportStart(livret, [valued], [], [paysIn()], [], ON, UNTIL)
    expect(start.valued).toBe(1)
    expect(start.rules).toBe(1)
  })
})

describe('ce que toute l’épargne d’une personne apporte', () => {
  it('additionne ses supports relevés, et compte ceux qui ne le sont pas', () => {
    const start = memberStart('m-1', [livret, pea], [valued], [], [], [], kindOf, ON, UNTIL)
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
    const start = memberStart('m-1', [livret, hers], [valued, valuedToo], [], [], [], kindOf, ON, UNTIL)
    expect(start.capital).toBe(420_000)
  })

  it('compte une règle d’épargne sans support, si elle est à la personne', () => {
    // Un versement d'avant les supports désigne un poste et pas un compte, mais
    // il part bien tous les mois : le taire annoncerait un effort inférieur.
    const loose = unlinked({ id: 'r-4' })
    expect(memberStart('m-1', [livret], [valued], [], [loose], [], kindOf, ON, UNTIL).monthly).toBe(35_000)
  })

  it('ne compte pas une règle qui n’est pas de nature épargne', () => {
    const rent = unlinked({ id: 'r-5', categoryId: 'rent' })
    expect(memberStart('m-1', [livret], [valued], [], [rent], [], kindOf, ON, UNTIL).monthly).toBe(0)
  })

  it('laisse le capital inconnu quand aucun support n’a de relevé', () => {
    expect(memberStart('m-1', [livret, pea], [], [], [], [], kindOf, ON, UNTIL).capital).toBe(null)
  })

  it('écarte les supports archivés', () => {
    const closed = makeSavingSupport({ id: 's-1', memberId: 'm-1', archived: true })
    expect(memberStart('m-1', [closed], [valued], [], [], [], kindOf, ON, UNTIL).capital).toBe(null)
  })
})

describe('le taux d’un support', () => {
  /* La règle a changé de forme, pas de fond. Un support peut désormais porter
     une hypothèse de rendement — parce que quelqu'un l'a tapée. Ce que ce
     module n'a toujours pas le droit de faire, c'est d'en **inventer** une :
     sans champ rempli, il rend `null`, et c'est l'écran qui comble avec son
     hypothèse à lui. Un défaut posé ici passerait pour le rendement du produit. */
  it('rend `null` quand le support ne porte aucun palier', () => {
    const start = supportStart(livret, [valued], [], [paysIn()], [], ON, UNTIL)
    expect(start.parts[0]?.rateBp).toBe(null)
    expect(start.parts[0]?.rateKind).toBe(null)
    expect(start.parts[0]?.steps).toEqual([])
  })

  it('rend exactement le palier en vigueur, sans rien y ajouter', () => {
    const rate = makeSavingRate({
      id: 'tx-1',
      supportId: 's-1',
      rateBp: 250,
      kind: 'guaranteed',
      from: '2020-01-01',
    })
    const start = supportStart(livret, [valued], [], [], [rate], ON, UNTIL)
    expect(start.parts[0]?.rateBp).toBe(250)
    expect(start.parts[0]?.rateKind).toBe('guaranteed')
  })

  it('ne prend pas un palier qui n’a pas encore commencé pour le taux du jour', () => {
    /* C'est toute la raison d'être du taux daté : une révision annoncée pour
       l'an prochain ne change pas ce que le support sert aujourd'hui. Elle est
       dans le barème, pas dans le taux de départ. */
    const now = makeSavingRate({ id: 'tx-1', supportId: 's-1', rateBp: 250, from: '2020-01-01' })
    const later = makeSavingRate({ id: 'tx-2', supportId: 's-1', rateBp: 180, from: '2027-01-01' })
    const start = supportStart(livret, [valued], [], [], [now, later], ON, UNTIL)
    expect(start.parts[0]?.rateBp).toBe(250)
    expect(start.parts[0]?.steps).toHaveLength(2)
  })

  it('rend zéro pour cent comme une hypothèse, et non comme une absence', () => {
    // Un compte courant rend zéro : c'est une réponse, pas un silence, et la
    // confondre avec l'absence ferait emprunter le taux de l'écran.
    const idle = makeSavingRate({ id: 'tx-1', supportId: 's-1', rateBp: 0, from: '2020-01-01' })
    expect(supportStart(livret, [valued], [], [], [idle], ON, UNTIL).parts[0]?.rateBp).toBe(0)
  })
})

describe('la décomposition d’un portefeuille', () => {
  it('donne une part par support, et elles se recomposent au total', () => {
    const other = makeSavingValuation({
      id: 'v-2',
      supportId: 's-2',
      amount: eur(350_000),
      date: '2026-07-01',
    })
    const start = memberStart('m-1', [livret, pea], [valued, other], [], [paysIn()], [], kindOf, ON, UNTIL)

    expect(start.parts.map((part) => part.label)).toEqual(['Livret A', 'PEA'])
    const capitals = start.parts.reduce((sum, part) => sum + (part.capital ?? 0), 0)
    const monthlies = start.parts.reduce((sum, part) => sum + part.monthly, 0)
    expect(capitals).toBe(start.capital)
    expect(monthlies).toBe(start.monthly)
  })

  it('se tait quand les colonnes ne feraient pas le total', () => {
    /* Un versement d'épargne d'avant les supports ne désigne aucun compte : il
       pèse dans le total sans appartenir à aucune colonne. Un tableau dont les
       colonnes ne font pas le total est pire qu'un tableau absent — on cherche
       l'erreur, et il n'y en a pas. */
    const loose = unlinked({ id: 'r-8' })
    const start = memberStart('m-1', [livret], [valued], [], [loose], [], kindOf, ON, UNTIL)
    expect(start.monthly).toBe(35_000)
    expect(start.parts).toEqual([])
  })
})
