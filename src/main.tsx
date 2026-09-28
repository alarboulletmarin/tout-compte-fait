import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/geist/wght.css'
import '@fontsource-variable/martian-mono/wght.css'
import './ui/tokens.css'
import './ui/app.css'
import { App } from './App'
import { readPref, THEMES, writePref } from './storage/prefs'
import { applyTheme } from './ui/theme'

applyTheme(readPref('theme', THEMES, 'system'))
// L'app a été ouverte : la landing ne sera plus montrée (public/boot/landing.js)
writePref('visited', '1')

const root = document.getElementById('root')
if (!root) throw new Error('#root introuvable')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
