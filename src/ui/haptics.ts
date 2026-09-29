import { readPref } from '../storage/prefs'

export const HAPTICS = ['on', 'off'] as const
export type Haptics = (typeof HAPTICS)[number]

/** Vibrer n'existe que sur certains téléphones (Android) : ailleurs, le réglage n'a pas lieu d'être. */
export const hapticsSupported = () =>
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

/** Un tout petit tic, sur les actions qui comptent (ajout, suppression, copie, réception). */
export function tap(): void {
  if (!hapticsSupported() || readPref('haptics', HAPTICS, 'on') === 'off') return
  navigator.vibrate(8)
}
