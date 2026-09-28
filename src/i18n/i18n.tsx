import { createContext, useContext } from 'react'
import { formatDecimal, formatEuros, formatShare, type Locale } from './format'
import { fr, type Messages } from './fr'

// ponytail: français seul ; l'anglais et le choix de langue arrivent en phases 5 et 6
const messages: Record<Locale, Messages> = { 'fr-FR': fr, 'en-GB': fr }

function make(locale: Locale) {
  return {
    t: messages[locale],
    locale,
    euros: (cents: number) => formatEuros(cents, locale),
    share: (share: number) => formatShare(share, locale),
    decimal: (value: number) => formatDecimal(value, locale),
  }
}

const I18n = createContext(make('fr-FR'))

export const useI18n = () => useContext(I18n)
