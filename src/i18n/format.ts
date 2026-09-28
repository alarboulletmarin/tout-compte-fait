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

/** Les parts en pourcentage à une décimale, qui font 100 pile : [54,1 ; 45,9]. Plus fort reste. */
export function sharePercents(shares: readonly number[]): number[] {
  const raw = shares.map((s) => s * 1000)
  const leftover = 1000 - raw.reduce((sum, r) => sum + Math.floor(r), 0)
  const bumped = new Set(
    raw
      .map((r, i) => ({ i, frac: r - Math.floor(r) }))
      .sort((a, b) => b.frac - a.frac || a.i - b.i)
      .slice(0, leftover)
      .map(({ i }) => i),
  )
  return raw.map((r, i) => (Math.floor(r) + (bumped.has(i) ? 1 : 0)) / 10)
}

export function formatDecimal(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)
}

/**
 * Lit un montant saisi : « 1 431,29 € », « 1431.29 », « 45 », et en anglais « €1,431.29 ».
 * Renvoie des centimes, ou null si le texte n'est pas un montant. Sans passer par les flottants.
 */
export function parseEuros(text: string, locale: Locale = 'fr-FR'): number | null {
  let compact = text.replace(/[\s\u00a0\u202f€]/g, '')
  // En anglais, la virgule sépare les milliers (1,431.29) ; ailleurs, « 45,50 » reste une décimale
  compact =
    locale === 'en-GB' && /^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(compact)
      ? compact.replace(/,/g, '')
      : compact.replace(',', '.')
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(compact)
  if (!match) return null
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
  return Number.isSafeInteger(cents) ? cents : null
}
