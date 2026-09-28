import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { initialData, type AppData, type Snapshot } from '../domain/data'
import { carryForward, monthOf, recordMonth } from '../domain/history'
import { computeSplit, type Split } from '../domain/split'
import { clearAll, loadData, saveData } from './db'

interface Store {
  data: AppData
  split: Split
  /** Premier lancement : rien n'a encore été enregistré sur l'appareil. */
  fresh: boolean
  /** Applique une modification et l'enregistre sur l'appareil, avec le mois courant de l'historique. */
  update: (change: (data: AppData) => AppData) => void
  /** Efface tout de l'appareil et revient au premier lancement. */
  reset: () => Promise<void>
}

type State =
  | { status: 'loading' }
  | { status: 'error' }
  // dirty : modifié depuis le chargement, donc à enregistrer
  | { status: 'ready'; data: AppData; fresh: boolean; dirty: boolean }

const StoreContext = createContext<Store | null>(null)

export function StoreProvider(props: {
  children: ReactNode
  fallback: (status: 'loading' | 'error') => ReactNode
  onSaveError: () => void
}) {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    // Un chargement annulé (effet rejoué en mode strict) ne doit rien appliquer
    let active = true
    loadData().then(
      (data) => {
        if (!active) return
        setState({
          status: 'ready',
          // Mois sans ouverture de l'app : reconduits en mémoire, écrits à la prochaine sauvegarde
          data: data ? carryForward(data, monthOf()) : initialData(),
          fresh: data === null,
          dirty: false,
        })
      },
      () => active && setState({ status: 'error' }),
    )
    return () => {
      active = false
    }
  }, [])

  const { onSaveError } = props
  const data = state.status === 'ready' ? state.data : null
  const fresh = state.status === 'ready' && state.fresh
  const dirty = state.status === 'ready' && state.dirty
  useEffect(() => {
    // Rien à écrire tant que rien n'a changé depuis le chargement
    if (!data || !dirty) return
    saveData(data).then(() => {
      // Demande au navigateur de ne pas effacer ces données pour faire de la place ;
      // un refus ne change rien à l'enregistrement
      navigator.storage?.persist?.().catch(() => {})
    }, onSaveError)
  }, [data, dirty, onSaveError])

  const update = useCallback((change: (data: AppData) => AppData) => {
    setState((s) =>
      s.status === 'ready'
        ? {
            status: 'ready',
            data: recordMonth(change(s.data), monthOf()),
            fresh: false,
            dirty: true,
          }
        : s,
    )
  }, [])

  const reset = useCallback(async () => {
    await clearAll()
    // Retour au premier lancement : rien à réécrire
    setState({ status: 'ready', data: initialData(), fresh: true, dirty: false })
  }, [])

  const store = useMemo(
    () => data && { data, split: computeSplit(data.household, data.charges), fresh, update, reset },
    [data, fresh, update, reset],
  )

  if (!store) return props.fallback(state.status === 'error' ? 'error' : 'loading')
  return <StoreContext.Provider value={store}>{props.children}</StoreContext.Provider>
}

/**
 * Montre un mois figé aux écrans de lecture (virements, détail) : ils lisent l'instantané
 * comme les données courantes. Lecture seule : aucun contrôle qui modifie n'y a sa place.
 */
export function MonthView(props: { snapshot: Snapshot; children: ReactNode }) {
  const store = useStore()
  const { snapshot } = props
  const view = useMemo<Store>(() => {
    const { household, charges, categories } = snapshot
    return {
      ...store,
      data: { household, charges, categories, history: {} },
      split: computeSplit(household, charges),
      fresh: false,
    }
  }, [snapshot, store])
  return <StoreContext.Provider value={view}>{props.children}</StoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore hors de StoreProvider')
  return store
}
