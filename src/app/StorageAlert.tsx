import { today } from '@/domain/date'
import { t } from '@/i18n/strings'
import { downloadExport } from '@/persistence/transfer'
import { useStore } from '@/store/store'
import { Button } from '@/ui/Button'
import { toast } from '@/ui/toast'

/**
 * Ce qui manquait le plus : le seul signal qu'une écriture a échoué.
 *
 * Il ne s'écarte pas. `ExportReminder` porte une croix et un balayage parce
 * qu'il rappelle une bonne habitude ; ici la condition est en cours, et un
 * bandeau qu'on chasse laisserait quelqu'un continuer à saisir dans une app qui
 * n'enregistre plus. Il disparaît quand la première écriture repasse — c'est le
 * `onWritten` du writer qui l'éteint, jamais un clic.
 *
 * **Les deux `kind` d'erreur y passent maintenant, et pas seulement `write`.**
 * Un échec de lecture ouvre bien son propre écran — mais seulement quand il
 * tombe à l'hydratation, où il bascule sur l'arrivée et ses recours. Il tombe
 * aussi une fois l'app ouverte : une base `blocked` à la réouverture, après
 * qu'un `terminated` a fermé la connexion sous nos pieds. Dans ce cas-là la
 * coquille est déjà montée, l'écran d'arrivée ne viendra pas, et le bandeau
 * était le seul endroit possible — il ne disait rien. La conséquence pratique
 * est d'ailleurs la même des deux côtés : plus rien ne s'enregistre.
 *
 * L'export part de la copie en mémoire, et c'est le point : c'est le disque qui
 * est en retard, l'écran est intact. L'écran de secours de l'`ErrorBoundary`
 * fait l'inverse, pour la raison inverse.
 */
export function StorageAlert() {
  const error = useStore((s) => s.error)
  const data = useStore((s) => s.data)

  if (error === null) return null

  return (
    <div
      role="alert"
      aria-label={t.storage.writeFailedLabel}
      className="tile mb-4 flex flex-col gap-3 border-danger p-4 sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="t-body font-semibold text-danger-text">{error.message}</p>
        <p className="t-label">{t.storage.writeFailedBody}</p>
      </div>
      <Button
        className="shrink-0 self-end sm:self-auto"
        onClick={() => {
          downloadExport(data, today())
          toast(t.settings.exported)
        }}
      >
        {t.storage.exportNow}
      </Button>
    </div>
  )
}
