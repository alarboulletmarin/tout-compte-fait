/* ============================================================================
 * Ce que les quatre chemins asynchrones des réglages disent quand ils ratent.
 *
 * Aucun ne portait de `.catch` : deux annonçaient la réussite d'une écriture
 * qui n'avait pas eu lieu, deux laissaient un clic sans effet et sans message.
 * ==========================================================================*/

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { t } from '@/i18n/strings'
import { useStore } from '@/store/store'
import { useToasts } from '@/ui/toast'
import { DataSection } from './DataSection'
import { ExampleControl } from './ExampleControl'
import { ImportControl } from './ImportControl'
import { SchemaControl } from './SchemaControl'

vi.mock('@/persistence/example', () => {
  throw new Error('chunk indisponible')
})

vi.mock('@/persistence/schemaDoc', () => {
  throw new Error('chunk indisponible')
})

const dangers = (): string[] =>
  useToasts.getState().toasts.filter((t) => t.tone === 'danger').map((t) => t.message)

const messages = (): string[] => useToasts.getState().toasts.map((t) => t.message)

/** Le champ de fichier est en `sr-only` : il n'a pas de nom accessible. */
function fileInput(): HTMLInputElement {
  const input = document.querySelector('input[type="file"]')
  if (!(input instanceof HTMLInputElement)) throw new Error('champ de fichier introuvable')
  return input
}

async function upload(payload: unknown): Promise<void> {
  const file = new File([JSON.stringify(payload)], 'export.json', { type: 'application/json' })
  await userEvent.upload(fileInput(), file)
}

beforeEach(() => {
  useToasts.setState({ toasts: [] })
})

afterEach(() => {
  useToasts.setState({ toasts: [] })
  vi.restoreAllMocks()
})

describe('un chargement à la demande qui n’aboutit pas', () => {
  it('le dit, plutôt que de laisser le clic sans effet', async () => {
    render(<ExampleControl confirm={false} />)
    await userEvent.click(screen.getByRole('button', { name: t.settings.exampleLoad }))

    await waitFor(() => {
      expect(dangers()).toEqual([t.settings.exampleFailed])
    })
  })

  it('le dit aussi pour le schéma, dont les boutons restent désactivés', async () => {
    render(<SchemaControl />)

    await waitFor(() => {
      expect(dangers()).toEqual([t.settings.schemaUnavailable])
    })
    expect(screen.getByRole('button', { name: t.settings.schemaCopy })).toBeDisabled()
  })
})

describe('un fichier dont des lignes ne passent pas', () => {
  /* Une dépense illisible disparaissait en silence — dans un geste qui remplace
     tout le document, c'est-à-dire au seul moment où l'on peut encore comparer
     avec ce qu'il y avait avant. */
  it('dit ce qu’il écarte avant qu’on confirme', async () => {
    useStore.setState({ replaceData: vi.fn().mockResolvedValue(undefined) })
    render(<ImportControl />)

    await upload({
      schemaVersion: 6,
      categories: [{ id: 'courses', label: 'Courses', familyId: 'fam-daily', direction: 'out' }],
      entries: [
        { id: 'e1', label: 'Loyer', categoryId: 'courses', amount: 95000, date: '2026-07-05' },
        { id: 'e2', label: 'Courses', categoryId: 'courses', amount: 12.5, date: '2026-07-06' },
      ],
    })

    await screen.findByText(t.settings.importConfirm)
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText(t.settings.reportDiscardedOne)).toBeInTheDocument()
    expect(
      dialog.getByText(
        `${t.settings.reportCollection.entries} « Courses » — ${t.settings.reportReason.amount}`,
      ),
    ).toBeInTheDocument()
  })

  it('ne montre aucun rapport quand le fichier passe entier', async () => {
    useStore.setState({ replaceData: vi.fn().mockResolvedValue(undefined) })
    render(<ImportControl />)

    await upload({
      schemaVersion: 6,
      categories: [{ id: 'courses', label: 'Courses', familyId: 'fam-daily', direction: 'out' }],
      entries: [
        { id: 'e1', label: 'Loyer', categoryId: 'courses', amount: 95000, date: '2026-07-05' },
      ],
    })

    await screen.findByText(t.settings.importConfirm)
    expect(screen.queryByText(t.settings.reportDiscardedOne)).not.toBeInTheDocument()
  })
})

describe('une écriture qui n’aboutit pas', () => {
  it('n’annonce pas un import qui a échoué comme réussi', async () => {
    const replaceData = vi.fn().mockRejectedValue(new Error('disque plein'))
    useStore.setState({ replaceData })

    render(<ImportControl />)

    await upload({ schemaVersion: 6 })

    // Deux pas avant que l'import parte : un remplacement se confirme.
    await screen.findByText(t.settings.importConfirm)
    const dialog = within(screen.getByRole('dialog'))
    await userEvent.click(dialog.getByRole('button', { name: t.common.confirm }))
    await userEvent.click(dialog.getByRole('button', { name: t.settings.import }))

    await waitFor(() => {
      expect(replaceData).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(messages()).toEqual([t.settings.importFailed])
    })
  })

  it('n’annonce pas « Données effacées » sur un effacement qui n’a pas eu lieu', async () => {
    const resetAll = vi.fn().mockRejectedValue(new Error('base verrouillée'))
    useStore.setState({ resetAll })

    /* La vue porte un lien vers « Sur cet appareil » depuis qu'elle résume le
       stockage : elle demande un routeur, comme toutes celles qui en ont un. */
    render(
      <MemoryRouter>
        <DataSection />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: t.settings.reset }))

    // Trois pas : c'est le seul geste de l'app qui n'épargne rien.
    const dialog = within(screen.getByRole('dialog'))
    await userEvent.click(dialog.getByRole('button', { name: t.common.confirm }))
    await userEvent.click(dialog.getByRole('button', { name: t.common.confirm }))
    await userEvent.click(dialog.getByRole('button', { name: t.settings.reset }))

    await waitFor(() => {
      expect(dangers()).toContain(t.settings.resetFailed)
    })
    expect(messages()).not.toContain(t.settings.resetDone)
  })
})
