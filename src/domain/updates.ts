/* ============================================================================
 * Mutations du document — fonctions pures `Data → Data`.
 *
 * Le store ne fait que les appliquer : c'est ici, et nulle part dans un
 * composant, que vivent les règles (une récurrence supprimée laisse derrière
 * elle ses échéances confirmées ; un membre retiré libère ses entrées).
 * ==========================================================================*/

import { monthlyInstalment } from './advance'
import { type ISODate, type YearMonth, diffDays, endOfMonth, parseISO, startOfMonth, today, ymOf } from './date'
import { type Money, ZERO } from './money'
import { buildPlannedEntry, planMonth } from './month'
import type { RateKind } from './projection'
import type {
  Advance,
  Category,
  Data,
  Debt,
  Entry,
  Family,
  Member,
  Recurrence,
  SavingGoal,
  SavingPace,
  SavingRole,
  SavingRate,
  SavingSupport,
  SavingValuation,
  Settings,
} from './types'

/* --- Foyer et membres -----------------------------------------------------*/

export function setHouseholdName(data: Data, name: string): Data {
  return { ...data, household: { ...data.household, name } }
}

export function addMember(data: Data, member: Member): Data {
  return { ...data, household: { ...data.household, members: [...data.household.members, member] } }
}

export function renameMember(data: Data, id: string, name: string): Data {
  return {
    ...data,
    household: {
      ...data.household,
      members: data.household.members.map((m) => (m.id === id ? { ...m, name } : m)),
    },
  }
}

/**
 * Retirer un membre libère ses entrées et récurrences plutôt que de les perdre.
 *
 * Ses **avances** et ses **supports d'épargne**, eux, partent avec lui, et
 * c'est la seule exception : leur `memberId` n'est pas facultatif — une épargne
 * est toujours à quelqu'un, et un livret que personne ne porte n'est le livret
 * de personne. Faute de pouvoir les détacher, on les retirait de fait sans le
 * faire : ils gardaient l'identifiant d'un membre disparu, et l'écran d'épargne
 * cherchait un porteur qu'il ne trouvait plus.
 *
 * Les **valorisations** partent avec leurs supports : elles décrivent un compte
 * qui n'existe plus, et rien ne pourrait plus les rattacher. Les **objectifs**
 * partent avec leur porteur, pour la raison qui emporte déjà ses avances et ses
 * supports : un cap que personne ne vise n'est le cap de personne.
 *
 * L'**historique financier ne bouge pas**. Les `Entry` restent, à leur montant
 * et à leur date : elles perdent seulement leur lien vers le support disparu,
 * exactement comme `removeRecurrence` détache les échéances de leur règle. Les
 * récurrences aussi, qui redeviennent des versements sans destination plutôt
 * que de pointer vers un compte fantôme. La confirmation annonce ce qui part —
 * et le retour arrière repose le document entier, si l'on s'est trompé.
 */
export function removeMember(data: Data, id: string): Data {
  const strip = <T extends { memberId?: string }>(item: T): T => {
    if (item.memberId !== id) return item
    const { memberId: _dropped, ...rest } = item
    return rest as T
  }
  const lost = new Set(
    data.savingSupports.filter((s) => s.memberId === id).map((support) => support.id),
  )
  const unlinkSupport = <T extends { savingSupportId?: string }>(item: T): T => {
    if (item.savingSupportId === undefined || !lost.has(item.savingSupportId)) return item
    const { savingSupportId: _dropped, ...rest } = item
    return rest as T
  }

  return {
    ...data,
    household: { ...data.household, members: data.household.members.filter((m) => m.id !== id) },
    recurrences: data.recurrences.map(strip).map(unlinkSupport),
    entries: data.entries.map(strip).map(unlinkSupport),
    advances: data.advances.filter((a) => a.memberId !== id),
    savingSupports: data.savingSupports.filter((s) => s.memberId !== id),
    savingValuations: data.savingValuations.filter((v) => !lost.has(v.supportId)),
    savingGoals: data.savingGoals
      .filter((goal) => goal.memberId !== id)
      .map((goal) => ({
        ...goal,
        supportIds: goal.supportIds.filter((one) => !lost.has(one)),
      })),
  }
}

/* --- Catégories -----------------------------------------------------------*/

export function addCategory(data: Data, category: Category): Data {
  return { ...data, categories: [...data.categories, category] }
}

export function updateCategory(data: Data, id: string, patch: Partial<Category>): Data {
  return {
    ...data,
    categories: data.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  }
}

/** Une catégorie n'est jamais effacée : elle est archivée, les entrées restent. */
export function archiveCategory(data: Data, id: string, archived = true): Data {
  return updateCategory(data, id, { archived })
}

/* --- Familles -------------------------------------------------------------*/

export function addFamily(data: Data, family: Family): Data {
  return { ...data, families: [...data.families, family] }
}

export function renameFamily(data: Data, id: string, label: string): Data {
  return {
    ...data,
    families: data.families.map((f) => (f.id === id ? { ...f, label } : f)),
  }
}

/* --- Crédits --------------------------------------------------------------*/

export function addDebt(data: Data, debt: Debt): Data {
  return { ...data, debts: [...data.debts, debt] }
}

export function updateDebt(data: Data, id: string, patch: Partial<Debt>): Data {
  return { ...data, debts: data.debts.map((d) => (d.id === id ? { ...d, ...patch } : d)) }
}

/**
 * Réécrit un crédit de bout en bout — même raison que `replaceRecurrence` :
 * sans cela, détacher la mensualité, remettre le taux à zéro ou vider la note
 * n'a aucun effet.
 */
export function replaceDebt(data: Data, id: string, next: Omit<Debt, 'id'>): Data {
  return { ...data, debts: data.debts.map((d) => (d.id === id ? { ...next, id } : d)) }
}

/**
 * Supprime le crédit, jamais sa récurrence ni ses échéances : les mensualités
 * déjà versées ont eu lieu. Cesser de suivre un capital ne réécrit pas ce qui
 * est sorti du compte.
 */
