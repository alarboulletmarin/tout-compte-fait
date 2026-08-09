/* ============================================================================
 * Le brouillon d'un support d'épargne — une seule fois, pour quatre portes.
 *
 * Un support se crée depuis la page Épargne, depuis l'onboarding et depuis la
 * saisie d'un versement quand il n'en existe encore aucun. Trois formulaires
 * auraient fini par ne plus poser les mêmes questions ni les mêmes règles —
 * c'est exactement ce qui était arrivé à la saisie d'une entrée et à celle
 * d'une récurrence avant qu'elles ne fusionnent.
 *
 * L'état et la validation vivent donc ici ; les champs dans `SupportFields` ;
 * l'écriture dans `domain/updates.createSavingSupport`.
 * ==========================================================================*/

import { useMemo, useState } from 'react'
import { type ISODate, type YearMonth, startOfMonth, today } from '@/domain/date'
import { type Money, parseAmount, toAmountInput } from '@/domain/money'
import type { RateKind } from '@/domain/projection'
import { MAX_RATE_PERCENT, parseRateBp } from '@/domain/rate'
import { DEFAULT_PACE, paceOf } from '@/domain/saving'
import type { Recurrence, SavingPace, SavingSupport, SavingValuation } from '@/domain/types'
import type { SavingSupportInput } from '@/domain/updates'
import { t } from '@/i18n/strings'
import { tpl } from '@/i18n/format'

export type SupportDraft = {
  label: string
  memberId: string
  categoryId: string
  /**
   * À quel rythme le relever. Toujours renseignée — le formulaire propose deux
   * réponses et en présélectionne une —, parce que c'est une question à laquelle
   * on peut répondre sans rien consulter : « est-ce que ce compte bouge tout
   * seul ? ». Ce qu'on ne sait pas, en revanche, c'est ce qu'il vaut aujourd'hui,
   * et c'est ce champ-là qui reste facultatif.
   */
  pace: SavingPace
  /**
   * L'hypothèse de rendement, telle qu'on la tape — « 3 », « 1,5 », ou rien.
   *
   * Vide veut dire « je n'en pose pas », jamais « zéro » : un support sans
   * hypothèse retombe sur celle de l'écran des projections, et écrire 0 % à sa
   * place figerait une réponse que personne n'a donnée. C'est la même règle que
   * le montant : vide n'est pas nul.
   */
  rateText: string
  rateKind: RateKind
  note: string
  /** Facultatif : vide veut dire « je ne connais pas », jamais « zéro ». */
  amountText: string
  valueDate: ISODate
}

export type SupportErrors = Partial<
  Record<'label' | 'member' | 'category' | 'amount' | 'rate', string>
>

export type SupportDefaults = {
  memberId?: string
  categoryId?: string
}

export function emptySupportDraft(defaults: SupportDefaults = {}): SupportDraft {
  return {
    label: '',
    memberId: defaults.memberId ?? '',
    categoryId: defaults.categoryId ?? '',
    pace: DEFAULT_PACE,
    /* Aucun taux par défaut, et surtout pas 3 % : préremplir reviendrait à
       annoncer le rendement d'un produit que l'app ne connaît pas (cahier
       §4.6 ter). Le simulateur, lui, a le droit d'avoir un défaut — il ne
       désigne aucun compte. */
    rateText: '',
    rateKind: 'assumed',
    note: '',
    amountText: '',
    valueDate: today(),
  }
}

/**
 * Le brouillon d'un support qui existe déjà.
 *
 * **Ni la valeur ni le taux n'y sont repris**, et pour la même raison : les
 * deux s'empilent, datés, alors que ce formulaire écrase ce qu'il touche. Les
 * reprendre ici ferait d'une correction de libellé une réécriture du capital et
 * du passé du taux. Les deux champs n'apparaissent donc qu'à la création — voir
 * `SupportFields` —, et se modifient ensuite depuis la fiche, où chaque ligne
 * porte sa date.
 */
export function supportDraftFrom(support: SavingSupport): SupportDraft {
  return {
    label: support.label,
    memberId: support.memberId,
    categoryId: support.categoryId,
    /* Un support d'avant le champ n'en porte aucune : c'est la lecture du
       domaine qui décide, et jamais une seconde valeur par défaut posée ici. */
    pace: paceOf(support),
    rateText: '',
    rateKind: 'assumed',
    note: support.note ?? '',
    amountText: '',
    valueDate: today(),
  }
}

export type SupportDraftState = {
  draft: SupportDraft
  patch: (next: Partial<SupportDraft>) => void
  /** Les erreurs à afficher — vides tant qu'on n'a pas essayé d'enregistrer. */
  errors: SupportErrors
  /** Le payload prêt pour le domaine, ou `null` si quelque chose manque. */
  build: () => SavingSupportInput | null
}

