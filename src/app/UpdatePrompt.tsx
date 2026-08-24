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
      /* Le dégagement du `Toaster`, au caractère près : 5rem écrits en dur ne
         connaissaient ni la hauteur réelle de la barre d'onglets ni la marge de
         sécurité de l'appareil, et le bandeau mordait de 11px dans la barre en
         masquant 47 des 56px du disque de saisie — le bouton qu'on vise le plus,
         sous un bandeau `z-50` contre son `z-40`. Le palier était faux du même
         coup : la barre disparaît à 1024px, pas à 768. */
      className="fixed inset-x-4 bottom-[calc(var(--nav-h)+3.25rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md lg:bottom-5"
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
