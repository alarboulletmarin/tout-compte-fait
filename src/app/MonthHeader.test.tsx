import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { today, ymOf } from '@/domain/date'
import { formatYearMonth, tpl } from '@/i18n/format'
import { t } from '@/i18n/strings'
import { useStore } from '@/store/store'
import { MonthHeader } from './MonthHeader'

const current = ymOf(today())

const backButton = () => screen.queryByRole('button', { name: t.shell.thisMonth })

describe('MonthHeader — retour au mois courant', () => {
  afterEach(() => {
    useStore.getState().setYm(current)
  })

  /* DS §6 : « Rien → aucun repère. C'est cette règle-là qui rend les trois
     autres lisibles. » Un bouton qui ne bougerait rien apprend à ignorer ceux
     qui bougent quelque chose. */
  it('n’existe pas quand on y est déjà', () => {
    useStore.getState().setYm(current)
    render(<MonthHeader />)
    expect(backButton()).not.toBeInTheDocument()
  })

  it('apparaît dès qu’on s’en éloigne', () => {
    useStore.getState().setYm('2025-02')
    render(<MonthHeader />)
    expect(backButton()).toBeInTheDocument()
  })

  it('ramène au mois courant, et s’efface derrière lui', async () => {
    useStore.getState().setYm('2025-02')
    render(<MonthHeader />)

    await userEvent.click(backButton() as HTMLElement)

    expect(useStore.getState().ym).toBe(current)
    expect(backButton()).not.toBeInTheDocument()
  })

  /* Le mois d'arrivée se dit avant le clic — mais en description et non dans le
     libellé : le nom accessible d'un bouton doit contenir son texte visible. */
  it('nomme le mois d’arrivée en infobulle, sans changer son nom accessible', () => {
    useStore.getState().setYm('2025-02')
    render(<MonthHeader />)

    expect(backButton()).toHaveAttribute(
      'title',
      tpl(t.shell.thisMonthTitle, formatYearMonth(current)),
    )
  })
})
