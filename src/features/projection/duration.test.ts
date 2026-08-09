import { describe, expect, it } from 'vitest'
import { formatDuration } from './duration'

describe('durée en toutes lettres', () => {
  it('écrit les années pleines', () => {
    expect(formatDuration(60)).toBe('5 ans')
    expect(formatDuration(240)).toBe('20 ans')
  })

  it('accorde le singulier', () => {
    expect(formatDuration(12)).toBe('1 an')
    expect(formatDuration(1)).toBe('1 mois')
  })

  it('garde les mois qui restent, plutôt que d’arrondir l’année', () => {
    // Le quart d'un horizon de dix ans tombe à trente mois : l'écrire « 2 ans »
    // ferait mentir le montant posé en face.
    expect(formatDuration(30)).toBe('2 ans 6 mois')
    expect(formatDuration(13)).toBe('1 an 1 mois')
  })

  it('reste en mois sous l’année', () => {
    expect(formatDuration(8)).toBe('8 mois')
    expect(formatDuration(0)).toBe('0 mois')
  })
})