export function removeDebt(data: Data, id: string): Data {
  return { ...data, debts: data.debts.filter((d) => d.id !== id) }
}

/* --- Supports d'épargne ---------------------------------------------------*/

export function addSavingSupport(data: Data, support: SavingSupport): Data {
  return { ...data, savingSupports: [...data.savingSupports, support] }
}

/**
 * Ce qu'un écran a à dire pour poser un support. Le reste s'en déduit.
 *
 * `value` est facultatif, et son absence a un sens : le capital est **inconnu**,
 * ce qui n'est pas zéro. Renseigné, il ne s'écrit pas sur le support mais pose
 * sa première valorisation — un seul endroit pour un seul chiffre.
 */
export type SavingSupportInput = {
  label: string
  memberId: string
  categoryId: string
  /** À quel rythme un relevé est attendu. Voir `SavingPace`. */
  pace: SavingPace
  /**
   * Ce à quoi le compte sert. Voir `SavingRole`.
   *
   * Facultatif jusqu'ici — contrairement à `pace`, qui a une réponse par défaut.
   * Un rôle qu'on ne pose pas reste absent du document, et le compte ne pèse
   * alors dans aucune autonomie : c'est la seule lecture prudente, et l'écran a
   * de quoi poser la question quand elle change quelque chose.
   */
  role?: SavingRole
  /**
   * Le plafond de versements du contrat. Voir `SavingSupport.depositCap` — il
   * se pose **sur le support** et non à côté, parce qu'il ne réécrit rien.
   */
  depositCap?: Money
  note?: string
  /** Le capital du jour, s'il est connu, et la date à laquelle il l'est. */
  value?: { amount: Money; date: ISODate }
  /**
   * Le premier palier de taux, s'il est connu — posé exactement comme la
   * première valorisation, et pour la même raison : ni le capital ni le taux ne
   * s'écrivent sur le support, tous deux sont des faits datés qui s'empilent.
   * Absent tant que personne n'a posé d'hypothèse : voir `SavingRate`.
   */
  rate?: { rateBp: number; kind: RateKind; from: ISODate }
}

/**
 * Pose un support, et sa première valorisation si un montant est connu.
 *
 * La composition vit ici, dans le domaine, et non dans l'écran qui l'appelle :
 * quatre portes créent des supports — la page Épargne, l'onboarding, la saisie
 * d'un versement, le jeu d'exemple — et quatre copies de ce geste finiraient
 * par ne plus se répondre. C'est exactement l'argument qui a déjà fait
 * descendre `createAdvance` ici.
 *
 * Le montant n'est **jamais recopié sur le support** : il n'existe que comme
 * valorisation. Un `currentAmount` mutable à côté serait une seconde vérité, et
 * la première mise à jour les ferait diverger — en plus de perdre l'historique
 * dont la courbe et, plus tard, les projections ont besoin.
 */
export function createSavingSupport(
  data: Data,
  input: SavingSupportInput,
  makeId: () => string,
): {
  data: Data
  support: SavingSupport
  valuation: SavingValuation | null
  rate: SavingRate | null
} {
  const { value, rate: firstRate, note, ...rest } = input
  const support: SavingSupport = {
    ...rest,
    id: makeId(),
    archived: false,
    ...(note === undefined || note === '' ? {} : { note }),
  }
  const valuation: SavingValuation | null =
    value === undefined
      ? null
      : { id: makeId(), supportId: support.id, amount: value.amount, date: value.date }
  const rate: SavingRate | null =
    firstRate === undefined ? null : { id: makeId(), supportId: support.id, ...firstRate }

  let next = addSavingSupport(data, support)
  if (valuation !== null) next = addSavingValuation(next, valuation)
  if (rate !== null) next = addSavingRate(next, rate)
  return { data: next, support, valuation, rate }
}

/** Réécrit un support de bout en bout — même raison que `replaceRecurrence`. */
export function replaceSavingSupport(
  data: Data,
  id: string,
  next: Omit<SavingSupport, 'id'>,
): Data {
  return {
    ...data,
    savingSupports: data.savingSupports.map((s) => (s.id === id ? { ...next, id } : s)),
  }
}

/**
 * Archive un support : il sort des formulaires, il reste dans les lectures.
 *
 * C'est le geste par défaut dès qu'il a une histoire — un PEA clôturé ne doit
 * pas emporter ses relevés ni ses versements passés. La règle des catégories,
 * qui ne s'effacent jamais non plus.
 */
export function archiveSavingSupport(data: Data, id: string, archived = true): Data {
  return {
    ...data,
    savingSupports: data.savingSupports.map((s) => (s.id === id ? { ...s, archived } : s)),
  }
}

/**
 * Arrête les règles qui alimentent encore un support.
 *
 * Archiver un support qui reçoit 300 € chaque mois le ferait disparaître des
 * écrans pendant que la règle continue d'y poser des échéances : un compte
 * invisible qui grossit tout seul est exactement l'état incohérent qu'on
 * cherche à éviter. Le geste est proposé avec l'archivage, jamais imposé —
 * l'écran demande, la règle est ici.
 *
 * `stopRecurrence` retire au passage les échéances prévues d'après la date :
 * ce sont des projections, et une projection sur un compte fermé n'en est plus
 * une. Les confirmées restent, elles ont eu lieu.
 */
export function stopSupportRecurrences(data: Data, supportId: string, on: ISODate): Data {
  return data.recurrences
    .filter((r) => r.savingSupportId === supportId && (r.endedOn === undefined || r.endedOn > on))
    .reduce((acc, recurrence) => stopRecurrence(acc, recurrence.id, on), data)
}

/**
 * Supprime un support pour de bon, ses valorisations et ses taux avec lui.
 *
 * Réservé à ce qui n'a pas d'histoire — voir `isSupportEmpty` : un support créé
 * par erreur se retire, un support qui porte des mouvements s'archive. La
 * garde vit dans l'écran, qui sait ce qu'il propose ; la mutation, elle, coupe
 * proprement les liens qui pourraient rester plutôt que de laisser pointer vers
 * un identifiant mort — c'est le geste de `removeRecurrence`, au même endroit
 * et pour la même raison.
 */