export function useSupportDraft(initial: SupportDraft): SupportDraftState {
  const [draft, setDraft] = useState<SupportDraft>(initial)
  const [showErrors, setShowErrors] = useState(false)

  const amount: Money | null = useMemo(() => parseAmount(draft.amountText), [draft.amountText])
  const typedAmount = draft.amountText.trim() !== ''
  const rateBp: number | null = useMemo(() => parseRateBp(draft.rateText), [draft.rateText])
  const typedRate = draft.rateText.trim() !== ''

  const errors: SupportErrors = useMemo(() => {
    const found: SupportErrors = {}
    if (draft.label.trim() === '') found.label = t.savings.supportLabelRequired
    if (draft.memberId === '') found.member = t.savings.supportOwnerRequired
    if (draft.categoryId === '') found.category = t.savings.supportKindRequired
    /* Facultatif, mais pas au point d'être avalé en silence : un montant saisi
       puis ignoré à l'enregistrement se découvre des semaines plus tard, quand
       le total d'épargne ne compte toujours pas le support. Zéro passe — un
       livret vidé est une information réelle ; un négatif, non. */
    if (typedAmount && (amount === null || amount < 0)) found.amount = t.savings.valueRequired
    /* Même règle que le montant : un taux tapé puis avalé en silence se
       découvre des mois plus tard, devant une projection qui ne l'a jamais
       pris. Vide passe — c'est l'absence d'hypothèse, et elle est légitime. */
    if (typedRate && rateBp === null) found.rate = tpl(t.savings.rateInvalid, MAX_RATE_PERCENT)
    return found
  }, [draft.label, draft.memberId, draft.categoryId, typedAmount, amount, typedRate, rateBp])

  return {
    draft,
    patch: (next) => {
      setDraft((current) => ({ ...current, ...next }))
    },
    errors: showErrors ? errors : {},
    build: () => {
      setShowErrors(true)
      if (Object.keys(errors).length > 0) return null
      return {
        label: draft.label.trim(),
        memberId: draft.memberId,
        categoryId: draft.categoryId,
        pace: draft.pace,
        ...(draft.note.trim() === '' ? {} : { note: draft.note.trim() }),
        ...(typedAmount && amount !== null
          ? { value: { amount, date: draft.valueDate } }
          : {}),
        /* Le premier palier part **du jour du relevé** quand il y en a un, et
           du jour même sinon : un support ouvert avec « 12 400 € au 31
           décembre » sert son taux depuis ce 31 décembre, et le dater
           d'aujourd'hui laisserait les mois d'intervalle sans taux. La nature
           ne part jamais seule : sans taux, « garanti » ne qualifie rien. */
        ...(typedRate && rateBp !== null
          ? {
              rate: {
                rateBp,
                kind: draft.rateKind,
                from: typedAmount && amount !== null ? draft.valueDate : today(),
              },
            }
          : {}),
      }
    },
  }
}

/* --- La feuille de création, posée par les écrans de saisie ---------------*/

/**
 * L'état d'ouverture de `SupportCreateSheet`, pour les écrans qui la posent.
 *
 * Ici plutôt qu'à côté du composant : un module qui exporte à la fois des
 * composants et des fonctions casse le rafraîchissement à chaud, et l'état
 * d'une saisie de support a de toute façon sa place avec le reste de sa
 * mécanique.
 */
export function useSupportCreateSheet(onCreated: (supportId: string) => void) {
  const [open, setOpen] = useState(false)

  return {
    open: () => {
      setOpen(true)
    },
    props: {
      open,
      onClose: () => {
        setOpen(false)
      },
      onCreated: (supportId: string) => {
        setOpen(false)
        onCreated(supportId)
      },
    },
  }
}

/* --- Le versement régulier qui alimente un support ------------------------*/

/**
 * La récurrence qu'un « je verse tant chaque mois » décrit, reliée au support
 * **par identifiant**.
 *
 * C'est ce qui empêche le doublon que cette V2 existe pour éviter : le montant
 * du versement vit dans la récurrence — donc dans les `Entry` qu'elle produira —
 * et nulle part sur le support. Le support porte le capital, la règle porte le
 * flux, et rien ne recopie l'autre.
 *
 * Mensuelle et ancrée au 1er, comme les lignes de l'étape précédente : le jour
 * ne se demande pas, il se corrige depuis la fiche (cahier §4.1).
 *
 * `null` si le montant est vide, illisible ou nul — l'étape est facultative, et
 * un champ vide ne pose rien.
 */
export function supportContribution(
  support: Pick<SavingSupport, 'id' | 'label' | 'memberId' | 'categoryId'>,
  amountText: string,
  ym: YearMonth,
): Omit<Recurrence, 'id'> | null {
  const amount = parseAmount(amountText)
  if (amount === null || amount <= 0) return null
  return {
    label: tpl(t.savings.contributionLabel, support.label),
    categoryId: support.categoryId,
    memberId: support.memberId,
    savingSupportId: support.id,
    // Un versement sort du compte, comme toute épargne : c'est la nature, pas
    // le sens, qui le distingue d'une charge.
    direction: 'out',
    amount,
    period: { unit: 'month', every: 1, anchorDay: 1 },
    startedOn: startOfMonth(ym),
  }
}

/* --- Valorisations --------------------------------------------------------*/

export type ValuationDraft = { amountText: string; date: ISODate }

export function valuationDraftFrom(valuation: SavingValuation | null): ValuationDraft {
  return valuation === null
    ? { amountText: '', date: today() }
    : { amountText: toAmountInput(valuation.amount), date: valuation.date }
}

/**
 * Un relevé se valide plus strictement qu'à la création d'un support : là-bas
 * le champ vide veut dire « je ne sais pas », ici il n'y a rien d'autre à
 * saisir — un relevé sans montant ne relève rien.
 */
export function valuationError(draft: ValuationDraft): string | undefined {
  const amount = parseAmount(draft.amountText)
  if (draft.amountText.trim() === '' || amount === null || amount < 0) {
    return t.savings.valueRequired
  }
  return undefined
}
