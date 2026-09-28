import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/i18n'
import { readPref, writePref } from '../storage/prefs'
import { AddToHomeIcon, ShareIcon } from '../ui/icons'
import { Sheet } from '../ui/Sheet'

const SEEN = 'tcf-install-hint-seen'

/** Safari sur iPhone ou iPad, hors app installée : la seule plateforme sans invite d'installation. */
function isIosBrowser(): boolean {
  const ios =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const standalone =
    matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  return ios && !standalone
}

/** Montrée une fois par session, jusqu'à « Ne plus afficher ». Sans effet de bord. */
function shouldShow(): boolean {
  if (!isIosBrowser() || readPref('install-hint', ['on', 'off'], 'on') === 'off') return false
  try {
    return !sessionStorage.getItem(SEEN)
  } catch {
    return true // sans sessionStorage : une fois par chargement
  }
}

export function InstallHint() {
  const { t } = useI18n()
  const [open, setOpen] = useState(shouldShow)

  useEffect(() => {
    if (!open) return
    try {
      sessionStorage.setItem(SEEN, '1')
    } catch {
      // Voir shouldShow
    }
  }, [open])
  const steps = [
    { icon: <ShareIcon />, text: t.install.step1 },
    { icon: <AddToHomeIcon />, text: t.install.step2 },
    { icon: <span className="install__ok">OK</span>, text: t.install.step3 },
  ]

  if (!open) return null
  return (
    <Sheet open onClose={() => setOpen(false)} labelledBy="install-title">
      <h2 id="install-title" className="sheet__title">
        {t.install.title}
      </h2>
      <p className="sheet__text">{t.install.intro}</p>
      <ol className="install__steps">
        {steps.map((step, i) => (
          <li key={i}>
            <span className="num install__number" aria-hidden="true">
              {i + 1}
            </span>
            <span className="install__icon" aria-hidden="true">
              {step.icon}
            </span>
            <span>
              {step.text[0]}
              <b>{step.text[1]}</b>
              {step.text[2]}
            </span>
          </li>
        ))}
      </ol>
      <div className="stack stack--8">
        <button
          type="button"
          className="button button--primary"
          onClick={() => setOpen(false)}
          data-autofocus
        >
          {t.install.ok}
        </button>
        <button
          type="button"
          className="button-plain button-plain--44"
          onClick={() => {
            writePref('install-hint', 'off')
            setOpen(false)
          }}
        >
          {t.install.never}
        </button>
      </div>
    </Sheet>
  )
}