export function removeSavingSupport(data: Data, id: string): Data {
  const unlink = <T extends { savingSupportId?: string }>(item: T): T => {
    if (item.savingSupportId !== id) return item
    const { savingSupportId: _dropped, ...rest } = item
    return rest as T
  }
  return {
    ...data,
    savingSupports: data.savingSupports.filter((s) => s.id !== id),
    savingValuations: data.savingValuations.filter((v) => v.supportId !== id),
    savingRates: data.savingRates.filter((r) => r.supportId !== id),
    entries: data.entries.map(unlink),
    recurrences: data.recurrences.map(unlink),
    advances: data.advances.map(unlink),
    /* L'objectif qui visait ce compte reste, amputé du lien : il vise toujours
       la même somme, et sa lecture repart sur les comptes qui restent. Le
       supprimer avec le compte ferait disparaître une intention parce qu'un de
       ses moyens a disparu — c'est la règle du lien coupé de `validate.ts`. */
    savingGoals: data.savingGoals.map((goal) =>
      goal.supportIds.includes(id)
        ? { ...goal, supportIds: goal.supportIds.filter((one) => one !== id) }
        : goal,
    ),
  }
}

/* --- Objectifs ------------------------------------------------------------*/

/**
 * Ce qu'un écran a à dire pour poser un objectif — et c'est peu.
 *
 * Trois champs tapés, tout le reste calculé : c'est ce qui rend l'objet
 * tenable, et c'est écrit une fois pour toutes sur `SavingGoal`. Ni taux, ni
 * capital, ni versement obligatoire — ils vivent déjà ailleurs, datés, et les
 * recopier ici ferait autant de secondes vérités.
 */
export type SavingGoalInput = {
  label: string
  memberId: string
  supportIds: string[]
  target: Money
  targetOn?: YearMonth
  monthly?: Money
}

/** Pose un objectif. Le jour d'aujourd'hui est son point de départ. */
export function createSavingGoal(
  data: Data,
  input: SavingGoalInput,
  makeId: () => string,
  on: ISODate = today(),
): { data: Data; goal: SavingGoal } {
  const goal: SavingGoal = { ...input, id: makeId(), startedOn: on, archived: false }
  return { data: { ...data, savingGoals: [...data.savingGoals, goal] }, goal }
}

/** Réécrit un objectif de bout en bout — même raison que `replaceRecurrence`. */
export function replaceSavingGoal(
  data: Data,
  id: string,
  next: Omit<SavingGoal, 'id'>,
): Data {
  return {
    ...data,
    savingGoals: data.savingGoals.map((goal) => (goal.id === id ? { ...next, id } : goal)),
  }
}

/**
 * Range un objectif sans l'effacer.
 *
 * Un cap abandonné ou remplacé garde son passé, comme un support clôturé : on
 * ne supprime pas ce qui a été visé, on cesse de le poursuivre. La suppression
 * existe quand même — un objectif créé par erreur il y a dix secondes n'a rien
 * derrière lui —, et c'est l'écran qui choisit, comme pour un support.
 */
export function archiveSavingGoal(data: Data, id: string, archived = true): Data {
  return {
    ...data,
    savingGoals: data.savingGoals.map((goal) => (goal.id === id ? { ...goal, archived } : goal)),
  }
}

export function removeSavingGoal(data: Data, id: string): Data {
  return { ...data, savingGoals: data.savingGoals.filter((goal) => goal.id !== id) }
}

/* --- Valorisations --------------------------------------------------------*/

/**
 * Ajoute un relevé de valeur. Il **s'empile**, il n'écrase rien.
 *
 * C'est toute la différence avec un champ mutable : les valeurs d'hier restent
 * lisibles, la courbe existe, et la future comparaison d'une projection au réel
 * aura de quoi se faire. Un relevé n'est pas un mouvement : il n'entre dans
 * aucun total du mois.
 */
export function addSavingValuation(data: Data, valuation: SavingValuation): Data {
  return { ...data, savingValuations: [...data.savingValuations, valuation] }
}

/**
 * Plusieurs relevés d'un coup — ce que fait un relevé de banque.
 *
 * On ne relève pas ses comptes un par un : les chiffres arrivent ensemble, en
 * fin de mois ou de trimestre, et les poser un à un demandait d'ouvrir chaque
 * fiche. En une seule mutation parce que c'est un seul geste : un seul rendu,
 * une seule écriture, un seul retour arrière — quatre relevés qu'on annulerait
 * en quatre fois ne seraient pas le geste qu'on vient de faire.
 */
export function addSavingValuations(
  data: Data,
  valuations: readonly SavingValuation[],
): Data {
  return { ...data, savingValuations: [...data.savingValuations, ...valuations] }
}

/**
 * Corrige un relevé, sans toucher aux autres.
 *
 * Un chiffre mal saisi se rattrape — sinon il reste faux pour toujours dans
 * l'historique. Corriger celui d'aujourd'hui ne réécrit jamais celui du mois
 * dernier : c'est une ligne, pas une série.
 */
export function replaceSavingValuation(
  data: Data,
  id: string,
  next: Omit<SavingValuation, 'id'>,
): Data {
  return {
    ...data,
    savingValuations: data.savingValuations.map((v) => (v.id === id ? { ...next, id } : v)),
  }
}

export function removeSavingValuation(data: Data, id: string): Data {
  return { ...data, savingValuations: data.savingValuations.filter((v) => v.id !== id) }
}

/* --- Taux -----------------------------------------------------------------*/

/**
 * Ajoute un palier de taux. Il **s'empile**, il n'écrase rien.
 *
 * Le pendant exact d'`addSavingValuation`, et pour la même raison : un taux
 * corrigé ne doit pas emporter celui qu'il remplace. « 3 % jusqu'en février,
 * 2,40 % ensuite » est la seule forme qui permette à l'évolution passée de
 * rester ce qu'elle était — un champ mutable la recalculerait entièrement au
 * dernier taux connu, c'est-à-dire à un taux qui n'y a jamais couru.
 */
