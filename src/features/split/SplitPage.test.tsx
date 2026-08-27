import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { ENTRY_NEW_PATH } from '@/app/routes'
import { type Money, money } from '@/domain/money'
import { eur, makeCategory, makeData, makeEntry, makeFamily, makeMember } from '@/domain/fixtures'
import type { Entry, Period, Recurrence } from '@/domain/types'
import { t } from '@/i18n/strings'
import { formatMoney } from '@/i18n/format'
import { ALL_FILTER, useStore } from '@/store/store'
import { SplitPage } from './SplitPage'

const initial = useStore.getState().data

/* `getByText` normalise les blancs du nœud avant de comparer : l'espace
   insécable étroite qu'`Intl` glisse devant le symbole y devient une espace
   ordinaire. La chaîne attendue, elle, la garde telle quelle. */
const said = (text: string): string => text.replace(/\s+/g, ' ').trim()

/** Ce qu'`Amount` donne à lire d'une sortie, en texte hors de l'œil. */
const out = (value: Money): string =>
  said(`${t.direction.out.toLowerCase()} ${formatMoney(value, 'EUR')}`)

const MONTHLY: Period = { unit: 'month', every: 1, anchorDay: 1 }

const FAMILIES = [
  makeFamily({ id: 'fam-charges', label: 'Logement', kind: 'charge' }),
  makeFamily({ id: 'fam-res', label: 'Ressources', kind: 'resource' }),
]

const CATEGORIES = [
  makeCategory({ id: 'loyer', label: 'Loyer', familyId: 'fam-charges' }),
  makeCategory({ id: 'salaire', label: 'Salaire', familyId: 'fam-res', direction: 'in' }),
]

const ALIX = makeMember({ id: 'm-1', name: 'Alix' })
const CAMILLE = makeMember({ id: 'm-2', name: 'Camille', color: 'var(--member-2)' })

/** Un salaire mensuel au nom de quelqu'un — la seule source d'un revenu. */
function salary(memberId: string, amount: Money): Recurrence {
  return {
    id: `rec-${memberId}`,
    label: 'Salaire',
    categoryId: 'salaire',
    memberId,
    direction: 'in',
    amount,
    startedOn: '2026-01-01',
    period: MONTHLY,
  }
}

/**
 * Le foyer d'essai : deux revenus au double l'un de l'autre, une charge commune
 * de 900 € en août, et 300 € de plus avancés par Alix seule le même mois.
 *
 * Les chiffres sont choisis pour que tout tombe rond et que chaque assertion
 * porte sur une valeur qu'on peut vérifier de tête : pot 1 200, parts
 * 66,7 / 33,3, dues 800 / 400, avance −300 chez Alix, versements 500 / 400 —
 * dont la somme vaut 900, le pot moins l'avance. C'est exactement ce que la
 * carte prétend montrer.
 */
function household(over: { members?: typeof ALIX[]; entries?: Entry[] } = {}): void {
  useStore.setState({
    ym: '2026-08',
    filter: ALL_FILTER,
    data: makeData({
      household: { name: 'Foyer', members: over.members ?? [ALIX, CAMILLE] },
      families: FAMILIES,
      categories: CATEGORIES,
      recurrences: [salary('m-1', money(200_000)), salary('m-2', money(100_000))],
      entries: over.entries ?? [
        makeEntry({ date: '2026-08-05', label: 'Loyer', categoryId: 'loyer', amount: eur(90_000) }),
        /* `shared` explicite : une dépense qui porte un membre n'est pas
           commune par défaut, et sans lui il n'y aurait rien d'avancé. */
        makeEntry({
          date: '2026-08-12',
          label: 'Assurance',
          categoryId: 'loyer',
          amount: eur(30_000),
          memberId: 'm-1',
          shared: true,
        }),
      ],
    }),
  })

  render(
    <MemoryRouter>
      <SplitPage />
    </MemoryRouter>,
  )
}

/** La ligne d'un membre dans la carte des parts. */
const rowOf = (name: string): HTMLElement | null => screen.getByText(name).closest('li')

