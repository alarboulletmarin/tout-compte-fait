// Préférences de l'appareil : hors des données exportées, dans localStorage.
// Un stockage indisponible (navigation privée, blocage) ne doit rien casser.

export type Theme = 'system' | 'light' | 'dark'

export function readPref<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = localStorage.getItem(`tcf-${key}`)
    return allowed.includes(value as T) ? (value as T) : fallback
  } catch {
    return fallback
  }
}

export function writePref(key: string, value: string): void {
  try {
    localStorage.setItem(`tcf-${key}`, value)
  } catch {
    // Préférence perdue au prochain lancement, sans conséquence sur les données
  }
}

export const THEMES: readonly Theme[] = ['system', 'light', 'dark']
