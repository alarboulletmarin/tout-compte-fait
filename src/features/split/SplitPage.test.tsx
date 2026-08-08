import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { type Money, money } from '@/domain/money'
import { eur, makeCategory, makeData, makeEntry, makeFamily, makeMember } from '@/domain/fixtures'
import type { Entry, Period, Recurrence } from '@/domain/types'
import { t } from '@/i18n/strings'
import { de, formatMoney, formatYearMonth, tpl } from '@/i18n/format'
import { ALL_FILTER, useStore } from '@/store/store'
import { SplitPage } from './SplitPage'

const initial = useStore.getState().data

/* `getByText` normalise les blancs du nœud avant de comparer : l'espace
   insécable étroite qu'`Intl` glisse devant le symbole y devient une espace
   ordinaire. La chaîne attendue, elle, la garde telle quelle. */
const said = (text: string): string => text.replace(/\s+/g, ' ').trim()

/** Ce qu'`Amount` donne à lire d'une sortie, en texte hors de l'œil. */
const out = (value: Money): string =>
  said(`${t.direction.out.toLowerCase()} ${formatMoney(value, 'EUR')}`)

const MONTHLY: Period = { unit: 'month', every: 1, anchorDay: 1 }

const FAMILIES = [
  makeFamily({ id: 'fam-charges', label: 'Logement', kind: 'charge' }),
  makeFamily({ id: 'fam-res', label: 'Ressources', kind: 'resource' }),
]

const CATEGORIES = [
  makeCategory({ id: 'loyer', label: 'Loyer', familyId: 'fam-charges' }),
  makeCategory({ id: 'salaire', label: 'Salaire', familyId: 'fam-res', direction: 'in' }),
]

const ALIX = makeMember({ id: 'm-1', name: 'Alix' })
const CAMILLE = makeMember({ id: 'm-2', name: 'Camille', color: 'var(--member-2)' })

/** Un salaire mensuel au nom de quelqu'un — la seule source d'un revenu. */
function salary(memberId: string, amount: Money): Recurrence {
  return {
    id: `rec-${memberId}`,
    label: 'Salaire',
    categoryId: 'salaire',
    memberId,
    direction: 'in',
    amount,
    startedOn: '2026-01-01',
    period: MONTHLY,
  }
}

/**
 * Le foyer d'essai : deux revenus au double l'un de l'autre, une charge commune
 * de 900 € en août, et 300 € avancés par Alix seule en juillet.
 *
 * Les chiffres sont choisis pour que tout tombe rond et que chaque assertion
 * porte sur une valeur qu'on peut vérifier de tête : parts 66,7 / 33,3, dues
 * 600 / 300, report −100 / +100, versements 500 / 400 — dont la somme vaut
 * encore 900. C'est exactement ce que la carte prétend montrer.
 */
function household(over: { members?: typeof ALIX[]; entries?: Entry[] } = {}): void {
  useStore.setState({
    ym: '2026-08',
    filter: ALL_FILTER,
    data: makeData({
      household: { name: 'Foyer', members: over.members ?? [ALIX, CAMILLE] },
      families: FAMILIES,
      categories: CATEGORIES,
      recurrences: [salary('m-1', money(200_000)), salary('m-2', money(100_000))],
      entries: over.entries ?? [
        makeEntry({ date: '2026-08-05', label: 'Loyer', categoryId: 'loyer', amount: eur(90_000) }),
        /* `shared` explicite : une dépense qui porte un membre n'est pas
           commune par défaut, et sans lui il n'y aurait ni avance ni report. */
        makeEntry({
          date: '2026-07-05',
          label: 'Loyer',
          categoryId: 'loyer',
          amount: eur(30_000),
          memberId: 'm-1',
          shared: true,
        }),
      ],
    }),
  })

  render(
    <MemoryRouter>
      <SplitPage />
    </MemoryRouter>,
  )
}

/** La ligne d'un membre dans la carte des parts. */
const rowOf = (name: string): HTMLElement | null => screen.getByText(name).closest('li')

