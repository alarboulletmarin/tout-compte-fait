/* ============================================================================
 * Ce que la simulation a le droit de reprendre d'un support — et ce qu'elle
 * n'a pas le droit d'inventer.
 *
 * Deux règles y sont tenues plus que les autres : un support sans relevé ne vaut
 * pas zéro, et aucun rendement ne se déduit d'un support. La première évite un
 * patrimoine faux présenté comme exact ; la seconde est la raison d'être de tout
 * l'écran (cahier §4.6 ter).
 *
 * Le module rendait aussi des totaux — « toute l'épargne de Camille » — que la
 * simulation prenait pour point de départ. Ils ont disparu avec l'écran qui les
 * lisait : un portefeuille ne suit aucun taux moyen, donc sa courbe est la somme
 * de celles de ses comptes, et cette somme se fait sur des séries. Ce qui reste
 * est la brique unitaire, et c'est elle que ces tests décrivent.
 * ==========================================================================*/

import { describe, expect, it } from 'vitest'
import {
  eur,
  makeEntry,
  makeRecurrence,
  makeSavingRate,
  makeSavingSupport,
  makeSavingValuation,
} from './fixtures'
import { supportPart, supportParts } from './projectionStart'
import type { Recurrence } from './types'

const ON = '2026-08-09'
/* Le dernier jour d'un horizon de dix ans : c'est lui qui décide quelles règles
   sont assez durables pour entrer dans un versement constant. */
const UNTIL = '2036-08-31'
const MONTHLY = { unit: 'month', every: 1, anchorDay: 5 } as const

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

/** Le raccourci de tous ces tests : un support, et ce qu'on en reprend. */
const part = (
  valuations = [valued],
  entries: Parameters<typeof supportPart>[2] = [],
  recurrences: Recurrence[] = [],
  rates: Parameters<typeof supportPart>[4] = [],
  until = UNTIL,
) => supportPart(livret, valuations, entries, recurrences, rates, ON, until)

describe('ce qu’un support apporte à une simulation', () => {
  it('reprend le capital estimé et le versement récurrent', () => {
    const one = part([valued], [], [paysIn()])
    expect(one.capital).toBe(420_000)
    expect(one.monthly).toBe(35_000)
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
    expect(part([valued], [paid]).capital).toBe(430_000)
  })

  it('rend un capital inconnu plutôt qu’un capital nul', () => {
    // Zéro est une information financière — un livret vidé ; l'absence de
    // relevé n'en est pas une, et les additionner donnerait un faux exact.
    const one = part([], [], [paysIn()])
    expect(one.capital).toBe(null)
    // Les versements, eux, restent vrais : on sait ce qui part chaque mois.
    expect(one.monthly).toBe(35_000)
  })

  it('compte les versements en net, reprises déduites', () => {
    const takesOut = paysIn({ id: 'r-2', direction: 'in', amount: eur(10_000) })
    expect(part([valued], [], [paysIn(), takesOut]).monthly).toBe(25_000)
  })

  it('amortit une règle annuelle au mois', () => {
    const yearly = paysIn({
      amount: eur(120_000),
      period: { unit: 'year', every: 1, anchorDay: 5 },
    })
    expect(part([valued], [], [yearly]).monthly).toBe(10_000)
  })

  it('signale une règle au montant variable au lieu de la compter pour zéro', () => {
    const one = part([valued], [], [paysIn({ amount: null })])
    expect(one.variable).toBe(true)
    expect(one.monthly).toBe(0)
  })

  it('ignore une règle arrêtée : elle ne posera plus d’échéance', () => {
    expect(part([valued], [], [paysIn({ endedOn: '2026-06-30' })]).monthly).toBe(0)
  })

  it('ne reprend que les règles de ce support', () => {
    expect(part([valued], [], [paysIn({ id: 'r-3', savingSupportId: 's-2' })]).monthly).toBe(0)
  })

  it('écarte une règle qui s’arrête avant la fin de l’horizon, et la compte', () => {
    /* Le piège du module. Une reconstitution d'avance court six mois ; le
       moteur ne sait projeter qu'un versement constant, donc la compter la
       multiplierait par cent vingt — des milliers d'euros que personne n'a
       l'intention de verser, et qui ne sont même pas un effort d'épargne : on
       remet de l'argent là où on l'avait pris. */
    const advance = paysIn({ id: 'r-6', amount: eur(6_600), endedOn: '2027-02-28' })
    const one = part([valued], [], [paysIn(), advance])
    expect(one.monthly).toBe(35_000)
    expect(one.ending).toBe(1)
    expect(one.rules).toBe(1)
  })

  it('garde une règle qui court au-delà de l’horizon', () => {
    const one = part([valued], [], [paysIn({ endedOn: '2040-01-31' })])
    expect(one.monthly).toBe(35_000)
    expect(one.ending).toBe(0)
  })

  it('ne signale pas une règle déjà éteinte : elle n’est plus du présent', () => {
    expect(part([valued], [], [paysIn({ endedOn: '2026-06-30' })]).ending).toBe(0)
  })

  it('raccourcir l’horizon peut suffire à reprendre une règle bornée', () => {
    // La même règle, deux horizons : à dix ans elle est écartée, à six mois
    // elle est comptée. C'est ce qui rend la lecture dépendante de la durée.
    const advance = paysIn({ id: 'r-7', endedOn: '2027-02-28' })
    expect(part([valued], [], [advance]).monthly).toBe(0)
    expect(part([valued], [], [advance], [], '2026-12-31').monthly).toBe(35_000)
  })

  it('reprend le plafond du contrat et la place qu’il laisse', () => {
    const capped = makeSavingSupport({ id: 's-1', memberId: 'm-1', depositCap: eur(2_285_000) })
    const one = supportPart(capped, [valued], [], [], [], ON, UNTIL)
    expect(one.cap).toBe(2_285_000)
    expect(one.room).toBe(1_865_000)
  })
})

