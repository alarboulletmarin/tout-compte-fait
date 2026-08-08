import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { t } from '@/i18n/strings'
import { NOTICE_STORAGE_KEY } from '@/lib/notice'
import { useStore } from '@/store/store'
import {
  LEGAL_NOTICE_PATH,
  ONBOARDING_PATH,
  PRIVACY_PATH,
  styleguideRoute,
  TERMS_PATH,
} from './routes'
import { PrivacyNotice } from './PrivacyNotice'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  useStore.setState({ error: null })
})

function mount(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PrivacyNotice />
    </MemoryRouter>,
  )
}

/* `hidden: true` : le bouchon de `src/test/setup.ts` ne pose que l'attribut
   `open`, il ne sort pas l'élément de l'arbre d'accessibilité comme le ferait un
   vrai `showModal()`. C'est le même choix que `Sheet.test.tsx`. */
function dialog(): HTMLElement {
  return screen.getByRole('dialog', { hidden: true })
}

function action(): HTMLElement {
  return screen.getByRole('button', { name: t.notice.action })
}

/**
 * Ce que la touche Échap envoie à un `<dialog>` ouvert.
 *
 * Construit à la main : `createEvent` n'a pas de fabrique `cancel`, et jsdom
 * n'émet rien sur une vraie touche puisque son `showModal()` est un bouchon. Il
 * faut l'objet lui-même et non le booléen de `fireEvent` : c'est
 * `defaultPrevented` qui dit que la feuille a refusé de se fermer.
 */
function pressEscape(node: Element): Event {
  const event = new Event('cancel', { bubbles: false, cancelable: true })
  fireEvent(node, event)
  return event
}

describe('PrivacyNotice : quand elle se montre', () => {
  it('bloque au premier lancement', () => {
    mount()
    expect(dialog()).toBeInTheDocument()
    expect(screen.getByText(t.notice.noServer)).toBeInTheDocument()
  })

  /* Le vrai contrat du « une seule fois » : sans lui, la notice serait une
     modale bloquante à chaque ouverture de l'app. Rien du tout dans le DOM, et
     pas seulement pas de feuille : chez qui l'a lue, elle n'a jamais été là. */
  it('ne revient pas quand elle a été lue', () => {
    localStorage.setItem(NOTICE_STORAGE_KEY, '1')
    const { container } = mount()
    expect(container).toBeEmptyDOMElement()
  })

  /* Le stockage inaccessible, en navigation privée sur un vieux Safari. On ne
     sait pas, donc on montre : une notice vue deux fois est une gêne, une notice
     jamais vue est la fonctionnalité qui manque. */
  it('se montre plutôt que de se taire quand le stockage refuse', async () => {
    const user = userEvent.setup()
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('mode privé')
    })
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('mode privé')
    })

    mount()
    expect(dialog()).toBeInTheDocument()

    // Et la fermer ne lève pas, même si rien ne peut être retenu.
    await user.click(screen.getByRole('checkbox', { name: t.notice.check }))
    await user.click(action())
    expect(dialog()).not.toHaveAttribute('open')

    vi.restoreAllMocks()
  })
})

describe('PrivacyNotice : les écrans qui ne la reçoivent pas', () => {
  /* Son lien est la seule chose qu'elle donne à vérifier. Tant qu'elle
     recouvrait la page qu'il ouvre, on ne voyait rien se passer, donc le lien
     passait pour cassé. */
  it.each([PRIVACY_PATH, LEGAL_NOTICE_PATH, TERMS_PATH])('s’efface sur %s', (path) => {
    mount(path)
    expect(screen.queryByRole('dialog', { hidden: true })).not.toHaveAttribute('open')
  })

  it('s’efface sur le nuancier, qui n’est pas un écran de l’app', () => {
    mount(styleguideRoute().path)
    expect(screen.queryByRole('dialog', { hidden: true })).not.toHaveAttribute('open')
  })

  it.each(['/', ONBOARDING_PATH])('bloque sur %s', (path) => {
    mount(path)
    expect(dialog()).toBeInTheDocument()
  })

  /* Repartir des pages juridiques la ramène, décochée : le drapeau n'a pas été
     écrit, et lire la politique n'est pas dire qu'on l'a lue. */
  it('ne retient rien d’un détour par sa propre source', () => {
    mount(PRIVACY_PATH)
    expect(localStorage.getItem(NOTICE_STORAGE_KEY)).toBeNull()
  })

  /* Le pire moment de toute l'app pour bloquer : l'écran d'arrivée porte alors
     les quatre recours du cahier §5. */
  it('se retire devant un document qui ne s’ouvre pas', () => {
    useStore.setState({ error: { kind: 'read', message: 'illisible' } })
    mount()
    expect(screen.queryByRole('dialog', { hidden: true })).not.toHaveAttribute('open')
    expect(localStorage.getItem(NOTICE_STORAGE_KEY)).toBeNull()
  })
})

