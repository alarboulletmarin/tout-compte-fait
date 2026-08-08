import { useState } from 'react'
import { t } from '@/i18n/strings'
import type { ConfirmDialogProps } from './ConfirmDialog'

/**
 * Comparaison de surface, et c'est assez : les quatre brouillons de formulaire
 * sont des objets plats de chaînes et de booléens. Une comparaison profonde
 * coûterait un `JSON.stringify` par frappe pour départager des valeurs qui ne
 * sont jamais des objets — et sérialiser ferait dépendre le résultat de l'ordre
 * des clés, que rien ne garantit après un `patch`.
 */
function same<T extends object>(a: T, b: T): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  return [...keys].every((key) => a[key as keyof T] === b[key as keyof T])
}

export type LeaveGuard = {
  /** Vrai dès que la saisie diffère de ce qu'elle était à l'ouverture. */
  dirty: boolean
  /** À poser à la place du départ : ne demande que si la saisie a bougé. */
  request: () => void
  /** À étaler sur une `ConfirmDialog`. */
  dialog: Omit<ConfirmDialogProps, 'details'>
}

/**
 * Ce qui empêche une saisie de partir sans un mot.
 *
 * « Annuler » et le chevron retour jetaient le formulaire sans prévenir, sur
 * les quatre écrans de saisie. Aucun `beforeunload` non plus — mais il n'aurait
 * rien réglé : ces écrans quittent par le routeur, pas par le navigateur, et
 * `beforeunload` ne voit pas passer un changement d'URL interne.
 *
 * La question ne se pose que si quelque chose a changé : ouvrir un formulaire,
 * le regarder et repartir est un geste courant, et le ponctuer d'une question
 * apprendrait surtout à cliquer sans lire — ce qui coûterait précisément la
 * fois où la saisie n'était pas vide.
 *
 * Un pas, comme toute question qui ne perd qu'une ligne (cahier §4.8). Ce qui
 * s'enregistre, lui, ne demande rien : `submit` part directement.
 */
export function useLeaveGuard<T extends object>(draft: T, leave: () => void): LeaveGuard {
  /* Le brouillon du premier rendu, figé. En reprise, c'est ce que la ligne
     valait à l'ouverture : corriger un montant puis le retaper à l'identique
     ne « modifie » rien, et ne doit donc rien demander. */
  const [pristine] = useState(draft)
  const [asking, setAsking] = useState(false)
  const dirty = !same(pristine, draft)

  return {
    dirty,
    request: () => {
      if (dirty) setAsking(true)
      else leave()
    },
    dialog: {
      open: asking,
      title: t.unsaved.title,
      steps: [{ question: t.unsaved.question, action: t.unsaved.leave }],
      cancelLabel: t.unsaved.stay,
      onCancel: () => {
        setAsking(false)
      },
      onConfirm: () => {
        setAsking(false)
        leave()
      },
    },
  }
}
