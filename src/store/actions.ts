/* ============================================================================
 * Actions — le seul vocabulaire dont dispose un composant pour changer l'état.
 *
 * Chacune se contente d'appliquer une mutation pure du domaine. Aucune règle
 * métier ne vit ici, et encore moins dans un composant.
 * ==========================================================================*/

import { type ISODate, today } from '@/domain/date'
import { makeId } from '@/domain/ids'
import type { Money } from '@/domain/money'
import { type Advance, type Category, type CategoryKind, type Debt, type Entry, type Family, type Member, type Recurrence, type SavingRate, type SavingSupport, type SavingValuation, type Settings, directionOfKind } from '@/domain/types'
import * as updates from '@/domain/updates'
import { t } from '@/i18n/strings'
import { nextCategoryColor, nextMemberColor } from '@/persistence/defaults'
import { toast } from '@/ui/toast'
import { ALL_FILTER, useStore } from './store'

const mutate = (recipe: Parameters<ReturnType<typeof useStore.getState>['mutate']>[0]): void => {
  useStore.getState().mutate(recipe)
}

/**
 * Fait le geste, l'annonce, et propose de revenir dessus.
 *
 * Aucune structure de commande là-dessous, et il n'en faut aucune : toutes les
 * mutations du domaine sont pures — `updates.ts` rend un `Data` neuf plutôt que
 * de modifier celui qu'on lui donne —, si bien que le document d'avant est
 * encore là, intact, à portée de référence. Le reposer *est* l'annulation
 * exacte de n'importe quel geste, y compris ceux qui touchent à dix endroits à
 * la fois comme le retrait d'un membre ou la suppression d'une récurrence.
 *
 * L'offre ne survit pas à la mutation suivante — `mutate` la retire. C'est ce
 * qui empêche l'instantané d'écraser ce qui a été fait depuis, et ce qui fait
 * qu'un seul geste est défaisable : le dernier. La fenêtre est celle du
 * message, huit secondes.
 *
 * Elle ne remplace pas la confirmation : le cahier §4.8 la demande sur toute
 * suppression, et un retour arrière qui dure huit secondes ne dit pas la même
 * chose qu'une question posée avant. Elle rattrape ce que la question ne
 * rattrape pas — le oui donné trop vite.
 */
export function undoable(message: string, apply: () => void): void {
  const before = useStore.getState().data
  apply()
  toast(message, 'default', {
    label: t.common.undo,
    onAction: () => {
      mutate(() => before)
    },
  })
}

/* --- Foyer ----------------------------------------------------------------*/

export function setHouseholdName(name: string): void {
  mutate((data) => updates.setHouseholdName(data, name))
}

export function addMember(name: string): Member {
  const member: Member = {
    id: makeId(),
    name,
    color: nextMemberColor(useStore.getState().data.household.members.length),
  }
  mutate((data) => updates.addMember(data, member))
  return member
}

export function renameMember(id: string, name: string): void {
  mutate((data) => updates.renameMember(data, id, name))
}

export function removeMember(id: string): void {
  mutate((data) => updates.removeMember(data, id))
  // Le filtre pointait sur quelqu'un qui n'est plus du foyer : il ne rendrait
  // plus rien. « Commun » et « Tout », eux, survivent à un départ.
  const { filter, setFilter } = useStore.getState()
  if (filter.kind === 'member' && filter.memberId === id) setFilter(ALL_FILTER)
}

/* --- Catégories -----------------------------------------------------------*/

export function addCategory(input: Omit<Category, 'id' | 'archived' | 'color' | 'direction'>): Category {
  const kind =
    useStore.getState().data.families.find((f) => f.id === input.familyId)?.kind ?? 'charge'
  const category: Category = {
    ...input,
    id: makeId(),
    // La teinte et le sens ne se saisissent pas : ils découlent de la famille,
    // et les laisser diverger d'elle n'aurait aucun sens lisible.
    color: nextCategoryColor(input.familyId),
    direction: directionOfKind(kind),
    archived: false,
  }
  mutate((data) => updates.addCategory(data, category))
  return category
}

/* --- Familles -------------------------------------------------------------*/

export function addFamily(input: { label: string; kind: CategoryKind }): Family {
  const family: Family = { ...input, id: makeId() }
  mutate((data) => updates.addFamily(data, family))
  return family
}

export function renameFamily(id: string, label: string): void {
  mutate((data) => updates.renameFamily(data, id, label))
}

/* --- Crédits --------------------------------------------------------------*/

export function addDebt(input: Omit<Debt, 'id'>): Debt {
  const debt: Debt = { ...input, id: makeId() }
  mutate((data) => updates.addDebt(data, debt))
  return debt
}

