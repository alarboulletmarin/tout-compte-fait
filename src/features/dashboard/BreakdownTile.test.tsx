import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { money } from '@/domain/money'
import { makeCategory, makeData, makeEntry, makeFamily } from '@/domain/fixtures'
import { t } from '@/i18n/strings'
import { tpl } from '@/i18n/format'
import { ALL_FILTER, useStore } from '@/store/store'
import { BreakdownTile } from './BreakdownTile'

/* Sept familles pour dépasser le nombre de parts de l'anneau : ce qui reste
   est regroupé sous « Autres », qui n'est pas une famille et ne s'ouvre pas. */
const FAMILIES = Array.from({ length: 8 }, (_, index) =>
  makeFamily({ id: `fam-${index}`, label: `Poste ${index}`, kind: 'charge' }),
)

describe('« Où part l’argent »', () => {
  beforeEach(() => {
    useStore.setState({
      ym: '2026-08',
      filter: ALL_FILTER,
      data: makeData({
        families: FAMILIES,
        categories: FAMILIES.map((family, index) =>
          makeCategory({ id: `cat-${index}`, familyId: family.id }),
        ),
        entries: FAMILIES.map((_, index) =>
          makeEntry({
            date: '2026-08-05',
            label: `Ligne ${index}`,
            categoryId: `cat-${index}`,
            amount: money(10000 - index * 100),
          }),
        ),
      }),
    })
  })

  /* Les deux tuiles de flux mènent depuis longtemps à la liste filtrée sur leur
     nature ; celle-ci ne menait nulle part. Voir « Poste 0 » et vouloir savoir
     ce qu'il contient était un geste sans réponse. */
  it('ouvre chaque part sur les lignes qu’elle compte', async () => {
    const onShowFamily = vi.fn()
    render(<BreakdownTile onShowFamily={onShowFamily} />)

    await userEvent.click(
      screen.getByRole('button', { name: tpl(t.dashboard.showFamily, 'Poste 0') }),
    )
    expect(onShowFamily).toHaveBeenCalledWith('fam-0')
  })

  /* « Autres » n'est pas une famille mais le reste de la liste : l'ouvrir
     promettrait un filtre qui n'existe pas. */
  it('n’ouvre pas le reliquat', () => {
    render(<BreakdownTile onShowFamily={vi.fn()} />)
    expect(screen.getByText(t.common.other)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: tpl(t.dashboard.showFamily, t.common.other) }),
    ).not.toBeInTheDocument()
  })

  /* Sans destination, la légende reste une lecture : un bouton qui ne fait rien
     est pire qu'un texte. */
  it('reste muette quand rien ne l’écoute', () => {
    render(<BreakdownTile />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