describe('le taux d’un support', () => {
  /* La règle a changé de forme, pas de fond. Un support peut désormais porter
     une hypothèse de rendement — parce que quelqu'un l'a tapée. Ce que ce
     module n'a toujours pas le droit de faire, c'est d'en **inventer** une :
     sans champ rempli, il rend `null`, et c'est l'écran qui comble avec son
     hypothèse à lui. Un défaut posé ici passerait pour le rendement du produit. */
  it('rend `null` quand le support ne porte aucun palier', () => {
    const one = part([valued], [], [paysIn()])
    expect(one.rateBp).toBe(null)
    expect(one.rateKind).toBe(null)
    expect(one.steps).toEqual([])
  })

  it('rend exactement le palier en vigueur, sans rien y ajouter', () => {
    const rate = makeSavingRate({
      id: 'tx-1',
      supportId: 's-1',
      rateBp: 250,
      kind: 'guaranteed',
      from: '2020-01-01',
    })
    const one = part([valued], [], [], [rate])
    expect(one.rateBp).toBe(250)
    expect(one.rateKind).toBe('guaranteed')
  })

  it('ne prend pas un palier qui n’a pas encore commencé pour le taux du jour', () => {
    /* C'est toute la raison d'être du taux daté : une révision annoncée pour
       l'an prochain ne change pas ce que le support sert aujourd'hui. Elle est
       dans le barème, pas dans le taux de départ. */
    const now = makeSavingRate({ id: 'tx-1', supportId: 's-1', rateBp: 250, from: '2020-01-01' })
    const later = makeSavingRate({ id: 'tx-2', supportId: 's-1', rateBp: 180, from: '2027-01-01' })
    const one = part([valued], [], [], [now, later])
    expect(one.rateBp).toBe(250)
    expect(one.steps).toHaveLength(2)
  })

  it('rend zéro pour cent comme une hypothèse, et non comme une absence', () => {
    // Un compte courant rend zéro : c'est une réponse, pas un silence, et la
    // confondre avec l'absence ferait emprunter le taux de l'écran.
    const idle = makeSavingRate({ id: 'tx-1', supportId: 's-1', rateBp: 0, from: '2020-01-01' })
    expect(part([valued], [], [], [idle]).rateBp).toBe(0)
  })
})

describe('la liste des supports simulables', () => {
  it('rend une part par support, dans l’ordre du document', () => {
    const parts = supportParts([livret, pea], [valued], [], [paysIn()], [], ON, UNTIL)
    expect(parts.map((one) => one.label)).toEqual(['Livret A', 'PEA'])
    expect(parts[0]?.monthly).toBe(35_000)
    // Le second n'a ni relevé ni règle : il part de rien, et le dit.
    expect(parts[1]?.capital).toBe(null)
    expect(parts[1]?.monthly).toBe(0)
  })

  it('écarte les supports archivés', () => {
    // Un compte clôturé n'a pas de trajectoire à venir : le proposer ferait
    // projeter un contrat qui n'existe plus.
    const closed = makeSavingSupport({ id: 's-3', memberId: 'm-1', archived: true })
    const parts = supportParts([livret, closed], [valued], [], [], [], ON, UNTIL)
    expect(parts.map((one) => one.supportId)).toEqual(['s-1'])
  })

  it('ne somme rien : aucun total ne sort d’ici', () => {
    /* La règle du module depuis qu'il ne rend plus que des parts. Un
       portefeuille ne suit aucun taux moyen — sa courbe est la somme de celles
       de ses comptes —, donc la somme se fait sur des séries, à l'écran, et
       après le choix des comptes. */
    const parts = supportParts([livret, pea], [valued], [], [], [], ON, UNTIL)
    expect(parts).toHaveLength(2)
    expect(Object.keys(parts[0] ?? {})).not.toContain('total')
  })
})
