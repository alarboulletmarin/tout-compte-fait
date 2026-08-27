import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { today } from '@/domain/date'
import {
  eur,
  makeCategory,
  makeData,
  makeEntry,
  makeFamily,
  makeMember,
  makeRecurrence,
  makeSavingSupport,
  makeSavingValuation,
} from '@/domain/fixtures'
import type { Entry } from '@/domain/types'
import { t } from '@/i18n/strings'
import { ENTRY_NEW_PATH, RECURRENCE_NEW_PATH, entryPath } from '@/app/routes'
import { EntryPage } from '@/features/month/EntryPage'
import { RecurrenceFormPage } from '@/features/recurrences/RecurrenceFormPage'
import { useStore } from '@/store/store'
import { ScreenTitleProvider } from '@/ui/ScreenTitleProvider'

/* Un seul formulaire, deux portes. Ce fichier vérifie surtout la chose qu'on ne
   peut pas lire dans le code d'un composant : que les deux portes mènent au même
   écran, et que rien à l'intérieur ne dit par laquelle on est passé. */

const CATEGORIES = [
  makeCategory({ id: 'cat-rent', label: 'Loyer', familyId: 'fam-home' }),
  makeCategory({ id: 'cat-power', label: 'Électricité', familyId: 'fam-home' }),
]

const TODAY = today()
const NEXT_YEAR = `${String(Number(TODAY.slice(0, 4)) + 1)}-01-15`

function openAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <ScreenTitleProvider>
        <Routes>
          <Route path={ENTRY_NEW_PATH} element={<EntryPage />} />
          <Route path={`${ENTRY_NEW_PATH}/:id`} element={<EntryPage />} />
          <Route path={RECURRENCE_NEW_PATH} element={<RecurrenceFormPage />} />
          <Route path="*" element={null} />
        </Routes>
      </ScreenTitleProvider>
    </MemoryRouter>,
  )
}

const fromEntryDoor = () => { openAt(`${ENTRY_NEW_PATH}?sens=sortie`) }
const fromRecurrenceDoor = () => { openAt(RECURRENCE_NEW_PATH) }
const editingEntry = (id: string) => { openAt(entryPath(id)) }

const choice = (label: string) => screen.getByRole('radio', { name: label })
const field = (label: string) => screen.getByLabelText(new RegExp(label))
const missing = (label: string) => screen.queryByLabelText(new RegExp(label))
const save = () => screen.getByRole('button', { name: /Ajouter|Enregistrer/ })

const setDate = (label: string, value: string): void => {
  fireEvent.change(field(label), { target: { value } })
}

const recurrences = () => useStore.getState().data.recurrences
const entries = () => useStore.getState().data.entries

beforeEach(() => {
  useStore.setState({
    status: 'onboarding',
    /* Le mois affiché est celui qu'on vit : la date proposée est donc
       aujourd'hui, des deux côtés. */
    ym: TODAY.slice(0, 7),
    data: makeData({
      families: [makeFamily({ id: 'fam-home', label: 'Logement', kind: 'charge' })],
      categories: CATEGORIES,
    }),
  })
})

describe('les deux portes mènent au même formulaire', () => {
  /* Le titre ne nomme plus ce qu'on croit enregistrer : nature et rythme se
     changent d'un doigt, et « Ajouter une récurrence » s'affichait au-dessus
     d'un formulaire qu'un seul geste ramenait au ponctuel. */
  it('porte le même titre depuis la saisie', () => {
    fromEntryDoor()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t.entry.addOperation)
    expect(choice(t.entry.once)).toHaveAttribute('aria-checked', 'true')
  })

  it('porte le même titre depuis l’onglet des récurrences', () => {
    fromRecurrenceDoor()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t.entry.addOperation)
    expect(choice(t.entry.recurring)).toHaveAttribute('aria-checked', 'true')
  })

  /* La seule chose qu'une porte transmet est un état initial : tout le reste —
     champs, mots, comportements — doit être indiscernable. */
  it('pose les mêmes champs qu’on arrive par la saisie ou par les récurrences', async () => {
    const labels = [
      t.entry.amount,
      t.entry.category,
      t.entry.firstDate,
      t.recurrences.form.period,
      t.recurrences.form.monthDay,
      t.entry.label,
      t.entry.note,
    ]

    fromEntryDoor()
    await userEvent.click(choice(t.entry.recurring))
    for (const label of labels) expect(field(label)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: t.recurrences.variable })).toBeInTheDocument()
    cleanup()

    fromRecurrenceDoor()
    for (const label of labels) expect(field(label)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: t.recurrences.variable })).toBeInTheDocument()
  })
})

