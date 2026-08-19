/* ============================================================================
 * Ce que les réglages de la simulation produisent, et ce qu'ils refusent.
 *
 * Cinq règles y sont tenues plus que les autres : la courbe est la **somme des
 * trajectoires** des comptes cochés et jamais une projection de plus posée à
 * côté ; un compte dont on n'a rien réglé court au taux de sa fiche ; un compte
 * muet court à une fourchette et non à un chiffre flatteur ; **rien ne bloque le
 * calcul** — un champ illisible retire l'essai et se signale ; et le plafond d'un
 * contrat arrête les versements sans arrêter le capital.
 * ==========================================================================*/

import { afterEach, describe, expect, it } from 'vitest'
import { currentYm } from '@/domain/date'
import { eur } from '@/domain/fixtures'
import type { ProjectionPart } from '@/domain/projectionStart'
import { projection } from '@/i18n/projection'
import {
  DEFAULT_DRAFT,
  MAX_YEARS,
  PROJECTION_STORAGE_KEY,
  type SimulationDraft,
  type SupportSetting,
  analyse,
  defaultAmount,
  modeOf,
  pickedParts,
  readDraft,
  writeDraft,
  yearMarks,
} from './model'

/**
 * Un brouillon en mode comptes — celui que ces tests interrogent.
 *
 * L'écran s'ouvre en mode simple, qui ne lit pas le document : le poser ici
 * ferait passer chaque cas à côté des comptes qu'il donne à `analyse`. Le mode
 * simple a son propre bloc, plus bas.
 */
const draft = (patch: Partial<SimulationDraft> = {}): SimulationDraft => ({
  ...DEFAULT_DRAFT,
  mode: 'accounts',
  ...patch,
})

const part = (over: Partial<ProjectionPart> = {}): ProjectionPart => ({
  supportId: 's-1',
  label: 'Livret A',
  memberId: 'm-1',
  capital: eur(100_000),
  monthly: eur(10_000),
  rateBp: 200,
  rateKind: 'assumed',
  steps: [{ rateBp: 200, kind: 'assumed', from: '2020-01-01', to: null }],
  cap: null,
  room: null,
  rules: 1,
  ending: 0,
  variable: false,
  ...over,
})

/** Un réglage d'écran, complet — les champs vides valent leur défaut. */
const setting = (over: Partial<SupportSetting> = {}): SupportSetting => ({
  supportId: 's-1',
  mode: 'own',
  rateText: '',
  lowText: '2',
  highText: '5',
  amountText: '',
  ...over,
})

const arrival = (one: ReturnType<typeof analyse>): number => one.result?.arrival.low ?? Number.NaN

afterEach(() => {
  localStorage.clear()
})

describe('les comptes cochés', () => {
  it('prend tous les comptes tant que personne n’a choisi', () => {
    /* `null` et non la liste complète : un compte créé demain doit entrer de
       lui-même dans un écran qu'on n'a jamais réglé. */
    const parts = [part(), part({ supportId: 's-2' })]
    expect(pickedParts(parts, null)).toHaveLength(2)
  })

  it('ne garde que ceux qui sont cochés, dans l’ordre du document', () => {
    const parts = [part(), part({ supportId: 's-2' }), part({ supportId: 's-3' })]
    expect(pickedParts(parts, ['s-3', 's-1']).map((one) => one.supportId)).toEqual(['s-1', 's-3'])
  })

  it('ignore un identifiant qui ne désigne plus rien', () => {
    // Un compte supprimé depuis la dernière visite : la case disparaît, l'écran
    // ne cherche pas à projeter un contrat qui n'existe plus.
    expect(pickedParts([part()], ['s-1', 's-mort'])).toHaveLength(1)
  })

  it('ne trace rien quand tout est décoché, et le dit', () => {
    const { result, missing } = analyse(draft({ picked: [] }), [part()])
    expect(result).toBe(null)
    expect(missing).toBe(projection.pickSupports)
  })

  it('ne trace rien quand le document n’a aucun compte, et dit autre chose', () => {
    /* Deux absences, deux gestes : il faut créer un compte, ou en cocher un. Un
       seul message aurait envoyé créer un compte quelqu'un qui en a cinq. */
    const { result, missing } = analyse(draft(), [])
    expect(result).toBe(null)
    expect(missing).toBe(projection.noSupports)
  })
})

