/* ============================================================================
 * La navigation range, elle ne cache pas.
 *
 * Ce qui est éprouvé ici n'est pas la mise en forme mais l'architecture : la
 * barre d'onglets a longtemps décidé de ce qui existait, parce qu'elle plafonne
 * à cinq entrées et que quatre écrans réels de l'app n'y tenaient pas. Ils
 * n'avaient alors aucune adresse — on n'y arrivait que par une tuile du mois,
 * laquelle s'efface précisément quand elle n'a rien à montrer.
 *
 * Trois invariants, donc, et ce sont ceux qu'un rangement de composants défait
 * sans que rien ne le dise : aucune destination perdue, l'onglet « Plus » reste
 * allumé dans ce qu'il range, et son lien dans la colonne latérale aussi.
 * ==========================================================================*/

import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { fr } from '@/i18n/fr'
import { Sidebar, TabBar } from './Nav'
import {
  ABOUT_PATH,
  ADVANCES_PATH,
  APPEARANCE_PATH,
  CATEGORIES_PATH,
  CREDITS_PATH,
  DATA_PATH,
  MANAGE_ROUTES,
  MORE_PATH,
  NAV_ROUTES,
  PEOPLE_PATH,
  PROJECTION_PATH,
  RECURRENCES_PATH,
  SAVINGS_PATH,
  SIDEBAR_GROUPS,
  SPLIT_PATH,
  STORAGE_PATH,
  isInMoreSection,
  isUnderMore,
} from './routes'

function tabs(at = '/') {
  return render(
    <MemoryRouter initialEntries={[at]}>
      <TabBar />
    </MemoryRouter>,
  )
}

function sidebar(at = '/') {
  return render(
    <MemoryRouter initialEntries={[at]}>
      <Sidebar householdName="Maison" />
    </MemoryRouter>,
  )
}

describe('Barre d’onglets — quatre destinations, et une porte pour le reste', () => {
  it('n’en porte que quatre', () => {
    tabs()

    expect(screen.getAllByRole('link')).toHaveLength(4)
    expect(NAV_ROUTES).toHaveLength(4)
  })

  it('garde les trois lectures qu’on ouvre pour regarder', () => {
    tabs()

    for (const label of [fr.nav.month, fr.nav.calendar, fr.nav.history, fr.nav.more]) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
  })

  /* Le défaut que la table de préfixes corrige : `NavLink` n'apparie que son
     propre chemin, et sans elle le premier pas dans une section éteignait les
     quatre onglets d'un coup — sans rien pour dire d'où l'on venait. */
  it.each([
    ['les récurrences', RECURRENCES_PATH],
    ['l’épargne', SAVINGS_PATH],
    ['la répartition', SPLIT_PATH],
    ['les crédits', CREDITS_PATH],
    ['les avances', ADVANCES_PATH],
    ['les personnes', PEOPLE_PATH],
    ['la fiche d’un membre', `${PEOPLE_PATH}/m-1`],
    ['le catalogue', CATEGORIES_PATH],
    ['l’apparence', APPEARANCE_PATH],
    ['le stockage', STORAGE_PATH],
    ['les données', DATA_PATH],
    ['à propos', ABOUT_PATH],
    ['le simulateur', PROJECTION_PATH],
    ['lui-même', MORE_PATH],
  ])('laisse « Plus » allumé sur %s', (_, path) => {
    expect(isInMoreSection(path)).toBe(true)
  })

  /* La réciproque, sans quoi le prédicat pourrait répondre « oui » à tout et
     les tests ci-dessus ne prouveraient rien. */
  it.each(['/', '/calendrier', '/historique', '/depense'])(
    'laisse « Plus » éteint sur %s',
    (path) => {
      expect(isInMoreSection(path)).toBe(false)
    },
  )
})

describe('Colonne latérale — trois groupes, et rien qui disparaisse', () => {
  /* Elle déplie ce qu'on ouvre souvent, et nomme le reste. Elle dépliait tout
     tant que « Plus » tenait en deux groupes ; il en porte cinq, dont un qui
     n'est pas fait que de liens — la devise se règle dans un sélecteur, et une
     colonne de navigation n'héberge pas un champ de formulaire. */
  it('déplie « Gérer » et nomme « Plus » pour le reste', () => {
    sidebar()

    for (const route of MANAGE_ROUTES) {
      expect(screen.getByRole('link', { name: route.label })).toBeInTheDocument()
    }
    expect(screen.getByRole('link', { name: fr.nav.more })).toHaveAttribute('href', MORE_PATH)
  })

  /* Un seul titre : le premier groupe s'ouvre sur les destinations
     quotidiennes, et le dernier ne contient qu'une destination — un titre posé
     au-dessus d'un lien unique n'aurait rien séparé de ce qu'il nomme. */
  it('ne nomme que le groupe qui fait descendre d’un cran', () => {
    sidebar()

    expect(screen.getByText(fr.nav.manage)).toBeInTheDocument()
    expect(SIDEBAR_GROUPS.filter((group) => group.title !== undefined)).toHaveLength(1)
  })

  /* L'invariant qui compte : le regroupement ne doit retirer aucune porte. Les
     trois lectures, les quatre écrans du foyer, « Plus », et les deux liens de
     pied — tout est atteignable d'un clic depuis la colonne. */
  it('mène à toutes les destinations sans exception', () => {
    const { container } = sidebar()
    const nav = within(container).getByRole('navigation')
    const paths = [...nav.querySelectorAll('a')].map((link) => link.getAttribute('href'))

    for (const group of SIDEBAR_GROUPS) {
      for (const route of group.routes) expect(paths).toContain(route.path)
    }
    expect(paths).toContain(ABOUT_PATH)
  })

  /* Le pendant de la table de préfixes de la barre d'onglets : sans elle, le
     premier pas dans l'une des cinq vues que « Plus » ouvre éteignait toute la
     colonne, sans rien pour dire d'où l'on venait. Elle est plus étroite que
     celle des onglets — la colonne déplie « Gérer », dont les écrans s'allument
     donc eux-mêmes, et elle porte son propre lien « À propos » en pied. */
  it.each([
    ['les personnes', PEOPLE_PATH],
    ['la fiche d’un membre', `${PEOPLE_PATH}/m-1`],
    ['le catalogue', CATEGORIES_PATH],
    ['l’apparence', APPEARANCE_PATH],
    ['le stockage', STORAGE_PATH],
    ['les données', DATA_PATH],
    /* Le simulateur n'est pas déplié par la colonne, contrairement aux quatre
       écrans de « Gérer » : « Plus » est donc la seule chose qu'elle puisse
       allumer quand on lit une projection. */
    ['le simulateur', PROJECTION_PATH],
    ['lui-même', MORE_PATH],
  ])('garde « Plus » allumé sur %s', (_, path) => {
    expect(isUnderMore(path)).toBe(true)
  })

  it.each([RECURRENCES_PATH, SAVINGS_PATH, ABOUT_PATH, '/'])(
    'laisse « Plus » éteint sur %s, que la colonne déplie déjà',
    (path) => {
      expect(isUnderMore(path)).toBe(false)
    },
  )

  it('allume son lien « Plus » dans les vues qu’il ouvre', () => {
    sidebar(PEOPLE_PATH)

    expect(screen.getByRole('link', { name: fr.nav.more })).toHaveClass('bg-accent')
  })
})
