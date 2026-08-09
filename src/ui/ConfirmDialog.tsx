import { type ReactNode, useState } from 'react'
import { t } from '@/i18n/strings'
import { Button } from './Button'
import { Sheet } from './Sheet'

export type ConfirmStep = {
  /** Ce qui se passe si l'on continue, jamais « êtes-vous sûr ». */
  question: string
  /** Le verbe du bouton qui continue. Sur le dernier pas, celui de l'action. */
  action: string
}

export type ConfirmDialogProps = {
  open: boolean
  /** Court : il tient dans l'en-tête de la feuille, qui tronque. */
  title: string
  /** Un pas d'ordinaire. Trois pour un effacement total (cahier §4.8). */
  steps: readonly ConfirmStep[]
  /**
   * Ce que la question ne peut pas dire en une phrase, sous elle et à tous les
   * pas — le détail des lignes qu'un import s'apprête à écarter, par exemple.
   * Une question posée sur un chiffre qu'on ne peut pas ouvrir ne se vérifie
   * pas ; elle se clique.
   */
  details?: ReactNode
  /**
   * Le verbe qui repart en arrière, quand « Annuler » y voudrait dire l'inverse
   * de ce qu'il vient de dire. C'est le cas de la garde de brouillon : on
   * arrive dans la boîte en cliquant « Annuler » sur le formulaire, et le même
   * mot y signifierait « non, garde ma saisie ». Ailleurs, `t.common.cancel`
   * est le bon mot et reste le défaut.
   */
  cancelLabel?: string
  onCancel: () => void
  onConfirm: () => void
}

/**
 * La confirmation d'un geste destructif, la même partout.
 *
 * L'app en comptait quatre formes — panneau qui remplace le bouton, escalier à
 * deux pas dans les réglages, panneau d'import, et un `window.confirm()` — et
 * quatre suppressions qui n'en demandaient aucune. Quatre grammaires pour un
 * même geste, c'est une de trop par écran : on n'apprend pas ce qu'un clic va
 * faire, on le découvre.
 *
 * Elle s'appuie sur `Sheet`, donc sur `<dialog>` natif : le piège de focus, la
 * touche Échap, le clic sur le fond et le retour du focus au bouton d'origine
 * viennent du navigateur, donc sont corrects. Le pied de feuille pose déjà deux
 * boutons de largeur égale, ce que les panneaux en ligne reconstruisaient à la
 * main avec une grille à deux colonnes.
 *
 * Le nombre de pas fait la gravité : un pour une ligne, deux pour un import qui
 * remplace tout, trois pour l'effacement des données. Chaque pas pose une
 * question *différente* — répéter la même trois fois ne se lit plus, ça se
 * clique.
 */
export function ConfirmDialog({
  open,
  title,
  steps,
  details,
  cancelLabel = t.common.cancel,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const [step, setStep] = useState(0)

  const current = steps[Math.min(step, steps.length - 1)]
  if (current === undefined) return null
  const last = step >= steps.length - 1

  /* L'escalier se redescend à la sortie, pas à l'entrée : remettre le pas à
     zéro en refermant vaut pour toutes les portes — le bouton, la croix, Échap,
     le clic sur le fond — et évite qu'une boîte abandonnée au troisième pas se
     rouvre en étant déjà destructive. */
  const cancel = (): void => {
    setStep(0)
    onCancel()
  }

  return (
    <Sheet
      open={open}
      onClose={cancel}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={cancel} full>
            {cancelLabel}
          </Button>
          <Button
            variant="danger"
            full
            onClick={() => {
              if (!last) {
                setStep(step + 1)
                return
              }
              setStep(0)
              onConfirm()
            }}
          >
            {current.action}
          </Button>
        </>
      }
    >
      <p className="t-body">{current.question}</p>
      {details !== undefined && <div className="mt-3">{details}</div>}
      {/* Où l'on en est, quand il y a plusieurs pas : sans repère, le second
          écran se lit comme si le premier clic n'avait rien fait. Deux nombres
          et une barre, pas une phrase — rien à traduire ici. */}
      {steps.length > 1 && (
        <p className="t-label tnum mt-2">{`${String(step + 1)} / ${String(steps.length)}`}</p>
      )}
    </Sheet>
  )
}
