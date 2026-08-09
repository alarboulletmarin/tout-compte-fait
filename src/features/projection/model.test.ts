import { afterEach, describe, expect, it } from 'vitest'
import { eur } from '@/domain/fixtures'
import type { ProjectionPart, ProjectionStart } from '@/domain/projectionStart'
import { tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import {
  DEFAULT_DRAFT,
  MAX_YEARS,
  MIN_YEARS,
  PROJECTION_STORAGE_KEY,
  type ProjectionDraft,
  analyse,
  breakdownOf,
  effortLadder,
  nextSlot,
  readDraft,
  writeDraft,
} from './model'

const draft = (patch: Partial<ProjectionDraft> = {}): ProjectionDraft => ({
  ...DEFAULT_DRAFT,
  ...patch,
})

afterEach(() => {
  localStorage.clear()
})

describe('ce que la saisie donne', () => {
  it('trace ce qu’un versement mensuel devient', () => {
    const { result } = analyse(
      draft({ monthlyText: '250', years: 20, scenarios: [{ id: 'a', rateText: '11', kind: 'assumed' }] }),
    )
    expect(result?.months).toBe(240)
    expect(result?.scenarios[0]?.series.balance.at(-1)).toBeCloseTo(20_213_625, -1)
  })

  it('donne la même aire de versements à toutes les hypothèses', () => {
    // Le versé ne dépend pas du taux : c'est ce qui rend l'écart entre l'aire
    // et chaque courbe lisible comme « ce que le taux a produit ».
    const { result } = analyse(
      draft({
        monthlyText: '100',
        scenarios: [
          { id: 'a', rateText: '2', kind: 'guaranteed' },
          { id: 'b', rateText: '7', kind: 'assumed' },
        ],
      }),
    )
    expect(result?.contributed).toEqual(result?.scenarios[1]?.series.contributed)
  })

  it('retire l’hypothèse illisible sans effacer les autres', () => {
    const { errors, result } = analyse(
      draft({
        scenarios: [
          { id: 'a', rateText: '4', kind: 'assumed' },
          { id: 'b', rateText: '450', kind: 'assumed' },
        ],
      }),
    )
    expect(errors.rates.b).toBe(tpl(projection.rateInvalid, 100))
    expect(result?.scenarios).toHaveLength(1)
    expect(result?.scenarios[0]?.id).toBe('a')
  })

  it('signale un montant illisible plutôt que de le lire comme zéro', () => {
    expect(analyse(draft({ monthlyText: 'beaucoup' })).errors.monthly).toBe(
      projection.amountInvalid,
    )
  })

  it('lit un capital de départ vide comme zéro, pas comme une erreur', () => {
    const { errors, result } = analyse(draft({ initialText: '', monthlyText: '100' }))
    expect(errors.initial).toBeUndefined()
    expect(result?.scenarios[0]?.series.balance[0]).toBe(0)
  })

  it('ne trace rien sans versement ni capital, et dit ce qui manque', () => {
    const { result, missing } = analyse(draft({ monthlyText: '', initialText: '' }))
    expect(result).toBe(null)
    expect(missing).toBe(projection.nothingToPlot)
  })

  it('refuse une durée hors bornes', () => {
    const bornes = tpl(projection.durationInvalid, MIN_YEARS, MAX_YEARS)
    expect(analyse(draft({ years: 0 })).errors.years).toBe(bornes)
    expect(analyse(draft({ years: 51 })).errors.years).toBe(bornes)
    expect(analyse(draft({ years: 50 })).errors.years).toBeUndefined()
  })
})

describe('mode inverse', () => {
  it('rend le versement requis, hypothèse par hypothèse', () => {
    const { result } = analyse(
      draft({
        mode: 'target',
        targetText: '100000',
        initialText: '',
        years: 20,
        scenarios: [
          { id: 'a', rateText: '2', kind: 'guaranteed' },
          { id: 'b', rateText: '6', kind: 'assumed' },
        ],
      }),
    )
    const prudent = result?.scenarios[0]?.monthly ?? 0
    const optimiste = result?.scenarios[1]?.monthly ?? 0
    // Plus le taux est haut, moins il faut verser — et les deux atteignent la
    // même cible.
    expect(prudent).toBeGreaterThan(optimiste)
    expect(result?.scenarios[0]?.series.balance.at(-1)).toBeGreaterThanOrEqual(10_000_000)
    expect(result?.scenarios[1]?.series.balance.at(-1)).toBeGreaterThanOrEqual(10_000_000)
  })

  it('n’a pas d’aire commune : chaque hypothèse a son propre versement', () => {
    const { result } = analyse(draft({ mode: 'target', targetText: '50000' }))
    expect(result?.contributed).toBe(null)
  })

  it('demande la cible plutôt que de tracer une courbe à zéro', () => {
    const { result, missing } = analyse(draft({ mode: 'target', targetText: '' }))
    expect(result).toBe(null)
    expect(missing).toBe(projection.targetMissing)
  })

  it('dit qu’il n’y a rien à verser quand le capital de départ suffit', () => {
    const { result } = analyse(
      draft({ mode: 'target', targetText: '1000', initialText: '5000', years: 10 }),
    )
    expect(result?.targetReached).toBe(true)
    expect(result?.scenarios[0]?.monthly).toBe(0)
  })
})

describe('euros constants', () => {
  it('ne change rien tant que la case est décochée', () => {
    const courants = analyse(draft({ monthlyText: '100', inflationText: '2', constant: false }))
    expect(courants.result?.inflationBp).toBe(0)
  })

  it('déflate l’arrivée une fois la case cochée', () => {
    const courants = analyse(draft({ monthlyText: '100', constant: false }))
    const constants = analyse(draft({ monthlyText: '100', constant: true, inflationText: '2' }))
    const nominal = courants.result?.scenarios[0]?.series.balance.at(-1) ?? 0
    const reel = constants.result?.scenarios[0]?.series.balance.at(-1) ?? 0
    expect(reel).toBeLessThan(nominal)
  })

  it('fait arriver la courbe sur la cible tapée, et non dessous', () => {
    // La cible est réinflatée avant le calcul : quelqu'un qui lit en euros
    // d'aujourd'hui et tape « 100 000 € » parle du pouvoir d'achat qu'il
    // connaît, pas d'un nombre affiché sur un relevé dans vingt ans.
    const { result } = analyse(
      draft({ mode: 'target', targetText: '100000', years: 20, constant: true, inflationText: '2' }),
    )
    expect(result?.scenarios[0]?.series.balance.at(-1)).toBeGreaterThanOrEqual(10_000_000)
    expect((result?.scenarios[0]?.series.balance.at(-1) ?? 0) - 10_000_000).toBeLessThan(100_000)
  })
})

describe('le confort local', () => {
  it('retrouve les derniers réglages', () => {
    const saved = draft({ years: 7, customYears: true, monthlyText: '325', constant: true })
    writeDraft(saved)
    expect(readDraft()).toEqual(saved)
  })

  it('ramène le champ de durée avec une durée qui n’est pas un raccourci', () => {
    // Sans lui, sept ans reviendraient à l'écran sans rien pour les relire, et
    // le premier appui sur une pilule les écraserait sans qu'on ait pu voir ce
    // qu'ils valaient.
    writeDraft(draft({ years: 7, customYears: false }))
    expect(readDraft().customYears).toBe(true)
    writeDraft(draft({ years: 10, customYears: false }))
    expect(readDraft().customYears).toBe(false)
  })

  it('garde l’origine choisie, et refuse une origine illisible', () => {
    writeDraft(draft({ source: { kind: 'support', id: 's-1' } }))
    expect(readDraft().source).toEqual({ kind: 'support', id: 's-1' })

    localStorage.setItem(
      PROJECTION_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_DRAFT, source: { kind: 'support' } }),
    )
    expect(readDraft().source).toEqual({ kind: 'free' })
  })

  it('retombe sur les valeurs par défaut quand rien n’a été gardé', () => {
    expect(readDraft()).toEqual(DEFAULT_DRAFT)
  })

  it('revalide tout ce qui vient du stockage', () => {
    // `localStorage` s'édite depuis la console : une durée absurde et quarante
    // scénarios ne doivent pas casser l'écran.
    localStorage.setItem(
      PROJECTION_STORAGE_KEY,
      JSON.stringify({
        mode: 'ailleurs',
        years: 900,
        scenarios: Array.from({ length: 40 }, () => ({ rateText: '5', kind: 'assumed' })),
        constant: 'oui',
      }),
    )
    const read = readDraft()
    expect(read.mode).toBe('forecast')
    expect(read.years).toBe(DEFAULT_DRAFT.years)
    expect(read.scenarios).toHaveLength(3)
    expect(read.constant).toBe(false)
  })

  it('survit à un JSON abîmé', () => {
    localStorage.setItem(PROJECTION_STORAGE_KEY, '{oups')
    expect(readDraft()).toEqual(DEFAULT_DRAFT)
  })

  it('ne garde jamais un défaut prudent qui ressemblerait à un rendement promis', () => {
    // 3 %, et une *hypothèse* : écrire un taux garanti reviendrait à annoncer
    // celui d'un produit, révisé deux fois par an et donc faux dans six mois.
    expect(DEFAULT_DRAFT.scenarios).toEqual([{ id: 'a', rateText: '3', kind: 'assumed' }])
  })
})

