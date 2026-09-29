// Mouvement : deux garde-fous communs, mouvement réduit et View Transitions.

/** L'utilisateur a demandé moins de mouvement : on n'anime rien qui ne soit indispensable. */
export const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Applique `update` avec une View Transition quand le navigateur en a une et que le mouvement
 * n'est pas réduit ; sinon, tout de suite. L'écran d'après est photographié quand la promesse
 * rendue par `update` se résout (ou dès son retour si elle est synchrone).
 * Rend la transition pour qui veut la suivre, ou null.
 */
export function withViewTransition(update: () => void | Promise<void>): ViewTransition | null {
  if (!('startViewTransition' in document) || reducedMotion()) {
    update()
    return null
  }
  return document.startViewTransition(update)
}