describe('le rythme commande les champs', () => {
  it('ne montre ni périodicité ni type de montant en ponctuel', () => {
    fromEntryDoor()
    expect(field(t.entry.date)).toBeInTheDocument()
    expect(missing(t.recurrences.form.period)).not.toBeInTheDocument()
    expect(missing(t.recurrences.form.monthDay)).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: t.recurrences.variable })).not.toBeInTheDocument()
  })

  it('les fait apparaître à la bascule, sans changer de date', async () => {
    fromEntryDoor()
    setDate(t.entry.date, NEXT_YEAR)
    await userEvent.click(choice(t.entry.recurring))

    expect(field(t.entry.firstDate)).toHaveValue(NEXT_YEAR)
    expect(field(t.recurrences.form.period)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: t.recurrences.variable })).toBeInTheDocument()
  })

  /* « Première échéance le 15 janvier » répond déjà à « quel jour du mois ». */
  it('préremplit le jour du mois depuis la première échéance, sans le figer', () => {
    fromRecurrenceDoor()
    setDate(t.entry.firstDate, NEXT_YEAR)
    expect(field(t.recurrences.form.monthDay)).toHaveValue(15)

    // Le prérempli est une proposition : c'est la date suivante qui le reprend.
    fireEvent.change(field(t.recurrences.form.monthDay), { target: { value: '28' } })
    expect(field(t.recurrences.form.monthDay)).toHaveValue(28)

    setDate(t.entry.firstDate, `${NEXT_YEAR.slice(0, 8)}03`)
    expect(field(t.recurrences.form.monthDay)).toHaveValue(3)
  })
})

describe('ce qui est enregistré suit le rythme, pas la porte', () => {
  const fill = async (label: string, categoryId: string) => {
    await userEvent.type(field(t.entry.amount), '850')
    await userEvent.selectOptions(field(t.entry.category), categoryId)
    await userEvent.type(field(t.entry.label), label)
  }

  it('crée une entrée ponctuelle depuis l’onglet des récurrences', async () => {
    fromRecurrenceDoor()
    await userEvent.click(choice(t.entry.once))
    await fill('Achat unique', 'cat-rent')
    await userEvent.click(save())

    expect(recurrences()).toHaveLength(0)
    expect(entries()).toHaveLength(1)
    expect(entries()[0]).toMatchObject({ label: 'Achat unique', amount: 85000 })
  })

  it('crée une récurrence depuis la saisie d’une dépense', async () => {
    fromEntryDoor()
    await userEvent.click(choice(t.entry.recurring))
    await fill('Loyer', 'cat-rent')
    await userEvent.click(save())

    expect(recurrences()).toHaveLength(1)
    expect(recurrences()[0]).toMatchObject({ label: 'Loyer', amount: 85000 })
  })

  it('nomme dans son bouton ce qui va être créé', async () => {
    fromEntryDoor()
    expect(save()).toHaveTextContent(t.entry.saveOperation)

    await userEvent.click(choice(t.entry.recurring))
    expect(save()).toHaveTextContent(t.entry.saveRecurrence)
  })
})

