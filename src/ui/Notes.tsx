import type { ReactNode } from 'react'
import { InfoIcon, WarningIcon } from './icons'

/** Erreur sous un champ : icône et texte, jamais la couleur seule. */
export function FieldError(props: { id: string; children: ReactNode }) {
  return (
    <p id={props.id} className="field-error">
      <WarningIcon />
      {props.children}
    </p>
  )
}

/** Encadré d'information ; `strong` le borde d'encre pour les messages qui changent le calcul. */
export function InfoNote(props: { strong?: boolean; status?: boolean; children: ReactNode }) {
  return (
    <div
      className={`info${props.strong ? ' info--strong' : ''}`}
      role={props.status ? 'status' : undefined}
    >
      <InfoIcon />
      <p>{props.children}</p>
    </div>
  )
}