describe('emplacements de scénario', () => {
  it('en propose trois, puis plus aucun', () => {
    expect(nextSlot([])).toBe('a')
    expect(nextSlot([{ id: 'a', rateText: '', kind: 'assumed' }])).toBe('b')
    expect(
      nextSlot([
        { id: 'a', rateText: '', kind: 'assumed' },
        { id: 'b', rateText: '', kind: 'assumed' },
        { id: 'c', rateText: '', kind: 'assumed' },
      ]),
    ).toBe(null)
  })

  it('reprend un emplacement libéré au milieu', () => {
    expect(
      nextSlot([
        { id: 'a', rateText: '', kind: 'assumed' },
        { id: 'c', rateText: '', kind: 'assumed' },
      ]),
    ).toBe('b')
  })
})

describe('quand l’origine est l’épargne réelle', () => {
  const start = (over: Partial<ProjectionStart> = {}): ProjectionStart => ({
    capital: eur(845_000),
    monthly: eur(35_000),
    valued: 1,
    unvalued: 0,
    rules: 1,
    ending: 0,
    variable: false,
    parts: [],
    ...over,
  })
  const linked = draft({ source: { kind: 'member', id: 'm-1' } })

  it('projette le capital et les versements lus, et non les champs de saisie', () => {
    // Les deux champs gardent ce qu'on y avait tapé — c'est du confort local,
    // pas une donnée du foyer — mais ils ne pilotent plus rien.
    const { result } = analyse({ ...linked, initialText: '1', monthlyText: '2' }, start())
    expect(result?.initial).toBe(845_000)
    expect(result?.monthly).toBe(35_000)
  })

  it('part d’un capital nul quand rien n’a jamais été relevé, sans crier à l’erreur', () => {
    // Il n'y a pas eu de saisie : il ne peut donc pas y avoir de faute de
    // saisie. L'écran le *dit*, il ne le signale pas en rouge.
    const { errors, result } = analyse(linked, start({ capital: null }))
    expect(errors.initial).toBeUndefined()
    expect(result?.initial).toBe(0)
  })

  it('ne lit pas les champs comme illisibles quand ils ne servent pas', () => {
    const { errors } = analyse({ ...linked, monthlyText: 'beaucoup' }, start())
    expect(errors.monthly).toBeUndefined()
  })

  it('ne reprend le capital que, en mode inverse : le versement est la réponse', () => {
    const { result } = analyse(
      { ...linked, mode: 'target', targetText: '100000', years: 10 },
      start(),
    )
    expect(result?.initial).toBe(845_000)
    expect(result?.monthly).toBe(null)
  })
})