describe('la première échéance', () => {
  const poser = async (categoryId: string) => {
    await userEvent.type(field(t.entry.label), 'Loyer')
    await userEvent.selectOptions(field(t.entry.category), categoryId)
    await userEvent.click(save())
  }

  /* Une échéance datée d'aujourd'hui, dont le montant est fixe, a eu lieu : le
     geste courant de la saisie — « j'ai payé le loyer, et c'est tous les mois ». */
  it('part payée quand elle est datée d’aujourd’hui et chiffrée', async () => {
    fromRecurrenceDoor()
    expect(screen.getByText(t.entry.firstDatePaid)).toBeInTheDocument()
    await userEvent.type(field(t.entry.amount), '850')
    await poser('cat-rent')

    const paid = entries().filter((e) => e.status === 'confirmed')
    expect(paid).toHaveLength(1)
    expect(paid[0]).toMatchObject({ date: TODAY, amount: 85000 })
  })

  it('part à confirmer quand elle est à venir', async () => {
    fromEntryDoor()
    await userEvent.click(choice(t.entry.recurring))
    await userEvent.type(field(t.entry.amount), '850')
    setDate(t.entry.firstDate, NEXT_YEAR)
    expect(screen.getByText(t.entry.firstDatePlanned)).toBeInTheDocument()
    await poser('cat-rent')

    expect(recurrences()).toHaveLength(1)
    expect(entries().filter((e) => e.status === 'confirmed')).toHaveLength(0)
  })

  /* Sans montant, il n'y a rien à enregistrer comme payé : la marquer payée
     l'écrirait à l'estimation, c'est-à-dire à une supposition. */
  it('part à confirmer quand le montant est variable', async () => {
    fromRecurrenceDoor()
    await userEvent.click(choice(t.recurrences.variable))
    expect(screen.getByText(t.entry.firstDatePlanned)).toBeInTheDocument()
    await poser('cat-power')

    expect(entries().filter((e) => e.status === 'confirmed')).toHaveLength(0)
  })
})

describe('le montant variable', () => {
  it('rend le montant facultatif, et le garde en ordre de grandeur', async () => {
    fromRecurrenceDoor()
    await userEvent.click(choice(t.recurrences.variable))
    await userEvent.type(field(t.entry.amount), '87,50')
    await userEvent.selectOptions(field(t.entry.category), 'cat-power')
    await userEvent.type(field(t.entry.label), 'Électricité')
    await userEvent.click(save())

    expect(recurrences()[0]).toMatchObject({ amount: null, estimate: 8750 })
  })

  it('s’enregistre même sans montant', async () => {
    fromRecurrenceDoor()
    await userEvent.click(choice(t.recurrences.variable))
    await userEvent.selectOptions(field(t.entry.category), 'cat-power')
    await userEvent.type(field(t.entry.label), 'Électricité')
    await userEvent.click(save())

    expect(recurrences()).toHaveLength(1)
    expect(recurrences()[0]).toMatchObject({ amount: null })
    expect(recurrences()[0]).not.toHaveProperty('estimate')
  })

  /* Le montant redevient obligatoire dès que la règle en fixe un — et il l'est
     toujours en ponctuel, où un mouvement sans montant n'est pas un mouvement. */
  it('reste obligatoire en montant fixe', async () => {
    fromRecurrenceDoor()
    await userEvent.selectOptions(field(t.entry.category), 'cat-rent')
    await userEvent.type(field(t.entry.label), 'Loyer')
    await userEvent.click(save())

    expect(screen.getByText(t.entry.amountRequired)).toBeInTheDocument()
    expect(recurrences()).toHaveLength(0)
  })
})

describe('les mots suivent ce qu’on enregistre', () => {
  it('parle de la récurrence en récurrence, de l’entrée en ponctuel', async () => {
    fromEntryDoor()
    await userEvent.click(save())
    expect(screen.getByText(t.entry.labelRequired)).toBeInTheDocument()

    await userEvent.click(choice(t.entry.recurring))
    expect(screen.getByText(t.entry.labelRequiredRecurring)).toBeInTheDocument()
    expect(screen.queryByText(t.entry.labelRequired)).not.toBeInTheDocument()
  })
})

