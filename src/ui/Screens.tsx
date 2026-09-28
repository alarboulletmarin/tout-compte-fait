import type { ReactNode } from 'react'
import { Link } from 'wouter'
import { useI18n } from '../i18n/i18n'
import { BackIcon, CloseIcon } from './icons'
import { Nav } from './Nav'

/** Écran d'un onglet : marque, sous-titre, contenu, navigation. */
export function TabScreen(props: { kicker: string; className?: string; children: ReactNode }) {
  const { t } = useI18n()
  return (
    <div className="screen">
      <header className="topbar">
        <div className="topbar__brand">{t.brand}</div>
        <div className="topbar__kicker">{props.kicker}</div>
      </header>
      <main className={props.className}>{props.children}</main>
      <Nav />
    </div>
  )
}

/** Écran secondaire : retour, titre, contenu. */
export function SubScreen(props: {
  title: string
  back: string
  backLabel: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className="screen">
      <header className="subbar">
        <Link href={props.back} className="icon-button" aria-label={props.backLabel}>
          <BackIcon />
        </Link>
        <h1 className="subbar__title">{props.title}</h1>
      </header>
      <main className={props.className}>{props.children}</main>
    </div>
  )
}

export function FormHeader(props: { title: string; close: string }) {
  const { t } = useI18n()
  return (
    <header className="formbar">
      <h1 className="subbar__title">{props.title}</h1>
      <Link href={props.close} className="icon-button" aria-label={t.form.close}>
        <CloseIcon />
      </Link>
    </header>
  )
}