describe('la décomposition du résultat', () => {
  it('sépare ce qu’il y avait, ce qu’on a mis, et ce que le taux a ajouté', () => {
    const { result } = analyse(
      draft({ initialText: '1000', monthlyText: '100', years: 10 }),
    )
    const series = result?.scenarios[0]?.series
    if (series === undefined || result === undefined || result === null) throw new Error('pas de série')
    const split = breakdownOf(series, result.months)

    expect(split.initial).toBe(100_000)
    expect(split.paid).toBe(120 * 10_000)
    // Les trois se recomposent exactement : il n'existe pas de second calcul.
    expect(split.initial + split.paid + split.interest).toBe(split.total)
    expect(split.share).toBeCloseTo(split.interest / split.total, 10)
  })

  it('ne met pas un total nul en fraction', () => {
    const empty = { balance: [], contributed: [] }
    expect(breakdownOf(empty, 0).share).toBe(null)
  })
})

describe('l’échelle des efforts', () => {
  it('range quatre versements autour de celui qu’on simule, et le marque', () => {
    const { result } = analyse(draft({ monthlyText: '200', years: 10 }))
    if (result === null) throw new Error('pas de résultat')
    const rungs = effortLadder(result, result.scenarios[0])

    expect(rungs.map((rung) => rung.monthly)).toEqual([10_000, 20_000, 30_000, 40_000])
    expect(rungs.filter((rung) => rung.current)).toHaveLength(1)
    expect(rungs.find((rung) => rung.current)?.monthly).toBe(20_000)
  })

  it('monte avec l’effort, et retrouve la projection de l’écran au barreau courant', () => {
    const { result } = analyse(draft({ monthlyText: '200', years: 10 }))
    if (result === null) throw new Error('pas de résultat')
    const rungs = effortLadder(result, result.scenarios[0])
    const current = rungs.find((rung) => rung.current)

    expect(current?.arrival).toBe(result.scenarios[0]?.series.balance.at(-1))
    for (let i = 1; i < rungs.length; i += 1) {
      expect(rungs[i]?.arrival ?? 0).toBeGreaterThan(rungs[i - 1]?.arrival ?? 0)
    }
  })

  it('garde le versement simulé à son montant exact, jamais arrondi', () => {
    const { result } = analyse(draft({ monthlyText: '327,40', years: 10 }))
    if (result === null) throw new Error('pas de résultat')
    expect(effortLadder(result, result.scenarios[0]).find((r) => r.current)?.monthly).toBe(32_740)
  })

  it('n’a rien à comparer sans versement', () => {
    const { result } = analyse(draft({ monthlyText: '', initialText: '5000' }))
    if (result === null) throw new Error('pas de résultat')
    expect(effortLadder(result, result.scenarios[0])).toEqual([])
  })

  it('se tait en mode inverse : le versement requis répond déjà par l’autre bout', () => {
    const { result } = analyse(draft({ mode: 'target', targetText: '100000' }))
    if (result === null) throw new Error('pas de résultat')
    expect(effortLadder(result, result.scenarios[0])).toEqual([])
  })
})