describe('convertir une entrée ponctuelle en récurrence', () => {
  const seedEntry = (over: Partial<Entry> = {}) => {
    const entry = makeEntry({
      id: 'e1',
      date: TODAY,
      label: 'Assurance',
      categoryId: 'cat-rent',
      amount: eur(85000),
      status: 'confirmed',
      ...over,
    })
    useStore.setState((state) => ({
      data: { ...state.data, entries: [...state.data.entries, entry] },
    }))
  }

  it('propose la bascule sur une entrée ponctuelle', () => {
    seedEntry()
    editingEntry('e1')
    expect(screen.getByRole('radio', { name: t.entry.recurring })).toBeInTheDocument()
  })

  // Une échéance déjà générée n'a pas sa place ici : voir `canSwitchRhythm`.
  it('ne la propose pas sur une échéance déjà générée par une récurrence', () => {
    seedEntry({ recurrenceId: 'r-existante' })
    editingEntry('e1')
    expect(screen.queryByRole('radio', { name: t.entry.recurring })).not.toBeInTheDocument()
  })

  it('dit que la première échéance part payée quand l’entrée l’était déjà', async () => {
    seedEntry({ status: 'confirmed' })
    editingEntry('e1')
    await userEvent.click(choice(t.entry.recurring))
    expect(screen.getByText(t.entry.firstDatePaid)).toBeInTheDocument()
  })

  it('dit qu’elle reste à confirmer quand l’entrée n’était encore que prévue', async () => {
    seedEntry({ status: 'planned' })
    editingEntry('e1')
    await userEvent.click(choice(t.entry.recurring))
    expect(screen.getByText(t.entry.firstDatePlanned)).toBeInTheDocument()
  })

  it('remplace l’entrée par une récurrence, payée à sa date', async () => {
    seedEntry({ status: 'confirmed', amount: eur(85000) })
    editingEntry('e1')
    await userEvent.click(choice(t.entry.recurring))
    await userEvent.click(save())

    expect(entries().some((e) => e.id === 'e1')).toBe(false)
    expect(recurrences()).toHaveLength(1)
    expect(recurrences()[0]).toMatchObject({ label: 'Assurance', amount: 85000 })
    const posed = entries().find((e) => e.recurrenceId === recurrences()[0]?.id)
    expect(posed).toMatchObject({ status: 'confirmed', amount: 85000, date: TODAY })
  })

  it('ne force pas la confirmation d’une entrée qui n’était encore que prévue', async () => {
    seedEntry({ status: 'planned' })
    editingEntry('e1')
    await userEvent.click(choice(t.entry.recurring))
    await userEvent.click(save())

    expect(entries().some((e) => e.id === 'e1')).toBe(false)
    expect(recurrences()).toHaveLength(1)
    expect(entries().filter((e) => e.status === 'confirmed')).toHaveLength(0)
  })
})

/* ============================================================================
 * « Réglé par » — la balance entre membres, façon Tricount.
 *
 * La ligne de Camille, l'argent d'Alix : Camille le lui doit, et la
 * répartition fait la balance. Le champ ne se montre que là où il a un sens —
 * une dépense, à plusieurs — et l'égal du membre ne s'écrit pas : une
 * exception, jamais une copie.
 * ==========================================================================*/
describe('« réglé par », la balance entre membres', () => {
  const withMembers = () => {
    useStore.setState((state) => ({
      data: {
        ...state.data,
        household: {
          name: '',
          members: [
            makeMember({ id: 'm-1', name: 'Alix' }),
            makeMember({ id: 'm-2', name: 'Camille', color: 'var(--member-2)' }),
          ],
        },
      },
    }))
  }

  const seedExpense = () => {
    useStore.setState((state) => ({
      data: {
        ...state.data,
        entries: [
          makeEntry({
            id: 'e1',
            date: TODAY,
            label: 'Courses',
            categoryId: 'cat-rent',
            amount: eur(6_000),
            memberId: 'm-2',
            status: 'confirmed',
          }),
        ],
      },
    }))
  }

  it('propose le champ sur une dépense à plusieurs, pas sur un revenu', async () => {
    withMembers()
    fromEntryDoor()
    expect(field(t.entry.paidBy)).toBeInTheDocument()

    await userEvent.click(choice(t.entry.natureIncome))
    expect(missing(t.entry.paidBy)).not.toBeInTheDocument()
  })

  it('ne le propose pas à une personne : il n’y a personne d’autre pour régler', () => {
    fromEntryDoor()
    expect(missing(t.entry.paidBy)).not.toBeInTheDocument()
  })

  it('enregistre qui a réglé la ligne d’un autre', async () => {
    withMembers()
    seedExpense()
    editingEntry('e1')
    await userEvent.selectOptions(field(t.entry.paidBy), 'm-1')
    await userEvent.click(save())

    expect(entries()[0]).toMatchObject({ memberId: 'm-2', paidById: 'm-1' })
  })

  it('n’écrit pas l’égal du membre : une exception, jamais une copie', async () => {
    withMembers()
    seedExpense()
    editingEntry('e1')
    await userEvent.selectOptions(field(t.entry.paidBy), 'm-2')
    await userEvent.click(save())

    expect(entries()[0]).not.toHaveProperty('paidById')
  })
})

