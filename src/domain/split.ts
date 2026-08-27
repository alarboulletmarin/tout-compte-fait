/* ============================================================================
 * Répartition des charges communes entre les membres, au prorata des revenus.
 *
 * Deux personnes qui gagnent 2 500 € et 2 000 € ne peuvent pas payer le loyer
 * à parts égales sans que l'effort soit deux fois plus lourd pour l'une des
 * deux. Le prorata règle ça d'une seule règle : chacun porte la part des
 * charges communes que son revenu représente dans les revenus du foyer.
 *
 * Une seule exception : la part d'un membre est plafonnée à ce qui rentre
 * réellement sur son mois. Un congé parental fait tomber un salaire à 60 % sans
 * toucher au coefficient, qui se lit sur les récurrences — et la part dépassait
 * alors ce que la personne gagne, un mois entier dans le rouge pendant que
 * l'autre gardait de la marge. L'excédent bascule sur ceux qui en ont
 * (`cappedWeights`), et quand personne n'en a, le prorata reprend ses droits :
 * un foyer qui ne couvre pas ses charges les porte à proportion de ce que
 * chacun gagne, il n'y a pas de meilleur partage d'un découvert.
 *
 * Le module est pur — il ne connaît ni le store ni la persistance, et reçoit
 * la nature d'une catégorie sous forme de fonction, comme `stats.ts`.
 * ==========================================================================*/

import type { YearMonth } from './date'
import { type Money, ZERO, add, money, sub, sum } from './money'
import { monthlyEquivalent } from './recurrence'
import { type KindOf, type MemberFilter, entriesOfMonth } from './stats'
import {
  type CategoryKind,
  type Direction,
  type Entry,
  type Member,
  type Recurrence,
  isRunningIn,
  isSpending,
} from './types'

/* --- Répartition d'un entier ----------------------------------------------*/

/**
 * Répartit `total` proportionnellement à des poids entiers, sans perdre ni
 * inventer une unité : la somme des parts vaut exactement `total`.
 *
 * Arrondir chaque part dans son coin ne le garantit pas — 2 000 € entre trois
 * tiers donnerait trois fois 666,67 € et un centime de trop. On pose donc les
 * parts entières, puis on distribue le reste aux plus forts restes, du plus
 * grand au plus petit ; à égalité, au poids le plus à gauche. C'est la méthode
 * des plus forts restes, et elle est déterministe, ce qui compte autant que
 * son exactitude : deux affichages du même mois doivent donner le même
 * centime au même membre.
 */
export function largestRemainder(total: number, weights: readonly number[]): number[] {
  if (!Number.isInteger(total)) {
    throw new TypeError(`largestRemainder attend un entier, reçu ${String(total)}`)
  }
  const totalWeight = weights.reduce((acc, w) => acc + w, 0)
  if (totalWeight <= 0) return weights.map(() => 0)

  const exact = weights.map((w) => (total * w) / totalWeight)
  const floors = exact.map((v) => Math.floor(v))
  let left = total - floors.reduce((acc, v) => acc + v, 0)

  // Les plus forts restes d'abord ; l'index départage les ex æquo.
  const order = exact
    .map((value, index) => ({ index, rest: value - Math.floor(value) }))
    .sort((a, b) => (b.rest === a.rest ? a.index - b.index : b.rest - a.rest))

  const parts = [...floors]
  for (const { index } of order) {
    if (left <= 0) break
    parts[index] = (parts[index] ?? 0) + 1
    left -= 1
  }
  return parts
}

/** La même répartition, sur un montant. Aucun centime ne se perd en route. */
export function allocate(total: Money, weights: readonly number[]): Money[] {
  return largestRemainder(total, weights).map((cents) => money(cents))
}

/* --- Ce qui se partage ----------------------------------------------------*/

/**
 * Une sortie de nature charge ou crédit que personne ne s'est attribuée est
 * commune : c'est la même frontière que la capacité d'épargne, et pour la même
 * raison — un versement sort du compte mais reste à qui le fait, il n'a rien à
 * faire dans un partage.
 *
 * La case « à partager » de la saisie l'emporte, dans les deux sens : elle sert
 * autant à partager une dépense qu'un membre a avancée qu'à sortir du pot
 * commun une charge qui n'y a pas sa place.
 */
export function isSharedEntry(entry: Entry, kind: CategoryKind): boolean {
  return entry.shared ?? defaultShared(kind, entry.memberId)
}

/**
 * Ce que la règle dirait, sans case cochée. Sert à pré-cocher la case de la
 * saisie, et à n'enregistrer `shared` que lorsqu'il diverge : tant que la case
 * dit la même chose que la règle, c'est la règle qui reste maîtresse et le
 * document ne se remplit pas de booléens redondants.
 *
 * La chaîne vide compte comme « aucun membre » : c'est ce que vaut le choix
 * « en commun » dans un `select`.
 */
