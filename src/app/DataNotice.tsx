import { useState } from 'react'
import { Link } from 'react-router-dom'
import { today } from '@/domain/date'
import { ExportReminder } from '@/features/settings/ExportReminder'
import { fr } from '@/i18n/fr'
import {
  dismissDurabilityNotice,
  readDurabilityDismissed,
  shouldWarnDurability,
  useStorageHealth,
} from '@/persistence/health'
import {
  dismissReminder,
  readLastExport,
  readReminderDismissed,
  shouldRemindExport,
} from '@/persistence/transfer'
import { useHasAnyData } from '@/store/selectors'
import { useStore } from '@/store/store'
import { IconButton } from '@/ui/Button'
import { Close } from '@/ui/Icons'
import { SwipeAway } from '@/ui/SwipeAway'
import { dataNoticeLevel } from './noticeLevel'
import { DATA_PATH } from './routes'
import { StorageAlert } from './StorageAlert'

/**
 * L'avis de conservation. Le niveau intermédiaire, et le seul qui soit neutre.
 *
 * Il ne dit pas ce qu'il ne sait pas. Ni navigation privée — qu'aucune API
 * n'expose et qu'on ne devinera pas —, ni suppression imminente : il constate
 * que ce navigateur ne s'est engagé à rien, ce qui est exactement ce que
 * `persisted()` a répondu, et propose le seul geste qui rende la question sans
 * objet. Pas de rouge : le DS §2.3 réserve la couleur de danger à ce qui a
 * échoué, et rien n'a échoué ici.
 *
 * Il s'écarte, contrairement au bandeau d'échec, et pour la raison inverse : la
 * condition peut durer toute la vie de l'appareil — Safari refuse toujours — et
 * un bandeau permanent sur un état permanent devient le décor de l'app.
 */
function DurabilityNotice({ onDismiss }: { onDismiss: () => void }) {
  return (
    <SwipeAway onDismiss={onDismiss} label={fr.storage.durabilityLabel} className="mb-4 block">
      {/* La mise en page du rappel d'export, aux mêmes tokens : ce sont deux
          messages du même domaine, qui ne s'affichent jamais ensemble, et deux
          gabarits pour un même objet auraient fini par diverger. */}
      <div className="tile flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="t-body">{fr.storage.durabilityTitle}</p>
          <p className="t-label">{fr.storage.durabilityBody}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
          {/* Vers la vue des données, qui porte l'export **et** l'état du
              stockage depuis qu'elle le résume : le geste et sa raison au même
              endroit. */}
          <Link
            to={DATA_PATH}
            className="inline-flex h-11 items-center justify-center rounded-input bg-accent px-5 font-medium text-accent-fg"
          >
            {fr.settings.export}
          </Link>
          <IconButton label={fr.storage.durabilityDismiss} onClick={onDismiss}>
            <Close size={18} />
          </IconButton>
        </div>
      </div>
    </SwipeAway>
  )
}

/**
 * Le seul bandeau de sécurité des données de la coquille.
 *
 * Deux messages existaient, chacun décidant seul de s'afficher : l'échec
 * d'écriture et le rappel d'export pouvaient se superposer, et il aurait suffi
 * d'ajouter l'avis de conservation à côté d'eux pour empiler trois façons de
 * dire « pense à exporter » au-dessus du tableau de bord. Ils passent
 * maintenant par une seule décision, et un seul rend.
 *
 * `focus` reprend la règle qui existait dans la coquille : sur un écran de
 * saisie, seul l'échec confirmé s'intercale — c'est précisément là qu'on est en
 * train de perdre du travail. Les deux autres attendent la fin de la phrase.
 *
 * Les deux écarts sont notés ici *et* sur l'appareil : ce composant est remonté
 * à chaque changement d'écran, et le seul état local ne tiendrait pas le temps
 * d'aller au calendrier.
 */
export function DataNotice({ focus = false }: { focus?: boolean }) {
  const error = useStore((s) => s.error)
  /* Les deux champs qui décident, et non l'état entier : la coquille est montée
     en permanence, et s'abonner aux dates d'écriture la ferait rendre à chaque
     frappe pour un bandeau qui ne bouge pas. */
  const durable = useStorageHealth((s) => s.durable)
  const probed = useStorageHealth((s) => s.probed)
  const hasData = useHasAnyData()
  const [dismissed, setDismissed] = useState({ durability: false, export: false })

  const now = today()
  const level = dataNoticeLevel({
    failing: error !== null,
    fragile:
      !dismissed.durability &&
      shouldWarnDurability({ durable, probed }, hasData, readDurabilityDismissed(), now),
    staleExport:
      !dismissed.export &&
      shouldRemindExport(readLastExport(), now, hasData, readReminderDismissed()),
  })

  if (level === 'failure') return <StorageAlert />
  /* Après l'échec et avant les deux autres : c'est l'ordre du cahier appliqué à
     l'écran, pas une exception d'écran de saisie. */
  if (focus) return null

  if (level === 'durability') {
    return (
      <DurabilityNotice
        onDismiss={() => {
          dismissDurabilityNotice()
          setDismissed((state) => ({ ...state, durability: true }))
        }}
      />
    )
  }

  if (level === 'export') {
    return (
      <ExportReminder
        never={readLastExport() === null}
        onDismiss={() => {
          dismissReminder()
          setDismissed((state) => ({ ...state, export: true }))
        }}
      />
    )
  }

  return null
}