/* ============================================================================
 * Corriger une échéance générée : elle seule, ou toute la règle.
 *
 * Le formulaire ne touchait jamais la règle : on corrigeait le loyer d'août,
 * et septembre retombait sur l'ancien prix sans que rien ne le dise. La
 * bascule de portée pose la question, à la place exacte du rythme — c'est la
 * question du rythme, posée à une ligne qui en a déjà un.
 * ==========================================================================*/
describe('corriger une échéance générée : elle seule, ou toute la règle', () => {
  const seedOccurrence = (rule: Partial<Parameters<typeof makeRecurrence>[0]> = {}) => {
    useStore.setState((state) => ({
      data: {
        ...state.data,
        recurrences: [
          makeRecurrence({
            id: 'r1',
            label: 'Loyer',
            categoryId: 'cat-rent',
            amount: eur(85000),
            period: { unit: 'month', every: 1, anchorDay: 10 },
            ...rule,
          }),
        ],
        entries: [
          makeEntry({
            id: 'e1',
            recurrenceId: 'r1',
            date: TODAY,
            label: 'Loyer',
            categoryId: 'cat-rent',
            amount: eur(85000),
            status: 'confirmed',
          }),
        ],
      },
    }))
  }

  const setAmount = (value: string): void => {
    fireEvent.change(field(t.entry.amount), { target: { value } })
  }

  it('propose la portée sur une échéance générée, pas sur une saisie ponctuelle', () => {
    seedOccurrence()
    editingEntry('e1')
    expect(choice(t.entry.scopeOccurrence)).toHaveAttribute('aria-checked', 'true')
    expect(choice(t.entry.scopeRule)).toBeInTheDocument()
    cleanup()

    fromEntryDoor()
    expect(screen.queryByRole('radio', { name: t.entry.scopeOccurrence })).not.toBeInTheDocument()
  })

  it('laisse la règle tranquille tant que la portée reste à cette échéance', async () => {
    seedOccurrence()
    editingEntry('e1')
    setAmount('900')
    await userEvent.click(save())

    expect(entries().find((e) => e.id === 'e1')?.amount).toBe(eur(90000))
    expect(recurrences()[0]?.amount).toBe(eur(85000))
  })

  it('reporte la correction sur la règle quand la portée le demande', async () => {
    seedOccurrence()
    editingEntry('e1')
    setAmount('900')
    await userEvent.click(choice(t.entry.scopeRule))
    await userEvent.click(save())

    expect(recurrences()[0]?.amount).toBe(eur(90000))
    expect(entries().find((e) => e.id === 'e1')?.amount).toBe(eur(90000))
  })

  it('annonce la conséquence du choix, et la règle variable garde son montant', async () => {
    seedOccurrence({ amount: null })
    editingEntry('e1')
    expect(screen.getByText(t.entry.scopeOccurrenceHint)).toBeInTheDocument()

    await userEvent.click(choice(t.entry.scopeRule))
    expect(screen.getByText(t.entry.scopeRuleHintVariable)).toBeInTheDocument()

    await userEvent.click(save())
    expect(recurrences()[0]?.amount).toBeNull()
    expect(entries().find((e) => e.id === 'e1')?.amount).toBe(eur(85000))
  })

  it('annonce ce qui suit la règle quand son montant est fixe', async () => {
    seedOccurrence()
    editingEntry('e1')
    await userEvent.click(choice(t.entry.scopeRule))
    expect(screen.getByText(t.entry.scopeRuleHint)).toBeInTheDocument()
  })
})

/* ============================================================================
 * La saisie d'épargne demande **le support**, pas la catégorie ni le membre.
 *
 * « Où va l'argent » est la question de ce geste-là, et le support y répond
 * seul : il porte le poste sous lequel le mouvement se range et la personne à
 * qui il est. Les redemander donnerait trois réponses pour un seul fait, dont
 * deux peuvent se contredire.
 * ==========================================================================*/