describe('la somme des trajectoires', () => {
  it('additionne les comptes plutôt que de les projeter à un taux moyen', () => {
    /* La règle qui tient tout l'écran. Un Livret A à 2 % et un compte à 6 % ne
       se résument pas à 4 % : la courbe est l'addition de leurs deux séries, et
       le détail par compte s'y recompose exactement. */
    const parts = [
      part({ supportId: 's-1', rateBp: 200 }),
      part({ supportId: 's-2', rateBp: 600 }),
    ]
    const { result } = analyse(draft({ years: 10 }), parts)
    const runs = result?.runs ?? []
    expect(runs).toHaveLength(2)
    const summed = runs.reduce((total, one) => total + one.arrival.low, 0)
    expect(result?.arrival.low).toBe(summed)
  })

  it('décompose chaque rang en départ, versé et rendement — et les trois font le total', () => {
    const { result } = analyse(draft({ years: 5 }), [part()])
    for (const point of result?.points ?? []) {
      expect(point.initial + point.paid + point.gain).toBe(point.total)
    }
  })

  it('garde le capital de départ constant d’un rang à l’autre', () => {
    // C'est ce qui fait de la première couche une bande et non une pente : ce
    // qu'il y avait au départ ne bouge pas, seul ce qu'on ajoute bouge.
    const { result } = analyse(draft({ years: 3 }), [part({ capital: eur(500_000) })])
    const initials = new Set((result?.points ?? []).map((point) => point.initial))
    expect([...initials]).toEqual([500_000])
  })

  it('rejoint le vecteur de référence du cahier', () => {
    /* 250 €/mois, 11 % annuels, 20 ans → ≈ 202 k€. Il vaut moins pour son
       chiffre que pour ce qu'il fixe : la convention de fin de mois, et le fait
       qu'un compte réglé à une valeur suit exactement `projectSeries`. */
    const one = analyse(
      draft({
        years: 20,
        settings: [setting({ mode: 'flat', rateText: '11', amountText: '250' })],
      }),
      [part({ capital: eur(0), monthly: eur(0) })],
    )
    expect(arrival(one)).toBeCloseTo(20_213_625, -1)
  })
})

describe('d’où vient le rendement d’un compte', () => {
  it('part du taux de sa fiche quand rien n’a été réglé', () => {
    expect(modeOf(part({ rateBp: 240 }), undefined)).toBe('own')
    const { result } = analyse(draft(), [part({ rateBp: 240 })])
    expect(result?.rateSpan).toEqual({ low: 240, high: 240 })
    expect(result?.single).toBe(true)
  })

  it('part d’une fourchette quand la fiche est muette', () => {
    /* L'app ne devine aucun rendement : entre suggérer un chiffre et montrer un
       écart large, elle montre l'écart. */
    expect(modeOf(part({ rateBp: null }), undefined)).toBe('range')
    const { result } = analyse(draft(), [part({ rateBp: null, rateKind: null, steps: [] })])
    expect(result?.rateSpan).toEqual({ low: 200, high: 500 })
    expect(result?.single).toBe(false)
  })

  it('retombe sur la fourchette si le taux de la fiche a disparu depuis', () => {
    // Le réglage survit à ce qu'il désignait : un compte réglé sur « le taux du
    // support » dont le taux a été retiré ne vaut pas 0 %, il vaut la fourchette.
    expect(modeOf(part({ rateBp: null }), setting({ mode: 'own' }))).toBe('range')
  })

  it('essaie une valeur unique, et referme la fourchette', () => {
    const { result } = analyse(
      draft({ settings: [setting({ mode: 'flat', rateText: '4' })] }),
      [part({ rateBp: null, rateKind: null, steps: [] })],
    )
    expect(result?.rateSpan).toEqual({ low: 400, high: 400 })
    expect(result?.single).toBe(true)
  })

  it('range les deux bornes d’une fourchette tapée à l’envers', () => {
    // « entre 5 % et 2 % » est la même fourchette que « entre 2 % et 5 % ».
    const { result } = analyse(
      draft({ settings: [setting({ mode: 'range', lowText: '5', highText: '2' })] }),
      [part()],
    )
    expect(result?.rateSpan).toEqual({ low: 200, high: 500 })
  })

  it('affiche l’étendue de ce qui court, jamais celle des champs', () => {
    /* Un Livret A posé à 2,40 % et un compte muet laissé entre 3 % et 7 %
       donnent « 2,40 % – 7 % » : c'est ce qui court dans le calcul, et non les
       deux champs de la fourchette. */
    const parts = [
      part({ supportId: 's-1', rateBp: 240 }),
      part({ supportId: 's-2', rateBp: null, rateKind: null, steps: [] }),
    ]
    const { result } = analyse(
      draft({ settings: [setting({ supportId: 's-2', mode: 'range', lowText: '3', highText: '7' })] }),
      parts,
    )
    expect(result?.rateSpan).toEqual({ low: 240, high: 700 })
  })

  it('ne dit « garanti » que si tout ce qui court l’est', () => {
    const guaranteed = part({ rateKind: 'guaranteed' })
    expect(analyse(draft(), [guaranteed]).result?.guaranteed).toBe(true)
    /* Un seul compte laissé à la fourchette, et l'ensemble redevient une
       hypothèse — c'est la lecture qui promet le moins. */
    expect(
      analyse(draft(), [guaranteed, part({ supportId: 's-2', rateBp: null, steps: [] })]).result
        ?.guaranteed,
    ).toBe(false)
    /* Un taux essayé n'engage que celui qui l'a tapé, même sur un contrat qui
       garantit le sien. */
    expect(
      analyse(draft({ settings: [setting({ mode: 'flat', rateText: '9' })] }), [guaranteed]).result
        ?.guaranteed,
    ).toBe(false)
  })

  it('applique un palier daté au rang qui lui revient, et le signale', () => {
    const ym = currentYm()
    const [year, month] = ym.split('-').map(Number)
    const next = `${String((year ?? 2026) + 1)}-${String(month ?? 1).padStart(2, '0')}-01`
    const dated = part({
      rateBp: 300,
      steps: [
        { rateBp: 300, kind: 'guaranteed', from: '2020-01-01', to: null },
        { rateBp: 100, kind: 'guaranteed', from: next, to: null },
      ],
    })
    const { result } = analyse(draft({ years: 5 }), [dated])
    expect(result?.runs[0]?.dated).toBe(true)
    // Le taux de départ reste celui du jour : la révision est dans le barème.
    expect(result?.runs[0]?.lowBp).toBe(300)
  })
})

