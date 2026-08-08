/* ============================================================================
 * « Plus » range par intention, pas par commodité.
 *
 * Ce qui est éprouvé ici n'est pas la mise en forme mais l'architecture de
 * l'information : quatre groupes qui nomment ce pour quoi on vient, et aucun
 * intitulé fourre-tout au-dessus d'eux. L'écran a compté un groupe « Réglages »
 * qui contenait les personnes, les catégories, l'apparence, la devise, les
 * données et « à propos » — six natures de tâches derrière un mot qui n'en
 * nomme aucune, et qui mentait sur deux d'entre elles au moins.
 * ==========================================================================*/

import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  ABOUT_PATH,
  APPEARANCE_PATH,
  CATEGORIES_PATH,
  DATA_PATH,
  MANAGE_ROUTES,
  PEOPLE_PATH,
  STORAGE_PATH,
} from '@/app/routes'
import { makeCategory, makeData, makeFamily, makeMember } from '@/domain/fixtures'
import { fr } from '@/i18n/fr'
import { tpl } from '@/i18n/format'
import { useStore } from '@/store/store'
import { MorePage } from './MorePage'

function open() {
  return render(
    <MemoryRouter>
      <MorePage />
    </MemoryRouter>,
  )
}

/* Le groupe que l'étiquette nomme — c'est là que le rangement se vérifie, et
   non dans l'écran entier : une rangée présente quelque part ne prouve rien
   tant qu'on ne dit pas sous quelle intention elle est rangée. L'étiquette est
   un `Eyebrow`, dont le parent est la tuile du groupe (`ui/RowGroup.tsx`). */
function group(title: string): HTMLElement {
  const tile = screen.getByText(title).parentElement
  if (!(tile instanceof HTMLElement)) throw new Error(`groupe « ${title} » introuvable`)
  return tile
}

beforeEach(() => {
  useStore.setState({
    status: 'ready',
    data: makeData({
      household: { name: 'Maison', members: [makeMember({ id: 'm-1', name: 'Aix' })] },
      families: [
        makeFamily({ id: 'fam-transport', label: 'Transport' }),
        makeFamily({ id: 'fam-daily', label: 'Vie courante' }),
      ],
      categories: [
        makeCategory({ id: 'cat-fuel', label: 'Carburant', familyId: 'fam-transport' }),
        makeCategory({ id: 'cat-food', label: 'Courses', familyId: 'fam-daily' }),
      ],
    }),
  })
})

describe('« Plus » — la place qui manquait à quatre écrans', () => {
  /* La raison d'être de l'écran : l'épargne, la répartition et les crédits
     n'avaient aucune adresse dans la navigation, et n'existaient qu'au bout
     d'une tuile du mois qui s'efface quand elle n'a rien à montrer. */
  it('mène à chaque écran que « Gérer » range', () => {
    open()

    for (const route of MANAGE_ROUTES) {
      expect(screen.getByRole('link', { name: new RegExp(route.label) })).toHaveAttribute(
        'href',
        route.path,
      )
    }
  })

  /* Sur un écran qui n'est qu'une liste de portes, un libellé seul demande
     d'ouvrir pour savoir si c'était la bonne. */
  it('dit d’une phrase ce qu’il y a derrière chaque porte de « Gérer »', () => {
    open()

    expect(screen.getByText(fr.nav.savingsHint)).toBeInTheDocument()
    expect(screen.getByText(fr.nav.splitHint)).toBeInTheDocument()
  })
})

