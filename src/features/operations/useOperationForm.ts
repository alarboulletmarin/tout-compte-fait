/* État, règles et validation de la saisie — une seule fois.
 *
 * Il y en avait deux : un brouillon d'entrée sur l'écran de saisie, un
 * brouillon de récurrence sur celui des récurrences. Deux formulaires pour un
 * même geste, et donc deux ordres de champs, deux jeux de messages, deux
 * validations — dont une seule recevait chaque correction. Le composant ne
 * garde ici aucune règle : il lit des champs et appelle `build`. */

import { useMemo, useState } from 'react'
import { type ISODate, today } from '@/domain/date'
import { type Money, parseAmount, toAmountInput } from '@/domain/money'
import { memberRequired } from '@/domain/split'
import type { Direction, Entry, Recurrence } from '@/domain/types'
import type { EntryNature } from '@/ui/categoryKinds'
import { t } from '@/i18n/strings'
import { useActiveSavingSupports, useKindOf, useMembers } from '@/store/selectors'
import { type PeriodDraft, defaultsFrom, kindOf, monthlyDraftFrom, periodOf } from '@/features/recurrences/period'

/**
 * Ce que le formulaire reprend, quand il reprend quelque chose.
 *
 * Union discriminée plutôt que deux champs facultatifs : « une entrée ou une
 * récurrence, jamais les deux et jamais aucune des deux » est une propriété que
 * le type doit tenir, pas une convention à relire à chaque appel.
 */
export type Operation =
  | { kind: 'entry'; entry: Entry }
  | { kind: 'recurrence'; recurrence: Recurrence }

/**
 * Ce qu'une porte d'entrée transmet, et tout ce qu'elle transmet.
 *
 * C'est la seule chose qui distingue « Ajouter une dépense » d'« Ajouter une
 * récurrence » : des valeurs initiales. Le formulaire, lui, est le même — au
 * champ près, à l'espacement près, au comportement près, sans quoi l'utilisateur
 * pourrait deviner par quel bouton il est arrivé.
 */
export type OperationDefaults = {
  nature: EntryNature
  direction: Direction
  date: ISODate
  recurring: boolean
}

/**
 * Un seul brouillon pour les deux rythmes.
 *
 * `startedOn` porte la date, quel que soit le rythme : c'est la date de
 * l'opération en ponctuel, la première échéance en récurrence. Un second champ
 * de date aurait posé deux fois la même question, et laissé deux réponses là où
 * l'enregistrement n'en lit qu'une.
 */
export type OperationDraft = PeriodDraft & {
  /** Ce qu'on enregistre. Le sens en découle, sauf en épargne. */
  nature: EntryNature
  direction: Direction
  /** Une règle plutôt qu'un fait. Ne se change pas en reprise. */
  recurring: boolean
  amountText: string
  /** Règle dont le montant se saisit à chaque échéance. Ignoré en ponctuel. */
  variable: boolean
  /**
   * Le support versé ou repris, en nature `saving` — et la question centrale de
   * cette saisie-là : « où va l'argent ». La catégorie s'en **déduit**, elle ne
   * se saisit pas : le support porte déjà le poste sous lequel ses mouvements se
   * rangent, et redemander les deux donnerait deux réponses à tenir d'accord.
   */
  savingSupportId: string
  categoryId: string
  label: string
  memberId: string
  /** `undefined` = la règle de partage tranche ; voir `isSharedEntry`. */
  shared: boolean | undefined
  note: string
}

export type DraftErrors = Partial<
  Record<'amount' | 'category' | 'support' | 'label' | 'member', string>
>

/**
 * Ce que `build` rend à l'écran : le payload, et ce qu'il faut en faire.
 *
 * Le formulaire ne connaît pas les actions du store — c'est la page qui sait
 * d'où l'on vient, donc où revenir et quoi annoncer.
 */
