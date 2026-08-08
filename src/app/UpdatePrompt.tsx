import { useRegisterSW } from 'virtual:pwa-register/react'
import { t } from '@/i18n/strings'
import { Button } from '@/ui/Button'

/**
 * Le service worker est enregistré en mode « prompt » : une nouvelle version
 * ne remplace jamais l'app en cours d'usage sans le dire. Les données étant
 * locales, un rechargement surprise en pleine saisie serait impardonnable.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    // Deux boutons `shrink-0` sur une seule ligne ne laissent pas 320px de
    // large au message : il s'empile au-dessus tant que la place manque.
    <div className="surface fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-md flex-col gap-3 rounded-tile border border-border bg-surface p-4 shadow-tile sm:flex-row sm:items-center md:bottom-6">
      <p className="t-body min-w-0 flex-1">{t.settings.updateAvailable}</p>
      <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
        <Button
          size="sm"
          onClick={() => {
            void updateServiceWorker(true)
          }}
        >
          {t.settings.updateAction}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setNeedRefresh(false)
          }}
        >
          {t.common.close}
        </Button>
      </div>
    </div>
  )
}
