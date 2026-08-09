import { Link } from 'react-router-dom'
import { DATA_PATH } from '@/app/routes'
import { t } from '@/i18n/strings'
import { IconButton } from '@/ui/Button'
import { Close } from '@/ui/Icons'
import { SwipeAway } from '@/ui/SwipeAway'

/**
 * Rappel d'export au-delà de trente jours (cahier §4.8). Écarté — à la croix
 * ou d'un balayage vers le haut — il ne revient pas avant le cycle suivant.
 *
 * **Il ne décide plus s'il s'affiche.** Il partageait cette décision avec le
 * bandeau d'échec d'écriture, chacun de son côté, si bien que les deux
 * pouvaient s'empiler pour dire la même chose à deux niveaux de gravité
 * différents. C'est `DataNotice` qui tranche désormais, pour les trois messages
 * du domaine ; celui-ci ne fait plus que se rendre. Ses règles — trente jours,
 * jamais exporté, écart valable pour un cycle — n'ont pas bougé d'une ligne :
 * elles vivaient déjà dans `transfer.ts`, en fonctions pures.
 */
export function ExportReminder({ never, onDismiss }: { never: boolean; onDismiss: () => void }) {
  return (
    <SwipeAway onDismiss={onDismiss} label={t.settings.reminderLabel} className="mb-4 block">
      {/* Le texte et ses boutons s'empilent tant que la ligne n'est pas tenable :
          en rangée, un bouton `shrink-0` écrase la phrase sous sa largeur
          min-content et la fait tomber en colonne d'un mot. */}
      <div className="tile flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Le jour où l'on n'a jamais exporté, parler d'un « dernier export »
              décrit quelque chose qui n'existe pas. */}
          <p className="t-body">
            {never ? t.settings.reminderTitleNever : t.settings.reminderTitle}
          </p>
          <p className="t-label">{t.settings.reminderBody}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
          {/* Droit sur la vue qui exporte, et non sur la page de réglages :
              celle-ci n'a plus de bouton d'export, et le rappel demandait de
              retrouver soi-même ce qu'il venait de réclamer. */}
          <Link
            to={DATA_PATH}
            className="inline-flex h-11 items-center justify-center rounded-input bg-accent px-5 font-medium text-accent-fg"
          >
            {t.settings.export}
          </Link>
          <IconButton label={t.settings.reminderDismiss} onClick={onDismiss}>
            <Close size={18} />
          </IconButton>
        </div>
      </div>
    </SwipeAway>
  )
}
