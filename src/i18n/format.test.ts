import { describe, expect, it } from 'vitest'
import { formatEuros, formatShare, parseEuros, sharePercents } from './format'

// Intl sépare les milliers par une espace fine insécable
const plain = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ')

describe('formatEuros', () => {
  it.each([
    [143129, '1 431,29 €'],
    [4500, '45,00 €'],
    [0, '0,00 €'],
    [7, '0,07 €'],
    [100000000, '1 000 000,00 €'],
  ])('%i centimes → %s', (cents, text) => {
    expect(plain(formatEuros(cents, 'fr-FR'))).toBe(text)
  })

  it('en anglais', () => {
    expect(formatEuros(143129, 'en-GB')).toBe('€1,431.29')
  })
})

describe('parts', () => {
  it('formate une part à une décimale', () => {
    expect(plain(formatShare(230000 / 424800, 'fr-FR'))).toBe('54,1 %')
  })

  it('les pourcentages font 100 pile', () => {
    expect(sharePercents([230000 / 424800, 194800 / 424800])).toEqual([54.1, 45.9])
    expect(sharePercents([1 / 3, 2 / 3])).toEqual([33.3, 66.7])
    expect(sharePercents([0.5, 0.5])).toEqual([50, 50])
  })

  it('à trois ou plus, le dixième restant va au plus fort reste', () => {
    expect(sharePercents([1 / 3, 1 / 3, 1 / 3])).toEqual([33.4, 33.3, 33.3])
    expect(sharePercents([0.5, 0.25, 0.25])).toEqual([50, 25, 25])
    const six = sharePercents([1, 2, 3, 4, 5, 6].map((n) => n / 21))
    expect(Math.round(six.reduce((a, b) => a + b) * 10)).toBe(1000)
  })
})

describe('parseEuros', () => {
  it.each([
    ['45', 4500],
    ['45,5', 4550],
    ['45,50', 4550],
    ['45.5', 4550],
    ['1 431,29 €', 143129],
    ['1\u202f431,29\u00a0€', 143129],
    ['0,07', 7],
    ['0', 0],
    ['  12 ', 1200],
  ])('lit « %s » → %i', (text, cents) => {
    expect(parseEuros(text)).toBe(cents)
  })

  it.each(['', ' ', 'abc', '-5', '1,234', '1.2.3', '12,', ',5', '1e3', '9'.repeat(20)])(
    'refuse « %s »',
    (text) => {
      expect(parseEuros(text)).toBeNull()
    },
  )

  it.each([
    ['€1,431.29', 143129],
    ['1,431.29', 143129],
    ['1,431', 143100],
    ['1,234,567.89', 123456789],
    ['45.50', 4550],
    ['45,50', 4550],
    ['45,5', 4550],
    ['€0.07', 7],
  ])('en anglais, lit « %s » → %i', (text, cents) => {
    expect(parseEuros(text, 'en-GB')).toBe(cents)
  })

  it.each(['1,23,456', '1.431,29', '€', '12,345,6'])('en anglais, refuse « %s »', (text) => {
    expect(parseEuros(text, 'en-GB')).toBeNull()
  })

  it('relit ce que formatEuros écrit, dans les deux langues', () => {
    for (const cents of [0, 1, 99, 4500, 143129, 123456789]) {
      expect(parseEuros(formatEuros(cents, 'en-GB'), 'en-GB')).toBe(cents)
    }
  })

  it('relit ce que formatEuros écrit', () => {
    for (const cents of [0, 1, 99, 4500, 143129, 123456789]) {
      expect(parseEuros(formatEuros(cents, 'fr-FR'))).toBe(cents)
    }
  })
})