export function defaultShared(kind: CategoryKind, memberId?: string): boolean {
  return isSpending(kind) && (memberId === undefined || memberId === '')
}

/**
 * Une ligne doit être à quelqu'un, ou à tout le monde.
 *
 * Sans propriétaire et hors partage, elle sort bien du compte du foyer, mais
 * n'apparaît dans le mois de personne : la somme des soldes individuels cesse
 * alors de valoir celui du foyer, sans que rien ne le dise. C'est le cas d'un
 * versement d'épargne que personne ne revendique — l'épargne ne se partage
 * jamais —, d'une dépense dont on a décoché « à partager » sans dire à qui elle
 * est, et de toute entrée d'argent, qui ne se partage pas davantage.
 *
 * La saisie l'exige donc là, et seulement là : partout ailleurs, le membre
 * reste facultatif parce que la règle de partage sait déjà où ranger la ligne.
 */
export function memberRequired(
  direction: Direction,
  kind: CategoryKind,
  memberId: string,
  shared: boolean | undefined,
): boolean {
  if (memberId !== '') return false
  return !(direction === 'out' && (shared ?? defaultShared(kind, memberId)))
}

/**
 * La même frontière que `sharedEntries`, en un seul endroit.
 *
 * `advancedEntries` doit poser exactement la même : une ligne que la
 * répartition compte et que la déduction ignorerait — ou l'inverse — ferait
 * diverger ce qui a été avancé du total dont il se retranche.
 */
export function isCommon(entry: Entry, kindOf: KindOf): boolean {
  return entry.direction === 'out' && isSharedEntry(entry, kindOf(entry.categoryId))
}

/**
 * Total des charges communes du mois.
 *
 * Les échéances prévues comptent : la question posée est « combien chacun
 * doit-il verser ce mois-ci », pas « combien a déjà été payé ». Répondre au
 * réalisé ferait grimper la part de chacun au fil du mois, ce qui ne veut rien
 * dire pour un virement qu'on fait une fois.
 */
export function sharedTotal(
  entries: readonly Entry[],
  month: YearMonth,
  kindOf: KindOf,
  memberId?: MemberFilter,
): Money {
  return sum(sharedEntries(entries, month, kindOf, memberId).map((e) => e.amount))
}

/**
 * Le détail de ce total, du plus lourd au plus léger.
 *
 * Un chiffre de répartition qu'on ne peut pas ouvrir ne se vérifie pas, et une
 * dépense qui n'a rien à faire dans le pot commun ne se repère qu'en la voyant.
 */
export function sharedEntries(
  entries: readonly Entry[],
  month: YearMonth,
  kindOf: KindOf,
  memberId?: MemberFilter,
): Entry[] {
  return entriesOfMonth(entries, month, memberId)
    .filter((e) => isCommon(e, kindOf))
    .sort((a, b) => b.amount - a.amount)
}

/* --- Ce qu'une seule personne a déjà réglé ---------------------------------*/

/**
 * Les charges communes du mois qu'une personne a avancées — celles qui portent
 * un membre.
 *
 * La répartition dit ce que chacun doit sur le pot commun. Elle ne dit pas qui
 * a sorti l'argent — et c'est souvent une seule personne : Clara règle 300 €
 * qui rentrent dans le commun, elle en portait 47 %, elle a payé 100 %. Ce
 * qu'elle a avancé se **déduit de son virement du mois même** (`memberShares`),
 * sans quoi elle paierait deux fois — une fois la facture, une fois sa part.
 *
 * Une charge commune **sans** membre a été réglée par le pot : elle n'avance
 * rien à personne, et reste donc hors du calcul des deux côtés à la fois.
 * C'est cette symétrie qui fait que la somme des virements vaut exactement le
 * pot moins ce qui a déjà été avancé.
 *
 * **Confirmées seulement.** Une échéance prévue n'a été payée par personne, et
 * dire d'elle qu'un membre l'a avancée serait inventer un fait. C'est déjà la
 * règle de tous les chiffres rétrospectifs dérivés — le capital restant dû
 * d'un crédit (`debt.ts`) et ce qui reste à remettre sur une avance
 * (`advance.ts`) ne comptent que les échéances effectivement confirmées.
 *
 * Les mensualités d'avance, de nature épargne et pourtant « à partager »,
 * comptent comme le reste : elles sont dans le pot (`isCommon` les prend), et
 * quand c'est leur porteur qui les règle, il avance leur montant comme
 * n'importe quelle charge. La déduction porte sur le virement, jamais sur la
 * part qui coûte — `refund` continue de séparer ce qui se consomme de ce qui
 * se rembourse.
 */
export function advancedEntries(
  entries: readonly Entry[],
  month: YearMonth,
  kindOf: KindOf,
): Entry[] {
  return entriesOfMonth(entries, month)
    .filter(
      (entry) =>
        isCommon(entry, kindOf) &&
        entry.status === 'confirmed' &&
        entry.memberId !== undefined &&
        entry.memberId !== '',
    )
    .sort((a, b) => b.amount - a.amount)
}