export type Built = { nature: EntryNature } & (
  | { kind: 'entry'; payload: Omit<Entry, 'id'> }
  | {
      kind: 'recurrence'
      payload: Omit<Recurrence, 'id'>
      /**
       * La date à laquelle la première échéance part **payée**, ou `null` si
       * elle part à confirmer comme les suivantes.
       *
       * Une seule règle, et la même depuis les deux portes : une échéance déjà
       * datée et chiffrée a eu lieu — c'est le cas de « j'ai payé le loyer, et
       * c'est tous les mois », le geste le plus courant de l'écran de saisie.
       * Une échéance à venir n'a rien eu lieu du tout, et celle d'une règle à
       * montant variable n'a pas de montant à porter : la marquer payée
       * l'enregistrerait à l'estimation, c'est-à-dire à une supposition.
       */
      paidOn: ISODate | null
    }
)

function draftFrom(
  operation: Operation | null,
  defaults: OperationDefaults,
  isSaving: (categoryId: string) => boolean,
): OperationDraft {
  /* La nature se relit sur la catégorie plutôt que d'être stockée : elle est
     déjà dans la donnée, et un second champ finirait par en diverger. */
  const natureOf = (categoryId: string, direction: Direction): EntryNature =>
    isSaving(categoryId) ? 'saving' : direction === 'in' ? 'income' : 'expense'

  if (operation === null) {
    return {
      ...monthlyDraftFrom(defaults.date),
      nature: defaults.nature,
      direction: defaults.direction,
      recurring: defaults.recurring,
      amountText: '',
      variable: false,
      savingSupportId: '',
      categoryId: '',
      label: '',
      memberId: '',
      shared: undefined,
      note: '',
    }
  }

  if (operation.kind === 'entry') {
    const { entry } = operation
    return {
      ...monthlyDraftFrom(entry.date),
      nature: natureOf(entry.categoryId, entry.direction),
      direction: entry.direction,
      recurring: false,
      amountText: toAmountInput(entry.amount),
      variable: false,
      savingSupportId: entry.savingSupportId ?? '',
      categoryId: entry.categoryId,
      label: entry.label,
      memberId: entry.memberId ?? '',
      shared: entry.shared,
      note: entry.note ?? '',
    }
  }

  const { recurrence } = operation
  const fallbacks = defaultsFrom(recurrence.startedOn)
  return {
    kind: kindOf(recurrence.period),
    /* Chaque unité relit le sien, et seulement le sien : reprendre une
       trimestrielle ne doit pas proposer « toutes les 3 semaines » si l'on
       bascule ensuite sur la quinzaine. Le défaut de 2 est celui du cas le plus
       courant de chaque unité — quinzaine, bimestre, biennale. */
    everyWeeks: recurrence.period.unit === 'week' ? recurrence.period.every : 2,
    everyMonths: recurrence.period.unit === 'month' ? recurrence.period.every : 2,
    everyYears: recurrence.period.unit === 'year' ? recurrence.period.every : 2,
    monthDay: recurrence.period.unit === 'week' ? fallbacks.monthDay : recurrence.period.anchorDay,
    weekday: recurrence.period.unit === 'week' ? recurrence.period.anchorDay : fallbacks.weekday,
    startedOn: recurrence.startedOn,
    nature: natureOf(recurrence.categoryId, recurrence.direction),
    direction: recurrence.direction,
    recurring: true,
    /* Un variable n'a que son montant habituel à montrer — c'est le seul chiffre
       qu'il porte, et le champ est le même. */
    amountText:
      recurrence.amount === null
        ? recurrence.estimate === undefined
          ? ''
          : toAmountInput(recurrence.estimate)
        : toAmountInput(recurrence.amount),
    variable: recurrence.amount === null,
    savingSupportId: recurrence.savingSupportId ?? '',
    categoryId: recurrence.categoryId,
    label: recurrence.label,
    memberId: recurrence.memberId ?? '',
    shared: recurrence.shared,
    note: recurrence.note ?? '',
  }
}