export function addSavingRate(data: Data, rate: SavingRate): Data {
  return { ...data, savingRates: [...data.savingRates, rate] }
}

/**
 * Corrige un palier — sa date comme son taux.
 *
 * Corriger n'est pas changer de taux : on ne pose pas un palier de plus quand
 * on s'est trompé de chiffre en saisissant celui-ci. Les deux gestes existent
 * donc, et l'écran les nomme différemment.
 */
export function replaceSavingRate(data: Data, id: string, next: Omit<SavingRate, 'id'>): Data {
  return {
    ...data,
    savingRates: data.savingRates.map((rate) => (rate.id === id ? { ...next, id } : rate)),
  }
}

export function removeSavingRate(data: Data, id: string): Data {
  return { ...data, savingRates: data.savingRates.filter((rate) => rate.id !== id) }
}

/* --- Avances --------------------------------------------------------------*/

export function addAdvance(data: Data, advance: Advance): Data {
  return { ...data, advances: [...data.advances, advance] }
}

/** Réécrit une avance de bout en bout — même raison que `replaceDebt`. */
export function replaceAdvance(data: Data, id: string, next: Omit<Advance, 'id'>): Data {
  return { ...data, advances: data.advances.map((a) => (a.id === id ? { ...next, id } : a)) }
}

/**
 * Supprime l'avance, jamais sa récurrence ni ses échéances : ce qui est déjà
 * revenu sur le livret y est revenu. Cesser de suivre ce qu'on se doit ne
 * réécrit pas ce qui est sorti du compte.
 */
export function removeAdvance(data: Data, id: string): Data {
  return { ...data, advances: data.advances.filter((a) => a.id !== id) }
}

/** Ce qu'un écran a à dire pour poser une avance. Le reste s'en déduit. */
export type AdvanceInput = Omit<Advance, 'id' | 'recurrenceId' | 'savingSupportId'> & {
  /** Le support d'épargne repris, puis reconstitué. Désigné par identifiant. */
  savingSupportId: string
  /** La charge avancée entre-t-elle dans le pot commun du foyer ? */
  shared?: boolean
}

/**
 * Traduit une avance en ce qu'elle est vraiment : une reprise sur le livret, et
 * la récurrence qui l'y remet mois après mois.
 *
 * Les trois écritures tiennent dans une seule mutation — donc un seul rendu,
 * une seule sauvegarde — et surtout la reprise ne peut pas rester seule si la
 * récurrence échouait : une épargne qu'on a prise sans jamais la rendre est
 * exactement le trou que cet écran existe pour éviter.
 *
 * La reprise part **confirmée** : elle a eu lieu, c'est même tout le propos —
 * l'argent est déjà sorti du livret. Elle entre en sens `in` parce que c'est ce
 * qu'elle est du point de vue du foyer, de l'argent qui revient de l'épargne
 * vers ce qu'on peut dépenser. La dépense qu'elle a financée, elle, se saisit
 * comme n'importe quelle autre — l'app ne l'invente pas à la place de qui l'a
 * faite.
 *
 * La règle vit ici, dans le domaine, et non dans l'action qui l'appelait :
 * l'écran de saisie n'est plus le seul à poser des avances, et deux copies de
 * cette composition finiraient par ne plus se répondre.
 *
 * Et c'est bien pour ça que la période se contrôle ici : le formulaire le
 * faisait déjà, mais il n'est plus le seul appelant. Une période à l'envers
 * pose une récurrence qui se termine avant sa première mensualité — l'avance
 * ne se reconstitue alors jamais, et son reste dû ne bouge plus d'un centime
 * sans que rien à l'écran n'explique pourquoi. On lève plutôt qu'on corrige :
 * il n'existe aucune façon de deviner laquelle des deux bornes est la bonne.
 */
export function createAdvance(
  data: Data,
  input: AdvanceInput,
  makeId: () => string,
  on: ISODate = today(),
): { data: Data; advance: Advance } {
  const { savingSupportId, shared, ...rest } = input
  if (rest.to < rest.from) {
    throw new RangeError(
      `Une avance ne peut pas se terminer avant de commencer : ${rest.from} → ${rest.to}`,
    )
  }
  /* La catégorie de la reprise et des mensualités se lit **sur le support** :
     c'est lui qui dit sous quel poste d'épargne le mouvement se range, et le
     redemander à l'écran donnerait deux réponses à tenir d'accord. Faute de
     support — un document sans membre n'en a aucun —, on ne compose rien : la
     saisie exige le support, c'est sa première question. */
  const support = data.savingSupports.find((one) => one.id === savingSupportId)
  if (support === undefined) {
    throw new RangeError(`Support d'épargne inconnu : ${savingSupportId}`)
  }
  const recurrence: Recurrence = {
    id: makeId(),
    label: rest.label,
    categoryId: support.categoryId,
    memberId: rest.memberId,
    savingSupportId,
    direction: 'out',
    amount: monthlyInstalment(rest),
    period: { unit: 'month', every: 1, anchorDay: parseISO(rest.paidOn).d },
    startedOn: startOfMonth(rest.from),
    endedOn: endOfMonth(rest.to),
    ...(shared === undefined ? {} : { shared }),
  }
  const advance: Advance = { ...rest, id: makeId(), recurrenceId: recurrence.id, savingSupportId }
  const drawdown: Entry = {
    id: makeId(),
    label: rest.label,
    categoryId: support.categoryId,
    memberId: rest.memberId,
    savingSupportId,
    direction: 'in',
    amount: rest.amount,
    date: rest.paidOn,
    status: 'confirmed',
  }

  return {
    data: addAdvance(
      addEntry(
        syncRecurrenceEntries(addRecurrence(data, recurrence), recurrence.id, makeId, on),
        drawdown,
      ),
      advance,
    ),
    advance,
  }
}

/* --- Récurrences ----------------------------------------------------------*/

export function addRecurrence(data: Data, recurrence: Recurrence): Data {
  return { ...data, recurrences: [...data.recurrences, recurrence] }
}

