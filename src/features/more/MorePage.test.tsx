/* ============================================================================
 * « Plus » range par intention, pas par commodité.
 *
 * Ce qui est éprouvé ici n'est pas la mise en forme mais l'architecture de
 * l'information : cinq groupes qui nomment ce pour quoi on vient, et aucun
 * intitulé fourre-tout au-dessus d'eux. L'écran a compté un groupe « Réglages »
 * qui contenait les personnes, les catégories, l'apparence, la devise, les
 * données et « à propos » — six natures de tâches derrière un mot qui n'en
 * nomme aucune, et qui mentait sur deux d'entre elles au moins.
 * ==========================================================================*/

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  ABOUT_PATH,
  APPEARANCE_PATH,
  CATEGORIES_PATH,
  DATA_PATH,
  manageRoutes,
  PEOPLE_PATH,
  PROJECTION_PATH,
  STORAGE_PATH,
} from '@/app/routes'
import { makeCategory, makeData, makeFamily, makeMember } from '@/domain/fixtures'
import { en } from '@/i18n/en'
import { readStoredLocale } from '@/i18n/locale'
import { applyLocale, t } from '@/i18n/strings'
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

    for (const route of manageRoutes()) {
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

    expect(screen.getByText(t.nav.savingsHint)).toBeInTheDocument()
    expect(screen.getByText(t.nav.splitHint)).toBeInTheDocument()
  })
})

