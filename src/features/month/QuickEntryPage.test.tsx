import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ENTRY_QUICK_PATH, entryNewPath } from '@/app/routes'
import { eur, makeCategory, makeData, makeFamily, makeMember } from '@/domain/fixtures'
import { t } from '@/i18n/strings'
import { useStore } from '@/store/store'
import { QuickEntryPage } from './QuickEntryPage'

const initial = useStore.getState().data

const FAMILIES = [
  makeFamily({ id: 'f-charge', kind: 'charge', label: 'Charges' }),
  makeFamily({ id: 'f-resource', kind: 'resource', label: 'Ressources' }),
]

const CATEGORIES = [
  makeCategory({ id: 'groceries', label: 'Alimentation', familyId: 'f-charge' }),
  makeCategory({ id: 'fuel', label: 'Carburant', familyId: 'f-charge' }),
  makeCategory({ id: 'salary', label: 'Salaires', familyId: 'f-resource', direction: 'in' }),
]

function Url() {
  const { pathname, search } = useLocation()
  return <span data-testid="url">{`${pathname}${search}`}</span>
}

function renderAt(query: string, over: Parameters<typeof makeData>[0] = {}): void {
  useStore.setState({
    ym: '2026-08',
    data: makeData({
      household: { name: 'Maison', members: [makeMember({ id: 'm1', name: 'Alix' })] },
      families: FAMILIES,
      categories: CATEGORIES,
      ...over,
    }),
  })

  render(
    <MemoryRouter initialEntries={[`${ENTRY_QUICK_PATH}${query}`]}>
      <Routes>
        <Route path={ENTRY_QUICK_PATH} element={<QuickEntryPage />} />
        <Route path="*" element={<span>ailleurs</span>} />
      </Routes>
      <Url />
    </MemoryRouter>,
  )
}

const type = async (keys: string): Promise<void> => {
  for (const key of keys) {
    await userEvent.click(screen.getByRole('button', { name: key }))
  }
}

const entries = () => useStore.getState().data.entries

describe('QuickEntryPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 7, 15, 12, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
    useStore.setState({ data: initial })
  })

  it('écrit une dépense confirmée d’un montant et d’une pilule', async () => {
    renderAt('?sens=sortie')

    await type('4250')
    await userEvent.click(screen.getByRole('button', { name: 'Alimentation' }))
    await userEvent.click(screen.getByRole('button', { name: t.entry.addOut }))

    expect(entries()).toHaveLength(1)
    expect(entries()[0]).toMatchObject({
      /* Le libellé est le nom de la catégorie : la saisie rapide n'a pas de
         champ de texte, et la pilule *est* la description de la ligne. */
      label: 'Alimentation',
      categoryId: 'groceries',
      direction: 'out',
      amount: eur(4_250),
      date: '2026-08-15',
      status: 'confirmed',
    })
    // Une dépense que personne ne s'attribue est commune : rien à demander.
    expect(entries()[0]).not.toHaveProperty('memberId')
  })

  /* La frontière du domaine, et rien d'autre : un revenu sans propriétaire
     n'apparaîtrait dans le mois de personne (`memberRequired`). */
  it('demande à qui est un revenu, et pas à qui est une dépense', async () => {
    renderAt('?sens=sortie')
    await userEvent.click(screen.getByRole('button', { name: 'Alimentation' }))
    expect(screen.queryByRole('group', { name: t.entry.member })).not.toBeInTheDocument()
  })

  it('retient un revenu tant que personne ne le porte', async () => {
    renderAt('?sens=entree')

    await type('260000')
    await userEvent.click(screen.getByRole('button', { name: 'Salaires' }))
    await userEvent.click(screen.getByRole('button', { name: t.entry.addIn }))

    expect(entries()).toHaveLength(0)
    expect(screen.getByRole('alert')).toHaveTextContent(t.entry.memberRequired)

    await userEvent.click(screen.getByRole('button', { name: 'Alix' }))
    await userEvent.click(screen.getByRole('button', { name: t.entry.addIn }))

    expect(entries()[0]).toMatchObject({ direction: 'in', memberId: 'm1', label: 'Salaires' })
  })

  it('dit ce qui manque, au-dessus du bouton, sans rien écrire', async () => {
    renderAt('?sens=sortie')

    await userEvent.click(screen.getByRole('button', { name: t.entry.addOut }))
    expect(screen.getByRole('alert')).toHaveTextContent(t.entry.amountRequired)
    expect(entries()).toHaveLength(0)

    await type('1200')
    await userEvent.click(screen.getByRole('button', { name: t.entry.addOut }))
    expect(screen.getByRole('alert')).toHaveTextContent(t.entry.categoryRequired)
    expect(entries()).toHaveLength(0)
  })

  /* Le DS §6 : la saisie rapide est un écran plein, et elle ne remplace pas le
     formulaire — qui reste le seul à porter la date, la note, le rythme et le
     support. */
  it('garde le formulaire complet à un doigt', async () => {
    renderAt('?sens=sortie')

    await userEvent.click(screen.getByRole('button', { name: t.entry.quickFull }))
    expect(screen.getByTestId('url')).toHaveTextContent(entryNewPath({ direction: 'out' }))
  })

  /* La question d'un mouvement d'épargne n'est pas « quelle catégorie » mais
     « où va l'argent » : le support porte à lui seul le poste et la personne. */
  it('renvoie l’épargne au formulaire, qui sait demander le support', () => {
    renderAt('?sens=sortie&nature=epargne')

    expect(screen.getByTestId('url')).toHaveTextContent(
      entryNewPath({ direction: 'out', saving: true }),
    )
  })
})
