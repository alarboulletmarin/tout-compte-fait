import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { parseYm, today, ymOf } from '@/domain/date'
import { formatYearMonth, monthName, tpl } from '@/i18n/format'
import { t } from '@/i18n/strings'
import { useStore } from '@/store/store'
import { MonthHeader } from './MonthHeader'

const current = ymOf(today())

/* Le retour vit dans le bloc titre, et le bloc titre n'est un bouton que
   lorsqu'il ramène quelque part : le chercher par son rôle est donc exactement
   la question qu'on veut poser. */
const backButton = () =>
  screen.queryByRole('button', { name: tpl(t.shell.thisMonthTitle, formatYearMonth(current)) })

describe('MonthHeader — retour au mois courant', () => {
  afterEach(() => {
    useStore.getState().setYm(current)
  })

  /* DS §6 : « Rien → aucun repère. C'est cette règle-là qui rend les trois
     autres lisibles. » Un geste qui ne bougerait rien apprend à ignorer ceux
     qui bougent quelque chose — et, posé sur un titre, il annoncerait à un
     lecteur d'écran une action qui n'existe pas. */
  it('n’existe pas quand on y est déjà', () => {
    useStore.getState().setYm(current)
    render(<MonthHeader />)
    expect(backButton()).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /revenir/i })).not.toBeInTheDocument()
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

  /* Le mois affiché reste lisible pendant qu'on propose d'en sortir : le design
     remplace le millésime par le retour, ce qui rend « juillet » ambigu douze
     mois en arrière. Les deux cohabitent sur la même ligne. */
  it('garde l’année du mois affiché à côté du retour', () => {
    useStore.getState().setYm('2025-02')
    render(<MonthHeader />)

    const block = backButton() as HTMLElement
    expect(block).toHaveTextContent('2025')
    expect(block).toHaveTextContent(
      tpl(t.shell.returnToShort, monthName(parseYm(current).m)),
    )
  })

  /* Le nom accessible porte l'année de destination, que le texte visible ne dit
     pas — et il contient le texte visible de l'action, ce que le §8 exige. */
  it('nomme le mois d’arrivée en entier, année comprise', () => {
    useStore.getState().setYm('2025-02')
    render(<MonthHeader />)

    expect(backButton()).toHaveAccessibleName(
      tpl(t.shell.thisMonthTitle, formatYearMonth(current)),
    )
  })
})
