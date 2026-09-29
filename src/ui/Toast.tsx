import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'wouter'
import { useI18n } from '../i18n/i18n'
import { CloseIcon } from './icons'

interface Toast {
  message: string
  action?: { label: string; run: () => void }
  /** Reste affiché jusqu'à l'action (mise à jour disponible). */
  persistent?: boolean
}

interface Shown extends Toast {
  id: number
}

// Court : un toast ne doit jamais gêner la suite. Un peu plus long quand il propose « Annuler »
const DURATION = 3500
const DURATION_WITH_ACTION = 5000
// Distance de balayage vers le bas qui ferme le toast
const SWIPE = 40
// Au-delà, le plus ancien s'efface : la pile ne doit pas grimper sur l'écran
const MAX_SHOWN = 3

const ToastContext = createContext<(toast: Toast) => void>(() => {})

let counter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Shown[]>([])

  // Les toasts s'empilent : supprimer deux charges d'affilée garde les deux « Annuler »
  const show = useCallback((next: Toast) => {
    setToasts((all) =>
      [...all.filter((t) => t.message !== next.message), { ...next, id: ++counter }].slice(
        -MAX_SHOWN,
      ),
    )
  }, [])

  const dismiss = useCallback(
    (id: number) => setToasts((all) => all.filter((t) => t.id !== id)),
    [],
  )

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* La région existe avant les messages pour que les lecteurs d'écran les annoncent */}
      <div role="status" className="toast-region">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} dismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, dismiss }: { toast: Shown; dismiss: (id: number) => void }) {
  const { t } = useI18n()
  // Survolé ou focalisé, le toast reste : le temps de lire et d'atteindre « Annuler »
  const [held, setHeld] = useState(false)
  const [drag, setDrag] = useState(0)
  const startY = useRef<number | null>(null)
  const onDismiss = useCallback(() => dismiss(toast.id), [dismiss, toast.id])

  // Un toast est lié à l'écran où il est apparu : on change d'écran, il part.
  // L'écran est relevé au premier rendu, après la navigation éventuelle de l'action qui l'affiche.
  const [location] = useLocation()
  const born = useRef(location)
  useEffect(() => {
    if (!toast.persistent && location !== born.current) onDismiss()
  }, [location, toast.persistent, onDismiss])

  useEffect(() => {
    if (held || toast.persistent) return
    const timer = setTimeout(onDismiss, toast.action ? DURATION_WITH_ACTION : DURATION)
    return () => clearTimeout(timer)
  }, [held, toast, onDismiss])

  function release() {
    startY.current = null
    setDrag(0)
    if (drag > SWIPE) onDismiss()
  }

  return (
    <div
      className="toast"
      style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
      onPointerDown={(e) => (startY.current = e.clientY)}
      onPointerMove={(e) => {
        if (startY.current !== null) setDrag(Math.max(0, e.clientY - startY.current))
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <span>{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          className="toast__action"
          onClick={() => {
            toast.action?.run()
            onDismiss()
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button type="button" className="toast__close" aria-label={t.dismiss} onClick={onDismiss}>
        <CloseIcon />
      </button>
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext)