export function updateRecurrence(data: Data, id: string, patch: Partial<Recurrence>): Data {
  return {
    ...data,
    recurrences: data.recurrences.map((r) => (r.id === id ? { ...r, ...patch } : r)),
  }
}

/**
 * Réécrit une récurrence de bout en bout, son identifiant mis à part.
 *
 * Un formulaire n'envoie pas un correctif, il envoie l'état complet de ce qu'il
 * montre : ce qui n'y figure pas, l'utilisateur l'a vidé. Une fusion —
 * `{ ...r, ...patch }` — ne sait pas distinguer « inchangé » d'« effacé », et
 * garde donc en place le membre qu'on vient de remettre à « en commun » ou
 * la case « à partager » qu'on vient de rendre à la règle. L'écran annonce alors
 * une modification que le document n'a pas prise. La réécriture, elle, efface ce
 * qui a été effacé.
 */
export function replaceRecurrence(data: Data, id: string, next: Omit<Recurrence, 'id'>): Data {
  return {
    ...data,
    recurrences: data.recurrences.map((r) => (r.id === id ? { ...next, id } : r)),
  }
}

/**
 * Recolle une échéance sur la règle qui l'a posée : sous quel libellé et quelle
 * catégorie elle se lit, dans quel sens, à qui elle est, sur quel support elle
 * tombe et si elle se partage.
 *
 * Tout le reste lui appartient — son montant, sa date, son statut, sa note :
 * ce sont les seuls champs qu'une échéance peut porter contre sa règle, et les
 * réécrire effacerait une saisie.
 */
function requalify(entry: Entry, recurrence: Recurrence): Entry {
  const {
    memberId: _member,
    shared: _shared,
    savingSupportId: _support,
    ...rest
  } = entry
  return {
    ...rest,
    label: recurrence.label,
    categoryId: recurrence.categoryId,
    direction: recurrence.direction,
    ...(recurrence.memberId === undefined ? {} : { memberId: recurrence.memberId }),
    ...(recurrence.savingSupportId === undefined
      ? {}
      : { savingSupportId: recurrence.savingSupportId }),
    ...(recurrence.shared === undefined ? {} : { shared: recurrence.shared }),
  }
}

/**
 * Réaligne les échéances d'une récurrence sur sa définition courante, dans
 * tous les mois déjà ouverts à partir de `from`.
 *
 * Une récurrence est une règle, une échéance est un fait : c'est la règle qui
 * fabrique les faits, donc la changer doit refaire ceux qui n'ont pas encore
 * eu lieu. Les prévues à venir sont jetées puis régénérées — leur date, leur
 * montant ou leur libellé peuvent tous avoir bougé.
 *
 * Une échéance déjà confirmée mais **datée dans le futur** est requalifiée sans
 * être refaite : confirmer d'avance dit qu'elle aura lieu, pas qu'elle a eu
 * lieu, et la règle du cahier §3 — « une `Entry` confirmée s'en détache, elle a
 * eu lieu » — ne s'applique donc pas encore. Sans cela, un foyer qui valide son
 * mois à venir ne peut plus corriger la récurrence qui l'a produit : le membre
 * change sur la règle, et chaque graphique continue de lire l'ancien.
 *
 * Le passé, lui, ne bouge pas : ni ce qui est daté d'aujourd'hui ou d'avant, ni
 * le montant, la date ou le statut d'une confirmée — ceux-là ont pu être saisis
 * à la main, et les réécrire perdrait la saisie.
 *
 * **Le montant d'une prévue déjà datée survit à la régénération**, et c'est la
 * même règle vue d'un autre côté. Une prévue peut porter un montant saisi à la
 * main : `/depense/:id` conserve le statut de l'échéance qu'on y ouvre, donc
 * corriger le montant d'une prévue l'enregistre sans la confirmer. Le tour
 * jette-puis-refait ne pouvait pas le relire — l'entrée venait d'être retirée,
 * et `amountOn` n'avait plus rien à lire —, si bien que modifier la règle
 * remettait à l'écran le montant de la règle, silencieusement. Les prévues
 * **à venir**, elles, se refont entièrement : là, c'est bien la règle qui dit
 * ce qui va tomber.
 *
 * Rejouer l'opération ne duplique rien : `planMonth` reconnaît une échéance
 * déjà posée à sa paire récurrence + date.
 */
export function syncRecurrenceEntries(
  data: Data,
  recurrenceId: string,
  makeId: () => string,
  from: ISODate = today(),
): Data {
  const fromMonth = ymOf(from)
  const recurrence = data.recurrences.find((r) => r.id === recurrenceId)

  const dropped = data.entries.filter(
    (entry) =>
      entry.recurrenceId === recurrenceId &&
      entry.status === 'planned' &&
      ymOf(entry.date) >= fromMonth,
  )
  const kept = data.entries.filter((entry) => !dropped.includes(entry))

  /* Ce qu'on retient des prévues qu'on vient de jeter : leur montant, à leur
     date, tant qu'elles ne sont pas à venir. Un zéro ne compte pas — c'est
     l'emplacement vide que l'ouverture du mois pose sur un montant variable,
     pas un montant saisi (même lecture que `knownAmount`). */
  const savedAmounts = new Map<ISODate, Money>()
  for (const entry of dropped) {
    if (entry.date > from || entry.amount === ZERO) continue
    savedAmounts.set(entry.date, entry.amount)
  }

  let next: Data = {
    ...data,
    entries:
      recurrence === undefined
        ? kept
        : kept.map((entry) =>
            entry.recurrenceId === recurrenceId && entry.date > from
              ? requalify(entry, recurrence)
              : entry,
          ),
  }

  for (const state of data.months) {
    if (state.ym < fromMonth) continue
    // `planMonth` lit `next.entries`, qui s'enrichit à chaque tour : les mois
    // se plannifient en cascade sans se marcher dessus.
    next = {
      ...next,
      entries: [...next.entries, ...planMonth(next, state.ym, makeId, from).created],
    }
  }

  // Le montant rendu à l'échéance qui le portait, une fois refaite. Après la
  // régénération, parce qu'il n'y avait rien à qui le rendre avant elle.
  if (savedAmounts.size === 0) return next
  return {
    ...next,
    entries: next.entries.map((entry) =>
      entry.recurrenceId === recurrenceId && entry.status === 'planned'
        ? { ...entry, amount: savedAmounts.get(entry.date) ?? entry.amount }
        : entry,
    ),
  }
}