describe('un portefeuille dont les supports ont chacun leur taux', () => {
  const part = (over: Partial<ProjectionPart> = {}): ProjectionPart => ({
    supportId: 's-1',
    label: 'Livret A',
    capital: eur(100_000),
    monthly: eur(10_000),
    rateBp: 200,
    rateKind: 'assumed',
    ...over,
  })
  const portfolio = (parts: ProjectionPart[]): ProjectionStart => ({
    capital: eur(parts.reduce((n, p) => n + (p.capital ?? 0), 0)),
    monthly: eur(parts.reduce((n, p) => n + p.monthly, 0)),
    valued: parts.length,
    unvalued: 0,
    rules: parts.length,
    ending: 0,
    variable: false,
    parts,
  })
  const linked = draft({ source: { kind: 'member', id: 'm-1' } })

  it('trace une colonne par support, et leur somme est la courbe de l’écran', () => {
    const { result } = analyse(
      linked,
      portfolio([part(), part({ supportId: 's-2', label: 'PEA', rateBp: 600 })]),
    )
    if (result === null) throw new Error('pas de résultat')

    expect(result.split.map((one) => one.label)).toEqual(['Livret A', 'PEA'])
    // Un seul moteur : le total *est* la somme des colonnes, rang par rang.
    const summed = result.split.reduce(
      (total, one) => total + (one.series.balance.at(-1) ?? 0),
      0,
    )
    expect(result.scenarios[0]?.series.balance.at(-1)).toBe(summed)
  })

  it('ne suit aucun taux moyen : le portefeuille bat le taux le plus bas', () => {
    const mixed = analyse(
      linked,
      portfolio([part({ rateBp: 200 }), part({ supportId: 's-2', rateBp: 600 })]),
    )
    const flat = analyse(
      linked,
      portfolio([part({ rateBp: 200 }), part({ supportId: 's-2', rateBp: 200 })]),
    )
    expect(mixed.result?.scenarios[0]?.series.balance.at(-1) ?? 0).toBeGreaterThan(
      flat.result?.scenarios[0]?.series.balance.at(-1) ?? 0,
    )
  })

  it('comble avec l’hypothèse de l’écran, et le signale', () => {
    const { result } = analyse(
      { ...linked, scenarios: [{ id: 'a', rateText: '7', kind: 'assumed' }] },
      portfolio([part({ rateBp: null, rateKind: null })]),
    )
    expect(result?.split[0]?.rateBp).toBe(700)
    // `own` dit que le taux est emprunté : la colonne ne le fera pas passer
    // pour celui du support.
    expect(result?.split[0]?.own).toBe(false)
  })

  it('renonce à décomposer dès qu’on compare deux hypothèses', () => {
    // Deux hypothèses veulent dire qu'on compare des portefeuilles entiers ;
    // les mélanger à une décomposition par compte donnerait un tableau dont la
    // moitié des colonnes ne se somment pas.
    const { result } = analyse(
      {
        ...linked,
        scenarios: [
          { id: 'a', rateText: '3', kind: 'assumed' },
          { id: 'b', rateText: '6', kind: 'assumed' },
        ],
      },
      portfolio([part()]),
    )
    expect(result?.split).toEqual([])
  })

  it('ne décompose rien en simulation libre', () => {
    expect(analyse(draft({ monthlyText: '100' })).result?.split).toEqual([])
  })

  it('répartit l’effort supplémentaire au prorata, chaque support à son taux', () => {
    const { result } = analyse(
      linked,
      portfolio([part({ rateBp: 200 }), part({ supportId: 's-2', rateBp: 600 })]),
    )
    if (result === null) throw new Error('pas de résultat')
    const rungs = effortLadder(result, result.scenarios[0])

    // Le barreau courant retrouve exactement la projection de l'écran : sans
    // ça, « Simulation en cours » annoncerait un autre chiffre que le héros.
    expect(rungs.find((rung) => rung.current)?.arrival).toBe(
      result.scenarios[0]?.series.balance.at(-1),
    )
    for (let i = 1; i < rungs.length; i += 1) {
      expect(rungs[i]?.arrival ?? 0).toBeGreaterThan(rungs[i - 1]?.arrival ?? 0)
    }
  })
})