/**
 * Ce que chaque membre a avancé sur le mois, sous la forme qu'attend
 * `memberShares` : une table par membre.
 *
 * Bornée aux membres donnés — ceux du foyer : une charge avancée par quelqu'un
 * qui n'en est plus ne se déduit du virement de personne, et la compter d'un
 * seul côté ferait mentir la vérification — la somme des virements ne vaudrait
 * plus le pot moins ce que la liste des avances affiche.
 */
export function advancedByMember(
  entries: readonly Entry[],
  month: YearMonth,
  kindOf: KindOf,
  memberIds: ReadonlySet<string>,
): Map<string, Money> {
  const advanced = new Map<string, Money>()
  for (const entry of advancedEntries(entries, month, kindOf)) {
    const by = entry.memberId ?? ''
    if (!memberIds.has(by)) continue
    advanced.set(by, add(advanced.get(by) ?? ZERO, entry.amount))
  }
  return advanced
}

/* --- Le revenu d'un membre ------------------------------------------------*/

/**
 * Pourquoi un revenu manque. Deux causes, deux gestes différents — et c'est
 * bien pour ça qu'on les distingue : un écran qui se contente de « aucun revenu
 * enregistré » envoie créer une récurrence qui existe déjà.
 */
export type IncomeGap =
  /** Aucune récurrence de ressource à son nom. */
  | 'none'
  /** Il en porte, mais à montant variable et pas encore chiffré. */
  | 'unpriced'
  /**
   * Il en porte une qui est chiffrée — et le chiffre est zéro.
   *
   * Une échéance confirmée est un fait, y compris confirmée à zéro : c'est la
   * doctrine de `priceHistory`, et elle est juste. Mais le fait « ce salaire
   * vaut zéro » ne fabrique pas un revenu de zéro pour autant, il dit qu'on ne
   * sait pas ce que cette personne gagne. Sans ce troisième cas, elle se voyait
   * attribuer 0 % des charges communes — un chiffre faux, sans un mot, et le
   * plus difficile à repérer parce qu'il a l'air d'un résultat.
   */
  | 'zero'

/** Ce qu'on sait du revenu mensuel d'un membre. */
export type MemberIncomeValue = {
  /** `null` = pas de quoi le dire ; `gap` dit alors ce qui manque. */
  income: Money | null
  /** Renseigné exactement quand `income` vaut `null`. */
  gap: IncomeGap | null
}

/**
 * Ce dont le prorata a besoin, et rien de plus : qui, et combien.
 *
 * Le partage ne demande pas *pourquoi* un revenu manque — un dénominateur
 * incomplet ne se répartit pas, quelle qu'en soit la raison. C'est l'écran qui
 * a besoin de la raison, pour dire quoi faire. Les deux besoins ont deux types.
 */
export type IncomeWeight = { memberId: string; income: Money | null }

export type MemberIncome = IncomeWeight & MemberIncomeValue

/**
 * Le revenu mensuel d'un membre, déduit de ses récurrences de nature
 * `resource` — salaire, allocations, pension — ramenées au mois.
 *
 * Dérivé, jamais stocké. Un revenu déclaré sur le membre serait une seconde
 * vérité, et la première augmentation les ferait diverger. C'est aussi ce qui
 * donne au coefficient la stabilité qu'il lui faut : une récurrence est une
 * règle, une prime est une `Entry` ponctuelle — elle a lieu, mais elle ne dit
 * rien de ce que chacun gagne, et elle ne déplace donc pas la part du loyer.
 *
 * `amountOf` répond pour chaque récurrence — fixe ou variable — et c'est la
 * même fonction que pour le total des récurrences : le salaire qui pèse dans le
 * prorata est au centime celui que la liste des récurrences affiche.
 *
 * Le revenu se lit **sur un mois**, jamais sur un jour. Lu au jour où l'on
 * regarde, un salaire dont la première échéance tombe le 1er du mois suivant
 * n'existait pas encore : le foyer qui venait de poser ses deux salaires
 * n'avait aucune répartition, et en aurait eu une le lendemain. Un chiffre de
 * partage ne peut pas dépendre du moment où on ouvre l'écran.
 *
 * `null` quand rien ne permet de le dire : un revenu qu'on ne sait pas encore
 * ne vaut pas zéro — et un revenu déclaré à zéro n'en est pas un non plus. Le
 * `gap` dit laquelle des trois raisons c'est.
 */
