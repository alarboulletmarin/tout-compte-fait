import { describe, expect, it } from 'vitest'
import { parseRateBp, toRateInput } from './rate'

describe('saisie d’un taux', () => {
  it('rend des points de base entiers', () => {
    expect(parseRateBp('4,5')).toBe(450)
    expect(parseRateBp('4.5')).toBe(450)
    expect(parseRateBp('11')).toBe(1100)
    expect(parseRateBp('0,01')).toBe(1)
  })

  it('accepte les espaces autour', () => {
    expect(parseRateBp('  3,25  ')).toBe(325)
  })

  it('lit un champ vide comme un taux nul, pas comme une absence', () => {
    expect(parseRateBp('')).toBe(0)
    expect(parseRateBp('   ')).toBe(0)
  })

  it('refuse ce qui ne peut être qu’une faute de frappe', () => {
    // « 450 » tapé en pensant points de base : un refus visible, jamais une
    // projection à 450 % qui aurait l'air d'un résultat.
    expect(parseRateBp('450')).toBe(null)
    expect(parseRateBp('-1')).toBe(null)
    expect(parseRateBp('abc')).toBe(null)
  })

  it('accepte la borne haute elle-même', () => {
    expect(parseRateBp('100')).toBe(10_000)
  })

  it('fait l’aller-retour sans dériver', () => {
    expect(toRateInput(parseRateBp('4,5') ?? 0)).toBe('4,5')
    expect(toRateInput(1100)).toBe('11')
  })

  it('rend un champ vide sur un taux nul ou absent', () => {
    expect(toRateInput(0)).toBe('')
    expect(toRateInput(undefined)).toBe('')
  })
})
