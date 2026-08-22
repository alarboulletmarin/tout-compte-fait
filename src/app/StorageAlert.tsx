import { today } from '@/domain/date'
import { t } from '@/i18n/strings'
import { downloadExport } from '@/persistence/transfer'
import { useStore } from '@/store/store'
import { Banner } from '@/ui/Banner'
import { Button } from '@/ui/Button'
import { Warning } from '@/ui/Icons'
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
 * **Deux gestes, dans l'ordre de ce qu'ils coûtent.** Réessayer est gratuit et
 * répare parfois — un quota libéré, un onglet fermé —, donc il vient d'abord ;
 * exporter ne répare rien mais met à l'abri, donc il reste, en fantôme. Le
 * bandeau n'en avait qu'un, et il demandait le plus lourd des deux à quelqu'un
 * dont l'incident venait peut-être de se résoudre tout seul.
 *
 * **Réessayer ne s'affiche que sur un échec d'écriture.** Une base `blocked`
 * n'est pas réparée par une écriture — elle n'est pas ouverte —, et un bouton
 * qui ne peut pas tenir sa promesse vaut moins que son absence (DS §6).
 *
 * L'export part de la copie en mémoire, et c'est le point : c'est le disque qui
 * est en retard, l'écran est intact. L'écran de secours de l'`ErrorBoundary`
 * fait l'inverse, pour la raison inverse.
 */
export function StorageAlert() {
  const error = useStore((s) => s.error)
  const data = useStore((s) => s.data)
  const retryWrite = useStore((s) => s.retryWrite)

  if (error === null) return null

  return (
    <Banner
      role="alert"
      label={t.storage.writeFailedLabel}
      tone="danger"
      className="mb-4"
      /* Le glyphe d'alerte accompagne le titre plutôt que de le remplacer : le
         DS §8 veut qu'une couleur ne porte jamais seule ce qu'elle dit, et
         l'encre de danger était jusqu'ici doublée par le seul poids du texte. */
      icon={Warning}
      title={error.message}
      body={t.storage.writeFailedBody}
    >
      {error.kind === 'write' && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            /* Rien à annoncer ici, et c'est un retrait : ce bouton poussait son
               propre message rouge, parce qu'il était le seul endroit qui en
               poussait un. Toute écriture ratée en pousse un maintenant — voir
               `reportWriteFailure` dans le store —, et « Réessayer » repasse par
               le writer comme les autres. Le garder ici en aurait fait deux pour
               un seul clic. La réussite, elle, se lit toujours par la
               disparition du bandeau. */
            void retryWrite()
          }}
        >
          {t.storage.retry}
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          downloadExport(data, today())
          toast(t.settings.exported)
        }}
      >
        {t.storage.exportFirst}
      </Button>
    </Banner>
  )
}