describe('La répartition, dans une carte qui se lit d’un trait', () => {
  afterEach(() => {
    useStore.setState({ data: initial })
  })

  /* L'objet même du changement : le versement se lisait en tête de tuile, avant
     les termes qui le donnent. Un chiffre annoncé avant ses raisons se croit sur
     parole, et c'est précisément ce qu'un partage entre deux personnes ne fait
     pas. C'est l'ordre qui est testé, pas la présence. */
  it('pose le versement après le calcul qui le produit', () => {
    household()

    const text = said(rowOf('Alix')?.textContent ?? '')
    expect(text.indexOf(t.split.income)).toBeGreaterThan(text.indexOf('Alix'))
    expect(text.indexOf(t.split.settlementShare)).toBeGreaterThan(text.indexOf(t.split.income))
    expect(text.indexOf(t.split.due)).toBeGreaterThan(text.indexOf(t.split.settlementShare))
  })

  /* La vérification attendait après deux sections repliables, à deux écrans des
     chiffres qu'elle vérifie — il fallait en retenir deux pour constater qu'ils
     tombent. Elle ferme désormais la carte qu'elle vérifie, et c'est la seule
     place où elle prouve quelque chose. */
  it('ferme la même tuile que les parts', () => {
    household()

    expect(screen.getByText(t.split.checkTotal).closest('section')).toBe(
      screen.getByText('Alix').closest('section'),
    )
  })

  /* L'argument entier de la carte : la somme des versements vaut le pot commun
     au centime, reports compris — ils s'annulent d'un membre à l'autre. Si ces
     montants divergent un jour, l'écran dément à l'affichage ce que la ligne
     du dessous promet. */
  it('rend le total des versements égal au pot commun', () => {
    household()

    expect(screen.getByText(out(eur(50_000)))).toBeInTheDocument() // Alix verse
    expect(screen.getByText(out(eur(40_000)))).toBeInTheDocument() // Camille verse
    /* Trois fois : la tuile du pot commun, la ligne de vérification, et le
       total replié de « Ce qui est partagé ». C'est le même chiffre lu de trois
       façons, et c'est bien ce qu'on veut — la carte le redonne pour qu'on
       n'ait pas à remonter le chercher. */
    expect(screen.getAllByText(out(eur(90_000)))).toHaveLength(3)
    expect(screen.getByText(t.split.checkHint)).toBeInTheDocument()
  })

  /* Sans report, « Sa part du mois » recopierait à l'identique le « À verser »
     juste dessous, et une régularisation à zéro laisserait croire à un
     rattrapage là où les comptes tombaient justes. */
  it('tait le report du mois où il n’y en a pas', () => {
    household({
      entries: [
        makeEntry({ date: '2026-08-05', label: 'Loyer', categoryId: 'loyer', amount: eur(90_000) }),
      ],
    })

    expect(screen.queryByText(t.split.settlementShare)).not.toBeInTheDocument()
    expect(
      screen.queryByText(tpl(t.split.settlement, de(formatYearMonth('2026-07')))),
    ).not.toBeInTheDocument()
    expect(screen.getAllByText(t.split.income)).toHaveLength(2)
    expect(screen.getAllByText(t.split.due)).toHaveLength(2)
  })

  /* Le membre seul porte 100 % sans qu'aucun revenu soit exigé : le sien vaut
     zéro ici, et la rangée justifiée le rendrait bien plus lisible comme une
     donnée que l'ancienne chaîne collée. C'est une absence, pas un chiffre. */
  it('tait le revenu du membre seul, qui porte tout sans en avoir un', () => {
    useStore.setState({
      ym: '2026-08',
      filter: ALL_FILTER,
      data: makeData({
        household: { name: 'Foyer', members: [ALIX] },
        families: FAMILIES,
        categories: CATEGORIES,
        entries: [
          makeEntry({
            date: '2026-08-05',
            label: 'Loyer',
            categoryId: 'loyer',
            amount: eur(90_000),
          }),
        ],
      }),
    })
    render(
      <MemoryRouter>
        <SplitPage />
      </MemoryRouter>,
    )

    expect(screen.getByText(t.split.subtitleSolo)).toBeInTheDocument()
    expect(screen.getByText(said('100,0 %'))).toBeInTheDocument()
    expect(screen.queryByText(t.split.income)).not.toBeInTheDocument()
  })

  /* Le sous-titre vit dans la carte, et il n'y a pas de carte sur un mois sans
     charge commune : il doit alors se dire ailleurs, sans quoi l'écran perdrait
     ce qu'il est en changeant de mois. */
  it('garde son sous-titre sur un mois sans charge commune', () => {
    household({ entries: [] })

    expect(screen.getByText(t.split.subtitle)).toBeInTheDocument()
    expect(screen.getByText(t.split.nothing)).toBeInTheDocument()
    expect(screen.queryByText(t.split.checkTotal)).not.toBeInTheDocument()
    expect(screen.getByText(t.split.method)).toBeInTheDocument()
  })
})