export function useOperationForm(operation: Operation | null, defaults: OperationDefaults) {
  const members = useMembers()
  const kindOf = useKindOf()
  const supports = useActiveSavingSupports()
  const [draft, setDraft] = useState<OperationDraft>(() =>
    draftFrom(operation, defaults, (id) => kindOf(id) === 'saving'),
  )
  const [showErrors, setShowErrors] = useState(false)

  /**
   * La saisie d'épargne demande **le support**, pas la catégorie.
   *
   * « Où va l'argent » est la question de ce geste-là, et le support y répond
   * seul : il porte le poste sous lequel le mouvement se range et la personne à
   * qui il est. Demander les trois laisserait poser un versement sur le PEA
   * d'Andrea, rangé en « Livrets », au nom de Marie — trois réponses pour un
   * seul fait, dont deux peuvent se contredire.
   *
   * Sans personne au foyer, aucun support ne peut exister — une épargne est
   * toujours à quelqu'un, c'est déjà la règle des avances. La saisie retombe
   * alors sur la catégorie, qui reste tout ce qu'on peut savoir du mouvement.
   */
  const supportMode = draft.nature === 'saving' && members.length > 0

  /* Le montant n'est facultatif que sur une règle à montant variable, où il ne
     chiffre plus l'opération mais l'ordre de grandeur qu'on lui prête. Partout
     ailleurs — tout le ponctuel, toute règle à montant fixe — un mouvement sans
     montant n'est pas un mouvement. */
  const optionalAmount = draft.recurring && draft.variable
  const amount: Money | null = useMemo(() => parseAmount(draft.amountText), [draft.amountText])
  const typedAmount = draft.amountText.trim() !== ''

  const errors: DraftErrors = useMemo(() => {
    const found: DraftErrors = {}
    /* Facultatif, mais pas au point d'être avalé en silence : un chiffre saisi
       puis ignoré à l'enregistrement se découvre des semaines plus tard, quand
       la répartition ne se calcule toujours pas. */
    if ((typedAmount || !optionalAmount) && (amount === null || amount <= 0)) {
      found.amount = t.entry.amountRequired
    }
    if (supportMode && draft.savingSupportId === '') found.support = t.savings.supportRequired
    // En mode support, la catégorie est dérivée : l'exiger poserait deux fois
    // la même question, et son message désignerait un champ qui n'est pas là.
    if (!supportMode && draft.categoryId === '') found.category = t.entry.categoryRequired
    if (draft.label.trim() === '') {
      found.label = draft.recurring ? t.entry.labelRequiredRecurring : t.entry.labelRequired
    }
    /* Une ligne qui n'entre pas dans les charges communes doit être à quelqu'un :
       sans propriétaire, elle n'apparaîtrait dans le mois de personne — et une
       règle en pose une par période, donc elle creuse le trou à chaque fois. Le
       champ ne s'exige évidemment que s'il y a quelqu'un à désigner. */
    if (
      members.length > 0 &&
      memberRequired(draft.direction, kindOf(draft.categoryId), draft.memberId, draft.shared)
    ) {
      found.member = draft.recurring ? t.entry.memberRequiredRecurring : t.entry.memberRequired
    }
    return found
  }, [
    amount,
    typedAmount,
    optionalAmount,
    supportMode,
    draft.savingSupportId,
    draft.categoryId,
    draft.label,
    draft.recurring,
    draft.direction,
    draft.memberId,
    draft.shared,
    members,
    kindOf,
  ])

  const patch = (next: Partial<OperationDraft>): void => {
    setDraft((current) => {
      /* Changer de nature vide la catégorie **et** le support : les listes ne
         se recouvrent pas, et un support resté en place sur une saisie de
         dépense laisserait derrière lui une catégorie vidée par le même geste.
         Repasser en épargne redemande donc où va l'argent, ce qui est la
         question de cette nature-là. */
      if (next.nature !== undefined && next.nature !== current.nature) {
        return { ...current, ...next, categoryId: '', savingSupportId: '' }
      }
      /* Choisir un support répond à trois questions d'un coup : où va l'argent,
         sous quel poste il se range, et à qui il est. Les deux dernières se
         **dérivent** — les redemander à l'écran, c'est se donner deux réponses
         qui peuvent se contredire, et le document n'en garderait qu'une. */
      if (next.savingSupportId !== undefined && next.savingSupportId !== '') {
        const support = supports.find((one) => one.id === next.savingSupportId)
        if (support !== undefined) {
          return {
            ...current,
            ...next,
            categoryId: support.categoryId,
            memberId: support.memberId,
          }
        }
      }
      /* Changer la date réaligne le jour du mois et le jour de la semaine :
         « première échéance le 1er mars » répond déjà à « quel jour du mois »,
         et la redemander serait poser deux fois la même question. Les deux
         champs restent modifiables — c'est la date suivante qui les reprend. */
      if (next.startedOn !== undefined && next.startedOn !== current.startedOn) {
        return { ...current, ...next, ...defaultsFrom(next.startedOn) }
      }
      return { ...current, ...next }
    })
  }

  /* Voir `Built.paidOn`. Calculé ici et non dans `build` seul : le champ de date
     l'annonce à l'écran, avant l'enregistrement — ce qu'il advient de la
     première échéance ne doit pas se découvrir après coup. */
  const firstDuePaid =
    draft.recurring && operation === null && !draft.variable && draft.startedOn <= today()

  const build = (): Built | null => {
    setShowErrors(true)
    if (Object.keys(errors).length > 0) return null

    const common = {
      label: draft.label.trim(),
      categoryId: draft.categoryId,
      ...(draft.memberId === '' ? {} : { memberId: draft.memberId }),
      /* Le lien vers le support voyage par identifiant, sur l'échéance comme
         sur la règle : une `Entry` générée ne cherche jamais son support par
         libellé ni par catégorie. Il ne se pose que sur un mouvement
         d'épargne — ailleurs, il n'aurait rien à désigner. */
      ...(draft.nature === 'saving' && draft.savingSupportId !== ''
        ? { savingSupportId: draft.savingSupportId }
        : {}),
      direction: draft.direction,
      ...(draft.shared === undefined ? {} : { shared: draft.shared }),
      ...(draft.note.trim() === '' ? {} : { note: draft.note.trim() }),
    }

    if (!draft.recurring) {
      if (amount === null) return null
      return {
        kind: 'entry',
        nature: draft.nature,
        payload: {
          ...common,
          amount,
          date: draft.startedOn,
          /* Reprendre une échéance prévue pour en corriger le montant ne la
             confirme pas : modifier n'est pas confirmer, et la confirmation a
             son geste. */
          status: operation?.kind === 'entry' ? operation.entry.status : 'confirmed',
        },
      }
    }

    const existing = operation?.kind === 'recurrence' ? operation.recurrence : null
    return {
      kind: 'recurrence',
      nature: draft.nature,
      payload: {
        ...common,
        amount: draft.variable ? null : amount,
        ...(draft.variable && amount !== null ? { estimate: amount } : {}),
        period: periodOf(draft),
        startedOn: draft.startedOn,
        ...(existing?.endedOn === undefined ? {} : { endedOn: existing.endedOn }),
      },
      paidOn: firstDuePaid ? draft.startedOn : null,
    }
  }

  /* La mention « obligatoire » ne se découvre pas après un échec : le champ la
     porte dès que la règle s'applique, comme les autres champs obligatoires. */
  return {
    draft,
    patch,
    errors: showErrors ? errors : {},
    needsMember: errors.member !== undefined,
    optionalAmount,
    /** La saisie demande un support plutôt qu'une catégorie et un membre. */
    supportMode,
    firstDuePaid,
    build,
  }
}
