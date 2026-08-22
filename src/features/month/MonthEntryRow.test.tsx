import { createEvent, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeCategory, makeData, makeEntry, makeFamily } from '@/domain/fixtures'
import { money } from '@/domain/money'
import type { Entry } from '@/domain/types'
import { t } from '@/i18n/strings'
import { tpl } from '@/i18n/format'
import { ALL_FILTER, useStore } from '@/store/store'
import { MonthEntryRow } from './MonthEntryRow'

const FAMILIES = [makeFamily({ id: 'fam-home', kind: 'charge' })]
const CATEGORIES = [makeCategory({ id: 'loyer', familyId: 'fam-home' })]
const initial = useStore.getState().data

/* jsdom ne fabrique pas d'événement de pointeur complet : `clientX` et
   `clientY` ne sont pas dans les options qu'il connaît, et se posent donc à la
   main — c'est le gréement de `SwipeRow.test.tsx`, et pour la même raison. */
function pointer(
  kind: 'pointerDown' | 'pointerMove' | 'pointerUp',
  node: Element,
  x: number,
): void {
  const event = createEvent[kind](node, { pointerId: 1 })
  for (const [key, value] of Object.entries({ pointerId: 1, clientX: x, clientY: 0 })) {
    Object.defineProperty(event, key, { value, configurable: true })
  }
  fireEvent(node, event)
}

function entryOf(status: Entry['status'], recurrent = true): Entry {
  return makeEntry({
    id: 'e1',
    date: '2026-08-08',
    label: 'Électricité',
    categoryId: 'loyer',
    amount: money(9640),
    status,
    ...(recurrent ? { recurrenceId: 'r1' } : {}),
  })
}

function setUp(status: Entry['status'] = 'planned', recurrent = true) {
  const entry = entryOf(status, recurrent)
  useStore.setState({
    ym: '2026-08',
    filter: ALL_FILTER,
    data: makeData({ families: FAMILIES, categories: CATEGORIES, entries: [entry] }),
  })
  const open = vi.fn()
  const { container } = render(
    <MonthEntryRow entry={entry} color="var(--cat-1)" meta="8 août" onOpen={open} />,
  )
  /* La piste du glissé est le cadre que `SwipeRow` pose : c'est lui qui écoute
     le pointeur, et c'est donc lui qu'un geste doit viser. */
  const track = container.querySelector('.relative') as HTMLElement
  return { open, track }
}

/** L'état de la ligne dans le document, seule vérité qui compte ici. */
const stored = (): Entry => useStore.getState().data.entries[0] as Entry

function swipe(track: HTMLElement, to: number): void {
  pointer('pointerDown', track, 0)
  pointer('pointerMove', track, to)
  pointer('pointerUp', track, to)
}

afterEach(() => {
  useStore.setState({ data: initial, filter: ALL_FILTER })
})

describe('Une ligne prévue — le glissé et les boutons font la même chose', () => {
  it('confirme au glissé vers la droite', () => {
    const { track } = setUp()

    swipe(track, 100)

    expect(stored().status).toBe('confirmed')
    expect(stored().amount).toBe(money(9640))
  })

  /* La moitié que `SwipeRow` ne fournit pas, et que le DS §8 exige : un glissé
     ne s'annonce pas, donc il ne peut pas être le seul chemin. */
  it('confirme au bouton, exactement comme au doigt', async () => {
    setUp()

    await userEvent.click(
      screen.getByRole('button', { name: tpl(t.month.confirmEntry, 'Électricité') }),
    )

    expect(stored().status).toBe('confirmed')
  })

  it('n’écrit rien en deçà du seuil', () => {
    const { track } = setUp()

    swipe(track, 40)

    expect(stored().status).toBe('planned')
  })

  it('déplie le panneau d’ajustement au glissé vers la gauche', () => {
    const { track } = setUp()

    swipe(track, -100)

    expect(screen.getByRole('button', { name: t.month.confirmAmount })).toBeInTheDocument()
    // Rien n'est écrit tant que le panneau n'a pas été validé.
    expect(stored().status).toBe('planned')
  })

  it('déplie le même panneau au bouton', async () => {
    setUp()

    await userEvent.click(
      screen.getByRole('button', { name: tpl(t.month.adjustEntry, 'Électricité') }),
    )

    expect(screen.getByRole('button', { name: t.month.confirmAmount })).toBeInTheDocument()
  })
})