describe('les quatre intentions', () => {
  /* Le cœur du rangement : plus aucun intitulé ne couvre à lui seul les
     personnes, les catégories, l'apparence et les données. */
  it('nomme ce pour quoi on vient, et non « Réglages »', () => {
    open()

    for (const title of [fr.nav.manage, fr.nav.organise, fr.nav.data, fr.nav.application]) {
      expect(screen.getByText(title)).toBeInTheDocument()
    }
    expect(screen.queryByText('Réglages')).not.toBeInTheDocument()
  })

  /* Ce que « Organiser » sort des réglages : qui compose le foyer et sous
     quelles étiquettes on range sont la structure du budget, pas une
     préférence d'application. */
  it('range les personnes et les catégories sous « Organiser »', () => {
    open()
    const organise = within(group(fr.nav.organise))

    expect(organise.getByRole('link', { name: new RegExp(fr.settings.household) })).toHaveAttribute(
      'href',
      PEOPLE_PATH,
    )
    expect(
      organise.getByRole('link', { name: new RegExp(fr.settings.categories) }),
    ).toHaveAttribute('href', CATEGORIES_PATH)
  })

  it('remonte les données d’un cran, au lieu de les enfouir sous un réglage', () => {
    open()
    const data = within(group(fr.nav.data))

    expect(data.getByRole('link', { name: new RegExp(fr.storage.title) })).toHaveAttribute(
      'href',
      STORAGE_PATH,
    )
    expect(data.getByRole('link', { name: new RegExp(fr.settings.transfer) })).toHaveAttribute(
      'href',
      DATA_PATH,
    )
  })

  /* Ce qui reste vraiment un réglage : ce qui ne touche qu'à la façon dont
     l'app se présente — plus la page qui dit ce qu'elle est. */
  it('garde sous « Application » ce qui ne touche qu’à la présentation', () => {
    open()
    const application = within(group(fr.nav.application))

    expect(
      application.getByRole('link', { name: new RegExp(fr.appearance.title) }),
    ).toHaveAttribute('href', APPEARANCE_PATH)
    expect(application.getByRole('combobox', { name: fr.settings.currency })).toBeInTheDocument()
    expect(application.getByRole('link', { name: new RegExp(fr.nav.about) })).toHaveAttribute(
      'href',
      ABOUT_PATH,
    )
  })
})

/* Sous 1024px, cet écran *est* la navigation : la barre ne porte que quatre
   repères, et tout ce qu'elle range se lisait en texte seul. Le glyphe est
   aria-hidden — il ne s'atteint donc pas par un rôle, et c'est bien ce qu'on
   veut : le libellé porte le sens, le glyphe porte la reconnaissance. */
describe('les repères', () => {
  it('donne à chaque rangée le glyphe de sa destination', () => {
    open()

    /* Deux glyphes par rangée qui mène ailleurs : le repère à gauche, le
       chevron à droite. Un seul voudrait dire que le repère manque. */
    for (const link of screen.getAllByRole('link')) {
      expect(link.querySelectorAll('svg')).toHaveLength(2)
    }
  })

  /* La devise ne mène nulle part — elle se règle sur place —, donc pas de
     chevron ; elle garde son repère, sans quoi la colonne de glyphes
     s'interromprait au milieu du groupe. */
  it('en donne un aussi à la rangée qui ne mène nulle part', () => {
    open()

    const row = screen.getByText(fr.settings.currency).closest('div')
    expect(row?.querySelectorAll('svg')).toHaveLength(1)
  })
})

describe('ce que chaque rangée dit d’elle-même', () => {
  /* La valeur plutôt que la phrase : elle renseigne mieux, et c'est ce qui fait
     qu'on n'ouvre que ce qu'on venait changer. */
  it('affiche la valeur des rangées qui en ont une', () => {
    open()

    expect(screen.getByText(`Maison · ${tpl(fr.settings.membersCountOne, 1)}`)).toBeInTheDocument()
    expect(
      screen.getByText(`${tpl(fr.settings.familyCount, 2)} · ${tpl(fr.settings.familiesCount, 2)}`),
    ).toBeInTheDocument()
    expect(
      screen.getByText(tpl(fr.settings.appearanceSummary, fr.theme.system, fr.palettes.classique)),
    ).toBeInTheDocument()
  })

  /* Le nom du foyer est facultatif — il ne se demande plus au premier
     lancement. Sans lui, la rangée dit ce qu'elle a à dire et rien de plus. */
  it('se passe du nom du foyer quand il n’y en a pas', () => {
    useStore.setState({ data: makeData({ household: { name: '', members: [] } }) })
    open()

    expect(screen.getByText(fr.settings.membersNone)).toBeInTheDocument()
  })

  /* Un second tableau de bord serait en retard d'une règle sur le premier : les
     chiffres du budget restent sur les écrans qui les calculent, et le
     catalogue reste sur le sien. */
  it('ne déplie ni le catalogue ni le moindre chiffre du budget', () => {
    open()

    expect(screen.queryByText('Carburant')).not.toBeInTheDocument()
    expect(screen.queryByText('Transport')).not.toBeInTheDocument()
  })
})
