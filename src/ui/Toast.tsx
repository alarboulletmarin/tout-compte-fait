import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useI18n } from '../i18n/i18n'
import { CloseIcon } from './icons'

interface Toast {
  message: string
  action?: { label: string; run: () => void }
  /** Reste affiché jusqu'à l'action (mise à jour disponible). */
  persistent?: boolean
}

// Court : un toast ne doit jamais gêner la suite. Un peu plus long quand il propose « Annuler »
const DURATION = 3500
const DURATION_WITH_ACTION = 5000
// Distance de balayage vers le bas qui ferme le toast
const SWIPE = 40

const ToastContext = createContext<(toast: Toast) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(Toast & { id: number }) | null>(null)
  // Survolé ou focalisé, le toast reste : le temps de lire et d'atteindre « Annuler »
  const [held, setHeld] = useState(false)
  const { t } = useI18n()
  const startY = useRef<number | null>(null)
  const [drag, setDrag] = useState(0)
  const show = useCallback((next: Toast) => setToast({ ...next, id: Date.now() }), [])

  useEffect(() => {
    if (!toast || held || toast.persistent) return
    const timer = setTimeout(() => setToast(null), toast.action ? DURATION_WITH_ACTION : DURATION)
    return () => clearTimeout(timer)
  }, [toast, held])

  function dismiss() {
    setToast(null)
    setHeld(false)
    setDrag(0)
    startY.current = null
  }

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* La région existe avant le message pour que les lecteurs d'écran l'annoncent */}
      <div role="status" className="toast-region">
        {toast && (
          <div
            className="toast"
            key={toast.id}
            style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
            onPointerDown={(e) => (startY.current = e.clientY)}
            onPointerMove={(e) => {
              if (startY.current !== null) setDrag(Math.max(0, e.clientY - startY.current))
            }}
            onPointerUp={() => (drag > SWIPE ? dismiss() : (setDrag(0), (startY.current = null)))}
            onPointerCancel={() => (setDrag(0), (startY.current = null))}
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
                  dismiss()
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button type="button" className="toast__close" aria-label={t.dismiss} onClick={dismiss}>
              <CloseIcon />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext)