/* Un formulaire pose l'état complet de ce qu'il montre, jamais un correctif :
   voir `updates.replaceRecurrence`. */
export function replaceDebt(id: string, next: Omit<Debt, 'id'>): void {
  mutate((data) => updates.replaceDebt(data, id, next))
}

export function removeDebt(id: string): void {
  mutate((data) => updates.removeDebt(data, id))
}

/* --- Épargne : supports et valorisations ----------------------------------*/

/* La composition d'un support — le compte, et sa première valorisation quand un
   montant est connu — est une règle, et elle vit donc dans le domaine. Quatre
   portes créent des supports : la page Épargne, l'onboarding, la saisie d'un
   versement et le jeu d'exemple. Elles appellent toutes celle-ci. */
export type { SavingSupportInput } from '@/domain/updates'

/** Pose un support et rend ce qui a été créé, pour que l'écran sache où aller. */
export function addSavingSupport(input: updates.SavingSupportInput): SavingSupport {
  const created = updates.createSavingSupport(useStore.getState().data, input, makeId)
  mutate(() => created.data)
  return created.support
}

export function replaceSavingSupport(id: string, next: Omit<SavingSupport, 'id'>): void {
  mutate((data) => updates.replaceSavingSupport(data, id, next))
}

/**
 * Archive un support, et arrête au passage les règles qui l'alimentent encore
 * quand l'écran l'a demandé.
 *
 * Les deux gestes tiennent dans une seule mutation — donc un seul rendu, une
 * seule écriture, un seul retour arrière. Les séparer laisserait un instant où
 * le compte est invisible et continue pourtant de recevoir 300 € par mois.
 */
export function archiveSavingSupport(id: string, options: { stopRecurrences?: boolean } = {}): void {
  mutate((data) => {
    const archived = updates.archiveSavingSupport(data, id)
    return options.stopRecurrences === true
      ? updates.stopSupportRecurrences(archived, id, today())
      : archived
  })
}

export function unarchiveSavingSupport(id: string): void {
  mutate((data) => updates.archiveSavingSupport(data, id, false))
}

/** Supprime un support pour de bon. Réservé à ce qui n'a pas d'histoire. */
export function removeSavingSupport(id: string): void {
  mutate((data) => updates.removeSavingSupport(data, id))
}

export function addSavingValuation(input: Omit<SavingValuation, 'id'>): SavingValuation {
  const valuation: SavingValuation = { ...input, id: makeId() }
  mutate((data) => updates.addSavingValuation(data, valuation))
  return valuation
}

/** Plusieurs relevés en un geste — voir `updates.addSavingValuations`. */
export function addSavingValuations(
  inputs: readonly Omit<SavingValuation, 'id'>[],
): SavingValuation[] {
  const valuations = inputs.map((input) => ({ ...input, id: makeId() }))
  mutate((data) => updates.addSavingValuations(data, valuations))
  return valuations
}

export function replaceSavingValuation(id: string, next: Omit<SavingValuation, 'id'>): void {
  mutate((data) => updates.replaceSavingValuation(data, id, next))
}

export function removeSavingValuation(id: string): void {
  mutate((data) => updates.removeSavingValuation(data, id))
}

export function addSavingRate(input: Omit<SavingRate, 'id'>): SavingRate {
  const rate: SavingRate = { ...input, id: makeId() }
  mutate((data) => updates.addSavingRate(data, rate))
  return rate
}

export function replaceSavingRate(id: string, next: Omit<SavingRate, 'id'>): void {
  mutate((data) => updates.replaceSavingRate(data, id, next))
}

export function removeSavingRate(id: string): void {
  mutate((data) => updates.removeSavingRate(data, id))
}

/* --- Avances --------------------------------------------------------------*/

/* La composition d'une avance — la récurrence qui reconstitue le livret, la
   reprise confirmée du jour du paiement, l'avance elle-même — est une règle, et
   elle vit donc dans le domaine. L'écran de saisie n'est plus seul à poser des
   avances : le jeu d'exemple en pose aussi, et deux copies de cette composition
   finiraient par ne plus se répondre. */
export type { AdvanceInput } from '@/domain/updates'

/** Pose une avance et rend ce qui a été créé, pour que l'écran sache où aller. */
export function addAdvance(input: updates.AdvanceInput): Advance {
  const created = updates.createAdvance(useStore.getState().data, input, makeId)
  mutate(() => created.data)
  return created.advance
}

