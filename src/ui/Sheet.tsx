import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Feuille du bas modale. <dialog> natif : focus piégé, fond inerte,
 * fermeture avec Échap et retour du focus sont assurés par le navigateur.
 * La poignée se tire vers le bas pour fermer.
 */
const SWIPE = 80

export function Sheet(props: {
  open: boolean
  onClose: () => void
  labelledBy: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const startY = useRef<number | null>(null)
  const [drag, setDrag] = useState(0)

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

  function release() {
    startY.current = null
    setDrag(0)
    if (drag > SWIPE) props.onClose()
  }

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-modal="true"
      aria-labelledby={props.labelledBy}
      onClose={props.onClose}
      // Un clic sur le voile (hors du contenu) ferme la feuille
      onClick={(event) => event.target === ref.current && props.onClose()}
      style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
    >
      <div className="sheet__body">
        <div
          className="sheet__grab"
          aria-hidden="true"
          onPointerDown={(e) => {
            startY.current = e.clientY
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            if (startY.current !== null) setDrag(Math.max(0, e.clientY - startY.current))
          }}
          onPointerUp={release}
          onPointerCancel={release}
        >
          <div className="sheet__handle" />
        </div>
        {props.children}
      </div>
    </dialog>
  )
}
