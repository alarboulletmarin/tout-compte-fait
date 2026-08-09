import { t } from '@/i18n/strings'
import { cn } from '@/lib/cn'
import { Button, IconButton } from './Button'
import { Close } from './Icons'
import { type Toast, useToasts } from './toast'

/**
 * Les confirmations d'action. Le nom d'une action ne change pas dans le flux :
 * le bouton dit « Confirmer le mois », le toast dit « Mois confirmé » (DS §7).
 *
 * Un message qui se répète porte son compte plutôt que de se dupliquer, et la
 * pile est plafonnée : au-delà, elle recouvrirait ce sur quoi on agit.
 *
 * **Deux régions vivantes, et non une.** Tout passait par `aria-live="polite"`,
 * y compris « L'enregistrement a échoué » : annoncé poliment, un échec attend
 * que le lecteur d'écran ait fini ce qu'il lisait, et peut n'être jamais lu si
 * l'écran change entre-temps. Une erreur relève de `role="alert"`, qui
 * interrompt — c'est la seule chose qu'on ait à dire à quelqu'un dont la saisie
 * ne s'enregistre plus. Les deux régions existent dès le premier rendu : une
 * région créée en même temps que son contenu n'est pas annoncée. Elles sont en
 * `display: contents`, donc la pile reste une seule colonne à l'œil.
 */
export function Toaster() {
  const toasts = useToasts((s) => s.toasts)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-16 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
      <div role="status" aria-live="polite" className="contents">
        {toasts
          .filter((item) => item.tone !== 'danger')
          .map((item) => (
            <ToastItem key={item.id} toast={item} />
          ))}
      </div>
      <div role="alert" className="contents">
        {toasts
          .filter((item) => item.tone === 'danger')
          .map((item) => (
            <ToastItem key={item.id} toast={item} />
          ))}
      </div>
    </div>
  )
}

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToasts((s) => s.dismiss)

  return (
    <div
      className={cn(
        'surface pointer-events-auto flex max-w-md items-center gap-2 rounded-chip py-2 pr-2 pl-4',
        'border border-border shadow-tile',
        toast.tone === 'danger' ? 'bg-danger text-danger-fg' : 'bg-surface text-text',
      )}
    >
      <span className="t-body">{toast.message}</span>
      {toast.count > 1 && <span className="t-axis tnum shrink-0">· {toast.count}</span>}
      {/* Le retour arrière ferme le message en même temps qu'il agit : le
          laisser ouvert proposerait de défaire une deuxième fois ce qui vient
          de l'être. Le geste retire de toute façon l'offre — toute mutation du
          document la retire —, mais le message, lui, resterait à l'écran. */}
      {toast.action !== undefined && (
        <Button
          size="sm"
          variant="secondary"
          className="shrink-0"
          onClick={() => {
            toast.action?.onAction()
            dismiss(toast.id)
          }}
        >
          {toast.action.label}
        </Button>
      )}
      <IconButton
        label={t.common.close}
        onClick={() => {
          dismiss(toast.id)
        }}
      >
        <Close size={16} />
      </IconButton>
    </div>
  )
}
