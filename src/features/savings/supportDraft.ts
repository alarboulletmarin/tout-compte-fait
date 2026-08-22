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
import { type ISODate, today } from '@/domain/date'
import { type Money, parseAmount, toAmountInput } from '@/domain/money'
import type { RateKind } from '@/domain/projection'
import { MAX_RATE_PERCENT, parseRateBp } from '@/domain/rate'
import { DEFAULT_PACE, paceOf } from '@/domain/saving'
import type {
  SavingPace,
  SavingRate,
  SavingRole,
  SavingSupport,
  SavingValuation,
} from '@/domain/types'
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
   * À quoi ce compte sert. La chaîne vide est une réponse à part entière :
   * « je n'ai pas répondu ».
   *
   * Contrairement à la cadence, **rien n'est présélectionné** — et c'est la
   * différence de fond entre les deux champs. La cadence a une bonne réponse par
   * défaut, qui ne fausse rien si on la laisse ; le rôle décide, lui, de ce que
   * l'autonomie divise, et le présélectionner ferait entrer un compte dans une
   * réserve de précaution sans que personne l'ait dit. Vide reste vide dans le
   * document (voir `SavingRole`).
   */
  role: SavingRole | ''
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
  /**
   * Le plafond de versements du contrat, tel qu'on le tape — « 22950 », ou rien.
   *
   * Vide veut dire « je n'en pose pas », jamais « zéro » : un plafond de zéro
   * dirait qu'on ne peut plus rien verser, ce qui est un compte fermé et non un
   * compte plafonné — et c'est l'archivage qui le dit.
   *
   * Contrairement au taux et au relevé, **il se modifie ici**. Un plafond ne
   * s'empile pas : il ne réécrit aucun passé, il ne borne que ce qui reste à
   * verser. Le corriger n'a donc pas de conséquence rétroactive à protéger.
   */
  capText: string
  note: string
  /** Facultatif : vide veut dire « je ne connais pas », jamais « zéro ». */
  amountText: string
  valueDate: ISODate
}

export type SupportErrors = Partial<
  Record<'label' | 'member' | 'category' | 'amount' | 'rate' | 'cap', string>
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
    /* Aucun rôle par défaut, pour la raison exacte qui interdit un taux par
       défaut : ce serait répondre à la place de quelqu'un, sur le champ dont
       dépend un chiffre affiché. */
    role: '',
    /* Aucun taux par défaut, et surtout pas 3 % : préremplir reviendrait à
       annoncer le rendement d'un produit que l'app ne connaît pas (cahier
       §4.6 ter). Le simulateur, lui, a le droit d'avoir un défaut — il ne
       désigne aucun compte. */
    rateText: '',
    rateKind: 'assumed',
    capText: '',
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
    /* Un support d'avant le champ n'en porte aucun non plus — et ici rien ne
       décide à la lecture : l'absence se relit vide, et se réenregistre vide
       tant que personne n'a répondu. */
    role: support.role ?? '',
    rateText: '',
    rateKind: 'assumed',
    /* Le plafond, lui, se relit : il n'a pas de passé à protéger, et le taire
       ferait disparaître un plafond posé à la première correction de libellé. */
    capText: support.depositCap === undefined ? '' : toAmountInput(support.depositCap),
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
  const cap: Money | null = useMemo(() => parseAmount(draft.capText), [draft.capText])
  const typedCap = draft.capText.trim() !== ''

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
    /* Un plafond doit être **strictement positif** : zéro dirait qu'on ne peut
       plus rien verser, ce qui est un compte fermé — et c'est l'archivage qui le
       dit. Le refuser ici plutôt que de l'enregistrer évite un support qui
       n'accepterait plus aucun versement sans que rien ne l'explique. */
    if (typedCap && (cap === null || cap <= 0)) found.cap = t.savings.capInvalid
    return found
  }, [
    draft.label,
    draft.memberId,
    draft.categoryId,
    typedAmount,
    amount,
    typedRate,
    rateBp,
    typedCap,
    cap,
  ])

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
        ...(draft.role === '' ? {} : { role: draft.role }),
        ...(typedCap && cap !== null && cap > 0 ? { depositCap: cap } : {}),
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

/* --- Le palier de taux ----------------------------------------------------*/

export type RateDraft = { rateText: string; kind: RateKind; from: ISODate }

export function rateDraftFrom(rate: SavingRate | null): RateDraft {
  return rate === null
    ? { rateText: '', kind: 'assumed', from: today() }
    : {
        /* `toRateInput` n'irait pas : il rend la chaîne vide pour zéro, ce qui
           convient à un crédit sans intérêts mais pas ici — 0 % est un palier
           qu'on peut poser (un compte courant), et le relire vide effacerait la
           réponse à la première correction. */
        rateText: String(rate.rateBp / 100).replace('.', ','),
        kind: rate.kind,
        from: rate.from,
      }
}

/**
 * Un palier se valide plus strictement que le champ de création d'un support :
 * là-bas, vide veut dire « je ne pose aucune hypothèse » ; ici il n'y a rien
 * d'autre à saisir — un palier sans taux ne dit rien.
 *
 * Zéro passe : c'est une réponse, et c'est la seule façon de dire « ce capital
 * ne bouge pas ».
 */
export function rateError(draft: RateDraft): string | undefined {
  const rateBp = parseRateBp(draft.rateText)
  if (draft.rateText.trim() === '' || rateBp === null) {
    return tpl(t.savings.rateInvalid, MAX_RATE_PERCENT)
  }
  return undefined
}
