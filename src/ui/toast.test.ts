import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast, useToasts } from './toast'

const messages = (): string[] => useToasts.getState().toasts.map((t) => t.message)
const counts = (): number[] => useToasts.getState().toasts.map((t) => t.count)

beforeEach(() => {
  vi.useFakeTimers()
  useToasts.setState({ toasts: [] })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('pile de messages', () => {
  it('compte un message répété au lieu de l’empiler', () => {
    toast('Échéance confirmée')
    toast('Échéance confirmée')
    toast('Échéance confirmée')
    expect(messages()).toEqual(['Échéance confirmée'])
    expect(counts()).toEqual([3])
  })

  it('repart du délai complet à chaque répétition', () => {
    toast('Échéance confirmée')
    vi.advanceTimersByTime(3000)
    toast('Échéance confirmée')
    vi.advanceTimersByTime(3000)
    // Sans la remise à zéro, le premier compte à rebours aurait déjà fini.
    expect(messages()).toHaveLength(1)
    vi.advanceTimersByTime(1500)
    expect(messages()).toEqual([])
  })

  it('ne fond pas deux messages différents', () => {
    toast('Échéance confirmée')
    toast('Mois confirmé')
    expect(messages()).toEqual(['Échéance confirmée', 'Mois confirmé'])
  })

  it('ne fond pas deux tons différents', () => {
    toast('Rien à faire')
    toast('Rien à faire', 'danger')
    expect(messages()).toHaveLength(2)
  })

  it('n’en garde jamais plus de trois à l’écran', () => {
    for (const m of ['un', 'deux', 'trois', 'quatre', 'cinq']) toast(m)
    expect(messages()).toEqual(['trois', 'quatre', 'cinq'])
  })

  it('s’efface tout seul au bout du délai', () => {
    toast('Échéance confirmée')
    vi.advanceTimersByTime(4001)
    expect(messages()).toEqual([])
  })

  it('laisse plus de temps au message qui propose un retour arrière', () => {
    toast('Dépense supprimée', 'default', { label: 'Rétablir', onAction: () => undefined })
    vi.advanceTimersByTime(4001)
    // Quatre secondes suffisent à lire, pas à s'apercevoir qu'on s'est trompé
    // et à atteindre le bouton.
    expect(messages()).toEqual(['Dépense supprimée'])
    vi.advanceTimersByTime(4001)
    expect(messages()).toEqual([])
  })

  /* Le seul des trois délais qui vienne du design : un échec se lit vraiment,
     là où une réussite se reconnaît à sa forme. */
  it('laisse une seconde de plus à un échec', () => {
    toast('L’enregistrement a échoué', 'danger')
    vi.advanceTimersByTime(4001)
    expect(messages()).toEqual(['L’enregistrement a échoué'])
    vi.advanceTimersByTime(1200)
    expect(messages()).toEqual([])
  })

  /* Le plus long des deux gagne : ce qui décide du délai d'un message qui
     propose un geste, c'est le geste — pas sa couleur. */
  it('rend ses huit secondes à un échec qui propose un retour arrière', () => {
    toast('Suppression impossible', 'danger', { label: 'Rétablir', onAction: () => undefined })
    vi.advanceTimersByTime(5201)
    expect(messages()).toEqual(['Suppression impossible'])
    vi.advanceTimersByTime(2800)
    expect(messages()).toEqual([])
  })

  it('retire les retours arrière sans toucher aux messages', () => {
    toast('Dépense supprimée', 'default', { label: 'Rétablir', onAction: () => undefined })
    toast('Échéance confirmée')

    useToasts.getState().clearActions()

    expect(messages()).toEqual(['Dépense supprimée', 'Échéance confirmée'])
    expect(useToasts.getState().toasts.every((t) => t.action === undefined)).toBe(true)
  })

  it('ne rend pas une pile neuve quand il n’y a aucun retour arrière à retirer', () => {
    toast('Échéance confirmée')
    const before = useToasts.getState().toasts

    useToasts.getState().clearActions()

    /* Une mutation du document par échéance confirmée : sans ce garde, chacune
       rendrait à nouveau toute la pile alors qu'aucun message n'a changé. */
    expect(useToasts.getState().toasts).toBe(before)
  })

  it('remplace le retour arrière d’un message répété plutôt que de garder l’ancien', () => {
    const first = vi.fn()
    const second = vi.fn()
    toast('Dépense supprimée', 'default', { label: 'Rétablir', onAction: first })
    toast('Dépense supprimée', 'default', { label: 'Rétablir', onAction: second })

    expect(counts()).toEqual([2])
    useToasts.getState().toasts[0]?.action?.onAction()

    // C'est le dernier geste qu'on défait, jamais l'avant-dernier.
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()
  })

  it('se ferme à la main sans laisser son minuteur derrière', () => {
    toast('Échéance confirmée')
    const id = useToasts.getState().toasts[0]?.id ?? 0
    useToasts.getState().dismiss(id)
    expect(messages()).toEqual([])

    // Le même message revient : il ne doit pas être effacé par l'ancien minuteur.
    toast('Échéance confirmée')
    vi.advanceTimersByTime(3000)
    expect(messages()).toHaveLength(1)
  })
})