/**
 * Arrête une récurrence à une date donnée et retire les échéances seulement
 * prévues qui tombent après. Les confirmées restent : elles ont eu lieu.
 */
export function stopRecurrence(data: Data, id: string, on: ISODate): Data {
  return {
    ...data,
    recurrences: data.recurrences.map((r) => (r.id === id ? { ...r, endedOn: on } : r)),
    entries: data.entries.filter(
      (e) => !(e.recurrenceId === id && e.status === 'planned' && e.date > on),
    ),
  }
}

/** Relance une récurrence arrêtée en retirant sa date de fin. */
export function resumeRecurrence(data: Data, id: string): Data {
  return {
    ...data,
    recurrences: data.recurrences.map((r) => {
      if (r.id !== id) return r
      const { endedOn: _dropped, ...rest } = r
      return rest
    }),
  }
}

/**
 * Supprime une récurrence, et la supprime vraiment.
 *
 * Supprimer et arrêter sont deux gestes distincts (cahier §4.2), et rabattre le
 * premier sur le second dès qu'une échéance avait été confirmée rendait la
 * suppression inatteignable : la règle restait dans la liste, sous « Arrêtée »,
 * pendant que le message annonçait qu'elle était supprimée.
 *
 * L'historique ne se réécrit pas pour autant. Les échéances déjà confirmées ont
 * eu lieu : elles restent, simplement **détachées** de la règle qui les avait
 * posées. Les prévues, elles, partent avec — une échéance prévue n'est qu'une
 * projection de la règle, et sans règle elle ne projette plus rien.
 *
 * Un crédit ou une avance qui pointait sur elle voit son lien retiré, pas son
 * suivi supprimé : `useDebtStatuses` lirait sinon la mensualité d'une règle
 * disparue, donc `null`, sans que rien ne dise pourquoi.
 */
export function removeRecurrence(data: Data, id: string): Data {
  const detach = (entry: Entry): Entry => {
    if (entry.recurrenceId !== id) return entry
    const { recurrenceId: _dropped, ...rest } = entry
    return rest
  }
  const unlink = <T extends { recurrenceId?: string }>(item: T): T => {
    if (item.recurrenceId !== id) return item
    const { recurrenceId: _dropped, ...rest } = item
    return rest as T
  }
  return {
    ...data,
    recurrences: data.recurrences.filter((r) => r.id !== id),
    entries: data.entries
      .filter((e) => !(e.recurrenceId === id && e.status === 'planned'))
      .map(detach),
    debts: data.debts.map(unlink),
    advances: data.advances.map(unlink),
  }
}

/**
 * Traduit une entrée ponctuelle en récurrence : la même écriture, à qui l'on
 * découvre qu'elle se répète.
 *
 * L'entrée part avec sa date, devenue la première échéance de la règle — c'est
 * elle qui a eu lieu, ou qui est prévue, et rien n'invente une seconde fois ce
 * que l'utilisateur a déjà tapé. `syncRecurrenceEntries` pose ensuite les
 * échéances à venir, exactement comme à la création d'une récurrence neuve.
 *
 * Confirmée, elle laisse une échéance confirmée à sa place — la même
 * composition qu'`addRecurrencePaidOn`, sauf sur un point : le montant qui
 * part payé est celui, réel, de l'entrée qu'on remplace, jamais celui qu'une
 * règle à montant variable devinerait pour un jour qui n'a encore aucun fait
 * à lire (`buildPlannedEntry` ne connaît que l'ordre de grandeur).
 *
 * Un seul geste, une seule mutation : l'ancienne ligne ne peut pas disparaître
 * si la règle ne se posait pas.
 */
export function convertEntryToRecurrence(
  data: Data,
  entryId: string,
  recurrence: Recurrence,
  makeId: () => string,
): Data {
  const entry = data.entries.find((e) => e.id === entryId)
  if (entry === undefined) return data

  const withRecurrence = syncRecurrenceEntries(
    addRecurrence(removeEntry(data, entryId), recurrence),
    recurrence.id,
    makeId,
  )
  if (entry.status !== 'confirmed') return withRecurrence

  const confirmed = confirmOccurrence(withRecurrence, recurrence.id, recurrence.startedOn, makeId)
  const posed = confirmed.entries.find(
    (e) => e.recurrenceId === recurrence.id && e.date === recurrence.startedOn,
  )
  return posed === undefined || posed.amount === entry.amount
    ? confirmed
    : updateEntry(confirmed, posed.id, { amount: entry.amount })
}

/**
 * Vrai si `convertRecurrenceToEntry` va rendre une ligne **unique**.
 *
 * Une seule échéance confirmée compte comme une ligne unique : elle se
 * détache seule, à sa date et à son montant exacts, ni plus ni moins que si
 * elle était la seule chose que la règle ait jamais produite. Deux ou plus,
 * en revanche, n'en font pas une — choisir laquelle garder inventerait une
 * réponse — et un montant variable qui n'a encore rien confirmé n'a, lui,
 * rien à transporter dans une ligne unique.
 *
 * Exportée pour que l'écran qui propose le geste puisse annoncer ce qu'il va
 * faire avant qu'on l'actionne, sans jamais décider *comment* — c'est
 * `convertRecurrenceToEntry` seul qui choisit le chemin, sur le compte
 * d'échéances confirmées : au-delà de zéro, c'est toujours `removeRecurrence`,
 * jamais la ligne la plus proche du début de la règle, qui pourrait très bien
 * être une prévue plus ancienne qu'une confirmée tardive.
 */
