import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { t } from '@/i18n/strings'
import { ENTRY_NEW_PATH, entryNewPath } from './routes'
import { QuickEntry } from './QuickEntry'

/* Le composant navigue : sans témoin, on ne saurait pas où. Celui-ci rend
   l'URL courante, requête comprise — c'est elle qui porte le sens et la
   nature. */
function CurrentUrl() {
  const { pathname, search } = useLocation()
  return <span data-testid="url">{`${pathname}${search}`}</span>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QuickEntry />
      <CurrentUrl />
      {/* Tient lieu d'onglet : une navigation qui ne passe pas par le bouton. */}
      <Link to="/calendrier">{t.nav.calendar}</Link>
      <Routes>
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  )
}

const trigger = () => screen.getByRole('button', { name: t.shell.quickEntry })
const url = () => screen.getByTestId('url').textContent

describe('QuickEntry — le bouton de saisie flottant', () => {
  it('ne montre les trois portes qu’une fois déplié', async () => {
    renderAt('/')
    expect(screen.queryByRole('menuitem', { name: t.entry.newOut })).not.toBeInTheDocument()

    await userEvent.click(trigger())
    expect(screen.getByRole('menuitem', { name: t.entry.newOut })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: t.entry.newIn })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: t.entry.newSaving })).toBeInTheDocument()
  })

  it('annonce son état et change de nom quand il se déplie', async () => {
    renderAt('/')
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(trigger())
    const open = screen.getByRole('button', { name: t.shell.quickEntryClose })
    expect(open).toHaveAttribute('aria-expanded', 'true')
  })

  /* Les trois portes mènent à trois saisies différentes, et c'est tout l'objet
     du bouton : un FAB unique ramènerait la dépense pour tout le monde. */
  it.each([
    [t.entry.newOut, entryNewPath({ direction: 'out' })],
    [t.entry.newIn, entryNewPath({ direction: 'in' })],
    [t.entry.newSaving, entryNewPath({ direction: 'out', saving: true })],
  ])('« %s » ouvre %s', async (label, expected) => {
    renderAt('/')
    await userEvent.click(trigger())
    await userEvent.click(screen.getByRole('menuitem', { name: label }))
    expect(url()).toBe(expected)
  })

  it('se replie sur Échap, et rend le focus au bouton', async () => {
    renderAt('/')
    await userEvent.click(trigger())
    expect(screen.getByRole('menuitem', { name: t.entry.newOut })).toHaveFocus()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menuitem', { name: t.entry.newOut })).not.toBeInTheDocument()
    expect(trigger()).toHaveFocus()
  })

  it('se replie une fois la porte franchie', async () => {
    renderAt('/')
    await userEvent.click(trigger())
    await userEvent.click(screen.getByRole('menuitem', { name: t.entry.newOut }))
    expect(screen.queryByRole('menuitem', { name: t.entry.newIn })).not.toBeInTheDocument()
  })

  /* Il vit dans la coquille et ne se démonte jamais : l'état survivrait à un
     changement d'écran qui ne passe pas par lui — le bouton « retour » du
     navigateur, un onglet. */
  it('se replie quand l’écran change sans passer par lui', async () => {
    renderAt('/')
    await userEvent.click(trigger())
    expect(screen.getByRole('menuitem', { name: t.entry.newOut })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: t.nav.calendar }))
    expect(screen.queryByRole('menuitem', { name: t.entry.newOut })).not.toBeInTheDocument()
    expect(url()).toBe('/calendrier')
  })

  /* Le menu porte `role="menu"` : les flèches le parcourent, et le parcours
     boucle. Sans ça le rôle promet un motif clavier qu'il ne tient pas. */
  it('se parcourt aux flèches, et boucle', async () => {
    renderAt('/')
    await userEvent.click(trigger())
    expect(screen.getByRole('menuitem', { name: t.entry.newOut })).toHaveFocus()

    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: t.entry.newIn })).toHaveFocus()

    await userEvent.keyboard('{End}')
    expect(screen.getByRole('menuitem', { name: t.entry.newSaving })).toHaveFocus()

    // La dernière porte suivie d'une flèche bas ramène à la première.
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: t.entry.newOut })).toHaveFocus()

    await userEvent.keyboard('{ArrowUp}')
    expect(screen.getByRole('menuitem', { name: t.entry.newSaving })).toHaveFocus()
  })

  /* Ce que le repli coûte : les portes restent montées, et c'est une règle CSS
     seule qui les efface. Elle vise `.quick-doors[data-open='false']`, donc les
     deux sur le même nœud — séparés, le sélecteur ne désigne rien et les trois
     boutons s'affichent en permanence, ce qui est arrivé. jsdom ne charge pas
     la feuille de style et ne peut pas le voir à l'écran : c'est le contrat
     entre le composant et le sélecteur qu'on tient ici, faute de mieux. */
  it('porte l’état de repli sur le nœud que le style vise', async () => {
    const { container } = renderAt('/')
    expect(container.querySelector('.quick-doors[data-open="false"]')).not.toBeNull()

    await userEvent.click(trigger())
    expect(container.querySelector('.quick-doors[data-open="true"]')).not.toBeNull()
  })

  /* Repliées, les portes restent montées pour pouvoir s'animer en partant.
     Elles ne doivent alors être ni annoncées, ni atteignables. */
  it('retire les portes repliées de l’arbre d’accessibilité', async () => {
    const { container } = renderAt('/')
    const menu = container.querySelector('#portes-de-saisie')

    expect(menu).toHaveAttribute('aria-hidden', 'true')
    expect(menu).toHaveAttribute('inert')

    await userEvent.click(trigger())
    expect(menu).not.toHaveAttribute('aria-hidden')
    expect(menu).not.toHaveAttribute('inert')
  })

  /* La colonne du bouton flottant fait 168px de large sur plus de 200px de
     haut : la hauteur des trois portes, qui restent montées repliées, plus
     celle du bouton. Sans fond elle ne se voit pas, mais un `div` reste une
     cible — tout ce qui passait sous ce rectangle recevait les appuis à sa
     place, et les deux rangées du bas des récurrences y perdaient leur moitié
     droite, chevron compris.

     jsdom ne fait pas de mise en page et ne peut pas viser un pixel : ce qu'on
     tient ici est le contrat entre le cadre, qui laisse passer, et chaque cible,
     qui reprend les appuis pour elle seule. */
  it('laisse passer les appuis à travers la colonne, et pas à travers ses cibles', async () => {
    const { container } = renderAt('/')
    const column = container.querySelector('.quick-doors')
    const menu = container.querySelector('#portes-de-saisie')

    expect(column).toHaveClass('pointer-events-none')
    expect(trigger()).toHaveClass('pointer-events-auto')

    /* Repliées, les portes ne reprennent rien non plus : trois boutons
       transparents empilés sur la page ne doivent pas l'intercepter, quel que
       soit le moteur — `inert` est une garantie d'accessibilité, pas de
       géométrie. */
    expect(menu).toHaveClass('pointer-events-none')

    await userEvent.click(trigger())
    expect(menu).toHaveClass('pointer-events-auto')
  })

  /* Le calque referme aussi : toucher à côté est le geste le plus évident
     devant trois boutons qu'on n'a pas voulu ouvrir. */
  it('se replie sur un appui à côté', async () => {
    const { container } = renderAt('/')
    await userEvent.click(trigger())

    const overlay = container.querySelector('.quick-scrim')
    expect(overlay).not.toBeNull()
    await userEvent.click(overlay as Element)
    expect(screen.queryByRole('menuitem', { name: t.entry.newOut })).not.toBeInTheDocument()
  })

  /* Même garde que le raccourci « n » : sur un écran de saisie, il partirait
     créer une dépense par-dessus celle qu'on écrit, en contournant la garde de
     brouillon qui ne surveille que les deux boutons de sortie. */
  it('n’existe pas sur un écran de saisie', () => {
    const { container } = renderAt(ENTRY_NEW_PATH)
    expect(screen.queryByRole('button', { name: t.shell.quickEntry })).not.toBeInTheDocument()
    expect(container).not.toBeEmptyDOMElement()
  })
})
