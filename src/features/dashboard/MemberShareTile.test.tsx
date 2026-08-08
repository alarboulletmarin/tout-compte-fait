import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { eur, makeCategory, makeData, makeEntry, makeFamily, makeMember } from '@/domain/fixtures'
import { type Money, money } from '@/domain/money'
import type { Entry, Recurrence } from '@/domain/types'
import { t } from '@/i18n/strings'
import { de, formatMonthName, formatMoney, formatSignedMoney, tpl } from '@/i18n/format'
import { ALL_FILTER, useStore } from '@/store/store'
import { MemberShareTile } from './MemberShareTile'

const initial = useStore.getState().data

/* `getByText` normalise les blancs du nœud avant de comparer : l'espace
   insécable étroite qu'`Intl` glisse devant le symbole y devient une espace
   ordinaire. La chaîne attendue, elle, la garde telle quelle. */
const said = (text: string): string => text.replace(/\s+/g, ' ').trim()
const eurs = (value: Money): string => said(formatMoney(value, 'EUR'))
/** Ce qu'`Amount` donne à lire d'une sortie, en texte hors de l'œil. */
const out = (value: Money): string =>
  said(`${t.direction.out.toLowerCase()} ${formatMoney(value, 'EUR')}`)

const FAMILIES = [
  makeFamily({ id: 'fam-charges', label: 'Logement', kind: 'charge' }),
  makeFamily({ id: 'fam-res', label: 'Ressources', kind: 'resource' }),
]

const CATEGORIES = [
  makeCategory({ id: 'loyer', label: 'Loyer', familyId: 'fam-charges' }),
  makeCategory({ id: 'courses', label: 'Courses', familyId: 'fam-charges' }),
  makeCategory({ id: 'salaire', label: 'Salaire', familyId: 'fam-res', direction: 'in' }),
]

const ALIX = makeMember({ id: 'm-1', name: 'Alix' })
const CAMILLE = makeMember({ id: 'm-2', name: 'Camille', color: 'var(--member-2)' })

function salary(memberId: string, amount: Money): Recurrence {
  return {
    id: `rec-${memberId}`,
    label: 'Salaire',
    categoryId: 'salaire',
    memberId,
    direction: 'in',
    amount,
    startedOn: '2026-01-01',
    period: { unit: 'month', every: 1, anchorDay: 1 },
  }
}

/** Le loyer commun d'août, et les 300 € qu'Alix a avancés seule en juillet. */
const RENT = makeEntry({
  date: '2026-08-05',
  label: 'Loyer',
  categoryId: 'loyer',
  amount: eur(90_000),
})
const ADVANCED = makeEntry({
  date: '2026-07-05',
  label: 'Loyer',
  categoryId: 'loyer',
  amount: eur(30_000),
  memberId: 'm-1',
  shared: true,
})

/**
 * Deux revenus au double l'un de l'autre — parts 66,7 / 33,3 —, 900 € de loyer
 * commun en août et 300 € avancés par Alix en juillet. Sa part vaut donc 600 €,
 * son report −100 €, et elle verse 500 €. Chaque chiffre se vérifie de tête.
 */
function mount(over: { filterOn?: string; entries?: Entry[] } = {}): void {
  useStore.setState({
    ym: '2026-08',
    filter:
      over.filterOn === undefined ? ALL_FILTER : { kind: 'member', memberId: over.filterOn },
    data: makeData({
      household: { name: 'Foyer', members: [ALIX, CAMILLE] },
      families: FAMILIES,
      categories: CATEGORIES,
      recurrences: [salary('m-1', money(200_000)), salary('m-2', money(100_000))],
      entries: over.entries ?? [RENT, ADVANCED],
    }),
  })

  render(
    <MemoryRouter>
      <MemberShareTile />
    </MemoryRouter>,
  )
}

const july = de(formatMonthName('2026-07'))

describe('« À verser sur le commun », qui ne parle que du virement', () => {
  afterEach(() => {
    useStore.setState({ data: initial })
  })

  /* Une charge commune n'appartient à personne : hors filtre, il n'y a pas de
     virement à demander, et c'est la tuile Répartition qui prend la place. */
  it('s’efface hors d’un filtre par membre', () => {
    mount()
    expect(screen.queryByText(t.dashboard.memberShare)).not.toBeInTheDocument()
  })

  /* L'objet même du changement : le montant du virement, et le calcul qui le
     produit — sa part, plus le report. Rien de ce qu'elle paie pour elle. */
  it('pose sa part et son report, et leur somme en tête', () => {
    mount({ filterOn: 'm-1' })

    expect(screen.getByText(out(eur(50_000)))).toBeInTheDocument()
    expect(screen.getByText(t.split.settlementShare)).toBeInTheDocument()
    expect(screen.getByText(eurs(eur(60_000)))).toBeInTheDocument()
    expect(screen.getByText(tpl(t.split.settlement, july))).toBeInTheDocument()
    expect(screen.getByText(said(formatSignedMoney(eur(-10_000), 'EUR')))).toBeInTheDocument()
  })

  /* Ces deux montants n'étaient pas des virements : le report entrait dans le
     chiffre de tête et pas dans eux, si bien qu'un « Total à payer » s'affichait
     plus petit que le « À verser » posé juste au-dessus. */
  it('ne dit plus un mot des charges perso ni du coût du mois', () => {
    mount({
      filterOn: 'm-1',
      entries: [
        RENT,
        ADVANCED,
        makeEntry({
          date: '2026-08-12',
          label: 'Courses',
          categoryId: 'courses',
          amount: eur(5_000),
          memberId: 'm-1',
        }),
      ],
    })

    expect(screen.queryByText(t.dashboard.memberChargesOwn)).not.toBeInTheDocument()
    // Ses 50 € de courses, et le coût de son mois : ni l'un ni l'autre ici.
    expect(screen.queryByText(out(eur(5_000)))).not.toBeInTheDocument()
    expect(screen.queryByText(out(eur(65_000)))).not.toBeInTheDocument()
  })

  /* Sans report, « Sa part du mois » recopierait à l'identique le chiffre de
     tête, et une régularisation à zéro laisserait croire à un rattrapage là où
     les comptes tombaient justes. */
  it('tait le calcul du mois où il n’y a rien à rattraper', () => {
    mount({ filterOn: 'm-1', entries: [RENT] })

    expect(screen.getByText(out(eur(60_000)))).toBeInTheDocument()
    expect(screen.queryByText(t.split.settlementShare)).not.toBeInTheDocument()
  })

  /* Le cas que la tuile Régularisation couvrait seule, et qui serait tombé avec
     elle : plus aucune charge commune ce mois-ci, mais un report qui attend. Le
     virement n'est plus que lui, et c'est précisément le mois où il faut le
     lire. Alix a trop avancé : le commun lui rend 100 €, et le montant garde
     donc son signe au lieu de s'annoncer comme une sortie. */
  it('reste debout le mois où le report est le seul virement', () => {
    mount({ filterOn: 'm-1', entries: [ADVANCED] })

    expect(screen.getByText(t.dashboard.memberShare)).toBeInTheDocument()
    /* Deux fois : en tête, et sur la ligne du report — le virement *est* le
       report ce mois-ci, et les deux lectures doivent donc coïncider. */
    expect(screen.getAllByText(eurs(money(-10_000)))).toHaveLength(2)
    expect(screen.queryByText(out(money(10_000)))).not.toBeInTheDocument()
  })
})