export function convertsToSingleEntry(data: Data, id: string): boolean {
  const recurrence = data.recurrences.find((r) => r.id === id)
  if (recurrence === undefined) return false
  const confirmed = data.entries.filter((e) => e.recurrenceId === id && e.status === 'confirmed')
  if (confirmed.length > 1) return false
  return confirmed.length === 1 || recurrence.amount !== null
}

/**
 * Traduit une récurrence en ce qu'elle n'aurait jamais dû cesser d'être : une
 * ligne ponctuelle, à qui l'on découvre qu'elle ne se répète pas.
 *
 * Rien à recoller dès qu'au moins une échéance est **confirmée** : c'est un
 * fait, et le choisir parmi d'éventuels autres inventerait une réponse — la
 * règle s'arrête alors exactement comme `removeRecurrence` le fait déjà, ce
 * qui détache la confirmée seule si elle est unique. Même chemin sur un
 * montant **variable** qui n'en a encore confirmé aucune : rien à transporter.
 *
 * Sinon, il n'y a qu'un seul fait à sauver — la première échéance, déjà posée
 * par `syncRecurrenceEntries` si son mois est ouvert (la plus proche du début
 * de la règle, si plusieurs le sont — toutes prévues, ici, donc interchangeables
 *), ou fabriquée sinon. Les autres prévues n'en sont qu'un écho, et partent
 * avec la règle.
 */
export function convertRecurrenceToEntry(data: Data, id: string, makeId: () => string): Data {
  const recurrence = data.recurrences.find((r) => r.id === id)
  if (recurrence === undefined) return data

  const related = data.entries.filter((e) => e.recurrenceId === id)
  const hasConfirmed = related.some((e) => e.status === 'confirmed')
  if (hasConfirmed || recurrence.amount === null) return removeRecurrence(data, id)

  const unlink = <T extends { recurrenceId?: string }>(item: T): T => {
    if (item.recurrenceId !== id) return item
    const { recurrenceId: _dropped, ...rest } = item
    return rest as T
  }

  const earliest = related.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))[0]
  const kept = earliest ?? buildPlannedEntry(recurrence, recurrence.startedOn, data.entries, makeId)
  const { recurrenceId: _dropped, ...detached } = kept

  return {
    ...data,
    recurrences: data.recurrences.filter((r) => r.id !== id),
    entries: [...data.entries.filter((e) => e.recurrenceId !== id), detached],
    debts: data.debts.map(unlink),
    advances: data.advances.map(unlink),
  }
}

/* --- Entrées --------------------------------------------------------------*/

export function addEntry(data: Data, entry: Entry): Data {
  return { ...data, entries: [...data.entries, entry] }
}

export function updateEntry(data: Data, id: string, patch: Partial<Entry>): Data {
  return { ...data, entries: data.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) }
}

/**
 * Réécrit une entrée de bout en bout — même raison que `replaceRecurrence` :
 * un champ vidé dans le formulaire doit disparaître du document.
 *
 * Le lien vers la récurrence qui l'a posée survit à la réécriture : il ne se
 * saisit nulle part, et le perdre couperait l'échéance de sa récurrence, donc
 * l'historique de prix et l'amortissement d'un crédit avec elle.
 */
export function replaceEntry(
  data: Data,
  id: string,
  next: Omit<Entry, 'id' | 'recurrenceId'>,
): Data {
  return {
    ...data,
    entries: data.entries.map((e) =>
      e.id === id
        ? {
            ...next,
            id,
            ...(e.recurrenceId === undefined ? {} : { recurrenceId: e.recurrenceId }),
          }
        : e,
    ),
  }
}

/**
 * Reporte la correction d'une échéance sur la règle qui la pose.
 *
 * Le formulaire d'une échéance générée ne touchait jamais sa récurrence : on
 * corrigeait le loyer d'août, et septembre retombait sur l'ancien prix. Ici,
 * ce que la règle possède passe sur la règle — libellé, catégorie, sens,
 * membre, support, partage, et le montant si la règle en fixe un —, puis
 * `syncRecurrenceEntries` refait les échéances à venir, exactement comme une
 * reprise depuis la fiche de la règle. Une règle à montant variable garde son
 * `null` : chaque échéance y chiffre la sienne, et lui écrire un montant la
 * changerait de nature.
 *
 * Ce que l'échéance possède reste à l'échéance : sa date, son statut, sa note
 * et — sur une règle variable — son montant ne remontent pas. Sa période, sa
 * première échéance et sa date de fin non plus : le formulaire d'une échéance
 * ne les montre pas, et écrire ce qu'on n'a pas montré serait pire que de ne
 * rien écrire.
 *
 * L'échéance corrigée, elle, garde son identifiant quoi qu'il arrive : la
 * synchronisation jette et refait les prévues du mois courant et au-delà, et
 * l'écran `/depense/:id` resterait sinon ouvert sur une ligne disparue. La
 * régénérée la plus proche de sa date d'origine lui cède la place — une règle
 * hebdomadaire peut en poser plusieurs par mois, la plus proche est la seule
 * réponse déterministe — et s'il n'en repousse aucune (règle arrêtée, période
 * qui ne couvre plus le mois), la saisie est réinsérée telle quelle : un fait
 * qu'on vient d'écrire ne s'évapore pas.
 */
