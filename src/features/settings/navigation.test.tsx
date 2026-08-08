/* ============================================================================
 * Cinq vues, chacune à son adresse, et « Plus » pour seule entrée.
 *
 * Ce qui est éprouvé ici n'est pas la mise en forme mais l'architecture : les
 * pas de navigation qui mènent à chaque vue, et le retour de chacune. Ce que
 * « Plus » montre de son côté — les quatre groupes, et le fait qu'aucun ne
 * s'appelle « Réglages » — est éprouvé avec lui, dans `features/more`.
 *
 * Ces vues vivaient sous `/reglages/…`, derrière une page d'entrée qui les
 * réunissait toutes. La page a disparu et les adresses ont remonté d'un cran :
 * deux d'entre elles ne réglaient rien — les personnes et les catégories sont
 * la structure du budget —, et un écran rangé sous un parent qui n'existe plus
 * n'aurait gardé de la hiérarchie que ce qu'elle avait de faux.
 * ==========================================================================*/

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  APPEARANCE_PATH,
  CATEGORIES_PATH,
  FAMILY_NEW_PATH,
  LEGACY_SETTINGS_PATH,
  MEMBER_NEW_PATH,
  MORE_PATH,
  PEOPLE_PATH,
  familyPath,
  isFocusScreen,
  legacySettingsTarget,
} from '@/app/routes'
import { makeCategory, makeData, makeFamily, makeMember } from '@/domain/fixtures'
import { t } from '@/i18n/strings'
import { tpl } from '@/i18n/format'
import { useStore } from '@/store/store'
import { CategoriesPage } from './CategoriesPage'
import { CategoryNewPage, FamilyNewPage } from './CategoryForms'
import { FamilyPage } from './FamilyPage'
import { MemberPage } from './MemberPage'
import { PeoplePage } from './PeoplePage'
import { AppearancePage } from './AppearancePage'

/* Les mêmes chemins que `app/Routes.tsx`, par les mêmes constantes : un test
   qui écrirait ses URL à la main resterait vert le jour où l'app change les
   siennes. « Plus » n'est ici qu'une cible de retour — un titre suffit à dire
   qu'on y est revenu, et le vrai écran est éprouvé chez lui. */
function open(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={MORE_PATH} element={<h1>{t.nav.more}</h1>} />
        <Route path={APPEARANCE_PATH} element={<AppearancePage />} />
        <Route path={PEOPLE_PATH} element={<PeoplePage />} />
        <Route path={MEMBER_NEW_PATH} element={<MemberPage />} />
        <Route path={`${PEOPLE_PATH}/:id`} element={<MemberPage />} />
        <Route path={CATEGORIES_PATH} element={<CategoriesPage />} />
        <Route path={FAMILY_NEW_PATH} element={<FamilyNewPage />} />
        <Route path={`${CATEGORIES_PATH}/:id`} element={<FamilyPage />} />
        <Route path={`${CATEGORIES_PATH}/:id/nouvelle`} element={<CategoryNewPage />} />
      </Routes>
    </MemoryRouter>,
  )
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
        makeCategory({ id: 'cat-toll', label: 'Péages', familyId: 'fam-transport' }),
        makeCategory({ id: 'cat-food', label: 'Courses', familyId: 'fam-daily' }),
      ],
    }),
  })
})

/* Le retour de chaque vue mène à « Plus », et non plus à une page d'entrée qui
   n'existe plus. C'est ce qu'un rangement de composants casse sans que rien ne
   le dise : la vue reste juste, et le bouton « retour » atterrit sur une
   redirection. */
