import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Locale } from '@/domain/types'
import { fr } from './fr'
import { setCatalog, t } from './strings'
import { useApplyLocale } from './useLocale'

/**
 * L'écran remonte, la position ne bouge pas.
 *
 * Ce qui est éprouvé ici n'est pas le défilement de jsdom — il n'en a pas —,
 * c'est **l'ordre des deux gestes** : relever la position tant que l'ancien
 * arbre est là, la reposer une fois le nouveau écrit. C'est tout ce qui sépare
 * « on choisit sa langue en bas de l'écran Plus » de « on se retrouve en haut ».
 */
function Screen({ preference }: { preference: Locale }) {
  const active = useApplyLocale(preference)
  return (
    <div>
      <span data-testid="active">{active}</span>
      {/* Lu au rendu, comme partout ailleurs dans l'app : c'est ce qui prouve
          que le remontage a bien changé les mots. */}
      <span data-testid="mot">{t.common.add}</span>
    </div>
  )
}

/* jsdom pose `scrollTo` mais le fait lever. Il est remplacé une fois pour tout
   le fichier plutôt qu'autour de chaque test : la remise en français d'après
   chaque test provoque un dernier remontage, donc un dernier appel, et un
   espion rendu trop tôt le laisserait retomber sur celui de jsdom. */
const calls: ScrollToOptions[] = []
window.scrollTo = (options?: unknown) => {
  calls.push(options ?? {})
}

/** La position qu'on regardait au moment de changer de langue. */
function scrolledTo(position: number): void {
  Object.defineProperty(window, 'scrollY', { value: position, configurable: true })
}

beforeEach(() => {
  calls.length = 0
  setCatalog('fr', fr)
})

describe('changer de langue', () => {
  it('remet la page où elle était', async () => {
    scrolledTo(823)
    const view = render(<Screen preference="fr" />)

    view.rerender(<Screen preference="en" />)
    await screen.findByText('Add')

    expect(screen.getByTestId('active')).toHaveTextContent('en')
    expect(calls).toEqual([{ top: 823, behavior: 'auto' }])
  })

  /* Le premier affichage n'est pas un changement de langue : rendre une position
     qu'on n'a jamais quittée ferait sauter en haut de page tout écran qui monte
     — c'est-à-dire à chaque navigation. */
  it('ne touche à rien au premier affichage', () => {
    scrolledTo(500)
    render(<Screen preference="fr" />)

    expect(calls).toEqual([])
  })

  /* Demander la langue déjà affichée ne notifie personne (`applyLocale` rend la
     main tout de suite) : il n'y a donc ni remontage ni position à rendre. */
  it('ne touche à rien quand la langue ne change pas', async () => {
    scrolledTo(500)
    const view = render(<Screen preference="fr" />)

    view.rerender(<Screen preference="fr" />)
    await screen.findByText(fr.common.add)

    expect(calls).toEqual([])
  })
})
