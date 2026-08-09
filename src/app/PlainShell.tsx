import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { t } from '@/i18n/strings'
import { ChevronLeft } from '@/ui/Icons'
import { LANDING_PATH } from './routes'

/**
 * La coquille d'avant le foyer.
 *
 * Ni colonne latérale ni barre d'onglets : les cinq destinations n'existent pas
 * encore, et une navigation qui mène à des écrans vides est pire que pas de
 * navigation du tout. Elle reprend le cadre d'`AppShell` — même largeur, mêmes
 * marges — pour que « à propos » ait la même mise en page des deux côtés de la
 * création du foyer, et pose le seul retour qui ait un sens ici.
 *
 * Ce retour n'est pas un confort : le manifeste déclare `display: 'standalone'`,
 * donc l'app installée n'a pas de bouton retour, et sans lui la page serait un
 * cul-de-sac pour qui l'ouvre depuis le pied de la présentation.
 *
 * Pas d'animation d'entrée, contrairement au `<main>` d'`AppShell` : on n'y
 * arrive que depuis des écrans qui n'en ont pas, et une transition isolée se
 * remarque plus qu'elle ne sert.
 */
export function PlainShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-4 pb-10 md:px-8 md:pt-8">
      <Link
        to={LANDING_PATH}
        className="mb-5 inline-flex h-11 w-fit items-center gap-1 rounded-input text-[13px] font-medium text-muted"
      >
        <ChevronLeft size={18} />
        {t.nav.landing}
      </Link>
      {children}
    </div>
  )
}