describe('Le glissé part de la rangée, jamais de ses boutons', () => {
  /* La régression que ce test existe pour tenir : la rangée est un bouton — elle
     ouvre la fiche de la ligne —, et une garde qui refusait le geste sur tout ce
     qui est cliquable le refusait donc partout. Le geste se joue ici sur la
     rangée elle-même, comme un doigt le fait. */
  it('confirme quand le doigt part du libellé de la ligne', () => {
    setUp()
    /* La rangée n'a pas de nom à elle : son contenu *est* son nom. On part donc
       du libellé, exactement là où le doigt se pose. */
    const row = screen.getByText('Électricité').closest('button') as HTMLElement

    pointer('pointerDown', row, 0)
    pointer('pointerMove', row, 120)
    pointer('pointerUp', row, 120)

    expect(stored().status).toBe('confirmed')
  })

  /* Et l'inverse : viser la coche de 44px, c'est vouloir cliquer. */
  it('ne glisse pas quand le doigt part d’un bouton de la rangée', () => {
    setUp()
    const button = screen.getByRole('button', { name: tpl(t.month.adjustEntry, 'Électricité') })

    pointer('pointerDown', button, 0)
    pointer('pointerMove', button, 120)
    pointer('pointerUp', button, 120)

    expect(stored().status).toBe('planned')
  })
})

describe('Le panneau d’ajustement — corriger sans quitter la liste', () => {
  async function openPanel(): Promise<void> {
    setUp()
    await userEvent.click(
      screen.getByRole('button', { name: tpl(t.month.adjustEntry, 'Électricité') }),
    )
  }

  it('part du montant prévu et confirme le montant saisi', async () => {
    await openPanel()

    const field = screen.getByRole('textbox', { name: `${t.entry.amount} — Électricité` })
    expect(field).toHaveValue('96,40')

    await userEvent.clear(field)
    await userEvent.type(field, '104,20')
    await userEvent.click(screen.getByRole('button', { name: t.month.confirmAmount }))

    expect(stored().status).toBe('confirmed')
    expect(stored().amount).toBe(money(10420))
  })

  /* Le pas corrige, il ne pose pas : cinq euros de plus sur ce qui est affiché,
     et non sur le montant prévu — sans quoi deux appuis en feraient toujours
     cinq. */
  it('ajoute cinq euros par appui, en partant de ce qui est affiché', async () => {
    await openPanel()

    await userEvent.click(screen.getByRole('button', { name: t.month.adjustMore }))
    await userEvent.click(screen.getByRole('button', { name: t.month.adjustMore }))

    expect(screen.getByRole('textbox', { name: `${t.entry.amount} — Électricité` })).toHaveValue(
      '106,40',
    )
  })

  it('referme sans rien écrire', async () => {
    await openPanel()

    await userEvent.click(screen.getByRole('button', { name: t.common.cancel }))

    expect(screen.queryByRole('button', { name: t.month.confirmAmount })).not.toBeInTheDocument()
    expect(stored().status).toBe('planned')
  })
})

describe('Une ligne confirmée — plus rien à confirmer', () => {
  it('ne se glisse pas', () => {
    const { track } = setUp('confirmed')

    swipe(track, 120)
    swipe(track, -120)

    expect(stored().status).toBe('confirmed')
    expect(
      screen.queryByRole('button', { name: tpl(t.month.confirmEntry, 'Électricité') }),
    ).not.toBeInTheDocument()
  })

  /* Le geste inverse est sur la rangée : c'est là qu'on cherche comment défaire
     ce qu'on vient d'y faire. */
  it('porte le retour en prévu', async () => {
    setUp('confirmed')

    await userEvent.click(
      screen.getByRole('button', { name: tpl(t.month.unconfirmEntry, 'Électricité') }),
    )

    expect(stored().status).toBe('planned')
  })

  /* Une saisie ponctuelle est un fait, pas une prévision en attente : le
     domaine refuse de la remettre en prévu, et la rangée ne propose donc pas un
     bouton qui ne ferait rien. */
  it('ne propose pas le retour sur une saisie ponctuelle', () => {
    setUp('confirmed', false)

    expect(
      screen.queryByRole('button', { name: tpl(t.month.unconfirmEntry, 'Électricité') }),
    ).not.toBeInTheDocument()
  })
})
