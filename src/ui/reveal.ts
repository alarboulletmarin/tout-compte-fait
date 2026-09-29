import { useEffect, useState, type CSSProperties } from 'react'

let played = false

/**
 * Vrai au premier affichage des virements de la session, faux ensuite : la révélation
 * est un moment, pas un rituel à chaque changement d'onglet.
 */
export function useRevealOnce(): boolean {
  const [reveal] = useState(() => !played)
  useEffect(() => {
    played = true
  }, [])
  return reveal
}

/** Rang d'un élément dans une révélation échelonnée (lu par le CSS : --i). */
export const step = (i: number) => ({ '--i': i }) as CSSProperties
