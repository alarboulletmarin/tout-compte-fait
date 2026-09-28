import type { ReactNode } from 'react'
import { Link, useLocation } from 'wouter'
import { useI18n } from '../i18n/i18n'
import { ChargesIcon, HistoryIcon, HouseholdIcon, SettingsIcon, TransfersIcon } from './icons'

export function Nav() {
  const { t } = useI18n()
  const [location] = useLocation()
  const tabs: [string, string, ReactNode][] = [
    ['/', t.nav.transfers, <TransfersIcon key="i" />],
    ['/charges', t.nav.charges, <ChargesIcon key="i" />],
    ['/household', t.nav.household, <HouseholdIcon key="i" />],
    ['/history', t.nav.history, <HistoryIcon key="i" />],
    ['/settings', t.nav.settings, <SettingsIcon key="i" />],
  ]
  return (
    <nav className="nav" aria-label={t.nav.label}>
      {/* Barre latérale sur grand écran seulement */}
      <div className="nav__brand">{t.brand}</div>
      {tabs.map(([href, label, icon]) => {
        const current = href === '/' ? location === '/' : location.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className="nav__tab"
            aria-current={current ? 'page' : undefined}
          >
            {icon}
            <span className="nav__label">{label}</span>
            <span className="nav__dot" aria-hidden="true" />
          </Link>
        )
      })}
      <div className="nav__local">{t.nav.local}</div>
    </nav>
  )
}