export function monthlyIncome(
  recurrences: readonly Recurrence[],
  memberId: string,
  kindOf: KindOf,
  amountOf: (recurrence: Recurrence) => Money | null,
  month: YearMonth,
): MemberIncomeValue {
  let total = ZERO
  let found = false

  for (const recurrence of recurrences) {
    if (recurrence.memberId !== memberId) continue
    if (kindOf(recurrence.categoryId) !== 'resource') continue
    if (!isRunningIn(recurrence, month)) continue

    found = true
    const amount = amountOf(recurrence)
    if (amount === null) return { income: null, gap: 'unpriced' }
    /* Une source à zéro arrête le calcul, comme une source sans chiffre — et
       pour la même raison : `prorataWeights` ne refuse que si la *somme* est
       nulle, donc un membre à 0 € au milieu d'un foyer qui gagne sa vie
       recevait 0 % des charges communes en silence. Le refus est ici, source
       par source, exactement là où le `null` l'est déjà. */
    if (amount <= ZERO) return { income: null, gap: 'zero' }
    total = add(total, monthlyEquivalent({ ...recurrence, amount }) ?? ZERO)
  }

  return found ? { income: total, gap: null } : { income: null, gap: 'none' }
}

/** Le revenu de chaque membre du foyer, dans l'ordre du foyer. */
export function memberIncomes(
  members: readonly Member[],
  recurrences: readonly Recurrence[],
  kindOf: KindOf,
  amountOf: (recurrence: Recurrence) => Money | null,
  month: YearMonth,
): MemberIncome[] {
  return members.map((member) => ({
    memberId: member.id,
    ...monthlyIncome(recurrences, member.id, kindOf, amountOf, month),
  }))
}

/**
 * Les ressources actives que personne ne porte.
 *
 * Une ressource au foyer entier ne compte dans le revenu d'aucun membre : le
 * prorata compare ce que chacun gagne, et un revenu commun ne dit rien de cet
 * écart. Elle ne disparaît pas pour autant — elle rentre bien sur le mois du
 * foyer —, mais elle ne pèse dans la part de personne, et c'est exactement le
 * genre de silence qui fait chercher longtemps pourquoi la répartition ne se
 * calcule pas. La saisie l'exige désormais à quelqu'un ; restent les
 * récurrences posées avant cette règle, ou avant qu'il y ait des membres.
 */
export function unassignedIncomes(
  recurrences: readonly Recurrence[],
  kindOf: KindOf,
  month: YearMonth,
): Recurrence[] {
  return recurrences.filter(
    (recurrence) =>
      recurrence.memberId === undefined &&
      kindOf(recurrence.categoryId) === 'resource' &&
      isRunningIn(recurrence, month),
  )
}

/* --- Parts de chacun ------------------------------------------------------*/

export type MemberShare = {
  memberId: string
  income: Money
  /**
   * Sa part effective du pot, en points de base. 5556 = 55,56 %. C'est la part
   * du revenu du foyer — sauf quand un plafond mord : le coefficient suit alors
   * les parts réellement portées, pour que le pourcentage affiché sous les
   * charges communes reste celui qui les a découpées.
   */
  shareBp: number
  /**
   * Sa part du **pot commun** du mois : tout ce qui y entre, au prorata.
   *
   * Ce n'est pas ce que le mois lui coûte, et le confondre est ce qui faisait
   * lire deux chiffres voisins comme une erreur. Le pot porte aussi la
   * mensualité d'une avance — quelqu'un a réglé une dépense du foyer depuis son
   * épargne, le foyer la lui rembourse —, qui est de nature épargne et se verse
   * sans rien consommer. `due − refund` est la part qui coûte ; c'est elle que
   * la tuile Charges compte, et elle seule.
   */
  due: Money
  /**
   * La part de `due` qui ne se consomme pas : les lignes du pot dont la nature
   * n'est ni charge ni crédit, c'est-à-dire les mensualités d'avance.
   *
   * Zéro sur presque tous les mois, et c'est bien pour ça qu'elle méritait un
   * nom : le seul écart entre « ce que je verse » et « ce que je paie » qu'aucun
   * écran ne pouvait expliquer venait d'elle.
   */
  refund: Money
  /**
   * Ce qu'il a déjà réglé de sa poche sur le pot de ce mois : les charges
   * communes confirmées qui portent son nom (`advancedEntries`), mensualités
   * d'avance comprises. Il ne va pas le payer deux fois — c'est déjà sorti.
   */
  advanced: Money
  /**
   * Ce qu'il lui reste à verser ce mois-ci : `due − advanced`. Négatif, il a
   * avancé plus que sa part et c'est le pot qui lui doit. La somme vaut le
   * total des charges communes moins tout ce qui a déjà été avancé.
   */
  toPay: Money
}

/**
 * Les poids du prorata : les revenus, quand ils permettent de répartir.
 *
 * `null` — et non des poids à zéro — dans trois cas : aucun membre, un revenu
 * inconnu à plusieurs, ou des revenus tous nuls. Un prorata dont le
 * dénominateur est incomplet ne vaut pas zéro, il ne veut rien dire ; c'est le
 * raisonnement de `savingRate`, et l'écran doit dire ce qui manque plutôt
 * qu'afficher un chiffre faux.
 *
 * Un membre seul n'est pas un dénominateur incomplet : un prorata à un seul
 * participant n'est pas indéfini, il vaut 100 % — il n'y a personne à qui se
 * comparer, donc aucun revenu à exiger. Refuser ici faisait diverger le mois
 * filtré sur le membre unique du mois de son foyer, qui sont pourtant la même
 * personne.
 */
