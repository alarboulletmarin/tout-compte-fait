import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { money } from '@/domain/money'
import { makeCategory, makeData, makeEntry, makeFamily } from '@/domain/fixtures'
import { formatMoney } from '@/i18n/format'
import { t } from '@/i18n/strings'
import { closeDb } from '@/persistence/db'
import { useStore } from '@/store/store'
import { Amount } from '@/ui/Amount'
import { CurrencyContext } from '@/ui/currency'
import { MorePage } from './MorePage'

/**
 * La devise était stockée, validée, migrée, exportée et lue par tous les
 * montants de l'app — et réglable nulle part. Un champ qui décide de
 * l'affichage de chaque chiffre et qu'aucun écran n'atteint est un réglage en
 * panne, pas un défaut assumé.
 */
describe('la devise', () => {
  beforeEach(() => {
    useStore.setState({
      status: 'ready',
      data: makeData({
        families: [makeFamily({ id: 'fam-1' })],
        categories: [makeCategory({ id: 'cat-1', familyId: 'fam-1' })],
        entries: [makeEntry({ date: '2026-08-05', categoryId: 'cat-1', amount: money(1234) })],
      }),
    })
  })

  afterEach(() => {
    closeDb()
  })

  /* Elle se règle sur « Plus », et c'est le seul contrôle de l'écran : six
     codes dans un sélecteur natif n'ont rien à montrer qu'une vue rendrait
     mieux — l'argument inverse de celui qui a envoyé les palettes dans la
     leur. */
  it('se règle depuis « Plus », et l’écrit dans le document', async () => {
    render(
      <MemoryRouter>
        <MorePage />
      </MemoryRouter>,
    )

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: t.settings.currency }),
      'CHF',
    )
    expect(useStore.getState().data.settings.currency).toBe('CHF')
  })

  /* Un sélecteur de devise invite à croire qu'on convertit. L'app ne convertit
     rien — le cahier §2 laisse la multi-devise hors v1 —, et seul le symbole
     change : les centimes saisis restent les mêmes centimes. */
  it('change le symbole et pas le chiffre', () => {
    const value = money(1234)
    expect(formatMoney(value, 'EUR')).toContain('12,34')
    expect(formatMoney(value, 'CHF')).toContain('12,34')
    expect(formatMoney(value, 'EUR')).not.toBe(formatMoney(value, 'CHF'))
  })

  /* La coquille alimente le contexte depuis les réglages (`app/App.tsx`), et
     tous les montants le lisent : régler la devise atteint donc chaque chiffre
     de l'app, pas seulement l'écran où on la choisit. */
  it('atteint les montants, qui la lisent tous au même endroit', () => {
    render(
      <CurrencyContext value={useStore.getState().data.settings.currency}>
        <Amount value={money(1234)} />
      </CurrencyContext>,
    )
    expect(document.body.textContent).toContain('€')

    useStore.getState().setCurrency('CAD')
    render(
      <CurrencyContext value={useStore.getState().data.settings.currency}>
        <Amount value={money(1234)} />
      </CurrencyContext>,
    )
    expect(document.body.textContent).toContain('$')
  })
})
