import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { eur, makeCategory, makeData, makeEntry, makeFamily, makeMember } from '@/domain/fixtures'
import { type Money, money } from '@/domain/money'
import type { Entry, Recurrence } from '@/domain/types'
import { fr } from '@/i18n/fr'
import { formatMoney } from '@/i18n/format'
import { ALL_FILTER, useStore } from '@/store/store'
import { MemberChargesTile } from './MemberChargesTile'

const initial = useStore.getState().data

const said = (text: string): string => text.replace(/\s+/g, ' ').trim()
/** Ce qu'`Amount` donne à lire d'une sortie, en texte hors de l'œil. */
const out = (value: Money): string =>
  said(`${fr.direction.out.toLowerCase()} ${formatMoney(value, 'EUR')}`)

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

/** 900 € de loyer commun, et 50 € de courses au seul nom d'Alix. */
const RENT = makeEntry({
  date: '2026-08-05',
  label: 'Loyer',
  categoryId: 'loyer',
  amount: eur(90_000),
})
const GROCERIES = makeEntry({
  date: '2026-08-12',
  label: 'Courses',
  categoryId: 'courses',
  amount: eur(5_000),
  memberId: 'm-1',
})

/**
 * Deux revenus au double l'un de l'autre : Alix porte 66,7 % du pot, soit 600 €
 * du loyer, plus ses 50 € de courses — 650 € de charges dans son mois, dont on
 * peut enfin dire ce qui vient d'elle et ce qui vient du foyer.
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
      entries: over.entries ?? [RENT, GROCERIES],
    }),
  })

  render(<MemberChargesTile />)
}

describe('« Perso et commun », ce que le mois coûte et d’où ça vient', () => {
  afterEach(() => {
    useStore.setState({ data: initial })
  })

  /* Le foyer entier n'a pas de perso : la découpe n'existe que du point de vue
     de quelqu'un, et hors filtre elle n'aurait rien à séparer. */
  it('s’efface hors d’un filtre par membre', () => {
    mount()
    expect(screen.queryByText(fr.dashboard.memberCharges)).not.toBeInTheDocument()
  })

  /* Ce que `scopeToMember` fond dans chaque total et que plus rien ne séparait :
     ses lignes à elle d'un côté, sa part du pot de l'autre — et leur somme, qui
     est le chiffre annoncé par la tuile Charges de la même page. */
  it('éclate le coût de son mois en perso et part du commun', () => {
    mount({ filterOn: 'm-1' })

    expect(screen.getByText(out(eur(5_000)))).toBeInTheDocument()
    expect(screen.getByText(out(eur(60_000)))).toBeInTheDocument()
    // Au centre de l'anneau, sans centimes : 650 €, le total de la tuile
    // Charges — elle ne le contredit pas, elle l'éclate.
    expect(
      screen.getByText(
        said(`${fr.direction.out.toLowerCase()} ${formatMoney(eur(65_000), 'EUR', false)}`),
      ),
    ).toBeInTheDocument()
  })

  /* La carte du virement dit ce qu'on verse, celle-ci ce que le mois coûte. Un
     report change le premier et jamais le second (cahier §4.7 ter) : le taire
     ici est ce qui garantit que les deux moitiés redonnent bien la tuile
     Charges voisine. */
  it('ne dit pas un mot du virement ni du report', () => {
    mount({ filterOn: 'm-1' })

    expect(screen.queryByText(fr.dashboard.memberShare)).not.toBeInTheDocument()
    expect(screen.queryByText(fr.split.settlementShare)).not.toBeInTheDocument()
  })

  /* Sans charge commune, « tout est à moi » reste une réponse — et c'est le
     seul endroit qui la donne. La tuile reste donc, l'anneau plein. */
  it('reste debout le mois où rien n’est commun', () => {
    mount({ filterOn: 'm-1', entries: [GROCERIES] })

    expect(screen.getByText(fr.dashboard.memberCharges)).toBeInTheDocument()
    expect(screen.getByText(out(eur(5_000)))).toBeInTheDocument()
  })

  /* Une tuile qui n'a rien à dire ne dit pas zéro, elle s'en va (cahier §4.6). */
  it('s’en va quand le mois ne lui a rien coûté', () => {
    mount({ filterOn: 'm-2', entries: [GROCERIES] })
    expect(screen.queryByText(fr.dashboard.memberCharges)).not.toBeInTheDocument()
  })
})
