import { useSyncExternalStore } from 'react'

/** Vrai tant que la media query correspond ; suit les changements de taille. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => matchMedia(query).matches,
  )
}

/** Tablette et au-delà : tableau de bord à la place de l'écran Virements mobile. */
export const WIDE = '(min-width: 768px)'
