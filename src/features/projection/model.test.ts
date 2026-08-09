import { afterEach, describe, expect, it } from 'vitest'
import { currentYm } from '@/domain/date'
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
  effortAt,
  readDraft,
  writeDraft,
} from './model'

const draft = (patch: Partial<ProjectionDraft> = {}): ProjectionDraft => ({
  ...DEFAULT_DRAFT,
  ...patch,
})

/** Une fourchette refermée : les deux bornes au même taux. */
const flat = (rateText: string): Partial<ProjectionDraft> => ({
  lowText: rateText,
  highText: rateText,
})

const part = (over: Partial<ProjectionPart> = {}): ProjectionPart => ({
  supportId: 's-1',
  label: 'Livret A',
  capital: eur(100_000),
  monthly: eur(10_000),
  rateBp: 200,
  rateKind: 'assumed',
  steps: [{ rateBp: 200, kind: 'assumed', from: '2020-01-01', to: null }],
  cap: null,
  room: null,
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

afterEach(() => {
  localStorage.clear()
})

describe('ce que la saisie donne', () => {
  it('trace ce qu’un versement mensuel devient', () => {
    const { result } = analyse(draft({ monthlyText: '250', years: 20, ...flat('11') }))
    expect(result?.months).toBe(240)
    expect(result?.low.series.balance.at(-1)).toBeCloseTo(20_213_625, -1)
  })

  it('donne la même aire de versements aux deux bornes', () => {
    // Le versé ne dépend pas du taux : c'est ce qui rend l'écart entre l'aire
    // et chaque courbe lisible comme « ce que le taux a produit ».
    const { result } = analyse(draft({ monthlyText: '100', lowText: '2', highText: '7' }))
    expect(result?.contributed).toEqual(result?.high.series.contributed)
  })

  it('signale un montant illisible plutôt que de le lire comme zéro', () => {
    const { errors } = analyse(draft({ initialText: 'beaucoup' }))
    expect(errors.initial).toBe(projection.amountInvalid)
  })

  it('lit un capital de départ vide comme zéro, pas comme une erreur', () => {
    const { errors, result } = analyse(draft({ initialText: '' }))
    expect(errors.initial).toBeUndefined()
    expect(result?.initial).toBe(0)
  })

  it('ne trace rien sans versement ni capital, et dit ce qui manque', () => {
    const { result, missing } = analyse(draft({ initialText: '', monthlyText: '' }))
    expect(result).toBeNull()
    expect(missing).toBe(projection.nothingToPlot)
  })

  it('refuse une durée hors bornes', () => {
    expect(analyse(draft({ years: 0 })).errors.years).toBe(
      tpl(projection.durationInvalid, MIN_YEARS, MAX_YEARS),
    )
    expect(analyse(draft({ years: MAX_YEARS + 1 })).errors.years).toBeDefined()
    expect(analyse(draft({ years: 7 })).errors.years).toBeUndefined()
  })
})

describe('la fourchette', () => {
  /* Ce que trois courbes ne savaient pas faire : montrer l'écart sans demander
     laquelle croire. */
  it('donne deux trajectoires, la haute au-dessus de la basse', () => {
    const { result } = analyse(draft({ monthlyText: '100', years: 20, lowText: '2', highText: '7' }))
    if (result === null) throw new Error('pas de résultat')

    expect(result.single).toBe(false)
    expect(result.high.series.balance.at(-1)).toBeGreaterThan(
      result.low.series.balance.at(-1) ?? 0,
    )
  })

  /* Une fourchette se lit du plus bas au plus haut, quel que soit l'ordre dans
     lequel les deux champs ont été remplis : refuser l'inverse n'apprendrait
     qu'une chose, dans quel ordre l'app veut ses champs. */
  it('se range toute seule quand les deux champs sont inversés', () => {
    const straight = analyse(draft({ lowText: '2', highText: '7' }))
    const swapped = analyse(draft({ lowText: '7', highText: '2' }))
    expect(swapped.result?.low.series.balance).toEqual(straight.result?.low.series.balance)
    expect(swapped.result?.high.series.balance).toEqual(straight.result?.high.series.balance)
  })

  /* Deux bornes égales ne sont pas une fourchette : l'écran doit alors rendre un
     chiffre, et un seul trait. */
  it('se referme quand les deux bornes coïncident', () => {
    const { result } = analyse(draft({ ...flat('3') }))
    expect(result?.single).toBe(true)
  })

  it('signale une borne illisible sans effacer l’autre', () => {
    const { errors } = analyse(draft({ lowText: '2', highText: '450' }))
    expect(errors.low).toBeUndefined()
    expect(errors.high).toBe(tpl(projection.rateInvalid, 100))
  })

  /* Un taux illisible ne vaut pas zéro : il n'y a plus de fourchette du tout,
     donc plus rien à tracer — plutôt qu'une courbe à plat sur une faute de
     frappe. */
  it('ne trace rien tant qu’une borne est illisible', () => {
    expect(analyse(draft({ lowText: 'beaucoup' })).result).toBeNull()
  })

  /* L'étendue affichée est celle des taux qui **courent**, et non celle des deux
     champs : un compte posé sous la borne basse la tire vers lui, et afficher
     les champs à sa place mentirait sur ce que la simulation fait. */
  it('rend l’étendue des taux réellement en jeu', () => {
    const free = analyse(draft({ lowText: '2', highText: '7' }))
    expect(free.result?.rateSpan).toEqual({ low: 200, high: 700 })

    const mixed = analyse(
      { ...linked, lowText: '2', highText: '7' },
      portfolio([
        part({ rateBp: 150 }),
        part({ supportId: 's-2', label: 'PEA', rateBp: null, steps: [] }),
      ]),
    )
    expect(mixed.result?.rateSpan).toEqual({ low: 150, high: 700 })
  })
})

describe('mode inverse', () => {
  it('rend le versement requis à chaque borne, et le range par ce qu’il coûte', () => {
    const { result } = analyse(
      draft({ mode: 'target', targetText: '50000', years: 10, lowText: '2', highText: '7' }),
    )
    if (result === null) throw new Error('pas de résultat')

    expect(result.target).toBe(5_000_000)
    expect(result.monthly).toBeNull()
    /* Un rendement plus haut demande de verser moins : la borne « basse » de la
       réponse est donc celle du taux le plus haut, sans quoi la fourchette
       s'écrirait à l'envers. */
    expect(result.low.monthly).toBeLessThan(result.high.monthly)
  })

  it('n’a pas d’aire commune : chaque borne a son propre versement', () => {
    const { result } = analyse(draft({ mode: 'target', targetText: '50000' }))
    expect(result?.contributed).toBeNull()
  })

  it('demande la cible plutôt que de tracer une courbe à zéro', () => {
    const { result, missing } = analyse(draft({ mode: 'target', targetText: '' }))
    expect(result).toBeNull()
    expect(missing).toBe(projection.targetMissing)
  })

  it('dit qu’il n’y a rien à verser quand le capital de départ suffit', () => {
    const { result } = analyse(
      draft({ mode: 'target', initialText: '60000', targetText: '50000', years: 10 }),
    )
    expect(result?.targetReached).toBe(true)
    expect(result?.low.monthly).toBe(0)
  })
})

describe('euros constants', () => {
  it('ne change rien tant que la case est décochée', () => {
    const { result } = analyse(draft({ inflationText: '2', constant: false }))
    expect(result?.inflationBp).toBe(0)
  })

  it('déflate l’arrivée une fois la case cochée', () => {
    const nominal = analyse(draft({ monthlyText: '100', years: 20 }))
    const real = analyse(draft({ monthlyText: '100', years: 20, constant: true }))
    expect(real.result?.low.series.balance.at(-1)).toBeLessThan(
      nominal.result?.low.series.balance.at(-1) ?? 0,
    )
  })

  it('fait arriver la courbe sur la cible tapée, et non dessous', () => {
    const { result } = analyse(
      draft({
        mode: 'target',
        targetText: '50000',
        years: 10,
        constant: true,
        ...flat('3'),
      }),
    )
    expect(result?.low.series.balance.at(-1)).toBeCloseTo(5_000_000, -3)
  })
})

describe('le confort local', () => {
  it('retrouve les derniers réglages', () => {
    writeDraft(draft({ years: 7, lowText: '1', highText: '4' }))
    expect(readDraft().years).toBe(7)
    expect(readDraft().lowText).toBe('1')
    expect(readDraft().highText).toBe('4')
  })

  it('garde l’origine choisie, et refuse une origine illisible', () => {
    writeDraft(draft({ source: { kind: 'support', id: 's-1' } }))
    expect(readDraft().source).toEqual({ kind: 'support', id: 's-1' })

    localStorage.setItem(
      PROJECTION_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_DRAFT, source: { kind: 'planet', id: 'x' } }),
    )
    expect(readDraft().source).toEqual({ kind: 'free' })
  })

  it('retombe sur les valeurs par défaut quand rien n’a été gardé', () => {
    expect(readDraft()).toEqual(DEFAULT_DRAFT)
  })

  /* `localStorage` s'édite depuis la console du navigateur : ce qui en sort
     traverse la même méfiance qu'un document importé. */
  it('revalide tout ce qui vient du stockage', () => {
    localStorage.setItem(
      PROJECTION_STORAGE_KEY,
      JSON.stringify({
        mode: 'nawak',
        years: 900,
        lowText: 'x'.repeat(200),
        supportRates: [{ supportId: 42 }, { supportId: 's-1', rateText: '4' }],
      }),
    )
    const kept = readDraft()
    expect(kept.mode).toBe('forecast')
    expect(kept.years).toBe(DEFAULT_DRAFT.years)
    expect(kept.lowText).toBe(DEFAULT_DRAFT.lowText)
    expect(kept.supportRates).toEqual([{ supportId: 's-1', rateText: '4', kind: 'assumed' }])
  })

  /* Les champs de l'ancienne forme du brouillon ne sont plus lus, et les
     nouveaux retombent sur leur défaut : c'est ce que cette lecture champ par
     champ fait déjà de n'importe quelle saleté. */
  it('ignore un brouillon d’avant la fourchette sans rien casser', () => {
    localStorage.setItem(
      PROJECTION_STORAGE_KEY,
      JSON.stringify({ years: 15, scenarios: [{ id: 'a', rateText: '9', kind: 'assumed' }] }),
    )
    const kept = readDraft()
    expect(kept.years).toBe(15)
    expect(kept.lowText).toBe(DEFAULT_DRAFT.lowText)
    expect(kept.highText).toBe(DEFAULT_DRAFT.highText)
  })

  it('survit à un JSON abîmé', () => {
    localStorage.setItem(PROJECTION_STORAGE_KEY, '{oups')
    expect(readDraft()).toEqual(DEFAULT_DRAFT)
  })

  /* Un défaut flatteur est le tour de passe-passe des simulateurs de vente :
     celui-ci est modeste et large des deux côtés. */
  it('ne propose jamais un défaut qui ressemblerait à un rendement promis', () => {
    expect(Number(DEFAULT_DRAFT.highText)).toBeLessThanOrEqual(5)
    expect(Number(DEFAULT_DRAFT.lowText)).toBeLessThan(Number(DEFAULT_DRAFT.highText))
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

  it('ne reprend que le capital en mode inverse : le versement est la réponse', () => {
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
    const { result } = analyse(draft({ initialText: '1000', monthlyText: '100', years: 10 }))
    if (result === null) throw new Error('pas de résultat')

    const breakdown = breakdownOf(result.low.series, result.months)
    expect(breakdown.initial).toBe(100_000)
    expect(breakdown.paid).toBe(120 * 10_000)
    expect(breakdown.interest).toBe(
      breakdown.total - breakdown.initial - breakdown.paid,
    )
    expect(breakdown.share).toBeGreaterThan(0)
  })

  it('ne met pas un total nul en fraction', () => {
    expect(breakdownOf({ balance: [], contributed: [] }, 0).share).toBeNull()
  })
})

describe('un portefeuille dont les comptes ont chacun leur taux', () => {
  it('trace une part par compte, et leur somme est la courbe de l’écran', () => {
    const { result } = analyse(
      linked,
      portfolio([part(), part({ supportId: 's-2', label: 'PEA', rateBp: 600 })]),
    )
    if (result === null) throw new Error('pas de résultat')

    expect(result.split.map((one) => one.label)).toEqual(['Livret A', 'PEA'])
    // Un seul moteur : le total *est* la somme des parts, rang par rang.
    const summed = result.split.reduce((total, one) => total + (one.series.balance.at(-1) ?? 0), 0)
    expect(result.low.series.balance.at(-1)).toBe(summed)
  })

  /* Le cœur du modèle : la fourchette ne se pose pas uniformément sur un
     portefeuille, elle se pose là où l'app ne sait pas. */
  it('referme la fourchette sur les comptes qui portent leur taux', () => {
    const { result } = analyse(
      { ...linked, lowText: '2', highText: '7' },
      portfolio([part({ rateBp: 240 })]),
    )
    expect(result?.single).toBe(true)
    expect(result?.split[0]?.rateBp).toBe(240)
    expect(result?.split[0]?.highBp).toBe(240)
  })

  it('l’ouvre sur les comptes qui n’en portent aucun', () => {
    const { result } = analyse(
      { ...linked, lowText: '2', highText: '7' },
      portfolio([part({ rateBp: null, steps: [] })]),
    )
    if (result === null) throw new Error('pas de résultat')

    expect(result.single).toBe(false)
    expect(result.split[0]?.origin).toBe('screen')
    expect(result.split[0]?.rateBp).toBe(200)
    expect(result.split[0]?.highBp).toBe(700)
  })

  /* Un compte muet à côté d'un compte renseigné : l'écart ne porte que sur le
     premier, et le total du bas reste celui des taux posés. */
  it('n’écarte que ce qui est incertain', () => {
    const { result } = analyse(
      { ...linked, lowText: '2', highText: '7' },
      portfolio([
        part({ rateBp: 240 }),
        part({ supportId: 's-2', label: 'PEA', rateBp: null, steps: [] }),
      ]),
    )
    if (result === null) throw new Error('pas de résultat')

    const [livret, pea] = result.split
    expect(livret?.series.balance.at(-1)).toBe(livret?.highSeries.balance.at(-1))
    expect(pea?.highSeries.balance.at(-1)).toBeGreaterThan(pea?.series.balance.at(-1) ?? 0)
  })

  it('ne décompose rien en simulation libre', () => {
    expect(analyse(draft()).result?.split).toEqual([])
  })

  /* Un trait plein n'est permis que si **tout** ce qui court est contractuel :
     un seul compte muet, et l'ensemble redevient une hypothèse. */
  it('ne se dit garanti que si tout l’est', () => {
    const all = analyse(
      linked,
      portfolio([part({ rateKind: 'guaranteed' }), part({ supportId: 's-2', rateKind: 'guaranteed' })]),
    )
    expect(all.result?.guaranteed).toBe(true)

    const one = analyse(
      linked,
      portfolio([part({ rateKind: 'guaranteed' }), part({ supportId: 's-2', rateBp: null, steps: [] })]),
    )
    expect(one.result?.guaranteed).toBe(false)
  })
})

describe('un taux essayé sur un compte', () => {
  it('l’emporte sur le taux du compte, qui l’emporte sur la fourchette', () => {
    const tried = analyse(
      {
        ...linked,
        supportRates: [{ supportId: 's-1', rateText: '9', kind: 'assumed' }],
      },
      portfolio([part()]),
    )
    expect(tried.result?.split[0]?.origin).toBe('simulated')
    expect(tried.result?.split[0]?.rateBp).toBe(900)
    /* Un taux qu'on affirme ferme la fourchette, comme un taux posé : on vient
       de dire ce que ce compte rapporte. */
    expect(tried.result?.single).toBe(true)
  })

  it('ne touche pas un compte qu’il ne désigne pas', () => {
    const { result } = analyse(
      { ...linked, supportRates: [{ supportId: 'ailleurs', rateText: '9', kind: 'assumed' }] },
      portfolio([part()]),
    )
    expect(result?.split[0]?.origin).toBe('own')
    expect(result?.split[0]?.rateBp).toBe(200)
  })

  it('retombe sur le taux du compte quand le champ est vide ou illisible', () => {
    for (const rateText of ['', 'beaucoup']) {
      const { result } = analyse(
        { ...linked, supportRates: [{ supportId: 's-1', rateText, kind: 'assumed' }] },
        portfolio([part()]),
      )
      expect(result?.split[0]?.origin).toBe('own')
    }
  })

  /* « Et si celui-ci rendait 4 % » ne peut pas cohabiter avec une révision
     datée qui viendrait le contredire au rang 14. */
  it('remplace le barème entier, sans laisser une révision le contredire', () => {
    const { result } = analyse(
      { ...linked, supportRates: [{ supportId: 's-1', rateText: '9', kind: 'assumed' }] },
      portfolio([
        part({
          steps: [
            { rateBp: 200, kind: 'assumed', from: '2020-01-01', to: '2030-01-01' },
            { rateBp: 50, kind: 'assumed', from: '2030-01-01', to: null },
          ],
        }),
      ]),
    )
    expect(result?.split[0]?.schedule).toBe(900)
    expect(result?.split[0]?.dated).toBe(false)
  })
})

describe('un compte dont le taux change en route', () => {
  const nextYearStart = (): string => `${String(Number(currentYm().slice(0, 4)) + 1)}-01-01`

  const dated = (from: string): ProjectionPart =>
    part({
      label: 'Assurance-vie',
      capital: eur(1_000_000),
      rateBp: 400,
      steps: [
        { rateBp: 400, kind: 'assumed', from: '2020-01-01', to: from },
        { rateBp: 100, kind: 'assumed', from, to: null },
      ],
    })

  it('applique la révision, et le signale', () => {
    const soon = analyse({ ...linked, years: 10 }, portfolio([dated(nextYearStart())]))
    const never = analyse({ ...linked, years: 10 }, portfolio([dated('2099-01-01')]))

    expect(soon.result?.split[0]?.dated).toBe(true)
    expect(never.result?.split[0]?.dated).toBe(false)
    expect(soon.result?.low.series.balance.at(-1)).toBeLessThan(
      never.result?.low.series.balance.at(-1) ?? 0,
    )
  })
})

describe('un compte plafonné', () => {
  const capped = (over: Partial<ProjectionPart> = {}): ProjectionPart =>
    part({
      capital: eur(2_000_000),
      monthly: eur(30_000),
      rateBp: 300,
      steps: [{ rateBp: 300, kind: 'assumed', from: '2020-01-01', to: null }],
      cap: eur(2_295_000),
      room: eur(295_000),
      ...over,
    })
  const decade = draft({ source: { kind: 'member', id: 'm-1' }, years: 10 })

  it('arrête les versements au plafond, et le signale', () => {
    const { result } = analyse(decade, portfolio([capped()]))
    // 300 €/mois sur dix ans, mais 2 950 € de place : le versé s'y arrête.
    expect(result?.split[0]?.series.contributed.at(-1)).toBe(2_000_000 + 295_000)
    expect(result?.split[0]?.capped).toBe(true)
  })

  it('laisse le capital croître au-delà du plafond', () => {
    const { result } = analyse(decade, portfolio([capped()]))
    expect(result?.split[0]?.series.balance.at(-1)).toBeGreaterThan(2_295_000)
  })

  it('ne signale rien quand le plafond ne coupe rien', () => {
    const { result } = analyse(decade, portfolio([capped({ room: eur(9_000_000) })]))
    expect(result?.split[0]?.capped).toBe(false)
  })

  it('ne signale rien sur un compte qu’on vide', () => {
    const { result } = analyse(decade, portfolio([capped({ monthly: eur(-10_000) })]))
    expect(result?.split[0]?.capped).toBe(false)
  })

  it('borne aussi ce que l’effort ajoute', () => {
    const { result } = analyse(decade, portfolio([capped()]))
    if (result === null) throw new Error('pas de résultat')

    /* Verser deux fois plus sur un compte presque plein ne donne pas deux fois
       plus : la place restante est la même, et le plafond la tient. Ce qui
       change n'est que la **date** à laquelle elle est consommée — les mêmes
       2 950 € versés plus tôt capitalisent un peu plus longtemps —, et c'est
       exactement ce qu'un calcul qui ignorerait le plafond ne dirait pas. */
    const here = effortAt(result, eur(30_000))
    const twice = effortAt(result, eur(60_000))
    expect(twice.low).toBeGreaterThan(here.low)
    expect(twice.low - here.low).toBeLessThan(here.low * 0.01)
    expect(twice.parts[0]?.arrival).toBe(twice.low)
  })
})

describe('« et si je versais… »', () => {
  it('monte avec l’effort, et retrouve la projection de l’écran au montant simulé', () => {
    const { result } = analyse(draft({ monthlyText: '100', years: 10 }))
    if (result === null) throw new Error('pas de résultat')

    const same = effortAt(result, eur(10_000))
    expect(same.low).toBe(result.low.series.balance.at(-1))
    expect(same.high).toBe(result.high.series.balance.at(-1))
    expect(effortAt(result, eur(20_000)).low).toBeGreaterThan(same.low)
  })

  /* La fourchette suit l'effort : un écart unique posé sous une arrivée qui est
     une fourchette se lirait comme une promesse. */
  it('rend les deux bornes de l’arrivée', () => {
    const { result } = analyse(draft({ monthlyText: '100', years: 20, lowText: '2', highText: '7' }))
    if (result === null) throw new Error('pas de résultat')

    const tried = effortAt(result, eur(20_000))
    expect(tried.high).toBeGreaterThan(tried.low)
  })

  it('n’a rien à comparer sans versement', () => {
    const { result } = analyse(draft({ initialText: '1000', monthlyText: '0' }))
    if (result === null) throw new Error('pas de résultat')
    expect(effortAt(result, eur(10_000))).toEqual({ low: 0, high: 0, parts: [] })
  })

  /* Sur un portefeuille décomposé, l'effort se répartit au prorata et chaque
     compte garde son taux : sans le détail, on saurait combien verser sans
     savoir où. */
  it('répartit l’effort au prorata, chaque compte à son taux', () => {
    const { result } = analyse(
      linked,
      portfolio([part(), part({ supportId: 's-2', label: 'PEA', monthly: eur(30_000), rateBp: 600 })]),
    )
    if (result === null) throw new Error('pas de résultat')

    const doubled = effortAt(result, eur(80_000))
    expect(doubled.parts.map((one) => one.monthly)).toEqual([20_000, 60_000])
    expect(doubled.low).toBe(
      doubled.parts.reduce((total, one) => total + one.arrival, 0),
    )
  })
})