describe('ce qu’on verse, et tous les combien', () => {
  it('propose ce que les règles du compte versent, à la cadence choisie', () => {
    const one = part({ monthly: eur(35_000) })
    expect(defaultAmount(one, 1)).toBe(35_000)
    expect(defaultAmount(one, 3)).toBe(105_000)
    expect(defaultAmount(one, 12)).toBe(420_000)
  })

  it('verse le même effort annuel quelle que soit la cadence, et rend un peu moins', () => {
    const base = part({ capital: eur(0), monthly: eur(10_000), rateBp: 400 })
    const monthly = analyse(draft({ years: 10, every: 1 }), [base])
    const yearly = analyse(draft({ years: 10, every: 12 }), [base])
    expect(monthly.result?.paid).toBe(yearly.result?.paid)
    expect(arrival(yearly)).toBeLessThan(arrival(monthly))
  })

  it('remplace le versement du document par celui qu’on tape', () => {
    const one = analyse(
      draft({ settings: [setting({ amountText: '500' })] }),
      [part({ monthly: eur(10_000) })],
    )
    expect(one.result?.amount).toBe(50_000)
  })

  it('lit un versement illisible comme un essai retiré, et signale le champ', () => {
    /* Rien ne bloque le calcul : un réglage vit dans une feuille qu'on referme,
       donc une saisie à moitié tapée ne doit pas vider l'écran derrière. */
    const one = analyse(
      draft({ settings: [setting({ amountText: 'beaucoup' })] }),
      [part({ monthly: eur(10_000) })],
    )
    expect(one.result?.amount).toBe(10_000)
    expect(one.errors.supports['s-1']?.amount).toBe(projection.amountInvalid)
  })

  it('n’arrête les versements qu’au plafond, jamais le capital', () => {
    const capped = part({
      capital: eur(0),
      monthly: eur(10_000),
      rateBp: 300,
      cap: eur(50_000),
      room: eur(50_000),
    })
    const { result } = analyse(draft({ years: 5 }), [capped])
    expect(result?.capped).toBe(true)
    expect(result?.paid).toBe(50_000)
    // Le capital, lui, a continué de croître au-delà du plafond.
    expect(result?.arrival.low ?? 0).toBeGreaterThan(50_000)
  })
})

