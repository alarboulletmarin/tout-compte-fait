/* Ce que le formulaire enregistre, et ce qu'il en annonce.
 *
 * En un seul endroit, parce qu'il n'y a plus qu'un formulaire : depuis les deux
 * portes, le rythme se change d'un doigt à la création, si bien que « Ajouter
 * une récurrence » peut très bien finir sur une entrée ponctuelle — et
 * inversement. C'est ce qui est construit qui décide, jamais le bouton par
 * lequel on est arrivé. */

import type { Direction } from '@/domain/types'
import { t } from '@/i18n/strings'
import {
  addEntry,
  addRecurrence,
  addRecurrencePaidOn,
  applyEntryEditToRule,
  convertEntryToRecurrence,
  replaceEntry,
  replaceRecurrence,
} from '@/store/actions'
import type { EntryNature } from '@/ui/categoryKinds'
import { toast } from '@/ui/toast'
import type { Built, Operation } from './useOperationForm'

/** Annoncer « Dépense ajoutée » après un salaire ferait douter de ce qui vient
 *  d'être enregistré. */
const toasts = () => ({
  added: { in: t.entry.addedIn, out: t.entry.addedOut, saving: t.entry.addedSaving },
  updated: { in: t.entry.updatedIn, out: t.entry.updatedOut, saving: t.entry.updatedSaving },
} as const)

/** La clé du toast : l'épargne parle d'elle-même, les deux autres du sens. */
const toastKey = (nature: EntryNature, direction: Direction): 'in' | 'out' | 'saving' =>
  nature === 'saving' ? 'saving' : direction

/**
 * Jusqu'où porte la reprise d'une échéance générée : elle seule, ou la règle
 * qui la pose. Sans objet partout ailleurs — création, ponctuel, récurrence.
 */
export type EditScope = 'occurrence' | 'rule'

export function saveOperation(
  built: Built,
  operation: Operation | null,
  scope: EditScope = 'occurrence',
): void {
  if (built.kind === 'entry') {
    const key = toastKey(built.nature, built.payload.direction)
    if (operation?.kind === 'entry') {
      if (scope === 'rule' && operation.entry.recurrenceId !== undefined) {
        applyEntryEditToRule(operation.entry.id, built.payload)
        toast(t.entry.updatedRule)
      } else {
        replaceEntry(operation.entry.id, built.payload)
        toast(toasts().updated[key])
      }
    } else {
      addEntry(built.payload)
      toast(toasts().added[key])
    }
    return
  }

  if (operation?.kind === 'recurrence') {
    replaceRecurrence(operation.recurrence.id, built.payload)
    toast(t.recurrences.updated)
    return
  }

  /* Une entrée ponctuelle qu'on vient de rendre récurrente : elle sait déjà si
     elle a eu lieu, ce n'est plus `Built.paidOn` qui tranche. */
  if (built.convertedFromEntryId !== undefined) {
    convertEntryToRecurrence(built.convertedFromEntryId, built.payload)
    toast(t.recurrences.convertedFromEntry)
    return
  }

  /* La règle produit ses échéances dans la foulée. Celle qui a déjà eu lieu part
     confirmée — voir `Built.paidOn` : l'utilisateur vient de dire qu'elle a été
     payée, on ne la lui redemande pas. */
  if (built.paidOn === null) addRecurrence(built.payload)
  else addRecurrencePaidOn(built.payload, built.paidOn)
  toast(t.recurrences.added)
}