export function prorataWeights(incomes: readonly IncomeWeight[]): Money[] | null {
  if (incomes.length === 0) return null
  if (incomes.length === 1) {
    // Le poids ne sert qu'à porter ce 100 % : un centime factice suffit quand
    // le revenu n'est pas connu.
    const only = incomes[0]?.income
    return [only === null || only === undefined || only <= 0 ? money(1) : only]
  }

  const known: Money[] = []
  for (const entry of incomes) {
    if (entry.income === null) return null
    known.push(entry.income)
  }
  return sum(known) <= 0 ? null : known
}

/* --- Le plafond de chacun -------------------------------------------------*/

/**
 * Ce qui rentre de chiffré sur le mois de chaque membre — le plafond de sa
 * part, dans l'ordre d'`incomes`.
 *
 * Sur les **entrées** du mois, pas sur les récurrences : c'est tout le point.
 * Le coefficient se lit sur les récurrences pour rester stable — une prime ne
 * déplace pas la part du loyer. Mais le plafond répond à une autre question :
 * « peut-elle seulement verser ça ce mois-ci ? », et elle se pose sur ce qui
 * rentre vraiment — l'échéance de salaire réduite d'un congé, échéances
 * prévues comprises, comme tous les chiffres prospectifs du mois.
 *
 * `null` quand rien ne permet de le dire, et non zéro — la doctrine de
 * `monthlyIncome` : aucune rentrée sur le mois, ou une rentrée prévue laissée
 * sans montant (la règle de `knownAmount` — une case vide n'est pas un montant
 * nul). Un plafond inconnu ne plafonne rien ; un plafond à zéro, lui, est un
 * fait, et il se respecte : un mois confirmé sans un centime de rentrée ne
 * peut rien verser au pot.
 */
export function memberCaps(
  entries: readonly Entry[],
  month: YearMonth,
  incomes: readonly IncomeWeight[],
): (Money | null)[] {
  const monthly = entriesOfMonth(entries, month)
  return incomes.map(({ memberId }) => {
    let total = ZERO
    let found = false
    for (const entry of monthly) {
      if (entry.direction !== 'in' || entry.memberId !== memberId) continue
      if (entry.status !== 'confirmed' && entry.amount <= ZERO) return null
      found = true
      total = add(total, entry.amount)
    }
    return found ? total : null
  })
}

/**
 * Les poids du mois une fois les plafonds appliqués, ou `null` quand aucun ne
 * mord — le prorata pur suffit alors, et c'est le cas de presque tous les mois.
 *
 * Celui qui dépasse son plafond y est ramené, et l'excédent se répartit entre
 * les autres au prorata de leurs revenus — en cascade, parce qu'il peut à son
 * tour faire déborder quelqu'un. Quand tout le monde est au plafond, le pot
 * dépasse ce qui rentre au foyer : le surplus se répartit alors au prorata sur
 * tous, plafonds compris — un découvert du foyer se porte à proportion de ce
 * que chacun gagne, le plafonner ne ferait que le taire.
 *
 * Le résultat est un jeu de poids, pas de parts : chaque charge continue de se
 * découper ligne par ligne avec `allocate`, par le même chemin qu'avant — c'est
 * ce qui garantit que la part d'un poste, d'un jour ou d'une moitié de mois se
 * recompose exactement, plafond ou pas.
 */
export function cappedWeights(
  weights: readonly Money[],
  caps: readonly (Money | null)[],
  total: Money,
): Money[] | null {
  // Le membre seul porte tout, plafond ou pas : il n'y a personne sur qui
  // basculer l'excédent. Et un pot vide ne déborde de nulle part.
  if (weights.length <= 1 || total <= ZERO) return null

  const dues = largestRemainder(total, weights)
  const capped = new Set<number>()

  for (;;) {
    let bound = false
    for (const [index, cap] of caps.entries()) {
      if (cap === null || capped.has(index)) continue
      if ((dues[index] ?? 0) > cap) {
        capped.add(index)
        bound = true
      }
    }
    if (!bound) break

    const fixed = [...capped].reduce((acc, index) => acc + (caps[index] ?? 0), 0)
    const rest = total - fixed
    const free = weights.map((weight, index) => (capped.has(index) ? 0 : weight))

    if (free.every((weight) => weight <= 0)) {
      const extra = largestRemainder(rest, weights)
      return caps.map((cap, index) =>
        money((capped.has(index) ? (cap ?? 0) : 0) + (extra[index] ?? 0)),
      )
    }

    const spread = largestRemainder(rest, free)
    for (const [index, part] of spread.entries()) dues[index] = part
    for (const index of capped) dues[index] = caps[index] ?? 0
  }

  return capped.size === 0 ? null : dues.map((due) => money(due))
}

