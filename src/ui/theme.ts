import type { Theme } from '../storage/prefs'
import { withViewTransition } from './motion'

const COLORS = { light: '#F5F4F1', dark: '#0F0F0F' }

/** Applique le thème ; « système » laisse faire prefers-color-scheme. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme
  // Barre du navigateur : la couleur forcée l'emporte sur les deux balises media
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const scheme = meta.media.includes('dark') ? 'dark' : 'light'
    meta.content = COLORS[theme === 'system' ? scheme : theme]
  })
}

/**
 * Change de thème avec un cercle qui s'étend depuis le point touché (View Transition).
 * Sans View Transitions ou en mouvement réduit, le changement est immédiat.
 */
export function switchTheme(theme: Theme, origin: { x: number; y: number }): void {
  const root = document.documentElement
  // Rayon qui atteint le coin le plus éloigné : le cercle couvre tout l'écran
  const radius = Math.hypot(
    Math.max(origin.x, window.innerWidth - origin.x),
    Math.max(origin.y, window.innerHeight - origin.y),
  )
  root.style.setProperty('--theme-x', `${origin.x}px`)
  root.style.setProperty('--theme-y', `${origin.y}px`)
  root.style.setProperty('--theme-r', `${radius}px`)
  root.classList.add('theme-transition')
  const transition = withViewTransition(() => applyTheme(theme))
  const done = () => {
    root.classList.remove('theme-transition')
    root.style.removeProperty('--theme-x')
    root.style.removeProperty('--theme-y')
    root.style.removeProperty('--theme-r')
  }
  if (transition) void transition.finished.then(done, done)
  else done()
}
