import { beforeEach, describe, expect, it } from 'vitest'
import { PALETTES, isPaletteSetting } from '@/domain/types'
import { readStoredLocale } from '@/i18n/locale'
import {
  PALETTE_STORAGE_KEY,
  applyPalette,
  mirrorAppearance,
  readStoredPalette,
  storePalette,
} from './palette'
import {
  THEME_STORAGE_KEY,
  applyResolvedTheme,
  isThemePreference,
  readStoredPreference,
  resolveTheme,
  storePreference,
} from './theme'

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('retombe sur « system » si rien n’est stocké', () => {
    expect(readStoredPreference()).toBe('system')
  })

  it('retombe sur « system » si la valeur stockée est corrompue', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'chartreuse')
    expect(readStoredPreference()).toBe('system')
  })

  it('relit ce qu’il a écrit', () => {
    storePreference('dark')
    expect(readStoredPreference()).toBe('dark')
  })

  it('résout une préférence explicite sans consulter le système', () => {
    expect(resolveTheme('light')).toBe('light')
    expect(resolveTheme('dark')).toBe('dark')
  })

  it('écrit le thème résolu sur <html>', () => {
    applyResolvedTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    applyResolvedTheme('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('reconnaît les trois préférences valides et rien d’autre', () => {
    expect(isThemePreference('system')).toBe(true)
    expect(isThemePreference('light')).toBe(true)
    expect(isThemePreference('dark')).toBe(true)
    expect(isThemePreference('auto')).toBe(false)
    expect(isThemePreference(null)).toBe(false)
  })

  /* La barre système ne prend plus une couleur choisie dans ce fichier mais
     celle que la feuille calcule, palette comprise. Sous jsdom aucune feuille ne
     s'applique, donc `--bg` est vide : ce qu'on vérifie ici est le repli — une
     couleur valide plutôt qu'une balise vidée. */
  it('pose une couleur de barre système même sans feuille de style', () => {
    const meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    meta.setAttribute('content', '')
    document.head.append(meta)

    applyResolvedTheme('dark')
    expect(meta.getAttribute('content')).toMatch(/^#[0-9a-fA-F]{6}$/)

    meta.remove()
  })

  it('ne touche pas à une balise theme-color conditionnelle', () => {
    const scoped = document.createElement('meta')
    scoped.setAttribute('name', 'theme-color')
    scoped.setAttribute('media', '(prefers-color-scheme: dark)')
    scoped.setAttribute('content', '#123456')
    document.head.append(scoped)

    applyResolvedTheme('light')
    expect(scoped.getAttribute('content')).toBe('#123456')

    scoped.remove()
  })
})

describe('palette', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('retombe sur « classique » si rien n’est stocké', () => {
    expect(readStoredPalette()).toBe('classique')
  })

  it('retombe sur « classique » si la valeur stockée est inconnue', () => {
    localStorage.setItem(PALETTE_STORAGE_KEY, 'aurore')
    expect(readStoredPalette()).toBe('classique')
  })

  it('relit ce qu’il a écrit', () => {
    storePalette('contrastee')
    expect(readStoredPalette()).toBe('contrastee')
  })

  it('écrit la palette sur <html>, sans toucher au thème', () => {
    applyResolvedTheme('dark')
    applyPalette('vive')
    expect(document.documentElement.dataset.palette).toBe('vive')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  /* Les cinq chemins qui remplacent le document en bloc passent par là. Oublier
     l'un des trois miroirs ferait peindre l'ancienne apparence au démarrage
     suivant — un défaut qui ne se voit qu'une fois la page rechargée, et qui
     coûte un aller-retour de réseau sur la langue, dont le catalogue se
     télécharge. */
  it('mire les trois réglages d’un seul geste', () => {
    mirrorAppearance({ theme: 'dark', palette: 'neutre', locale: 'en' })
    expect(readStoredPreference()).toBe('dark')
    expect(readStoredPalette()).toBe('neutre')
    expect(readStoredLocale()).toBe('en')
  })

  it('reconnaît les six palettes et rien d’autre', () => {
    for (const palette of PALETTES) expect(isPaletteSetting(palette)).toBe(true)
    expect(isPaletteSetting('aurore')).toBe(false)
    expect(isPaletteSetting(null)).toBe(false)
  })
})
