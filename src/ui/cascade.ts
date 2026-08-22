import { type CSSProperties, useEffect, useState } from 'react'
import { prefersReducedMotion } from '@/lib/reveal'

/* Le pas de la cascade, tel que le handoff le pose : assez pour que les lignes
   se lisent l'une après l'autre, assez peu pour que toutes soient là avant
   qu'on ait fini de lire la première. */
export const CASCADE_STEP_MS = 110

/**
 * Combien de blocs sont déjà composés.
 *
 * Un compteur et non une classe d'animation par ligne : la cascade est une
 * suite, et une suite se compte. Sous `prefers-reduced-motion`, elle part
 * complète — tout est là au premier rendu, ce que le DS §4 demande et ce qui
 * évite le mode d'échec de toute cascade : un écran qui reste vide parce que
 * son minuteur n'a jamais couru.
 *
 * **Ici et non dans le bilan de la revue**, qui l'a écrit le premier : les
 * réponses du premier lancement se récapitulent de la même façon, et deux
 * cascades qui ne partiraient pas au même rythme se verraient d'un écran à
 * l'autre. Un hook, pas un composant : chaque écran habille ses lignes.
 */
export function useCascade(count: number): number {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? count : 0))

  useEffect(() => {
    if (shown >= count) return
    const timer = setTimeout(() => {
      setShown((step) => step + 1)
    }, CASCADE_STEP_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [shown, count])

  return shown
}

/**
 * Le style d'un bloc de la cascade, selon qu'il est déjà arrivé ou non.
 *
 * Six pixels, la plus courte des translations du DS §4 : le bloc se pose, il
 * n'arrive pas de loin. À poser avec `transition-[transform,opacity] ease-ds`,
 * que la feuille d'utilitaires porte déjà.
 */
export function cascadeStyle(rank: number, shown: number): CSSProperties {
  const here = rank < shown
  return {
    opacity: here ? 1 : 0,
    transform: here ? undefined : 'translateY(6px)',
    transitionDuration: 'var(--dur-view)',
  }
}
