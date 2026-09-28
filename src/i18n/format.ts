// Formatage et lecture des montants ; tout est en centimes entiers.

export type Locale = 'fr-FR' | 'en-GB'

export const LOCALES: readonly Locale[] = ['fr-FR', 'en-GB']

export function formatEuros(cents: number, locale: Locale): string {
  // Espace fine insécable → insécable : Geist n'a pas de glyphe pour U+202F
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' })
    .format(cents / 100)
    .replace(/\u202f/g, '\u00a0')
}

/** 0,5414 → « 54,1 % » */
export function formatShare(share: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
    .format(share)
    .replace(/\u202f/g, '\u00a0')
}

/** Les deux parts en pourcentage à une décimale, qui font 100 pile : [54,1 ; 45,9]. */
export function sharePercents(share1: number): [number, number] {
  const tenths = Math.round(share1 * 1000)
  return [tenths / 10, (1000 - tenths) / 10]
}

export function formatDecimal(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)
}

/**
 * Lit un montant saisi : « 1 431,29 € », « 1431.29 », « 45 ». Renvoie des centimes,
 * ou null si le texte n'est pas un montant. Sans passer par les flottants.
 */
export function parseEuros(text: string): number | null {
  const compact = text.replace(/[\s\u00a0\u202f€]/g, '').replace(',', '.')
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(compact)
  if (!match) return null
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
  return Number.isSafeInteger(cents) ? cents : null
}
