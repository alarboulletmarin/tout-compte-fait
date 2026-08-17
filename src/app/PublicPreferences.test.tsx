/* ============================================================================
 * La langue et le thème, sur les écrans d'avant le foyer.
 *
 * Trois choses sont éprouvées ici, et la troisième est la seule qui ait changé
 * quand la rangée a rétréci :
 *   — les deux réglages fonctionnent sans document, ce qui est la raison d'être
 *     du composant ;
 *   — rien ne s'enregistre pour autant : le statut reste « onboarding » ;
 *   — les cinq positions **gardent leur nom complet**, alors qu'elles
 *     n'affichent plus qu'un code ou un glyphe. C'est exactement ce qu'une
 *     forme courte peut perdre en silence : à l'œil la rangée est plus jolie,
 *     et au lecteur d'écran elle ne dit plus rien.
 * ==========================================================================*/

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { makeData } from '@/domain/fixtures'
import { t } from '@/i18n/strings'
import { useStore } from '@/store/store'
import { PublicPreferences } from './PublicPreferences'

/* L'appareil neuf, tel qu'il arrive sur la présentation : la langue détectée,
   le thème sur « Système », et rien d'écrit nulle part. */
beforeEach(() => {
  useStore.setState({ status: 'onboarding', data: makeData() })
})

describe('PublicPreferences', () => {
  /* Le nom accessible est le nom complet, pas ce qui est écrit dans la boîte.
     « FR » suffit à l'œil ; « Français » est ce qu'annonce le lecteur d'écran,
     et c'est aussi ce qui reste vrai le jour où la boîte change encore. */
  it('nomme ses cinq positions en toutes lettres', () => {
    render(<PublicPreferences />)

    for (const name of [t.language.fr, t.language.en, t.theme.light, t.theme.dark, t.theme.system]) {
      expect(screen.getByRole('radio', { name })).toBeInTheDocument()
    }
  })

  /* Ce que voit l'œil, en regard : deux codes et aucun nom de langue déployé.
     C'est la moitié de la place rendue au titre. */
  it('n’affiche que le code de la langue', () => {
    render(<PublicPreferences />)

    expect(screen.getByRole('radio', { name: t.language.fr })).toHaveTextContent(
      t.language.frShort,
    )
    expect(screen.queryByText(t.language.fr)).not.toBeInTheDocument()
  })

  /* « Système » est le défaut, donc l'état de presque tout le monde : une
     bascule à deux positions ne saurait pas le montrer. Il reste une position,
     et il reste celle qui est cochée. */
  it('garde « Système » visible et cochable', async () => {
    const user = userEvent.setup()
    render(<PublicPreferences />)

    expect(screen.getByRole('radio', { name: t.theme.system })).toBeChecked()

    await user.click(screen.getByRole('radio', { name: t.theme.dark }))
    expect(useStore.getState().data.settings.theme).toBe('dark')

    await user.click(screen.getByRole('radio', { name: t.theme.system }))
    expect(useStore.getState().data.settings.theme).toBe('system')
  })

  /* La raison d'être du composant : changer de langue sans avoir de foyer. Le
     statut ne bouge pas — c'est `mutate` qui refuse d'écrire tant qu'on est en
     « onboarding », et ce test est ce qui empêche qu'un jour la rangée crée un
     document fantôme. La bascule du catalogue, elle, est éprouvée là où elle se
     produit : elle passe par un `import()` et un remontage de l'arbre
     (`i18n/strings.ts`), que ce composant seul ne déclenche pas. */
  it('change la langue sans créer de foyer', async () => {
    const user = userEvent.setup()
    render(<PublicPreferences />)

    await user.click(screen.getByRole('radio', { name: t.language.en }))

    expect(useStore.getState().data.settings.locale).toBe('en')
    expect(useStore.getState().status).toBe('onboarding')
    expect(screen.getByRole('radio', { name: t.language.en })).toBeChecked()
  })
})