describe('la saisie d’un mouvement d’épargne', () => {
  const withSupports = (): void => {
    useStore.setState({
      status: 'onboarding',
      ym: TODAY.slice(0, 7),
      data: makeData({
        household: { name: '', members: [makeMember({ id: 'm-1', name: 'Andrea' })] },
        families: [
          makeFamily({ id: 'fam-home', label: 'Logement', kind: 'charge' }),
          makeFamily({ id: 'fam-savings', label: 'Épargne', kind: 'saving' }),
        ],
        categories: [
          ...CATEGORIES,
          makeCategory({ id: 'passbook', label: 'Livrets', familyId: 'fam-savings' }),
        ],
        savingSupports: [
          makeSavingSupport({ id: 's-1', label: 'Livret A', memberId: 'm-1', categoryId: 'passbook' }),
        ],
      }),
    })
  }

  it('remplace la catégorie et le membre par le support', async () => {
    withSupports()
    fromEntryDoor()
    await userEvent.click(choice(t.entry.natureSaving))

    expect(field(t.savings.support)).toBeInTheDocument()
    expect(missing(t.entry.category)).not.toBeInTheDocument()
    expect(missing(t.entry.member)).not.toBeInTheDocument()
  })

  /* Le support répond aux trois questions d'un coup : le document ne garde
     qu'une catégorie et qu'un membre, et ce sont les siens. */
  it('en dérive la catégorie et le propriétaire à l’enregistrement', async () => {
    withSupports()
    fromEntryDoor()
    await userEvent.click(choice(t.entry.natureSaving))
    await userEvent.type(field(t.entry.amount), '300')
    await userEvent.selectOptions(field(t.savings.support), 's-1')
    await userEvent.type(field(t.entry.label), 'Virement livret')
    await userEvent.click(save())

    expect(entries()).toHaveLength(1)
    expect(entries()[0]).toMatchObject({
      savingSupportId: 's-1',
      categoryId: 'passbook',
      memberId: 'm-1',
      direction: 'out',
      amount: 30_000,
    })
  })

  it('exige le support, et le dit', async () => {
    withSupports()
    fromEntryDoor()
    await userEvent.click(choice(t.entry.natureSaving))
    await userEvent.type(field(t.entry.amount), '300')
    await userEvent.type(field(t.entry.label), 'Virement livret')
    await userEvent.click(save())

    expect(screen.getByText(t.savings.supportRequired)).toBeInTheDocument()
    expect(entries()).toHaveLength(0)
  })

  /* Changer de nature vide le support en même temps que la catégorie : un
     support resté en place sur une dépense laisserait derrière lui une
     catégorie que le même geste vient d'effacer, et l'entrée s'enregistrerait
     sans poste. */
  it('oublie le support dès qu’on quitte l’épargne', async () => {
    withSupports()
    fromEntryDoor()
    await userEvent.click(choice(t.entry.natureSaving))
    await userEvent.selectOptions(field(t.savings.support), 's-1')

    await userEvent.click(choice(t.entry.natureExpense))
    await userEvent.click(choice(t.entry.natureSaving))

    expect(field(t.savings.support)).toHaveValue('')
  })

  /* Sans personne au foyer, aucun support ne peut exister — une épargne est
     toujours à quelqu'un. La saisie retombe alors sur la catégorie, tout ce
     qu'on peut savoir du mouvement. */
  it('retombe sur la catégorie quand le foyer n’a personne', async () => {
    useStore.setState({
      status: 'onboarding',
      ym: TODAY.slice(0, 7),
      data: makeData({
        families: [
          makeFamily({ id: 'fam-home', label: 'Logement', kind: 'charge' }),
          makeFamily({ id: 'fam-savings', label: 'Épargne', kind: 'saving' }),
        ],
        categories: [
          ...CATEGORIES,
          makeCategory({ id: 'passbook', label: 'Livrets', familyId: 'fam-savings' }),
        ],
      }),
    })
    fromEntryDoor()
    await userEvent.click(choice(t.entry.natureSaving))

    expect(field(t.entry.category)).toBeInTheDocument()
    expect(missing(t.savings.support)).not.toBeInTheDocument()
  })
})

/* ============================================================================
 * Le plafond de versements — ce que la saisie refuse, et comment on passe.
 *
 * Le plafond se saisissait sur le support et ne retenait rien : verser 50 € sur
 * un livret plein passait sans un mot. Il arrête désormais l'enregistrement, et
 * il laisse deux sorties nommées — verser la place restante, ou verser quand
 * même —, parce que la place calculée est sous-estimée par construction et
 * qu'un refus sans issue finirait par refuser un versement réel.
 * ==========================================================================*/