describe('La répartition, dans une carte qui se lit d’un trait', () => {
  afterEach(() => {
    useStore.setState({ data: initial })
  })

  /* Les tuiles Répartition et « À verser sur le commun » du mois ouvrent cet
     écran, et la barre d'onglets y allume « Plus » : sans retour, c'était un
     cul-de-sac. */
  it('porte un retour', () => {
    household()

    expect(screen.getByRole('button', { name: t.common.back })).toBeInTheDocument()
  })

  /* L'objet même du changement : le versement se lisait en tête de tuile, avant
     les termes qui le donnent. Un chiffre annoncé avant ses raisons se croit sur
     parole, et c'est précisément ce qu'un partage entre deux personnes ne fait
     pas. C'est l'ordre qui est testé, pas la présence. */
  it('pose le versement après le calcul qui le produit', () => {
    household()

    const text = said(rowOf('Alix')?.textContent ?? '')
    expect(text.indexOf(t.split.income)).toBeGreaterThan(text.indexOf('Alix'))
    expect(text.indexOf(t.split.settlementShare)).toBeGreaterThan(text.indexOf(t.split.income))
    expect(text.indexOf(t.split.due)).toBeGreaterThan(text.indexOf(t.split.settlementShare))
  })

  /* La vérification attendait après deux sections repliables, à deux écrans des
     chiffres qu'elle vérifie — il fallait en retenir deux pour constater qu'ils
     tombent. Elle ferme désormais la carte qu'elle vérifie, et c'est la seule
     place où elle prouve quelque chose. */
  it('ferme la même tuile que les parts', () => {
    household()

    expect(screen.getByText(t.split.checkTotal).closest('section')).toBe(
      screen.getByText('Alix').closest('section'),
    )
  })

  /* L'argument entier de la carte, en deux lignes : la somme des parts vaut le
     pot au centime, et la somme des versements vaut le pot moins ce qui a déjà
     été avancé — qui a réglé la facture ne la paie pas deux fois. Si ces
     montants divergent un jour, l'écran dément à l'affichage ce que les lignes
     du dessous promettent. */
  it('déduit l’avance du versement, et le dit sur les deux totaux', () => {
    household()

    expect(screen.getByText(out(eur(50_000)))).toBeInTheDocument() // Alix : 800 − 300
    expect(screen.getByText(out(eur(40_000)))).toBeInTheDocument() // Camille verse sa part
    expect(screen.getByText(t.split.advancedLine)).toBeInTheDocument()
    /* Deux fois en sortie : la ligne de vérification et le total replié de
       « Ce qui est partagé ». C'est le même chiffre que la tuile du pot, lu
       de deux façons de plus — la carte le redonne pour qu'on n'ait pas à
       remonter le chercher. */
    expect(screen.getAllByText(out(eur(120_000)))).toHaveLength(2)
    expect(screen.getByText(t.split.checkHint)).toBeInTheDocument()
    /* Le total des virements : une fois sur sa ligne de vérification, une fois
       sur la ligne du loyer que personne n'a avancé — même montant, hasard des
       chiffres ronds. */
    expect(screen.getByText(t.split.checkTransfers)).toBeInTheDocument()
    expect(screen.getAllByText(out(eur(90_000)))).toHaveLength(2)
  })

  /* Sans avance, « Part du commun » recopierait à l'identique le « À verser »
     juste dessous, et un « Déjà avancé 0,00 € » laisserait croire à une
     avance là où les comptes tombaient justes. */
  it('tait la déduction du mois où personne n’a rien avancé', () => {
    household({
      entries: [
        makeEntry({ date: '2026-08-05', label: 'Loyer', categoryId: 'loyer', amount: eur(90_000) }),
      ],
    })

    expect(screen.queryByText(t.split.settlementShare)).not.toBeInTheDocument()
    expect(screen.queryByText(t.split.advancedLine)).not.toBeInTheDocument()
    expect(screen.queryByText(t.split.checkTransfers)).not.toBeInTheDocument()
    expect(screen.getAllByText(t.split.income)).toHaveLength(2)
    expect(screen.getAllByText(t.split.due)).toHaveLength(2)
  })

  /* Le membre seul porte 100 % sans qu'aucun revenu soit exigé : le sien vaut
     zéro ici, et la rangée justifiée le rendrait bien plus lisible comme une
     donnée que l'ancienne chaîne collée. C'est une absence, pas un chiffre. */
  it('tait le revenu du membre seul, qui porte tout sans en avoir un', () => {
    useStore.setState({
      ym: '2026-08',
      filter: ALL_FILTER,
      data: makeData({
        household: { name: 'Foyer', members: [ALIX] },
        families: FAMILIES,
        categories: CATEGORIES,
        entries: [
          makeEntry({
            date: '2026-08-05',
            label: 'Loyer',
            categoryId: 'loyer',
            amount: eur(90_000),
          }),
        ],
      }),
    })
    render(
      <MemoryRouter>
        <SplitPage />
      </MemoryRouter>,
    )

    expect(screen.getByText(t.split.subtitleSolo)).toBeInTheDocument()
    expect(screen.getByText(said('100,0 %'))).toBeInTheDocument()
    expect(screen.queryByText(t.split.income)).not.toBeInTheDocument()
  })

  /* Le sous-titre vit dans la carte, et il n'y a pas de carte sur un mois sans
     charge commune : il doit alors se dire ailleurs, sans quoi l'écran perdrait
     ce qu'il est en changeant de mois. */
  it('garde son sous-titre sur un mois sans charge commune', () => {
    household({ entries: [] })

    expect(screen.getByText(t.split.subtitle)).toBeInTheDocument()
    expect(screen.getByText(t.split.nothing)).toBeInTheDocument()
    expect(screen.queryByText(t.split.checkTotal)).not.toBeInTheDocument()
    expect(screen.getByText(t.split.method)).toBeInTheDocument()
  })

  /* Le bug que ce test épingle : le revenu se lisait sur la règle seule, et
     corriger le salaire du mois ligne à ligne ne déplaçait jamais la part de
     ce mois-là — la répartition se lisait figée quel que soit le chiffre
     saisi. L'échéance du mois est un fait, et un fait passe devant une règle. */
  it('suit le salaire corrigé sur le mois, sans toucher à la règle', () => {
    // La paie d'Alix est tombée réduite : 1 000 € au lieu des 2 000 € de la
    // règle. À revenus égaux, les parts valent 50/50 — dues 450/450.
    household({
      entries: [
        makeEntry({ date: '2026-08-05', label: 'Loyer', categoryId: 'loyer', amount: eur(90_000) }),
        makeEntry({
          id: 'paie-alix',
          recurrenceId: 'rec-m-1',
          date: '2026-08-01',
          label: 'Salaire',
          categoryId: 'salaire',
          direction: 'in',
          memberId: 'm-1',
          amount: eur(100_000),
          status: 'confirmed',
        }),
      ],
    })

    expect(screen.getAllByText(said('50,0 %'))).toHaveLength(2)
    expect(screen.getAllByText(out(eur(45_000)))).toHaveLength(2)
  })

  /* Une dépense qui n'a rien à faire dans le pot se repère en la voyant — et
     se corrige d'un appui : chaque ligne du détail est une porte vers sa
     fiche, sans repasser par l'écran du mois. */
  it('ouvre la fiche d’une ligne du détail', async () => {
    useStore.setState({
      ym: '2026-08',
      filter: ALL_FILTER,
      data: makeData({
        household: { name: 'Foyer', members: [ALIX, CAMILLE] },
        families: FAMILIES,
        categories: CATEGORIES,
        recurrences: [salary('m-1', money(200_000)), salary('m-2', money(100_000))],
        entries: [
          makeEntry({
            id: 'e-loyer',
            date: '2026-08-05',
            label: 'Loyer',
            categoryId: 'loyer',
            amount: eur(90_000),
          }),
        ],
      }),
    })
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<SplitPage />} />
          <Route path={`${ENTRY_NEW_PATH}/:id`} element={<p>fiche-entree</p>} />
        </Routes>
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByText(t.split.detail))
    await userEvent.click(screen.getByRole('button', { name: /Loyer/ }))
    expect(screen.getByText('fiche-entree')).toBeInTheDocument()
  })
})