describe('les cinq intentions', () => {
  /* Le cœur du rangement : plus aucun intitulé ne couvre à lui seul les
     personnes, les catégories, l'apparence et les données. */
  it('nomme ce pour quoi on vient, et non « Réglages »', () => {
    open()

    for (const title of [
      t.nav.manage,
      t.nav.simulate,
      t.nav.organise,
      t.nav.data,
      t.nav.application,
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument()
    }
    expect(screen.queryByText('Réglages')).not.toBeInTheDocument()
    /* Ni « Calculateurs » ni « Outils » : ces mots-là nomment une catégorie
       d'objet, pas ce pour quoi on vient — c'est le défaut exact de
       « Réglages », et le rangement ne le réintroduit pas par la petite
       porte. */
    expect(screen.queryByText('Calculateurs')).not.toBeInTheDocument()
    expect(screen.queryByText('Outils')).not.toBeInTheDocument()
  })

  /* Le simulateur a deux portes, et celle-ci est la seule qui existe à toutes
     les largeurs : la rangée de l'écran Épargne vit en fin d'un écran qu'il
     faut avoir descendu. Un écran qu'on n'atteint que comme ça n'a pas
     d'adresse. */
  it('donne au simulateur une adresse sous « Simuler »', () => {
    open()

    expect(
      within(group(t.nav.simulate)).getByRole('link', { name: new RegExp(t.nav.projections) }),
    ).toHaveAttribute('href', PROJECTION_PATH)
  })

  /* Il n'est pas dans « Gérer », et c'est la distinction qui fait exister le
     cinquième groupe : « Gérer » range ce qui décide de ce que le budget
     calcule, et un simulateur ne décide de rien — il ne lit même pas le
     document. */
  it('ne range pas le simulateur sous « Gérer »', () => {
    open()

    expect(
      within(group(t.nav.manage)).queryByRole('link', { name: new RegExp(t.nav.projections) }),
    ).toBeNull()
  })

  /* Ce que « Organiser » sort des réglages : qui compose le foyer et sous
     quelles étiquettes on range sont la structure du budget, pas une
     préférence d'application. */
  it('range les personnes et les catégories sous « Organiser »', () => {
    open()
    const organise = within(group(t.nav.organise))

    expect(organise.getByRole('link', { name: new RegExp(t.settings.household) })).toHaveAttribute(
      'href',
      PEOPLE_PATH,
    )
    expect(
      organise.getByRole('link', { name: new RegExp(t.settings.categories) }),
    ).toHaveAttribute('href', CATEGORIES_PATH)
  })

  it('remonte les données d’un cran, au lieu de les enfouir sous un réglage', () => {
    open()
    const data = within(group(t.nav.data))

    expect(data.getByRole('link', { name: new RegExp(t.storage.title) })).toHaveAttribute(
      'href',
      STORAGE_PATH,
    )
    expect(data.getByRole('link', { name: new RegExp(t.settings.transfer) })).toHaveAttribute(
      'href',
      DATA_PATH,
    )
  })

  /* Ce qui reste vraiment un réglage : ce qui ne touche qu'à la façon dont
     l'app se présente — plus la page qui dit ce qu'elle est. */
  it('garde sous « Application » ce qui ne touche qu’à la présentation', () => {
    open()
    const application = within(group(t.nav.application))

    expect(
      application.getByRole('link', { name: new RegExp(t.appearance.title) }),
    ).toHaveAttribute('href', APPEARANCE_PATH)
    expect(application.getByRole('combobox', { name: t.settings.currency })).toBeInTheDocument()
    expect(application.getByRole('link', { name: new RegExp(t.nav.about) })).toHaveAttribute(
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
     chevron de navigation ; elle garde son repère, sans quoi la colonne de
     glyphes s'interromprait au milieu du groupe.

     Sa liste déroulante porte le sien, et les deux ne se confondent pas : le
     chevron d'une rangée pointe à droite et promet un écran, celui d'un
     contrôle pointe en bas et annonce ce qui s'ouvre sur place. */
  it('en donne un aussi à la rangée qui ne mène nulle part', () => {
    open()

    /* Le contrôle vit *sous* la ligne du libellé depuis que la rangée l'y a
       descendu (`Row`, branche `control`) : le `div` le plus proche du libellé
       n'est que cette ligne-là, et la rangée entière est son parent. */
    const row = screen.getByText(t.settings.currency).closest('div')?.parentElement
    const control = row?.querySelector('select')?.parentElement
    expect(control?.querySelectorAll('svg')).toHaveLength(1)
    // Le repère et ce chevron-là, et rien d'autre : la rangée n'est pas un lien.
    expect(row?.querySelectorAll('svg')).toHaveLength(2)
    expect(row?.querySelector('a')).toBeNull()
  })
})

describe('ce que chaque rangée dit d’elle-même', () => {
  /* La valeur plutôt que la phrase : elle renseigne mieux, et c'est ce qui fait
     qu'on n'ouvre que ce qu'on venait changer. */
  it('affiche la valeur des rangées qui en ont une', () => {
    open()

    expect(screen.getByText(`Maison · ${tpl(t.settings.membersCountOne, 1)}`)).toBeInTheDocument()
    expect(
      screen.getByText(`${tpl(t.settings.familyCount, 2)} · ${tpl(t.settings.familiesCount, 2)}`),
    ).toBeInTheDocument()
    expect(
      screen.getByText(tpl(t.settings.appearanceSummary, t.theme.system, t.palettes.classique)),
    ).toBeInTheDocument()
  })

  /* Le nom du foyer est facultatif — il ne se demande plus au premier
     lancement. Sans lui, la rangée dit ce qu'elle a à dire et rien de plus. */
  it('se passe du nom du foyer quand il n’y en a pas', () => {
    useStore.setState({ data: makeData({ household: { name: '', members: [] } }) })
    open()

    expect(screen.getByText(t.settings.membersNone)).toBeInTheDocument()
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

/**
 * Le réglage de langue, et ce qu'il doit à qui ne lit pas l'app.
 *
 * Le seul écran de l'app qu'on ouvre *sans pouvoir le lire* : quelqu'un qui
 * arrive sur une interface française sans parler français vient chercher un mot
 * qu'il reconnaît. C'est ce qui décide de la forme du contrôle, et c'est donc ce
 * qui se teste — pas seulement que le réglage existe, mais que les deux langues
 * sont **visibles ensemble**, et nommées chacune dans la sienne.
 */
describe('la langue', () => {
  it('montre les deux langues à la fois, chacune dans la sienne', () => {
    open()

    const application = group(t.nav.application)
    expect(within(application).getByRole('radio', { name: 'Français' })).toBeInTheDocument()
    expect(within(application).getByRole('radio', { name: 'English' })).toBeInTheDocument()
  })

  it('marque la langue active', () => {
    open()

    expect(screen.getByRole('radio', { name: 'Français' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'English' })).toHaveAttribute('aria-checked', 'false')
  })

  /* Le réglage vit dans le document, à côté du thème et de la palette : c'est
     un choix, et il doit survivre au navigateur qui l'a recueilli. */
  it('écrit la langue choisie dans le document', async () => {
    const user = userEvent.setup()
    open()

    await user.click(screen.getByRole('radio', { name: 'English' }))

    expect(useStore.getState().data.settings.locale).toBe('en')
  })

  /* Le miroir localStorage est celui des trois qui compte le plus : sans lui,
     l'app s'ouvre en français à chaque démarrage à froid, le temps d'un
     aller-retour de réseau pour aller chercher le catalogue anglais. */
  it('en garde un miroir pour le prochain démarrage', async () => {
    const user = userEvent.setup()
    open()

    await user.click(screen.getByRole('radio', { name: 'English' }))

    expect(readStoredLocale()).toBe('en')
  })
})

/**
 * L'app rendue en anglais, et la règle qu'elle vérifie.
 *
 * Les chaînes sont lues sur une liaison de module (`i18n/strings.ts`), qui n'est
 * juste qu'à une condition : **rien ne lit `t` à l'évaluation d'un module**. Un
 * tableau de libellés construit au chargement fige la langue du démarrage, et le
 * défaut ne se voit alors que sur l'écran concerné, en anglais, chez quelqu'un
 * qui ne le signalera pas.
 *
 * Cet écran-ci est le bon endroit pour l'éprouver : c'est celui qui portait le
 * plus de ces tables — les phrases de « Gérer », les noms de thème, les noms de
 * palette —, et elles sont toutes rendues ici en une fois.
 */
describe('rendu en anglais', () => {
  beforeEach(async () => {
    await applyLocale('en')
  })

  it('traduit les titres de groupe, qui viennent d’une table de module', () => {
    open()

    expect(screen.getByText(en.nav.manage)).toBeInTheDocument()
    expect(screen.getByText(en.nav.application)).toBeInTheDocument()
  })

  it('traduit les phrases de « Gérer », rangées par chemin', () => {
    open()

    expect(screen.getByText(en.nav.savingsHint)).toBeInTheDocument()
    expect(screen.getByText(en.nav.splitHint)).toBeInTheDocument()
  })

  /* La rangée d'apparence assemble deux tables indexées — les noms de thème et
     de palette — dans un gabarit. Trois occasions de figer la langue sur une
     seule ligne d'écran. */
  it('traduit le résumé d’apparence, assemblé de deux tables', () => {
    open()

    expect(
      screen.getByText(tpl(en.settings.appearanceSummary, en.theme.system, en.palettes.classique)),
    ).toBeInTheDocument()
  })

  it('garde le nom des deux langues dans la leur', () => {
    open()

    expect(screen.getByRole('radio', { name: 'Français' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'English' })).toBeInTheDocument()
  })
})
