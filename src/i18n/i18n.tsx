import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { readPref, writePref } from '../storage/prefs'
import {
  formatDecimal,
  formatEuros,
  formatMonth,
  formatShare,
  LOCALES,
  parseEuros,
  type Locale,
} from './format'
import { en } from './en'
import { fr, type Messages } from './fr'

const messages: Record<Locale, Messages> = { 'fr-FR': fr, 'en-GB': en }

function make(locale: Locale, setLocale: (locale: Locale) => void) {
  return {
    t: messages[locale],
    locale,
    setLocale,
    euros: (cents: number) => formatEuros(cents, locale),
    parse: (text: string) => parseEuros(text, locale),
    share: (share: number) => formatShare(share, locale),
    decimal: (value: number) => formatDecimal(value, locale),
    /** « septembre 2026 », pour une phrase. */
    month: (key: string) => formatMonth(key, locale),
    /** « Septembre 2026 », pour un titre. */
    monthTitle: (key: string) => {
      const label = formatMonth(key, locale)
      return label.charAt(0).toLocaleUpperCase(locale) + label.slice(1)
    },
  }
}

const I18n = createContext(make('fr-FR', () => {}))

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setState] = useState(() => readPref('locale', LOCALES, 'fr-FR'))
  const setLocale = useCallback((next: Locale) => {
    writePref('locale', next)
    setState(next)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale.slice(0, 2)
  }, [locale])

  const value = useMemo(() => make(locale, setLocale), [locale, setLocale])
  return <I18n.Provider value={value}>{children}</I18n.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useI18n = () => useContext(I18n)
