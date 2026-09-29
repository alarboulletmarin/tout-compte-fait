import { describe, expect, it } from 'vitest'
import { odometerSlots } from './odometer'

const rolling = (text: string, prev: string | null) =>
  odometerSlots(text, prev)
    .map((slot, i) => (slot.kind === 'roll' ? i : -1))
    .filter((i) => i >= 0)

describe('odometerSlots', () => {
  it('ne fait rien défiler au premier affichage', () => {
    expect(rolling('765,62 €', null)).toEqual([])
  })

  it('ne fait pas défiler un montant identique', () => {
    expect(rolling('765,62 €', '765,62 €')).toEqual([])
  })

  it('ne fait défiler que les chiffres qui changent', () => {
    // 765,62 → 765,67 : seul le dernier chiffre bouge
    expect(rolling('765,67 €', '765,62 €')).toEqual([5])
    // 765,62 → 865,62 : seul le premier
    expect(rolling('865,62 €', '765,62 €')).toEqual([0])
  })

  it("garde en place l'espace, la virgule et le symbole", () => {
    const slots = odometerSlots('1\u00a0431,29\u00a0€', '1\u00a0331,29\u00a0€')
    expect(slots.filter((s) => s.kind === 'roll')).toHaveLength(1)
    expect(slots[1]).toEqual({ kind: 'still', char: '\u00a0' })
    expect(slots[5]).toEqual({ kind: 'still', char: ',' })
  })

  it("garde l'ancien chiffre pour l'animation de sortie", () => {
    expect(odometerSlots('765,67 €', '765,62 €')[5]).toEqual({ kind: 'roll', char: '7', from: '2' })
  })

  it('aligne à droite : un chiffre de tête qui apparaît est nouveau', () => {
    // 999,00 € → 1000,00 € : les centimes ne bougent pas, le « 1 » est nouveau
    const slots = odometerSlots('1000,00 €', '999,00 €')
    expect(slots[0]).toEqual({ kind: 'roll', char: '1', from: null })
    expect(slots[slots.length - 1]).toEqual({ kind: 'still', char: '€' })
    expect(slots[slots.length - 3]).toEqual({ kind: 'still', char: '0' })
  })

  it('traite le symbole monétaire de tête (anglais)', () => {
    const slots = odometerSlots('€1,000.00', '€999.00')
    expect(slots[0]).toEqual({ kind: 'still', char: '€' })
    expect(slots[1]).toEqual({ kind: 'roll', char: '1', from: null })
  })
})
