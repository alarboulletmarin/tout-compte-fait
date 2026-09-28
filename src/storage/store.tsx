import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { initialData, type AppData } from '../domain/data'
import { computeSplit, type Split } from '../domain/split'
import { loadData, saveData } from './db'

interface Store {
  data: AppData
  split: Split
  /** Premier lancement : rien n'a encore été enregistré sur l'appareil. */
  fresh: boolean
  /** Applique une modification et l'enregistre sur l'appareil. */
  update: (change: (data: AppData) => AppData) => void
}

type State =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: AppData; fresh: boolean }

const StoreContext = createContext<Store | null>(null)

export function StoreProvider(props: {
  children: ReactNode
  fallback: (status: 'loading' | 'error') => ReactNode
  onSaveError: () => void
}) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const loaded = useRef<AppData | null>(null)

  useEffect(() => {
    // Un chargement annulé (effet rejoué en mode strict) ne doit rien appliquer :
    // sinon `loaded` change sous les pieds de l'état affiché, qui part s'enregistrer
    let active = true
    loadData().then(
      (data) => {
        if (!active) return
        loaded.current = data ?? initialData()
        setState({ status: 'ready', data: loaded.current, fresh: data === null })
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
  useEffect(() => {
    // Rien à écrire tant que rien n'a changé depuis le chargement
    if (!data || data === loaded.current) return
    saveData(data).catch(onSaveError)
  }, [data, onSaveError])

  const update = useCallback((change: (data: AppData) => AppData) => {
    setState((s) =>
      s.status === 'ready' ? { status: 'ready', data: change(s.data), fresh: false } : s,
    )
  }, [])

  const store = useMemo(
    () => data && { data, split: computeSplit(data.household, data.charges), fresh, update },
    [data, fresh, update],
  )

  if (!store) return props.fallback(state.status === 'error' ? 'error' : 'loading')
  return <StoreContext.Provider value={store}>{props.children}</StoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore hors de StoreProvider')
  return store
}