/**
 * Les revenus tels que la lecture d'un mois doit les peser : le prorata,
 * plafonné à ce qui rentre sur le mois de chacun.
 *
 * C'est le point d'entrée de `scopeToMember` et des siens, qui reçoivent des
 * revenus et n'ont pas à connaître le plafond : leur passer des revenus déjà
 * plafonnés leur fait découper les mêmes parts que `memberShares`, au centime,
 * sans changer une ligne chez eux. Le tableau rendu est **le même** tant
 * qu'aucun plafond ne mord — la référence comprise, pour que les caches en
 * aval continuent de reconnaître deux lectures identiques.
 *
 * Les montants qui en sortent servent de poids, jamais de revenus à afficher :
 * un écran qui y lirait « ce que gagne » quelqu'un mentirait, c'est déjà la
 * frontière que `memberShares` trace entre le poids et le revenu déclaré.
 */
export function cappedIncomes<T extends IncomeWeight>(
  incomes: readonly T[],
  entries: readonly Entry[],
  month: YearMonth,
  kindOf: KindOf,
): readonly T[] {
  if (incomes.length <= 1) return incomes
  const weights = prorataWeights(incomes)
  if (weights === null) return incomes

  const effective = cappedWeights(
    weights,
    memberCaps(entries, month, incomes),
    sharedTotal(entries, month, kindOf),
  )
  if (effective === null) return incomes
  return incomes.map((income, index) => ({ ...income, income: effective[index] ?? ZERO }))
}

/**
 * Ce que chaque membre doit sur des charges communes, au prorata des revenus.
 *
 * Réparti charge par charge, et non sur leur somme. Les deux donnent le même
 * total au centime près — c'est ce que garantit `allocate` — mais seul le
 * découpage par charge se recompose : la part d'un poste, d'un jour ou d'une
 * moitié de mois s'additionne alors exactement pour redonner la part du mois.
 * Répartir la somme laisserait l'écran du mois filtré sur quelqu'un et l'écran
 * Répartition annoncer deux chiffres à un centime l'un de l'autre.
 *
 * `advanced` porte ce que chacun a déjà réglé sur le pot de ce mois
 * (`advancedByMember`) : ça se déduit de son virement, jamais de sa part —
 * une avance ne change pas ce que le mois lui coûte, seulement ce qu'il
 * verse. Absente, chacun verse sa part et rien d'autre : c'est ce que veut le
 * coefficient lu seul, hors de tout mois.
 */
export function memberShares(
  incomes: readonly IncomeWeight[],
  amounts: readonly Money[],
  advanced: ReadonlyMap<string, Money> | null = null,
  /**
   * Le sous-ensemble d'`amounts` qui ne se consomme pas — les mensualités
   * d'avance. Passé à part plutôt que déduit ici : la nature d'une ligne se lit
   * sur sa catégorie, que ce module ne connaît pas et n'a pas à connaître.
   *
   * Découpé **par le même chemin** que le reste, entrée par entrée : allouer
   * une somme puis la retrancher d'une autre allocation ferait diverger les
   * arrondis d'un centime, et ce centime se verrait — `due − refund` doit
   * redonner au centime ce que la tuile Charges annonce.
   */
  refunds: readonly Money[] = [],
  /**
   * Le plafond de chacun — ce qui rentre sur son mois (`memberCaps`), quand
   * l'appelant lit un mois. Absent, le prorata s'applique sans plafond : c'est
   * ce que veut le coefficient lu seul, hors de tout mois, qui compare des
   * revenus et n'a aucun pot à ne pas dépasser.
   */
  caps: readonly (Money | null)[] | null = null,
): MemberShare[] | null {
  const raw = prorataWeights(incomes)
  if (raw === null) return null
  const weights = (caps === null ? null : cappedWeights(raw, caps, sum(amounts))) ?? raw

  const shares = largestRemainder(10_000, weights)
  const split = (list: readonly Money[]): number[] => {
    const totals = weights.map(() => 0)
    for (const amount of list) {
      const parts = largestRemainder(amount, weights)
      for (const [index, part] of parts.entries()) {
        totals[index] = (totals[index] ?? 0) + part
      }
    }
    return totals
  }
  const dues = split(amounts)
  const refunded = split(refunds)

  return incomes.map((entry, index) => {
    const due = money(dues[index] ?? 0)
    const fronted = advanced?.get(entry.memberId) ?? ZERO
    return {
      memberId: entry.memberId,
      // Le revenu déclaré, pas le poids : à plusieurs ils sont identiques, mais
      // le membre seul porte 100 % sans revenu connu — son poids est alors un
      // centime factice, et l'afficher comme un revenu serait un mensonge.
      income: entry.income ?? ZERO,
      shareBp: shares[index] ?? 0,
      due,
      refund: money(refunded[index] ?? 0),
      advanced: fronted,
      toPay: sub(due, fronted),
    }
  })
}

