import { useRegisterSW } from 'virtual:pwa-register/react'
import { t } from '@/i18n/strings'
import { Banner } from '@/ui/Banner'
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
    /* Le gabarit commun des bandeaux (`ui/Banner`), posé en flottant. Il
       réécrivait la surface en cinq utilitaires — `rounded-tile border
       border-border bg-surface shadow-tile` —, c'est-à-dire la définition de
       `.tile` recopiée : elle n'aurait pas suivi `components.css` le jour où
       celui-ci change. Seul ce qui le fait flotter reste ici. */
    <Banner
      className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md md:bottom-6"
      title={t.settings.updateAvailable}
    >
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
    </Banner>
  )
}
