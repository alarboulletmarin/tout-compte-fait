import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

interface Toast {
  message: string
  action?: { label: string; run: () => void }
  /** Reste affiché jusqu'à l'action (mise à jour disponible). */
  persistent?: boolean
}

const DURATION = 8000

const ToastContext = createContext<(toast: Toast) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(Toast & { id: number }) | null>(null)
  // Survolé ou focalisé, le toast reste : le temps de lire et d'atteindre « Annuler »
  const [held, setHeld] = useState(false)
  const show = useCallback((next: Toast) => setToast({ ...next, id: Date.now() }), [])

  useEffect(() => {
    if (!toast || held || toast.persistent) return
    const timer = setTimeout(() => setToast(null), DURATION)
    return () => clearTimeout(timer)
  }, [toast, held])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* La région existe avant le message pour que les lecteurs d'écran l'annoncent */}
      <div role="status" className="toast-region">
        {toast && (
          <div
            className="toast"
            key={toast.id}
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
                  setToast(null)
                  setHeld(false)
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext)