/* --- Le mois vu par un membre ---------------------------------------------*/

/**
 * Les entrées telles que les lit un membre : les siennes, et sa part de chaque
 * charge commune.
 *
 * Sans cette réécriture, filtrer sur quelqu'un ne garde que ce qu'il s'est
 * attribué — une charge commune n'appartient par définition à personne. Le
 * loyer, l'électricité et les crédits disparaissaient donc du filtre, et
 * chacun se lisait comme s'il vivait sans charges : capacité d'épargne à peine
 * inférieure au salaire, « aucune sortie ce mois-ci » sur la répartition.
 *
 * La part remplace le montant, et l'entrée est attribuée au membre : tout ce
 * qui lit ces entrées — totaux, natures, répartition par poste, par jour —
 * répond dès lors à sa part sans avoir à connaître le prorata. Les listes sur
 * lesquelles on agit, elles, gardent les entrées réelles : on confirme une
 * échéance entière, jamais une part.
 *
 * `null` tant que le prorata ne se calcule pas — l'appelant dit ce qui manque.
 */
export function scopeToMember(
  entries: readonly Entry[],
  memberId: string,
  kindOf: KindOf,
  incomes: readonly IncomeWeight[],
): Entry[] | null {
  // Seul du foyer, son mois est le mois du foyer : tout lui revient — le
  // commun à son montant plein, et les lignes que personne ne porte (une paie
  // ou un versement laissés « en commun »), qui ne sont pas communes et
  // que le découpage du prorata ne saurait donc pas lui rendre. C'est ce qui
  // fait que la lecture filtrée sur lui et « tout le monde » disent le même
  // centime.
  if (incomes.length === 1 && incomes[0]?.memberId === memberId) {
    return entries.map((entry) =>
      entry.memberId === undefined || entry.memberId === '' ? { ...entry, memberId } : entry,
    )
  }

  const weights = prorataWeights(incomes)
  const index = incomes.findIndex((income) => income.memberId === memberId)
  if (weights === null || index < 0) return null

  const scoped: Entry[] = []
  for (const entry of entries) {
    if (isCommon(entry, kindOf)) {
      const part = allocate(entry.amount, weights)[index] ?? ZERO
      // Une part nulle n'est pas une ligne : elle ferait apparaître un poste à
      // zéro dans la répartition sans rien ajouter à aucun total.
      if (part > 0) scoped.push({ ...entry, amount: part, memberId })
      continue
    }
    if (entry.memberId === memberId) scoped.push(entry)
  }
  return scoped
}

/**
 * La même réécriture, pour tout le foyer en un seul balayage.
 *
 * `scopeToMember` appelée une fois par membre relit tout le document autant de
 * fois qu'il y a de personnes, et redemande à `allocate` de découper chaque
 * charge commune à chaque tour — alors qu'`allocate` rend déjà toutes les parts
 * d'un coup, et qu'on en jetait toutes sauf une. C'est le cas de l'écran
 * Épargne, qui lit les colonnes de chacun côte à côte.
 *
 * Le résultat est rigoureusement celui de `scopeToMember` membre par membre,
 * ordre des entrées compris : un membre absent de `incomes` n'a pas de clé,
 * comme il obtenait `null`, et `null` continue de dire « le prorata ne se
 * calcule pas ».
 */
export function scopeToMembers(
  entries: readonly Entry[],
  kindOf: KindOf,
  incomes: readonly IncomeWeight[],
): Map<string, Entry[]> | null {
  // La même règle solo que `scopeToMember`, en un seul balayage : tout au
  // membre unique, montants intacts.
  if (incomes.length === 1) {
    const only = incomes[0]?.memberId ?? ''
    return new Map([
      [
        only,
        entries.map((entry) =>
          entry.memberId === undefined || entry.memberId === ''
            ? { ...entry, memberId: only }
            : entry,
        ),
      ],
    ])
  }

  const weights = prorataWeights(incomes)
  if (weights === null) return null

  const scoped = new Map<string, Entry[]>(incomes.map((income) => [income.memberId, []]))
  for (const entry of entries) {
    if (isCommon(entry, kindOf)) {
      const parts = allocate(entry.amount, weights)
      for (const [index, income] of incomes.entries()) {
        const part = parts[index] ?? ZERO
        // Une part nulle n'est pas une ligne — voir `scopeToMember`.
        if (part > 0) {
          scoped.get(income.memberId)?.push({ ...entry, amount: part, memberId: income.memberId })
        }
      }
      continue
    }
    if (entry.memberId !== undefined) scoped.get(entry.memberId)?.push(entry)
  }
  return scoped
}

/** Somme des parts. Vaut le total réparti — c'est ce que `allocate` garantit. */
export function totalDue(shares: readonly MemberShare[]): Money {
  return shares.reduce((acc, share) => add(acc, share.due), ZERO)
}