describe('la durée et l’inflation', () => {
  it('ramène une durée hors bornes dans la plage et signale le champ', () => {
    /* Le champ se tape chiffre par chiffre : « 1 » sur le chemin de « 12 » ne
       doit pas faire disparaître la figure. */
    const one = analyse(draft({ years: 0 }), [part()])
    expect(one.errors.years).toBeDefined()
    expect(one.result?.months).toBe(12)
    expect(analyse(draft({ years: 99 }), [part()]).result?.months).toBe(MAX_YEARS * 12)
  })

  it('ne déflate rien en euros courants', () => {
    const one = analyse(draft({ constant: false, inflationText: '2' }), [part()])
    const other = analyse(draft({ constant: false, inflationText: '9' }), [part()])
    expect(one.result?.inflationBp).toBe(0)
    expect(arrival(one)).toBe(arrival(other))
  })

  it('déflate à la demande, et dit à quel taux', () => {
    const nominal = analyse(draft({ years: 20 }), [part()])
    const constant = analyse(draft({ years: 20, constant: true, inflationText: '2' }), [part()])
    expect(constant.result?.inflationBp).toBe(200)
    expect(arrival(constant)).toBeLessThan(arrival(nominal))
  })

  it('éteint la lecture en euros d’aujourd’hui quand l’inflation est illisible', () => {
    // Une inflation illisible ne vaut pas zéro : elle éteint une lecture de
    // plus, elle ne change pas le calcul.
    const one = analyse(draft({ constant: true, inflationText: 'un peu' }), [part()])
    expect(one.errors.inflation).toBeDefined()
    expect(one.result?.inflationBp).toBe(0)
  })

  it('peut rendre un rendement négatif en euros d’aujourd’hui', () => {
    /* Un taux sous l'inflation ne compense pas l'érosion, et c'est précisément
       ce que cette lecture existe pour montrer. Sans rouge : ce n'est pas une
       faute. */
    const one = analyse(
      draft({ years: 20, constant: true, inflationText: '5', settings: [setting({ mode: 'flat', rateText: '1' })] }),
      [part()],
    )
    expect(one.result?.points.at(-1)?.gain ?? 0).toBeLessThan(0)
  })
})

describe('les lignes du tableau', () => {
  it('pose une ligne par année, départ compris', () => {
    expect(yearMarks(60)).toEqual([0, 12, 24, 36, 48, 60])
  })

  it('garde la dernière année même incomplète', () => {
    // Sans elle, le tableau s'arrêterait avant le chiffre que l'écran annonce.
    expect(yearMarks(30)).toEqual([0, 12, 24, 30])
  })

  it('ne rend qu’un départ sur un horizon nul', () => {
    expect(yearMarks(0)).toEqual([0])
  })
})

describe('le confort local', () => {
  it('relit ce qu’on a laissé', () => {
    writeDraft(draft({ years: 25, every: 3, view: 'table', picked: ['s-2'] }))
    const back = readDraft()
    expect(back.years).toBe(25)
    expect(back.every).toBe(3)
    expect(back.view).toBe('table')
    expect(back.picked).toEqual(['s-2'])
  })

  it('retombe sur les défauts quand le stockage est vide', () => {
    expect(readDraft()).toEqual(DEFAULT_DRAFT)
  })

  it('ne croit pas ce que le stockage raconte', () => {
    /* `localStorage` s'édite depuis la console du navigateur : une durée à
       `NaN`, une cadence inventée ou un tableau de mille entrées ne doivent pas
       casser l'écran. C'est la prudence de `persistence/validate.ts`, à
       l'échelle de six champs. */
    localStorage.setItem(
      PROJECTION_STORAGE_KEY,
      JSON.stringify({
        picked: [42, 's-1', 's-1'],
        years: 'beaucoup',
        every: 7,
        constant: 'oui',
        inflationText: 'x'.repeat(100),
        settings: [{ supportId: 's-1', mode: 'magique' }, 'nope'],
        view: 'ailleurs',
      }),
    )
    const back = readDraft()
    expect(back.picked).toEqual(['s-1'])
    expect(back.years).toBe(DEFAULT_DRAFT.years)
    expect(back.every).toBe(1)
    expect(back.constant).toBe(false)
    expect(back.inflationText).toBe(DEFAULT_DRAFT.inflationText)
    expect(back.settings).toEqual([setting({ mode: 'own' })])
    expect(back.view).toBe('chart')
  })

  it('survit à un JSON abîmé', () => {
    localStorage.setItem(PROJECTION_STORAGE_KEY, '{oups')
    expect(readDraft()).toEqual(DEFAULT_DRAFT)
  })
})