describe('le plafond d’un support à la saisie', () => {
  /** Un livret plafonné à 22 950 €, relevé à 22 900 € : 50 € de place. */
  const withCap = (relevé = 2_290_000): void => {
    useStore.setState({
      status: 'onboarding',
      ym: TODAY.slice(0, 7),
      data: makeData({
        household: { name: '', members: [makeMember({ id: 'm-1', name: 'Andrea' })] },
        families: [
          makeFamily({ id: 'fam-home', label: 'Logement', kind: 'charge' }),
          makeFamily({ id: 'fam-savings', label: 'Épargne', kind: 'saving' }),
        ],
        categories: [
          ...CATEGORIES,
          makeCategory({ id: 'passbook', label: 'Livrets', familyId: 'fam-savings' }),
        ],
        savingSupports: [
          makeSavingSupport({
            id: 's-1',
            label: 'Livret A',
            memberId: 'm-1',
            categoryId: 'passbook',
            depositCap: eur(2_295_000),
          }),
        ],
        savingValuations: [
          makeSavingValuation({
            id: 'v-1',
            supportId: 's-1',
            amount: eur(relevé),
            date: TODAY,
          }),
        ],
      }),
    })
  }

  const fillSaving = async (amount: string): Promise<void> => {
    await userEvent.click(choice(t.entry.natureSaving))
    await userEvent.type(field(t.entry.amount), amount)
    await userEvent.selectOptions(field(t.savings.support), 's-1')
    await userEvent.type(field(t.entry.label), 'Virement livret')
  }

  it('laisse passer un versement qui tient sous le plafond', async () => {
    withCap()
    fromEntryDoor()
    await fillSaving('50')
    await userEvent.click(save())

    expect(entries()).toHaveLength(1)
  })

  it('retient l’enregistrement quand le versement dépasse, et chiffre le dépassement', async () => {
    withCap()
    fromEntryDoor()
    await fillSaving('120')

    expect(screen.getByRole('alert')).toBeInTheDocument()
    await userEvent.click(save())
    expect(entries()).toHaveLength(0)
  })

  it('propose d’écrêter à la place restante', async () => {
    withCap()
    fromEntryDoor()
    await fillSaving('120')
    await userEvent.click(screen.getByRole('button', { name: /^Verser 50/ }))
    await userEvent.click(save())

    expect(entries()).toHaveLength(1)
    expect(entries()[0]?.amount).toBe(5_000)
  })

  /* La place calculée est sous-estimée : si la banque a accepté, l'app ne peut
     pas être le dernier mot. Le geste est explicite, et il ne vaut que pour ce
     montant-là. */
  it('laisse verser quand même, une fois le dépassement assumé', async () => {
    withCap()
    fromEntryDoor()
    await fillSaving('120')
    await userEvent.click(screen.getByRole('button', { name: t.savings.capAnyway }))
    await userEvent.click(save())

    expect(entries()).toHaveLength(1)
    expect(entries()[0]?.amount).toBe(12_000)
  })

  it('repose la question dès que le montant change', async () => {
    withCap()
    fromEntryDoor()
    await fillSaving('120')
    await userEvent.click(screen.getByRole('button', { name: t.savings.capAnyway }))
    await userEvent.type(field(t.entry.amount), '0')
    await userEvent.click(save())

    expect(entries()).toHaveLength(0)
    expect(screen.getByRole('button', { name: t.savings.capAnyway })).toBeInTheDocument()
  })

  /* Une reprise rend de la place : la borner reviendrait à interdire de vider
     un compte plein. */
  it('ne retient jamais une reprise', async () => {
    withCap(2_400_000)
    fromEntryDoor()
    await userEvent.click(choice(t.entry.natureSaving))
    await userEvent.click(choice(t.entry.savingOut))
    await userEvent.type(field(t.entry.amount), '500')
    await userEvent.selectOptions(field(t.savings.support), 's-1')
    await userEvent.type(field(t.entry.label), 'Retrait livret')
    await userEvent.click(save())

    expect(entries()).toHaveLength(1)
  })

  /* Sans relevé, la place restante est inconnue — pas nulle. Arrêter une saisie
     sur une place qu'on ne sait pas calculer serait un refus tiré au sort. */
  it('ne retient rien sur un support jamais relevé', async () => {
    withCap()
    useStore.setState((state) => ({ data: { ...state.data, savingValuations: [] } }))
    fromEntryDoor()
    await fillSaving('9000')
    await userEvent.click(save())

    expect(entries()).toHaveLength(1)
  })
})
