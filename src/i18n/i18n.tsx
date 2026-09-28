import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { readPref, writePref } from '../storage/prefs'
import { formatDecimal, formatEuros, formatShare, LOCALES, type Locale } from './format'
import { fr, type Messages } from './fr'

// ponytail: l'anglais reprend le français en attendant la traduction (phase 6)
const messages: Record<Locale, Messages> = { 'fr-FR': fr, 'en-GB': fr }

function make(locale: Locale, setLocale: (locale: Locale) => void) {
  return {
    t: messages[locale],
    locale,
    setLocale,
    euros: (cents: number) => formatEuros(cents, locale),
    share: (share: number) => formatShare(share, locale),
    decimal: (value: number) => formatDecimal(value, locale),
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
