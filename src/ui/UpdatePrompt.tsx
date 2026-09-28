import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useI18n } from '../i18n/i18n'
import { useToast } from './Toast'

const HOUR = 60 * 60 * 1000

/** « Nouvelle version disponible · Recharger » à chaque nouveau service worker. */
export function UpdatePrompt() {
  const { t } = useI18n()
  const toast = useToast()
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // Une app installée peut rester ouverte des jours : on vérifie toutes les heures
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => registration.update(), HOUR)
    },
  })

  useEffect(() => {
    if (!needRefresh) return
    toast({
      message: t.update.available,
      persistent: true,
      action: { label: t.update.reload, run: () => updateServiceWorker(true) },
    })
  }, [needRefresh, toast, t, updateServiceWorker])

  return null
}