describe('PrivacyNotice : la case et le bouton', () => {
  it('n’ouvre le bouton qu’une fois la case cochée', async () => {
    const user = userEvent.setup()
    mount()

    expect(action()).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: t.notice.check }))
    expect(action()).toBeEnabled()
  })

  /* La feuille reste montée, refermée. L'animation de sortie de `.sheet` vit en
     CSS et il lui faut son nœud : la démonter escamoterait la modale d'un coup. */
  it('referme et retient, sur le seul geste qui le peut', async () => {
    const user = userEvent.setup()
    mount()

    await user.click(screen.getByRole('checkbox', { name: t.notice.check }))
    await user.click(action())

    expect(dialog()).not.toHaveAttribute('open')
    expect(localStorage.getItem(NOTICE_STORAGE_KEY)).toBe('1')
  })

  /* La raison du bouton éteint vit sur la case, qui est focusable : un
     `disabled` ne prend pas le focus, donc il ne peut pas l'annoncer lui-même. */
  it('dit pourquoi le bouton est éteint, et le dit encore après', async () => {
    const user = userEvent.setup()
    mount()

    expect(screen.getByText(t.notice.checkHint)).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: t.notice.check }))
    expect(screen.getByText(t.notice.checkHint)).toBeInTheDocument()
  })
})

describe('PrivacyNotice : les sorties qui n’existent pas', () => {
  it('ne se referme pas sur Échap', () => {
    mount()
    expect(pressEscape(dialog()).defaultPrevented).toBe(true)
    expect(dialog()).toBeInTheDocument()
  })

  it('ne se referme pas sur un clic à côté', () => {
    mount()
    fireEvent.click(dialog())
    expect(dialog()).toBeInTheDocument()
  })

  it('ne porte pas de croix, qui promettrait une sortie de plus', () => {
    mount()
    expect(screen.queryByRole('button', { name: t.common.close })).not.toBeInTheDocument()
  })

  it('n’écrit rien tant qu’elle est ouverte', () => {
    mount()
    fireEvent.click(dialog())
    expect(localStorage.getItem(NOTICE_STORAGE_KEY)).toBeNull()
  })
})

describe('PrivacyNotice : ce qu’elle donne à vérifier', () => {
  it('mène à la page de confidentialité', () => {
    mount()
    expect(screen.getByRole('link', { name: t.legal.privacy })).toHaveAttribute(
      'href',
      PRIVACY_PATH,
    )
  })

  /* Sans `aria-describedby`, `showModal()` poserait le focus sur le lien du
     corps et un lecteur d'écran annoncerait le titre puis « Confidentialité,
     lien », sans un mot des quatre lignes entre les deux. */
  it('désigne son texte, pour qu’il soit annoncé et pas traversé', () => {
    mount()
    const described = dialog().getAttribute('aria-describedby')
    expect(described).not.toBeNull()

    const body = document.getElementById(described ?? '')
    expect(body).not.toBeNull()
    expect(body).toHaveTextContent(t.notice.noReader)
  })

  it('compte quatre « aucun », et les rend en liste', () => {
    mount()
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
  })

  /* Le focus va sur la boîte et non sur son premier lien : c'est la condition
     pour que la description ci-dessus soit annoncée plutôt que le nom du lien. */
  it('donne le focus à la boîte, pas au lien qu’elle contient', () => {
    mount()
    expect(dialog()).toHaveFocus()
  })

  /* La case est derrière ce qu'elle atteste. Dans le pied, elle était hors du
     défilement : sur un téléphone de 320, on cochait « J'ai lu » sans avoir fait
     défiler une seule des quatre lignes. */
  it('pose la case après le texte, et non dans le pied', () => {
    mount()
    const body = document.getElementById(dialog().getAttribute('aria-describedby') ?? '')
    const box = screen.getByRole('checkbox', { name: t.notice.check })

    expect(body).toContainElement(box)
    // Et derrière le lien, donc en dernier de l'ordre de tabulation du corps.
    const link = screen.getByRole('link', { name: t.legal.privacy })
    expect(link.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