describe('le retour des cinq vues', () => {
  it.each([
    ['l’apparence', APPEARANCE_PATH],
    ['les personnes', PEOPLE_PATH],
    ['le catalogue', CATEGORIES_PATH],
  ])('remonte de %s à « Plus »', async (_, path) => {
    const user = userEvent.setup()
    open(path)

    await user.click(screen.getByRole('button', { name: t.common.back }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t.nav.more)
  })
})

describe('l’apparence', () => {
  /* Deux réglages, deux groupes de choix : c'est ce qui les rend combinables
     plutôt que confondus. */
  it('porte le thème et les six palettes', async () => {
    const user = userEvent.setup()
    open(APPEARANCE_PATH)

    expect(screen.getByRole('radiogroup', { name: t.theme.label })).toBeInTheDocument()
    const palettes = screen.getByRole('group', { name: t.appearance.paletteLabel })
    expect(within(palettes).getAllByRole('radio')).toHaveLength(6)

    await user.click(screen.getByRole('radio', { name: new RegExp(t.palettes.vive) }))
    expect(useStore.getState().data.settings.palette).toBe('vive')
  })

  /* La palette est un réglage d'apparence, pas une donnée : la changer ne doit
     toucher à rien d'autre — et surtout pas aux teintes déjà posées sur les
     catégories, qui sont des noms de tokens et suivent d'elles-mêmes. */
  it('ne touche qu’au réglage, jamais aux teintes enregistrées', async () => {
    const user = userEvent.setup()
    const before = useStore.getState().data.categories.map((c) => c.color)
    open(APPEARANCE_PATH)

    await user.click(screen.getByRole('radio', { name: new RegExp(t.palettes.contrastee) }))
    expect(useStore.getState().data.categories.map((c) => c.color)).toEqual(before)
    expect(useStore.getState().data.settings.theme).toBe('system')
  })
})

describe('le catalogue', () => {
  it('descend famille par famille, et remonte', async () => {
    const user = userEvent.setup()
    open(CATEGORIES_PATH)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t.settings.categories)

    await user.click(screen.getByRole('link', { name: /Transport/ }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Transport')
    expect(screen.getByDisplayValue('Carburant')).toBeInTheDocument()
    // Les catégories des autres familles restent où elles sont.
    expect(screen.queryByDisplayValue('Courses')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: t.common.back }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t.settings.categories)
  })

  /* La recherche existait déjà ; ce qu'elle doit garder, c'est de retrouver une
     catégorie sans ouvrir sa famille — et de dire de laquelle il s'agit. */
  it('retrouve une catégorie sans ouvrir sa famille, et nomme celle-ci', async () => {
    const user = userEvent.setup()
    open(CATEGORIES_PATH)

    await user.type(screen.getByRole('searchbox', { name: t.settings.categorySearch }), 'carbu')

    const result = screen.getByRole('link', { name: /Carburant/ })
    expect(result).toHaveTextContent('Transport')
    expect(screen.queryByRole('link', { name: /Vie courante/ })).not.toBeInTheDocument()

    await user.click(result)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Transport')
  })

  it('dit ce qu’aucune recherche ne trouve', async () => {
    const user = userEvent.setup()
    open(CATEGORIES_PATH)

    await user.type(screen.getByRole('searchbox', { name: t.settings.categorySearch }), 'zzz')

    expect(screen.getByText(tpl(t.settings.categorySearchEmpty, 'zzz'))).toBeInTheDocument()
  })

  /* Le formulaire de création n'attend plus ouvert sous la liste : on le
     demande, et la famille qu'il crée s'ouvre pour qu'on y range. */
  it('crée une famille sur demande, et atterrit dessus', async () => {
    const user = userEvent.setup()
    open(CATEGORIES_PATH)

    await user.click(screen.getByRole('button', { name: t.settings.familyAdd }))
    await user.type(screen.getByRole('textbox', { name: t.settings.familyName }), 'Animaux')
    await user.click(screen.getByRole('button', { name: t.settings.familyAdd }))

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Animaux')
    expect(useStore.getState().data.families.map((f) => f.label)).toContain('Animaux')
  })

  /* La famille est connue : la création d'une catégorie ne la redemande pas. */
  it('crée une catégorie dans la famille où l’on est', async () => {
    const user = userEvent.setup()
    open(familyPath('fam-transport'))

    await user.click(screen.getByRole('button', { name: t.settings.categoryAdd }))
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: t.settings.categoryName }), 'Péage A7')
    await user.click(screen.getByRole('button', { name: t.settings.categoryAdd }))

    const created = useStore.getState().data.categories.find((c) => c.label === 'Péage A7')
    expect(created?.familyId).toBe('fam-transport')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Transport')
  })
})

describe('les personnes', () => {
  it('mènent à la fiche d’un membre, où le prénom se valide', async () => {
    const user = userEvent.setup()
    open(PEOPLE_PATH)

    await user.click(screen.getByRole('button', { name: /Aix/ }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Aix')

    const field = screen.getByRole('textbox', { name: t.settings.memberName })
    await user.clear(field)
    await user.type(field, 'Camille')
    // Rien n'est écrit tant qu'on n'a pas validé.
    expect(useStore.getState().data.household.members[0]?.name).toBe('Aix')

    await user.click(screen.getByRole('button', { name: t.common.save }))
    expect(useStore.getState().data.household.members[0]?.name).toBe('Camille')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t.settings.household)
  })

  it('ajoutent un membre depuis une vue à part', async () => {
    const user = userEvent.setup()
    open(PEOPLE_PATH)

    await user.click(screen.getByRole('button', { name: t.settings.memberAdd }))
    await user.type(screen.getByRole('textbox', { name: t.settings.memberName }), 'Sacha')
    await user.click(screen.getByRole('button', { name: t.settings.memberAdd }))

    expect(useStore.getState().data.household.members.map((m) => m.name)).toEqual(['Aix', 'Sacha'])
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t.settings.household)
  })
})

/* Le bouton flottant pose la saisie d'une dépense ; « Ajouter un membre » pose
   un membre. Deux actions principales sur le même écran, à trois centimètres
   l'une de l'autre, ne disent plus laquelle est celle de l'écran. */
/* Une URL qu'on a pu mettre en signet, poser sur son écran d'accueil ou envoyer
   à quelqu'un ne se supprime pas : elle se redirige. Et elle se redirige
   *entièrement* — atterrir sur l'accueil de la section aurait laissé le travail
   à moitié fait, comme si le lien n'avait jamais désigné qu'un rayon. */
describe('les anciennes adresses sous /reglages', () => {
  it.each([
    [LEGACY_SETTINGS_PATH, MORE_PATH],
    [`${LEGACY_SETTINGS_PATH}/`, MORE_PATH],
    [`${LEGACY_SETTINGS_PATH}/personnes`, PEOPLE_PATH],
    [`${LEGACY_SETTINGS_PATH}/personnes/m-1`, `${PEOPLE_PATH}/m-1`],
    [`${LEGACY_SETTINGS_PATH}/categories`, CATEGORIES_PATH],
    [`${LEGACY_SETTINGS_PATH}/categories/fam-1/nouvelle`, `${CATEGORIES_PATH}/fam-1/nouvelle`],
    [`${LEGACY_SETTINGS_PATH}/apparence`, APPEARANCE_PATH],
  ])('mène de %s à %s', (from, to) => {
    expect(legacySettingsTarget(from)).toBe(to)
  })
})

describe('le bouton flottant', () => {
  it('se retire des cinq vues, et reste sur « Plus »', () => {
    expect(isFocusScreen(MORE_PATH)).toBe(false)
    expect(isFocusScreen(PEOPLE_PATH)).toBe(true)
    expect(isFocusScreen(CATEGORIES_PATH)).toBe(true)
    expect(isFocusScreen(APPEARANCE_PATH)).toBe(true)
    expect(isFocusScreen(familyPath('fam-transport'))).toBe(true)
  })
})
