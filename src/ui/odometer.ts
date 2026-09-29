// Odomètre : quels caractères d'un montant défilent quand il change.
// Pur et sans React, pour se tester seul.

export type Slot =
  /** Caractère qui ne bouge pas. */
  | { kind: 'still'; char: string }
  /** Chiffre qui défile ; `from` : l'ancien chiffre, null si la position est nouvelle. */
  | { kind: 'roll'; char: string; from: string | null }

const isDigit = (char: string | undefined): char is string => char !== undefined && /\d/.test(char)

/**
 * Compare deux montants formatés en les alignant à droite : les centimes restent face à face,
 * et un chiffre de tête qui apparaît (999 → 1 000) est nouveau. Seuls les chiffres qui changent
 * défilent ; séparateurs, espaces et symbole monétaire restent en place.
 */
export function odometerSlots(text: string, prev: string | null): Slot[] {
  const shift = prev === null ? 0 : text.length - prev.length
  return Array.from(text, (char, i) => {
    if (prev === null || !isDigit(char)) return { kind: 'still', char }
    const before = prev[i - shift]
    if (before === char) return { kind: 'still', char }
    return { kind: 'roll', char, from: isDigit(before) ? before : null }
  })
}
