import { create } from 'zustand'

/**
 * Le retour arrière proposé par un message.
 *
 * Le verbe n'est jamais « Annuler » : c'est déjà le bouton qui ferme une boîte
 * de dialogue, et les deux se seraient répondu dans la même — la même raison
 * qui fait dire « remettre à confirmer » plutôt qu'« annuler la confirmation ».
 */
export type ToastAction = {
  label: string
  onAction: () => void
}

export type Toast = {
  id: number
  message: string
  tone: 'default' | 'danger'
  /** Nombre de fois que le même message s'est répété d'affilée. */
  count: number
  /** Absent tant que le geste n'a rien à défaire — la plupart n'ont rien. */
  action?: ToastAction
}

type ToastStore = {
  toasts: Toast[]
  push: (message: string, tone?: Toast['tone'], action?: ToastAction) => void
  dismiss: (id: number) => void
  /**
   * Retire les retours arrière sans toucher aux messages.
   *
   * Le store appelle ceci dès que le document change : un undo porte un
   * instantané, et le remettre par-dessus une modification survenue depuis
   * l'emporterait avec lui. Le message reste — ce qu'il annonce a bien eu
   * lieu —, seule l'offre disparaît. C'est aussi ce qui garantit qu'un seul
   * geste est défaisable à la fois : le plus récent.
   */
  clearActions: () => void
}

let nextId = 0
const LIFETIME_MS = 4000

/**
 * Un message qui propose un retour arrière vit plus longtemps : quatre secondes
 * suffisent à lire « Dépense supprimée », pas à s'apercevoir qu'on s'est trompé,
 * trouver le bouton et l'atteindre au pouce. C'est le seul geste que le message
 * demande, et le seul délai qui décide s'il est atteignable.
 */
const ACTION_LIFETIME_MS = 8000

/**
 * Un échec vit plus longtemps qu'une confirmation, et moins qu'un retour
 * arrière.
 *
 * Il n'y a rien à attraper — un message rouge ne propose aucun geste, il
 * annonce que ce qu'on vient de faire n'a pas eu lieu. Mais il se lit plus
 * lentement qu'une réussite : « Échéance confirmée » se reconnaît à la forme,
 * « L'enregistrement a encore échoué » se lit vraiment, et il faut ensuite un
 * temps pour comprendre que la phrase parle de la saisie qu'on vient de finir.
 * Une seconde de plus, qui est la valeur du design.
 *
 * **Elle ne s'applique pas à un message rouge qui propose un retour arrière** :
 * là, c'est le geste qui décide du délai, et il en demande huit — voir
 * ci-dessus. Le plus long des deux gagne, toujours.
 */
const DANGER_LIFETIME_MS = 5200

/**
 * Trois au plus. Au-delà, les plus anciens s'effacent : une pile de messages
 * qui recouvre l'écran ne dit plus rien de ce qui vient de se passer, et cache
 * ce sur quoi on est en train d'agir.
 */
const MAX_VISIBLE = 3

const timers = new Map<number, ReturnType<typeof setTimeout>>()

/**
 * Pose le retour arrière, ou n'en pose aucun.
 *
 * `exactOptionalPropertyTypes` distingue « la clé est absente » de « la clé
 * vaut `undefined` », et c'est une distinction utile ici : un message sans
 * retour arrière ne porte pas la clé du tout, plutôt qu'une clé vide que le
 * rendu devrait apprendre à ignorer.
 */
const withAction = (base: Omit<Toast, 'action'>, action: ToastAction | undefined): Toast =>
  action === undefined ? base : { ...base, action }

function forget(id: number): void {
  const timer = timers.get(id)
  if (timer !== undefined) clearTimeout(timer)
  timers.delete(id)
}

export const useToasts = create<ToastStore>()((set, get) => {
  /** (Re)lance le compte à rebours d'un message. */
  const schedule = (id: number, lifetime: number): void => {
    forget(id)
    timers.set(
      id,
      setTimeout(() => {
        get().dismiss(id)
      }, lifetime),
    )
  }

  return {
    toasts: [],

    push(message, tone = 'default', action) {
      const last = get().toasts.at(-1)
      const lifetime =
        action !== undefined
          ? ACTION_LIFETIME_MS
          : tone === 'danger'
            ? DANGER_LIFETIME_MS
            : LIFETIME_MS

      /* Le même message répété se compte au lieu de s'empiler : confirmer dix
         échéances une par une donne « Échéance confirmée · 10 », pas dix
         bandeaux. Le compte à rebours repart à chaque répétition.
         Le retour arrière, lui, est remplacé et non conservé : il porte
         l'instantané du dernier geste, et c'est le dernier qu'on défait. */
      if (last !== undefined && last.message === message && last.tone === tone) {
        set((state) => ({
          toasts: state.toasts.map((t) => {
            if (t.id !== last.id) return t
            const { action: _previous, ...rest } = t
            return withAction({ ...rest, count: t.count + 1 }, action)
          }),
        }))
        schedule(last.id, lifetime)
        return
      }

      nextId += 1
      const id = nextId
      set((state) => {
        const next = [...state.toasts, withAction({ id, message, tone, count: 1 }, action)]
        for (const dropped of next.slice(0, -MAX_VISIBLE)) forget(dropped.id)
        return { toasts: next.slice(-MAX_VISIBLE) }
      })
      schedule(id, lifetime)
    },

    dismiss(id) {
      forget(id)
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    },

    clearActions() {
      /* Rien à retirer : on rend le même tableau plutôt qu'un neuf. Sans ce
         garde, chaque mutation du document rendrait à nouveau toute la pile,
         alors qu'aucun message n'a changé — et il y a une mutation par frappe
         confirmée. */
      const { toasts } = get()
      if (!toasts.some((t) => t.action !== undefined)) return
      set({
        toasts: toasts.map(({ action: _action, ...rest }) => rest),
      })
    },
  }
})

/** Raccourci hors composant : une action peut annoncer son résultat. */
export const toast = (message: string, tone?: Toast['tone'], action?: ToastAction): void => {
  useToasts.getState().push(message, tone, action)
}
