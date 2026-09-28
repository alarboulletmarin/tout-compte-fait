import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Feuille du bas modale. <dialog> natif : focus piégé, fond inerte,
 * fermeture avec Échap et retour du focus sont assurés par le navigateur.
 */
export function Sheet(props: {
  open: boolean
  onClose: () => void
  labelledBy: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (props.open && !dialog.open) {
      dialog.showModal()
      // Focus sur l'action sûre plutôt que sur le premier bouton, souvent destructif
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
    if (!props.open && dialog.open) dialog.close()
  }, [props.open])

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-modal="true"
      aria-labelledby={props.labelledBy}
      onClose={props.onClose}
      // Un clic sur le voile (hors du contenu) ferme la feuille
      onClick={(event) => event.target === ref.current && props.onClose()}
    >
      <div className="sheet__body">
        <div className="sheet__handle" aria-hidden="true" />
        {props.children}
      </div>
    </dialog>
  )
}
