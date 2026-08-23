import { useSyncExternalStore } from 'react'
import { landing } from '@/i18n/landing'
import { canInstall, promptInstall, subscribeInstall } from '@/lib/install'
import { isOffline, subscribeOnline } from '@/lib/online'
import { Button } from '@/ui/Button'
import { Chip } from '@/ui/Chip'

/**
 * Les deux choses que l'app ne disait jamais, là où elles se disent.
 *
 * **L'installation.** Elle n'était proposée nulle part, pour l'app qui a le plus
 * de raisons de la proposer : le cahier §5 en fait une exigence, parce qu'un
 * site non installé voit son IndexedDB purgé par Safari après environ sept jours
 * sans visite — et l'IndexedDB, ici, *est* les données. Le bandeau vit sous
 * « Pas de compte, pas de serveur », qui vient d'expliquer pourquoi il n'y a
 * aucune copie ailleurs : c'est le moment exact où l'argument porte.
 *
 * Il n'apparaît que si le navigateur a proposé son invite (`lib/install.ts`).
 * Aucune détection, aucune marche à suivre écrite d'avance : sur un navigateur
 * qui ne sait pas installer, ou sur une app déjà installée, il n'y a rien à dire
 * et on ne dit rien.
 *
 * **Le hors-ligne.** L'app fonctionne sans réseau depuis toujours et ne l'a
 * jamais montré. Le chip ne s'affiche que hors ligne — en ligne il n'apprendrait
 * rien — et il dit ce qui continue plutôt que ce qui manque : perdre le réseau
 * n'est pas une panne ici, c'est le cas nominal.
 *
 * Il vit sur cette page seule, et non dans la coquille : c'est ici que la
 * promesse est faite, donc ici qu'elle se vérifie. Sur les écrans du foyer, un
 * bandeau qui apparaît à chaque tunnel de métro serait du bruit sur une app qui,
 * précisément, ne change pas de comportement.
 */
export function InstallBanner() {
  const installable = useSyncExternalStore(subscribeInstall, canInstall, () => false)
  const offline = useSyncExternalStore(subscribeOnline, isOffline, () => false)

  return (
    <>
      {installable && (
        /* Le texte et son bouton s'empilent tant que la ligne n'est pas
           tenable : en rangée, un bouton `shrink-0` écrase la phrase sous sa
           largeur min-content et la fait tomber en colonne d'un mot. C'est la
           même mise en page que le rappel d'export, pour la même raison. */
        <div className="tile flex w-full flex-col gap-3 p-5 sm:flex-row sm:items-center md:p-6">
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="t-body font-semibold">{landing.installTitle}</p>
            <p className="t-label">{landing.installBody}</p>
          </div>
          <Button
            className="shrink-0 self-start sm:self-auto"
            onClick={() => {
              void promptInstall()
            }}
          >
            {landing.installAction}
          </Button>
        </div>
      )}

      {/* La région est montée en permanence, vide la plupart du temps : un
          `role="status"` inséré en même temps que son contenu n'est pas annoncé
          de façon fiable, c'est le contenu qui doit changer dans une région déjà
          là. `empty:hidden` lui évite de consommer une gouttière pour rien.
          `status` et non `alert` : c'est une nouvelle rassurante, elle n'a pas à
          couper ce qu'un lecteur d'écran est en train de dire. */}
      <div role="status" className="empty:hidden">
        {offline && <Chip>{landing.offline}</Chip>}
      </div>
    </>
  )
}