export function applyEntryEditToRule(
  data: Data,
  entryId: string,
  next: Omit<Entry, 'id' | 'recurrenceId'>,
  makeId: () => string,
  from: ISODate = today(),
): Data {
  const entry = data.entries.find((e) => e.id === entryId)
  const recurrence = data.recurrences.find((r) => r.id === entry?.recurrenceId)
  // Détachée depuis un autre onglet, ou jamais liée : il ne reste qu'elle à corriger.
  if (entry === undefined || recurrence === undefined) return replaceEntry(data, entryId, next)

  /* Les champs à présence facultative suivent la sémantique de réécriture de
     `replaceRecurrence` : vidé dans le formulaire, le champ disparaît de la
     règle — une fusion garderait le membre qu'on vient de rendre au commun. */
  const {
    memberId: _member,
    savingSupportId: _support,
    shared: _shared,
    ...kept
  } = recurrence
  const nextRule: Omit<Recurrence, 'id'> = {
    ...kept,
    label: next.label,
    categoryId: next.categoryId,
    direction: next.direction,
    amount: recurrence.amount === null ? null : next.amount,
    ...(next.memberId === undefined ? {} : { memberId: next.memberId }),
    ...(next.savingSupportId === undefined ? {} : { savingSupportId: next.savingSupportId }),
    ...(next.shared === undefined ? {} : { shared: next.shared }),
  }

  const synced = syncRecurrenceEntries(
    replaceRecurrence(data, recurrence.id, nextRule),
    recurrence.id,
    makeId,
    from,
  )

  // Confirmée, ou prévue dans un mois passé : la synchronisation l'a laissée.
  if (synced.entries.some((e) => e.id === entryId)) return replaceEntry(synced, entryId, next)

  const restored: Entry = { ...next, id: entryId, recurrenceId: recurrence.id }
  const twins = synced.entries.filter(
    (e) =>
      e.recurrenceId === recurrence.id &&
      e.status === 'planned' &&
      ymOf(e.date) === ymOf(entry.date),
  )
  const twin = twins.reduce<Entry | undefined>((best, candidate) => {
    if (best === undefined) return candidate
    const gap = Math.abs(diffDays(entry.date, candidate.date))
    const bestGap = Math.abs(diffDays(entry.date, best.date))
    return gap < bestGap || (gap === bestGap && candidate.date < best.date) ? candidate : best
  }, undefined)

  return {
    ...synced,
    entries:
      twin === undefined
        ? [...synced.entries, restored]
        : synced.entries.map((e) => (e.id === twin.id ? restored : e)),
  }
}

export function removeEntry(data: Data, id: string): Data {
  return { ...data, entries: data.entries.filter((e) => e.id !== id) }
}

export function confirmEntry(data: Data, id: string): Data {
  return updateEntry(data, id, { status: 'confirmed' })
}

/**
 * Marque comme payée l'échéance d'une récurrence à une date donnée.
 *
 * Sert à la saisie qui pose la récurrence et la dépense du jour d'un seul geste :
 * l'utilisateur a dit que celle-là a eu lieu, on ne la lui redemande pas.
 *
 * L'échéance existe presque toujours — `syncRecurrenceEntries` vient de la
 * poser. Presque : une date antérieure au mois courant tombe dans un mois qui
 * n'a jamais été ouvert, et n'a donc rien produit. Elle est alors créée, déjà
 * confirmée, plutôt que perdue — c'est une dépense qui a eu lieu, et ouvrir le
 * mois pour la retrouver inventerait toutes les autres au passage (cahier §4.3).
 */
export function confirmOccurrence(
  data: Data,
  recurrenceId: string,
  date: ISODate,
  makeId: () => string,
): Data {
  const existing = data.entries.find((e) => e.recurrenceId === recurrenceId && e.date === date)
  if (existing !== undefined) return confirmEntry(data, existing.id)

  const recurrence = data.recurrences.find((r) => r.id === recurrenceId)
  if (recurrence === undefined) return data

  const entry = buildPlannedEntry(recurrence, date, data.entries, makeId)
  return addEntry(data, { ...entry, status: 'confirmed' })
}

/** Confirmation en bloc — le geste du cahier §4.3. */
export function confirmEntries(data: Data, ids: readonly string[]): Data {
  const set = new Set(ids)
  return {
    ...data,
    entries: data.entries.map((e) => (set.has(e.id) ? { ...e, status: 'confirmed' } : e)),
  }
}

/**
 * Le geste inverse : des échéances confirmées redeviennent prévues.
 *
 * Confirmer n'a jamais eu à être un aller simple. Une case cochée d'un doigt de
 * trop laissait l'écran sans aucun retour, et il fallait supprimer la ligne
 * pour la retrouver — ce qui n'est pas la même chose, et perd son montant.
 *
 * Seules les échéances de récurrence font demi-tour : une saisie ponctuelle est
 * un fait, pas une prévision en attente. Le montant, lui, ne bouge pas — c'est
 * peut-être celui d'une échéance variable, saisi à la main, et le rendre à la
 * règle perdrait la saisie ; reconfirmer le retrouve tel quel.
 *
 * À savoir : redevenue prévue, une échéance repasse sous la coupe de
 * `syncRecurrenceEntries`, qui jette et refait les prévues dès qu'on touche à
 * la règle. Le montant d'une prévue **déjà datée** y survit désormais — c'est
 * la même raison qui le protège ici et là, il a pu être saisi à la main. Celui
 * d'une prévue **à venir**, non : là, c'est bien la règle qui dit ce qui va
 * tomber, et une échéance qu'on déconfirme pour le mois prochain se remet à en
 * dépendre.
 */
export function unconfirmEntries(data: Data, ids: readonly string[]): Data {
  const set = new Set(ids)
  return {
    ...data,
    entries: data.entries.map((e) =>
      set.has(e.id) && e.recurrenceId !== undefined ? { ...e, status: 'planned' } : e,
    ),
  }
}

/* --- Mois -----------------------------------------------------------------*/

export type OpenMonthResult = { data: Data; created: number; variable: number }

/**
 * Ouvre un mois : génère les échéances manquantes et enregistre l'ouverture.
 * Rejouable — rien n'est dupliqué (cahier §4.3).
 */
export function openMonth(
  data: Data,
  ym: YearMonth,
  makeId: () => string,
  on: ISODate = today(),
): OpenMonthResult {
  const plan = planMonth(data, ym, makeId, on)
  const months = data.months.some((m) => m.ym === ym)
    ? data.months
    : [...data.months, { ym, openedAt: on, closed: false }]

  return {
    data: { ...data, entries: [...data.entries, ...plan.created], months },
    created: plan.created.length,
    variable: plan.variable.length,
  }
}

/* --- Réglages -------------------------------------------------------------*/

export function updateSettings(data: Data, patch: Partial<Settings>): Data {
  return { ...data, settings: { ...data.settings, ...patch } }
}
