import type { Theme } from '../storage/prefs'

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
