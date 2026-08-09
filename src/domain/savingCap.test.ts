import { describe, expect, it } from 'vitest'
import { eur, makeEntry, makeRecurrence, makeSavingSupport, makeSavingValuation } from './fixtures'
import { NO_CAP, capExcess, capFill, capStateOf, clipToCap, isFull, roomOf } from './savingCap'

const ON = '2026-08-09'

const livret = makeSavingSupport({ id: 's1', depositCap: eur(2_295_000) })
const sansPlafond = makeSavingSupport({ id: 's2' })
const releve = [makeSavingValuation({ id: 'v1', supportId: 's1', amount: eur(2_200_000), date: '2026-06-30' })]

describe('l’état du plafond', () => {
  it('ne borne rien sans plafond posé — absent n’est pas illimité, c’est sans réponse', () => {
    expect(capStateOf(sansPlafond, releve, [], ON)).toEqual(NO_CAP)
    expect(capStateOf(undefined, releve, [], ON)).toEqual(NO_CAP)
    expect(roomOf(NO_CAP)).toBeNull()
  })

  it('dit le plafond mais pas la place, faute de relevé : un capital inconnu n’est pas nul', () => {
    const state = capStateOf(livret, [], [], ON)
    expect(state).toEqual({ kind: 'unknown', cap: eur(2_295_000) })
    expect(roomOf(state)).toBeNull()
    expect(isFull(state)).toBe(false)
  })

  it('retranche le capital estimé du plafond', () => {
    expect(capStateOf(livret, releve, [], ON)).toEqual({
      kind: 'room',
      cap: eur(2_295_000),
      room: eur(95_000),
    })
  })

  it('compte les versements confirmés depuis le relevé, et les reprises rendent de la place', () => {
    const entries = [
      makeEntry({ date: '2026-07-05', amount: eur(50_000), direction: 'out', savingSupportId: 's1' }),
      makeEntry({ date: '2026-07-20', amount: eur(20_000), direction: 'in', savingSupportId: 's1' }),
    ]
    expect(roomOf(capStateOf(livret, releve, entries, ON))).toBe(eur(65_000))
  })

  it('ne compte pas une échéance seulement prévue — elle n’a bougé aucun livret', () => {
    const entries = [
      makeEntry({
        date: '2026-07-05',
        amount: eur(50_000),
        direction: 'out',
        status: 'planned',
        savingSupportId: 's1',
      }),
    ]
    expect(roomOf(capStateOf(livret, releve, entries, ON))).toBe(eur(95_000))
    // …sauf pour la trajectoire, qui sert à la génération des échéances.
    expect(roomOf(capStateOf(livret, releve, entries, ON, true))).toBe(eur(45_000))
  })

  it('donne zéro de place à un compte déjà au-dessus, jamais une place négative', () => {
    const plein = [makeSavingValuation({ id: 'v1', supportId: 's1', amount: eur(2_360_000) })]
    const state = capStateOf(livret, plein, [], ON)
    expect(roomOf(state)).toBe(eur(0))
    expect(isFull(state)).toBe(true)
  })
})

describe('ce qu’un versement dépasserait', () => {
  const state = capStateOf(livret, releve, [], ON) // 95 000 de place

  it('se tait tant que le versement tient', () => {
    expect(capExcess(state, eur(95_000))).toBeNull()
    expect(clipToCap(state, eur(95_000))).toBe(eur(95_000))
  })

  it('chiffre le dépassement et la place restante', () => {
    expect(capExcess(state, eur(120_000))).toEqual({
      cap: eur(2_295_000),
      room: eur(95_000),
      over: eur(25_000),
    })
  })

  it('écrête au lieu de refuser en entier', () => {
    expect(clipToCap(state, eur(120_000))).toBe(eur(95_000))
  })

  it('ne borne pas une reprise : elle rend de la place, elle n’en prend pas', () => {
    expect(capExcess(state, eur(500_000), 'in')).toBeNull()
    expect(clipToCap(state, eur(500_000), 'in')).toBe(eur(500_000))
  })

  it('ne borne rien quand la place est inconnue ou qu’il n’y a pas de plafond', () => {
    expect(capExcess(capStateOf(livret, [], [], ON), eur(500_000))).toBeNull()
    expect(capExcess(NO_CAP, eur(500_000))).toBeNull()
  })
})

describe('quand une règle remplit le support', () => {
  const state = capStateOf(livret, releve, [], ON) // 95 000 de place
  const mensuelle = makeRecurrence({
    id: 'r1',
    amount: eur(30_000),
    direction: 'out',
    startedOn: '2026-09-05',
    period: { unit: 'month', every: 1, anchorDay: 5 },
  })

  it('donne la date et le rang de la dernière échéance qui tient', () => {
    // 95 000 de place, 30 000 par mois : trois échéances pleines, la quatrième
    // écrêtée à 5 000.
    expect(capFill(mensuelle, state, ON)).toEqual({
      date: '2026-12-05',
      dues: 4,
      clipped: true,
    })
  })

  it('ne signale pas d’écrêtage quand la dernière tombe juste', () => {
    const juste = { ...mensuelle, amount: eur(47_500) }
    expect(capFill(juste, state, ON)).toEqual({ date: '2026-10-05', dues: 2, clipped: false })
  })

  it('rend zéro échéance sur un support déjà plein : la règle ne posera rien', () => {
    const plein = capStateOf(
      livret,
      [makeSavingValuation({ id: 'v1', supportId: 's1', amount: eur(2_400_000) })],
      [],
      ON,
    )
    expect(capFill(mensuelle, plein, ON)).toEqual({ date: '2026-09-05', dues: 0, clipped: false })
  })

  it('se tait sur une règle à montant variable : une estimation ne remplit rien', () => {
    expect(capFill({ ...mensuelle, amount: null }, state, ON)).toBeNull()
  })

  it('se tait sur une reprise, et sans plafond', () => {
    expect(capFill({ ...mensuelle, direction: 'in' }, state, ON)).toBeNull()
    expect(capFill(mensuelle, NO_CAP, ON)).toBeNull()
  })

  it('se tait quand la règle ne remplit pas le compte avant l’horizon', () => {
    const goutte = { ...mensuelle, amount: eur(100) }
    expect(capFill(goutte, state, ON)).toBeNull()
  })

  it('se tait sur une règle déjà terminée', () => {
    expect(capFill({ ...mensuelle, endedOn: '2026-08-01' }, state, ON)).toBeNull()
  })
})