/**
 * Retire l'avance du suivi, et avec elle la mensualité qui la reconstitue —
 * mais pas ce qui est déjà revenu sur le livret.
 *
 * C'est la différence avec un crédit, dont la mensualité survit au retrait : le
 * remboursement d'un crédit continue après qu'on a cessé d'en suivre le
 * capital, alors qu'une avance qu'on ne suit plus n'a plus de raison de se
 * reverser. La récurrence part donc avec elle, sans toucher aux échéances déjà
 * confirmées, que `removeRecurrence` conserve.
 */
export function removeAdvance(id: string): void {
  const advance = useStore.getState().data.advances.find((a) => a.id === id)
  const recurrenceId = advance?.recurrenceId
  mutate((data) => {
    const without = updates.removeAdvance(data, id)
    return recurrenceId === undefined
      ? without
      : updates.removeRecurrence(without, recurrenceId)
  })
}

export function updateCategory(id: string, patch: Partial<Category>): void {
  mutate((data) => updates.updateCategory(data, id, patch))
}

export function archiveCategory(id: string, archived = true): void {
  mutate((data) => updates.archiveCategory(data, id, archived))
}

/* --- Récurrences ----------------------------------------------------------*/

/* Toute écriture sur une récurrence réaligne ses échéances dans la foulée :
   poser la règle et en tirer les faits sont un seul geste pour qui l'utilise,
   ce ne sont pas deux commandes dont la seconde s'oublie. */

export function addRecurrence(input: Omit<Recurrence, 'id'>): Recurrence {
  const recurrence: Recurrence = { ...input, id: makeId() }
  mutate((data) =>
    updates.syncRecurrenceEntries(updates.addRecurrence(data, recurrence), recurrence.id, makeId),
  )
  return recurrence
}

/**
 * Pose la récurrence et marque l'échéance du jour saisi comme déjà payée.
 *
 * C'est le geste de la saisie d'une dépense qu'on bascule en récurrence :
 * celle-là a eu lieu, les suivantes sont à venir. Les trois étapes tiennent
 * dans une seule mutation — donc un seul rendu, une seule écriture — et surtout
 * l'échéance du jour ne peut pas rester prévue si la suite échouait.
 */
export function addRecurrencePaidOn(input: Omit<Recurrence, 'id'>, on: ISODate): Recurrence {
  const recurrence: Recurrence = { ...input, id: makeId() }
  mutate((data) =>
    updates.confirmOccurrence(
      updates.syncRecurrenceEntries(updates.addRecurrence(data, recurrence), recurrence.id, makeId),
      recurrence.id,
      on,
      makeId,
    ),
  )
  return recurrence
}

export function replaceRecurrence(id: string, next: Omit<Recurrence, 'id'>): void {
  mutate((data) =>
    updates.syncRecurrenceEntries(updates.replaceRecurrence(data, id, next), id, makeId),
  )
}

export function stopRecurrence(id: string, on: ISODate = today()): void {
  // `stopRecurrence` retire déjà les prévues postérieures : rien à replanifier.
  mutate((data) => updates.stopRecurrence(data, id, on))
}

export function resumeRecurrence(id: string): void {
  mutate((data) => updates.syncRecurrenceEntries(updates.resumeRecurrence(data, id), id, makeId))
}

export function removeRecurrence(id: string): void {
  mutate((data) => updates.removeRecurrence(data, id))
}

/* --- Entrées --------------------------------------------------------------*/

export function addEntry(input: Omit<Entry, 'id'>): Entry {
  const entry: Entry = { ...input, id: makeId() }
  mutate((data) => updates.addEntry(data, entry))
  return entry
}

export function replaceEntry(id: string, next: Omit<Entry, 'id' | 'recurrenceId'>): void {
  mutate((data) => updates.replaceEntry(data, id, next))
}

export function removeEntry(id: string): void {
  mutate((data) => updates.removeEntry(data, id))
}

export function confirmEntry(id: string, amount?: Money): void {
  mutate((data) =>
    updates.updateEntry(data, id, {
      status: 'confirmed',
      ...(amount === undefined ? {} : { amount }),
    }),
  )
}

export function confirmEntries(ids: readonly string[]): void {
  mutate((data) => updates.confirmEntries(data, ids))
}

export function unconfirmEntry(id: string): void {
  mutate((data) => updates.unconfirmEntries(data, [id]))
}

export function unconfirmEntries(ids: readonly string[]): void {
  mutate((data) => updates.unconfirmEntries(data, ids))
}

/* --- Réglages -------------------------------------------------------------*/

export function updateSettings(patch: Partial<Settings>): void {
  mutate((data) => updates.updateSettings(data, patch))
}
