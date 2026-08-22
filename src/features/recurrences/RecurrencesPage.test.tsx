import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ADVANCES_PATH, CREDITS_PATH, RECURRENCE_NEW_PATH } from '@/app/routes'
import {
  eur,
  makeAdvance,
  makeCategory,
  makeData,
  makeFamily,
  makeMember,
  makeRecurrence,
} from '@/domain/fixtures'
import { t } from '@/i18n/strings'
import { de, tpl } from '@/i18n/format'
import { useStore } from '@/store/store'
import { useToasts } from '@/ui/toast'
import { RecurrencesPage } from './RecurrencesPage'

const initial = useStore.getState().data

/* La page navigue : sans témoin, on ne saurait pas où elle mène. */
function CurrentUrl() {
  const { pathname } = useLocation()
  return <span data-testid="url">{pathname}</span>
}

const FAMILIES = [
  makeFamily({ id: 'f-charge', kind: 'charge', label: 'Charges' }),
  makeFamily({ id: 'f-resource', kind: 'resource', label: 'Ressources' }),
  makeFamily({ id: 'f-saving', kind: 'saving', label: 'Épargne' }),
]

/* Un libellé long exprès : c'est celui qui se coupait au troisième mot quand le
   compte de récurrences lui prenait la moitié de la ligne. */
const LONG = 'Salaires, retraites ou indemnités'

const CATEGORIES = [
  makeCategory({ id: 'logement', label: 'Immobilier', familyId: 'f-charge' }),
  makeCategory({ id: 'energie', label: 'Énergies', familyId: 'f-charge' }),
  makeCategory({
    id: 'salaire',
    label: LONG,
    familyId: 'f-resource',
    direction: 'in',
  }),
  makeCategory({ id: 'livret', label: 'Livrets', familyId: 'f-saving' }),
]

const MEMBERS = [
  makeMember({ id: 'm1', name: 'Alix' }),
  makeMember({ id: 'm2', name: 'Camille' }),
]

/**
 * Quatre règles, choisies pour que les deux tris ne rendent pas le même ordre.
 *
 * « Immobilier » est le plus lourd et tombe le plus tard ; « Énergies » est le
 * plus léger et tombe le plus tôt. Trier par montant met donc l'un en tête,
 * trier par échéance met l'autre — et c'est l'ordre des *groupes* qui le montre,
 * puisqu'ils sont repliés au chargement.
 */
const RECURRENCES = [
  makeRecurrence({
    id: 'loyer',
    label: 'Loyer',
    categoryId: 'logement',
    amount: eur(108_500),
    period: { unit: 'month', every: 1, anchorDay: 28 },
  }),
  makeRecurrence({
    id: 'elec',
    label: 'Électricité',
    categoryId: 'energie',
    amount: eur(6_000),
    memberId: 'm1',
    period: { unit: 'month', every: 1, anchorDay: 18 },
  }),
  makeRecurrence({
    id: 'paie',
    label: 'Salaire',
    categoryId: 'salaire',
    direction: 'in',
    amount: eur(260_000),
    memberId: 'm2',
    period: { unit: 'month', every: 1, anchorDay: 27 },
  }),
  makeRecurrence({
    id: 'livret-a',
    label: 'Livret A',
    categoryId: 'livret',
    amount: eur(20_000),
    memberId: 'm1',
    period: { unit: 'month', every: 1, anchorDay: 20 },
  }),
]

function renderPage(over: Parameters<typeof makeData>[0] = {}): void {
  useStore.setState({
    data: makeData({
      household: { name: 'Maison', members: MEMBERS },
      families: FAMILIES,
      categories: CATEGORIES,
      recurrences: RECURRENCES,
      ...over,
    }),
  })

  render(
    <MemoryRouter>
      <RecurrencesPage />
      <CurrentUrl />
    </MemoryRouter>,
  )
}

/** Les en-têtes de groupe, dans l'ordre où la liste les pose. */
function groupOrder(): string[] {
  return screen
    .getAllByRole('group')
    .map((node) => node.querySelector('summary')?.textContent ?? '')
    .filter((text) => text !== '')
}

