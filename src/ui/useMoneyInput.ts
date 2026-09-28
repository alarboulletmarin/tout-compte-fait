import { useState } from 'react'
import { parseEuros } from '../i18n/format'
import { useI18n } from '../i18n/i18n'

/**
 * Saisie d'un montant en texte libre. Transmet les centimes dès que le texte se lit
 * (null s'il est vide), le reformate en quittant le champ, et signale un texte illisible.
 */
export function useMoneyInput(initial: number | null, onCents: (cents: number | null) => void) {
  const { euros } = useI18n()
  const [text, setText] = useState(initial === null ? '' : euros(initial))
  const empty = text.trim() === ''
  const cents = empty ? null : parseEuros(text)
  const invalid = !empty && cents === null

  return {
    text,
    cents,
    empty,
    invalid,
    onChange(next: string) {
      setText(next)
      const nextCents = next.trim() === '' ? null : parseEuros(next)
      if (next.trim() === '' || nextCents !== null) onCents(nextCents)
    },
    onBlur() {
      if (cents !== null) setText(euros(cents))
    },
  }
}
