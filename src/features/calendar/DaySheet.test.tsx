import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ISODate } from '@/domain/date'
import { t } from '@/i18n/strings'
import { DaySheet } from './DaySheet'

const DAY = '2026-08-08' as ISODate

/* Les trois portes, dans l'ordre de l'écran du mois : ce qu'on lit, ce qu'un
   lecteur d'écran entend, et la nature que le clic emporte. */
const DOORS = [
  [t.entry.newOut, t.entry.addOut, 'out'],
  [t.entry.newIn, t.entry.addIn, 'in'],
  [t.entry.newSaving, t.entry.addSavingAction, 'saving'],
] as const

function open() {
  const onAdd = vi.fn()
  render(
    <DaySheet date={DAY} entries={[]} onOpen={vi.fn()} onAdd={onAdd} onClose={vi.fn()} />,
  )
  return { onAdd }
}

describe('DaySheet — les trois portes de saisie', () => {
  /* Trois pilules grises de largeur égale au bas d'un panneau ont la forme
     exacte d'un `Segmented` : « Dépense » seul se lit comme un filtre. Le verbe
     manque à l'œil, et cette ligne-là est ce qui le rend. */
  it('annonce le geste au-dessus de la rangée', () => {
    open()
    expect(screen.getByText(t.calendar.addLead)).toBeInTheDocument()
  })

  it.each(DOORS)('« %s » ouvre la saisie de la bonne nature', async (_visible, name, nature) => {
    const user = userEvent.setup()
    const { onAdd } = open()

    await user.click(screen.getByRole('button', { name }))
    expect(onAdd).toHaveBeenCalledExactlyOnceWith(nature)
  })

  /* Le nom accessible dit le geste et contient le texte visible — la règle du
     DS §6, que WCAG 2.5.3 pose aussi : sans elle, la saisie vocale sur le mot
     qu'on lit ne trouve pas le bouton qui le porte. La légende, elle, reste
     muette : elle est là pour l'œil, et un lecteur d'écran l'entendrait sinon
     une fois de plus que nécessaire. */
  it.each(DOORS)('nomme « %s » par son geste, sans perdre son libellé', (visible, name) => {
    open()
    const door = screen.getByRole('button', { name })

    expect(door).toHaveTextContent(visible)
    expect(name.toLowerCase()).toContain(visible.toLowerCase())
  })
})