describe('RecurrencesPage', () => {
  /* L'ordre par échéance dépend du jour où l'on lit : sans date figée, le test
     dirait une chose le 17 du mois et une autre le 19. */
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 6, 15, 12, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
    useStore.setState({ data: initial })
  })

  describe('le total en tête', () => {
    it('dit ce qu’il additionne dans son étiquette, et ce qu’il laisse dehors', () => {
      renderPage({
        recurrences: [
          ...RECURRENCES,
          makeRecurrence({
            id: 'courses',
            label: 'Courses',
            categoryId: 'energie',
            amount: null,
            period: { unit: 'month', every: 1, anchorDay: 5 },
          }),
        ],
      })

      expect(screen.getByText(t.recurrences.totalOut)).toBeInTheDocument()
      expect(screen.getByText(t.recurrences.scopeOut)).toBeInTheDocument()
      expect(
        screen.getByText(tpl(t.recurrences.variableExcludedOne, 1)),
      ).toBeInTheDocument()
    })

    it('suit la pilule active — étiquette, périmètre et chiffre', async () => {
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: t.recurrences.showIn }))

      const label = screen.getByText(t.recurrences.totalIn)
      expect(screen.queryByText(t.recurrences.totalOut)).not.toBeInTheDocument()
      expect(screen.getByText(t.recurrences.scopeIn)).toBeInTheDocument()

      /* Dans la tuile et non dans la page : le même chiffre s'écrit aussi sur le
         groupe et sur la ligne, puisqu'il n'y a qu'un revenu.
         Une expression et non la chaîne de `formatMoney` : le séparateur de
         milliers est une espace fine insécable, que le normaliseur de Testing
         Library ramène à une espace ordinaire d'un seul côté. */
      const tile = label.closest('section')
      expect(tile).not.toBeNull()
      expect(within(tile as HTMLElement).getByText(/^2\s600,00\s€$/)).toBeInTheDocument()
    })
  })

  describe('les groupes', () => {
    it('sont repliés au chargement, et « Tout déplier » dit ensuite l’inverse', async () => {
      renderPage()

      expect(screen.queryByRole('button', { name: 'Loyer' })).not.toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: t.recurrences.expandAll }))

      expect(screen.getByRole('button', { name: /^Loyer/ })).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: t.recurrences.collapseAll }),
      ).toBeInTheDocument()
    })

    /* Le nom vit sur sa propre ligne depuis qu'il ne partage plus la largeur
       avec le compte : il doit être entier dans le DOM, troncature CSS ou pas. */
    it('portent leur nom complet, et le compte en seconde lecture', () => {
      renderPage()

      expect(screen.getByText(LONG)).toBeInTheDocument()
      expect(screen.getAllByText(tpl(t.recurrences.groupCountOne, 1)).length).toBeGreaterThan(0)
    })

    it('signalent une variable qui manque à leur total', () => {
      renderPage({
        recurrences: [
          ...RECURRENCES,
          makeRecurrence({
            id: 'gaz',
            label: 'Gaz',
            categoryId: 'energie',
            amount: null,
            period: { unit: 'month', every: 1, anchorDay: 9 },
          }),
        ],
      })

      expect(
        screen.getByText(
          `${tpl(t.recurrences.groupCount, 2)} · ${tpl(t.recurrences.groupVariable, 1)}`,
        ),
      ).toBeInTheDocument()
    })

    it('se rangent par personne quand on change de vue', async () => {
      renderPage()

      await userEvent.click(screen.getByRole('radio', { name: t.recurrences.byMember }))

      expect(groupOrder().join(' ')).toContain('Alix')
      expect(groupOrder().join(' ')).toContain('Camille')
    })
  })

  describe('le tri', () => {
    /* Les groupes sont repliés : si le tri ne rangeait que leur intérieur, il
       n'aurait aucun effet visible à l'ouverture de la page. */
    it('range aussi les groupes entre eux', async () => {
      renderPage()

      const select = screen.getByLabelText(t.recurrences.sortBy)
      const byDue = groupOrder()

      await userEvent.selectOptions(select, 'amount')
      const byAmount = groupOrder()

      // Par échéance au 15 juillet : Énergies (18), Livrets (20), Salaires (27), Immobilier (28).
      expect(byDue[0]).toContain('Énergies')
      // Par poids : le salaire, puis le loyer.
      expect(byAmount[0]).toContain(LONG)
      expect(byDue).not.toEqual(byAmount)
    })
  })

  describe('les filtres', () => {
    it('retirent ce qu’on ne regarde pas', async () => {
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: t.recurrences.showSaving }))

      expect(groupOrder().join(' ')).toContain('Livrets')
      expect(groupOrder().join(' ')).not.toContain('Immobilier')
    })

    it('offrent une sortie quand ils ne laissent rien', async () => {
      renderPage({ recurrences: [RECURRENCES[0]!] })

      await userEvent.click(screen.getByRole('button', { name: t.recurrences.showIn }))
      expect(screen.getByText(t.recurrences.showEmptyIn)).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: t.recurrences.showAllBack }))
      expect(screen.queryByText(t.recurrences.showEmptyIn)).not.toBeInTheDocument()
      expect(groupOrder().join(' ')).toContain('Immobilier')
    })
  })

  describe('les deux suivis du bas', () => {
    it('résument les avances et mènent à leur écran', async () => {
      renderPage({
        advances: [makeAdvance({ id: 'a1', memberId: 'm1', categoryId: 'logement' })],
      })

      const row = screen.getByRole('link', { name: new RegExp(t.advances.section) })
      expect(row).toHaveTextContent(tpl(t.advances.countOne, 1))

      await userEvent.click(row)
      expect(screen.getByTestId('url')).toHaveTextContent(ADVANCES_PATH)
    })

    it('disent qu’il n’y a aucune avance plutôt que de disparaître', () => {
      renderPage()

      expect(
        screen.getByRole('link', { name: new RegExp(t.advances.section) }),
      ).toHaveTextContent(t.advances.empty)
    })

    it('mènent aux crédits', async () => {
      renderPage()

      await userEvent.click(screen.getByRole('link', { name: new RegExp(t.credits.title) }))
      expect(screen.getByTestId('url')).toHaveTextContent(CREDITS_PATH)
    })
  })

  describe('sans aucune récurrence', () => {
    it('invite à poser la première, et garde les deux suivis', async () => {
      renderPage({ recurrences: [] })

      expect(screen.getByText(t.recurrences.empty)).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: new RegExp(t.credits.title) }),
      ).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: t.recurrences.add }))
      expect(screen.getByTestId('url')).toHaveTextContent(RECURRENCE_NEW_PATH)
    })

    /* Le titre ne porte son bouton que lorsque l'état vide ne le porte pas :
       deux fois le même geste dans le même écran. */
    it('ne pose le bouton du titre qu’une fois la liste peuplée', () => {
      renderPage()

      const header = screen.getByRole('heading', { level: 1 })
      expect(header).toHaveTextContent(t.recurrences.title)
      expect(screen.getAllByRole('button', { name: t.recurrences.add })).toHaveLength(1)
    })
  })

  describe('une ligne dépliée', () => {
    it('dit à qui elle est quand la liste est rangée par poste', async () => {
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: t.recurrences.expandAll }))

      const row = screen.getByRole('button', { name: /^Électricité/ })
      expect(within(row).getByText(/Alix/)).toBeInTheDocument()
    })

    /* Sur une mensuelle, l'annuel vaut douze fois le chiffre du dessus : il
       n'apprend rien et fait le quatrième nombre de la ligne. */
    it('tait l’annuel sur une mensuelle et le garde sur une annuelle', async () => {
      renderPage({
        recurrences: [
          RECURRENCES[0]!,
          makeRecurrence({
            id: 'assurance',
            label: 'Assurance',
            categoryId: 'energie',
            amount: eur(24_000),
            period: { unit: 'year', every: 1, anchorDay: 3 },
            startedOn: '2026-03-03',
          }),
        ],
      })

      await userEvent.click(screen.getByRole('button', { name: t.recurrences.expandAll }))

      const monthly = screen.getByRole('button', { name: /^Loyer/ })
      expect(within(monthly).queryByText(/par an/)).not.toBeInTheDocument()

      const yearly = screen.getByRole('button', { name: /^Assurance/ })
      expect(within(yearly).getByText(/240\s€ par an/)).toBeInTheDocument()
    })
  })

  /* Le glissé n'est pas testable dans jsdom — il n'a ni pointeur ni pixels —
     mais ce qu'il déclenche l'est : les deux boutons de la rangée appellent
     **la même fonction** que lui, c'est le contrat de `SwipeableListRow`. Les
     tester, c'est tester les deux chemins. */
  describe('les gestes de la rangée', () => {
    async function openList(over: Parameters<typeof makeData>[0] = {}): Promise<void> {
      renderPage(over)
      await userEvent.click(screen.getByRole('button', { name: t.recurrences.expandAll }))
    }

    it('déplie le panneau du montant, et l’enregistrement change la règle', async () => {
      await openList()

      const open = screen.getByRole('button', {
        name: tpl(t.recurrences.changeAmountOf, de('Loyer')),
      })
      expect(open).toHaveAttribute('aria-expanded', 'false')
      await userEvent.click(open)
      expect(open).toHaveAttribute('aria-expanded', 'true')

      /* La coupure est aujourd'hui, pas le mois prochain : c'est ce que la
         maquette disait de travers, et c'est ce que la phrase dit maintenant. */
      expect(screen.getByText(t.recurrences.amountAhead)).toBeInTheDocument()

      const field = screen.getByLabelText(`${t.entry.amount} — Loyer`)
      await userEvent.clear(field)
      await userEvent.type(field, '1200')
      await userEvent.click(screen.getByRole('button', { name: t.common.save }))

      expect(
        useStore.getState().data.recurrences.find((r) => r.id === 'loyer')?.amount,
      ).toBe(eur(120_000))
      // Annulable, et le verbe est « Rétablir », jamais « Annuler ».
      expect(useToasts.getState().toasts.at(-1)?.action?.label).toBe(t.common.undo)
    })

    it('déplace le montant de cinq euros par appui, sans passer sous zéro', async () => {
      await openList()

      await userEvent.click(
        screen.getByRole('button', { name: tpl(t.recurrences.changeAmountOf, de('Loyer')) }),
      )
      const field = screen.getByLabelText(`${t.entry.amount} — Loyer`)
      await userEvent.click(screen.getByRole('button', { name: t.month.adjustMore }))
      expect(field).toHaveValue('1090,00')
      await userEvent.click(screen.getByRole('button', { name: t.month.adjustLess }))
      expect(field).toHaveValue('1085,00')
    })

    it('n’offre pas le panneau à une règle à montant variable', async () => {
      await openList({
        recurrences: [
          makeRecurrence({
            id: 'courses',
            label: 'Courses',
            categoryId: 'energie',
            amount: null,
            period: { unit: 'month', every: 1, anchorDay: 5 },
          }),
        ],
      })

      expect(
        screen.queryByRole('button', { name: tpl(t.recurrences.changeAmountOf, de('Courses')) }),
      ).not.toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: tpl(t.recurrences.removeOf, de('Courses')) }),
      ).toBeInTheDocument()
    })

    /* La décision la plus contraignante de l'écran : le geste destructif pose la
       question, il n'écrit pas. `ARCHITECTURE.md` garde toutes les boîtes, et le
       principe 2 du handoff qui voudrait les retirer est un arbitrage produit. */
    it('ouvre la question au lieu de supprimer, et supprime quand on répond', async () => {
      await openList()

      await userEvent.click(
        screen.getByRole('button', { name: tpl(t.recurrences.removeOf, de('Loyer')) }),
      )
      expect(useStore.getState().data.recurrences).toHaveLength(RECURRENCES.length)
      expect(screen.getByText(t.recurrences.removeConfirm)).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: t.common.delete }))
      expect(
        useStore.getState().data.recurrences.some((r) => r.id === 'loyer'),
      ).toBe(false)
      expect(useToasts.getState().toasts.at(-1)?.message).toBe(t.recurrences.deleted)
    })

    /* Le second geste, que le prototype ne montre nulle part : on résilie un
       abonnement, on ne l'efface pas. Il vit dans la boîte parce que c'est là
       qu'on hésite, et parce qu'une rangée de 320 points ne porte pas un
       troisième bouton de 44. */
    it('offre d’arrêter plutôt que de supprimer, et l’arrêt garde la règle', async () => {
      await openList()

      await userEvent.click(
        screen.getByRole('button', { name: tpl(t.recurrences.removeOf, de('Loyer')) }),
      )
      await userEvent.click(screen.getByRole('button', { name: t.recurrences.stopAction }))

      const stopped = useStore.getState().data.recurrences.find((r) => r.id === 'loyer')
      expect(stopped?.endedOn).toBeDefined()
      expect(useToasts.getState().toasts.at(-1)?.message).toBe(t.recurrences.stopped)
    })

    it('ne propose pas d’arrêter une règle déjà arrêtée', async () => {
      renderPage({
        recurrences: [
          makeRecurrence({
            id: 'ancien',
            label: 'Ancien abonnement',
            categoryId: 'energie',
            amount: eur(1_000),
            period: { unit: 'month', every: 1, anchorDay: 5 },
            startedOn: '2025-01-05',
            endedOn: '2025-12-05',
          }),
        ],
      })

      // Les règles arrêtées vivent dans leur propre liste, repliée.
      await userEvent.click(screen.getByRole('button', { name: /Arrêtée/ }))
      await userEvent.click(
        screen.getByRole('button', { name: tpl(t.recurrences.removeOf, de('Ancien abonnement')) }),
      )
      expect(
        screen.queryByRole('button', { name: t.recurrences.stopAction }),
      ).not.toBeInTheDocument()
    })
  })
})