/**
 * Somme de ce qu'il reste à verser, avances déduites. Vaut le total réparti
 * moins tout ce qui a déjà été avancé — c'est la vérification que l'écran
 * Répartition affiche à côté de la somme des parts.
 */
export function totalToPay(shares: readonly MemberShare[]): Money {
  return shares.reduce((acc, share) => add(acc, share.toPay), ZERO)
}

/* --- Ce qu'un membre porte du mois ----------------------------------------*/

/** Les charges du mois d'un membre, de part et d'autre du partage. */
export type MemberCharges = {
  /** Ce qu'il porte seul : les charges et les crédits à son nom. */
  own: Money
  /** Sa part des charges communes, au prorata des revenus. */
  common: Money
  /**
   * La même part, ventilée par nature — la cascade de la capacité d'épargne
   * lit « charges » et « crédits » séparément, et ne peut retrancher du
   * commun que ce qui vient de la même nature qu'elle.
   *
   * `commonCharge + commonDebt` vaut `common` sauf sur un document qui aurait
   * marqué « à partager » une nature que la saisie n'y autorise pas : ces
   * deux-ci s'arrêtent aux natures que `spendingFlow` compte, `common` non.
   */
  commonCharge: Money
  /** Sa part des crédits communs. Voir `commonCharge`. */
  commonDebt: Money
  /** Le total commun dont cette part est tirée, pour que le chiffre se vérifie. */
  commonTotal: Money
  /** Le coefficient qui la produit, en points de base. 5556 = 55,56 %. */
  shareBp: number
}

/**
 * Ce que le mois coûte à un membre, ses charges d'un côté et sa part du foyer
 * de l'autre.
 *
 * `scopeToMember` fond déjà les deux dans un même jeu d'entrées — c'est ce qui
 * fait qu'un mois filtré ne se lit pas comme si son membre vivait sans loyer.
 * Mais une fois fondues, plus rien ne dit ce qui vient du pot commun : le total
 * des charges d'une personne mêle ses courses et sa part de l'électricité sans
 * qu'on puisse les séparer, et le coefficient qui produit la seconde ne se lit
 * nulle part sur son mois. C'est le même découpage, lu au lieu d'être fondu.
 *
 * `own` s'arrête aux natures que `spendingFlow` compte — charges et crédits :
 * les deux morceaux redonnent alors exactement le total des charges du mois
 * filtré, et une tuile qui annoncerait un tout plus grand que la somme de ses
 * parts ne vaudrait pas mieux qu'un chiffre faux.
 *
 * `null` tant que le prorata ne se calcule pas, comme partout ailleurs : une
 * part au dénominateur incomplet ne vaut pas zéro, elle ne veut rien dire.
 */
export function memberCharges(
  entries: readonly Entry[],
  month: YearMonth,
  memberId: string,
  kindOf: KindOf,
  incomes: readonly IncomeWeight[],
): MemberCharges | null {
  const raw = prorataWeights(incomes)
  const index = incomes.findIndex((income) => income.memberId === memberId)
  if (raw === null || index < 0) return null

  const solo = incomes.length === 1
  let own = ZERO
  let common = ZERO
  let commonCharge = ZERO
  let commonDebt = ZERO
  let commonTotal = ZERO

  /* Le commun se ramasse avant de se découper : le plafond se lit sur le total
     du pot, qui n'est connu qu'une fois le mois parcouru. */
  const commons: Entry[] = []
  for (const entry of entriesOfMonth(entries, month)) {
    if (isCommon(entry, kindOf)) {
      commons.push(entry)
      commonTotal = add(commonTotal, entry.amount)
      continue
    }
    // Seul du foyer, une ligne de personne est à lui — même règle que
    // `scopeToMember` : sans elle, une dépense héritée « à personne » hors
    // partage comptait dans son mois filtré sans se lire ni en perso ni en
    // part du commun, et les deux morceaux ne redonnaient plus le total.
    const unowned = entry.memberId === undefined || entry.memberId === ''
    if (entry.memberId !== memberId && !(solo && unowned)) continue
    if (entry.direction !== 'out' || !isSpending(kindOf(entry.categoryId))) continue
    own = add(own, entry.amount)
  }

  const weights =
    cappedWeights(raw, memberCaps(entries, month, incomes), commonTotal) ?? raw

  for (const entry of commons) {
    const part = allocate(entry.amount, weights)[index] ?? ZERO
    common = add(common, part)
    const kind = kindOf(entry.categoryId)
    if (kind === 'charge') commonCharge = add(commonCharge, part)
    else if (kind === 'debt') commonDebt = add(commonDebt, part)
  }

  return {
    own,
    common,
    commonCharge,
    commonDebt,
    commonTotal,
    shareBp: largestRemainder(10_000, weights)[index] ?? 0,
  }
}
