import { afterEach, describe, expect, it, vi } from 'vitest'
import { LOCALES, isLocale } from '@/domain/types'
import {
  LOCALE_STORAGE_KEY,
  applyDocumentLocale,
  detectLocale,
  readStoredLocale,
  storeLocale,
} from './locale'

/** Remplace `navigator.languages` le temps d'un test. */
function withLanguages(languages: string[], run: () => void): void {
  const descriptor = Object.getOwnPropertyDescriptor(navigator, 'languages')
  Object.defineProperty(navigator, 'languages', { value: languages, configurable: true })
  try {
    run()
  } finally {
    if (descriptor) Object.defineProperty(navigator, 'languages', descriptor)
    else Reflect.deleteProperty(navigator, 'languages')
  }
}

afterEach(() => {
  localStorage.clear()
  document.documentElement.lang = 'fr'
})

describe('la langue qu’on parle', () => {
  it('reconnaît les deux langues et rien d’autre', () => {
    for (const locale of LOCALES) expect(isLocale(locale)).toBe(true)
    expect(isLocale('de')).toBe(false)
    expect(isLocale('fr-CA')).toBe(false)
    expect(isLocale(null)).toBe(false)
  })

  it('ignore la région : « en-GB » est de l’anglais', () => {
    withLanguages(['en-GB'], () => {
      expect(detectLocale()).toBe('en')
    })
    withLanguages(['fr-CA'], () => {
      expect(detectLocale()).toBe('fr')
    })
  })

  /* Le défaut du repli serait de retomber au premier tag inconnu : un navigateur
     réglé sur « de, en, fr » ouvrirait alors en français, alors qu'il vient de
     dire préférer l'anglais. On continue donc la liste. */
  it('descend la liste des préférences plutôt que de retomber au premier mot', () => {
    withLanguages(['de-DE', 'en-US', 'fr-FR'], () => {
      expect(detectLocale()).toBe('en')
    })
  })

  it('retombe sur le français quand aucune préférence ne se parle', () => {
    withLanguages(['de-DE', 'it-IT'], () => {
      expect(detectLocale()).toBe('fr')
    })
  })
})

describe('le miroir de la langue', () => {
  it('relit ce qu’il a écrit', () => {
    storeLocale('en')
    expect(readStoredLocale()).toBe('en')
  })

  /* Sans miroir, le tout premier écran doit s'afficher dans une langue : celle
     du navigateur est la moins mauvaise réponse, et elle n'écrit rien — c'est
     l'hydratation qui tranchera. */
  it('retombe sur la langue du navigateur faute de miroir', () => {
    withLanguages(['en-GB'], () => {
      expect(readStoredLocale()).toBe('en')
    })
  })

  it('ignore une valeur stockée que personne ne parle', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'klingon')
    withLanguages(['fr-FR'], () => {
      expect(readStoredLocale()).toBe('fr')
    })
  })

  /* Mode privé, quota plein : la langue n'est pas une raison de faire tomber
     l'app. Le même parti que le thème et la palette. */
  it('ne lève pas quand le stockage refuse d’écrire', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => {
      storeLocale('en')
    }).not.toThrow()
    setItem.mockRestore()
  })
})

describe('l’attribut lang', () => {
  /* Ce n'est pas décoratif : `lang` décide de la voix d'un lecteur d'écran, et
     un texte anglais lu par une synthèse française est inintelligible. */
  it('s’écrit sur <html>', () => {
    applyDocumentLocale('en')
    expect(document.documentElement.lang).toBe('en')
    applyDocumentLocale('fr')
    expect(document.documentElement.lang).toBe('fr')
  })
})
