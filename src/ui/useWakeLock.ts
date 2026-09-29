import { useEffect } from 'react'

/** Garde l'écran allumé tant que `active` : un code QR qui défile ne doit pas s'éteindre. */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !navigator.wakeLock) return
    let lock: WakeLockSentinel | null = null
    let released = false
    const request = () =>
      navigator.wakeLock.request('screen').then(
        (sentinel) => {
          if (released) void sentinel.release()
          else lock = sentinel
        },
        // Refusé (économie d'énergie) : l'écran s'éteindra, sans conséquence
        () => {},
      )
    void request()
    // Le verrou saute quand la page passe en arrière-plan : on le reprend au retour
    const onVisible = () => document.visibilityState === 'visible' && request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [active])
}
