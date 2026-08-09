import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { money } from '@/domain/money'
import {
  makeCategory,
  makeData,
  makeEntry,
  makeFamily,
  makeMember,
} from '@/domain/fixtures'
import { t } from '@/i18n/strings'
import { formatDayFull } from '@/i18n/format'
import { ALL_FILTER, useStore } from '@/store/store'
import { EntriesSection } from './EntriesSection'

const FAMILIES = [
  makeFamily({ id: 'fam-home', label: 'Logement', kind: 'charge' }),
  makeFamily({ id: 'fam-food', label: 'Vie courante', kind: 'charge' }),
]

const CATEGORIES = [
  makeCategory({ id: 'cat-rent', label: 'Loyer', familyId: 'fam-home' }),
  makeCategory({ id: 'cat-food', label: 'Courses', familyId: 'fam-food' }),
]

const ENTRIES = [
  makeEntry({ date: '2026-08-03', label: 'Loyer', categoryId: 'cat-rent', amount: money(90000) }),
  makeEntry({
    date: '2026-08-05',
    label: 'Courses',
    categoryId: 'cat-food',
    amount: money(6500),
    memberId: 'm1',
    note: 'avec la caution',
  }),
]

function setup(family: string | null = null) {
  const onFamily = vi.fn()
  render(
    <EntriesSection
      nature={null}
      onNature={vi.fn()}
      family={family}
      onFamily={onFamily}
      focus={0}
      onOpen={vi.fn()}
    />,
  )
  return { onFamily }
}

describe('la liste du mois', () => {
  beforeEach(() => {
    useStore.setState({
      ym: '2026-08',
      filter: ALL_FILTER,
      data: makeData({
        household: { name: 'Foyer', members: [makeMember({ id: 'm1', name: 'Alix' })] },
        families: FAMILIES,
        categories: CATEGORIES,
        entries: ENTRIES,
      }),
    })
  })

  /* La note se saisissait et ne se relisait nulle part : il fallait rouvrir la
     ligne pour la voir, et rien n'annonçait qu'il y en avait une. */
  it('montre la note d’une ligne, à côté de son membre', () => {
    setup()
    expect(screen.getByText('Alix · avec la caution')).toBeInTheDocument()
  })

  it('ne fabrique pas de sous-libellé quand il n’y a ni membre ni note', () => {
    setup()
    const row = screen.getByText('Loyer').closest('button')
    expect(row).not.toBeNull()
    expect(within(row as HTMLElement).queryByText(/·/)).not.toBeInTheDocument()
  })

  describe('le filtre par poste, venu de « Où part l’argent »', () => {
    it('ne garde que les lignes de la famille visée', () => {
      setup('fam-home')
      expect(screen.getByText('Loyer')).toBeInTheDocument()
      expect(screen.queryByText('Courses')).not.toBeInTheDocument()
    })

    /* Une liste réduite par un geste fait deux écrans plus haut, et qu'aucune
       commande visible ne défait, se lit comme un mois où il manque des
       lignes. */
    it('se nomme et se retire', async () => {
      const { onFamily } = setup('fam-home')
      const chip = screen.getByRole('button', { name: /Logement/ })
      expect(chip).toBeInTheDocument()

      await userEvent.click(chip)
      expect(onFamily).toHaveBeenCalledWith(null)
    })

    it('ne s’annonce pas quand il n’y en a pas', () => {
      setup()
      expect(screen.queryByText(t.month.familyFilter)).not.toBeInTheDocument()
    })
  })

  /* La liste s'ouvrait en entier par jour, ce qui est juste tant qu'on ne
     compte pas la hauteur : une quarantaine de lignes dépliées d'office, tout
     en bas d'une page qui en faisait déjà quatre écrans. Tout replier n'est pas
     la réponse non plus — la section devient un accordéon mort. */
  describe('ce qui est ouvert à l’arrivée', () => {
    /* Seule la date est feinte : `today()` ne lit qu'elle, et fausser les
       minuteries casserait `userEvent` des tests voisins. */
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date(2026, 7, 5, 12))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    const groupOf = (date: string): HTMLDetailsElement => {
      const details = screen.getByText(formatDayFull(date)).closest('details')
      expect(details).not.toBeNull()
      return details as HTMLDetailsElement
    }

    it('n’ouvre que le groupe du jour courant', () => {
      setup()
      expect(groupOf('2026-08-05').open).toBe(true)
      expect(groupOf('2026-08-03').open).toBe(false)
    })

    /* Une accentuation légère, mais jamais portée par la seule nuance : le mot
       dit ce que l'encre pleine laisserait deviner. */
    it('nomme le jour courant', () => {
      setup()
      expect(within(groupOf('2026-08-05')).getByText(t.month.today)).toBeInTheDocument()
      expect(
        within(groupOf('2026-08-03')).queryByText(t.month.today),
      ).not.toBeInTheDocument()
    })

    /* Sur un mois passé ou à venir, « aujourd'hui » n'y est pas — et c'est le
       dernier jour mouvementé qu'on vient voir. */
    it('retombe sur le jour le plus récent hors du mois courant', () => {
      vi.setSystemTime(new Date(2026, 8, 15, 12))
      setup()

      expect(groupOf('2026-08-05').open).toBe(true)
      expect(groupOf('2026-08-03').open).toBe(false)
      expect(screen.queryByText(t.month.today)).not.toBeInTheDocument()
    })

    /* Par poste, l'en-tête porte déjà la réponse : c'est un résumé dans lequel
       on entre, il n'y a pas de groupe à ouvrir d'office. */
    it('n’ouvre rien sur un autre axe', async () => {
      setup()
      vi.useRealTimers()

      await userEvent.click(screen.getByRole('radio', { name: t.month.byCategory }))

      const groups = screen
        .getAllByText(/Loyer|Courses/)
        .map((node) => node.closest('details'))
        .filter((node): node is HTMLDetailsElement => node !== null)
      expect(groups.length).toBeGreaterThan(0)
      expect(groups.every((group) => !group.open)).toBe(true)
    })
  })
})
