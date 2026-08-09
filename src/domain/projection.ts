/* ============================================================================
 * Projection d'épargne à taux constant.
 *
 * Ce module ne sait faire qu'une chose : dire ce que devient un capital qu'on
 * alimente tous les mois, sous une hypothèse de taux qu'on lui donne. Il ne
 * choisit aucun taux, ne connaît aucun produit, et ne lit pas le document — un
 * simulateur n'est pas une lecture du foyer, c'est une calculatrice qu'on
 * interroge (cahier §4.6 ter).
 *
 * **Le taux est saisi net.** Ni fiscalité, ni frais de gestion, ni enveloppe :
 * ce qu'on lui donne est déjà ce qui reste. Modéliser le PFU et les
 * prélèvements sociaux demanderait de figer dans le code un barème qui change,
 * et un barème périmé se lit comme un calcul faux — l'écran explique donc
 * comment estimer son taux net plutôt que de prétendre le calculer.
 *
 * **Un seul moteur, et c'est la règle qui tient tout le reste.** Le tracé, les
 * jalons et le chiffre d'arrivée lisent la **même** série : il n'existe pas de
 * formule fermée à côté qui donnerait la valeur finale plus vite. Deux façons
 * de calculer un capital donneraient deux vérités à tenir d'accord, et c'est
 * exactement ce que le cahier §4.6 bis refuse déjà pour la valeur estimée d'un
 * support.
 * ==========================================================================*/

import { type Money, ZERO, money } from './money'

/**
 * Ce que vaut le taux qu'on a saisi — et c'est une distinction de sens, pas de
 * calcul : les deux natures se capitalisent de la même façon.
 *
 * Un **taux garanti** est une propriété du contrat : un Livret A, un fonds
 * euros. Il est connu d'avance, révisable, mais jamais démenti après coup. Une
 * **hypothèse** est une propriété de celui qui la pose : un PEA, un
 * compte-titres, une assurance-vie en unités de compte ne promettent rien, et
 * le taux qu'on leur prête n'engage que la personne qui l'a tapé.
 *
 * L'écran les sépare par le mot et par la forme du trait, jamais par la seule
 * couleur (DS §2.3) : une distinction qui ne survit pas au niveau de gris n'en
 * est pas une.
 */
export type RateKind = 'guaranteed' | 'assumed'

export type ProjectionInput = {
  /** Ce qu'il y a déjà, au premier jour. */
  initial: Money
  /** Ce qu'on ajoute chaque mois, en fin de mois. */
  monthly: Money
  /** L'horizon, en mois. La série porte `months + 1` points, le départ compris. */
  months: number
  /** Taux annuel **net**, en points de base. 600 = 6,00 %. */
  rateBp: number
  /**
   * Inflation annuelle en points de base, pour la lecture en euros constants.
   * Zéro — le défaut — laisse les montants en euros courants.
   */
  inflationBp?: number
}

export type ProjectionSeries = {
  /** Ce que vaut le capital à la fin de chaque mois, du mois 0 à `months`. */
  balance: Money[]
  /**
   * Ce qu'on y a mis, au même rang : capital initial plus les versements
   * échus. C'est la ligne qui rend les intérêts visibles — l'écart entre les
   * deux séries *est* ce que le taux a produit.
   */
  contributed: Money[]
}

/**
 * Le taux mensuel équivalent d'un taux annuel : `(1 + r)^(1/12) − 1`.
 *
 * **Jamais `r/12`**, et l'écart n'est pas une subtilité d'arrondi. À 11 %, le
 * taux proportionnel vaut 0,9167 % par mois quand l'équivalent en vaut 0,8735 :
 * capitalisé deux cent quarante fois, le premier fait 11,57 % par an au lieu de
 * 11. Sur 250 €/mois pendant vingt ans, il annonce 216 k€ là où le second en
 * annonce 202 — quatorze mille euros sortis de nulle part, et toujours dans le
 * sens qui flatte.
 *
 * `domain/debt.ts` fait pourtant l'inverse, et ce n'est pas une incohérence :
 * un prêt immobilier français **est** contractuellement défini au taux nominal
 * proportionnel, `r/12` y est donc la convention exacte et non une
 * approximation. Ici il n'y a pas de contrat — on capitalise un rendement, et
 * la seule définition qui se tienne est celle qui, douze fois de suite, redonne
 * le taux annoncé.
 *
 * Un taux nul rend zéro, sans cas particulier : `1^(1/12) − 1 = 0`.
 */
export function monthlyRate(annualBp: number): number {
  /* Un taux ne descend pas sous −100 % : le capital ne peut pas devenir son
     propre opposé. La borne évite une racine douzième de nombre négatif, qui
     rendrait `NaN` et le propagerait dans toute la série sans rien dire. */
  const annual = Math.max(-10_000, annualBp) / 10_000
  return Math.pow(1 + annual, 1 / 12) - 1
}

/**
 * La trajectoire du capital, mois par mois.
 *
 * **Versements en fin de mois**, et c'est une convention prudente qu'il faut
 * écrire : un versement du 1er passerait un mois de plus à produire des
 * intérêts, et rendrait un chiffre supérieur pour exactement le même effort.
 * Entre deux conventions défendables, l'app prend celle qui promet le moins.
 * Elle n'est pas choisie au hasard non plus : c'est celle des simulateurs du
 * marché, et c'est ce qui rend le vecteur de référence du cahier vérifiable
 * ailleurs qu'ici — 250 €/mois à 11 % sur 20 ans, ≈ 202 k€.
 *
 * **Les flottants restent à l'intérieur.** Le capital court en `number` d'un
 * mois à l'autre, et n'est arrondi qu'au moment d'être posé dans la série :
 * arrondir à chaque pas ferait dériver le total de plusieurs euros sur vingt
 * ans, et l'arrondi serait alors une donnée du calcul plutôt qu'une décision
 * d'affichage. C'est le motif de `remainingPrincipal` (`domain/debt.ts`).
 *
 * **Les euros constants se déflatent au rang de chaque point**, pas à la fin :
 * un capital vaut ce qu'il vaut *à sa date*, et un versement fait dans dix ans
 * n'a pas le pouvoir d'achat de celui d'aujourd'hui. Le versé cumulé est donc
 * la somme de versements déjà déflatés, jamais la déflation de leur somme —
 * les deux ne donnent pas le même nombre, et seul le premier répond à « qu'ai-
 * je mis, en euros d'aujourd'hui ».
 */
export function projectSeries({
  initial,
  monthly,
  months,
  rateBp,
  inflationBp = 0,
}: ProjectionInput): ProjectionSeries {
  const horizon = Math.max(0, Math.trunc(months))
  const growth = 1 + monthlyRate(rateBp)
  const erosion = 1 + monthlyRate(inflationBp)

  let capital: number = initial
  /* Le versé se compte en euros du jour zéro dès qu'une inflation est posée,
     d'où son propre accumulateur : sans lui, il faudrait déflater une somme
     dont chaque terme est daté différemment. Sans inflation, `discount` reste
     à 1 et les deux accumulateurs redeviennent le même nombre — un seul chemin
     de code, pas deux à tenir d'accord. */
  let paid: number = initial
  let discount = 1

  const balance: Money[] = [money(Math.round(capital))]
  const contributed: Money[] = [money(Math.round(paid))]

  for (let month = 1; month <= horizon; month += 1) {
    capital = capital * growth + monthly
    discount /= erosion
    paid += monthly * discount
    balance.push(money(Math.round(capital * discount)))
    contributed.push(money(Math.round(paid)))
  }

  return { balance, contributed }
}

/**
 * Le versement mensuel qui atteint `target` en `months`, capital initial
 * compris — le mode inverse.
 *
 * C'est la question qu'on se pose vraiment : « combien dois-je mettre » est
 * actionnable, « combien j'aurai » ne l'est pas. La formule est celle de
 * `projectSeries`, résolue en `P` :
 * `P = (cible − initial·(1+i)ⁿ) · i / ((1+i)ⁿ − 1)`, et `(cible − initial)/n`
 * à taux nul, où la limite existe mais pas le quotient.
 *
 * **Arrondi au centime supérieur**, seul de tout le module. Un versement requis
 * arrondi par le bas rate sa cible — de peu, mais toujours du même côté, et
 * c'est le mauvais côté : c'est l'argument qui fait déjà arrondir « reste à
 * payer » plutôt que le tronquer (`i18n/format.ts`).
 *
 * Deux refus, et aucun des deux ne vaut zéro. Sans durée, la question n'a pas
 * de réponse — pas de versement nul, pas de réponse du tout. Et si le capital
 * initial atteint seul la cible, il n'y a rien à verser : `ZERO` le dit, et
 * l'écran a de quoi le formuler autrement qu'en « 0,00 € par mois ».
 */
export function requiredMonthly({
  target,
  initial,
  months,
  rateBp,
}: {
  target: Money
  initial: Money
  months: number
  rateBp: number
}): Money | null {
  const horizon = Math.trunc(months)
  if (horizon <= 0) return null

  const i = monthlyRate(rateBp)
  const grown = initial * Math.pow(1 + i, horizon)
  const missing = target - grown
  if (missing <= 0) return ZERO

  const perMonth = i === 0 ? missing / horizon : (missing * i) / (Math.pow(1 + i, horizon) - 1)
  return money(Math.ceil(perMonth))
}

/**
 * Ce qu'il faudra nominalement pour valoir `amount` d'aujourd'hui dans
 * `months` mois.
 *
 * Le pendant de la déflation de `projectSeries`, et il n'existe que pour le
 * mode inverse : quelqu'un qui lit en euros constants et tape « 200 000 € »
 * parle du pouvoir d'achat qu'il connaît, pas d'un nombre affiché sur un relevé
 * dans vingt ans. La cible est donc réinflatée avant le calcul, puis les
 * montants redescendent à l'affichage — si bien que la courbe arrive exactement
 * sur le chiffre demandé.
 */
export function inflate(amount: Money, inflationBp: number, months: number): Money {
  return money(Math.round(amount * Math.pow(1 + monthlyRate(inflationBp), Math.max(0, months))))
}

/**
 * Les rangs où la lecture s'arrête, en mois — quatre jalons, le dernier étant
 * l'horizon lui-même.
 *
 * Des **quarts de l'horizon**, et non une liste fixe de 5/10/15/20 ans : sur
 * quarante ans, une liste fixe laisserait vingt années sans un seul repère, et
 * sur trois ans elle ne rendrait rien du tout. Les quarts redonnent d'ailleurs
 * 5/10/15/20 sur l'horizon de vingt ans, qui est celui du vecteur de référence.
 *
 * Quatre, parce que le tableau se lit sur un téléphone : un jalon par ligne,
 * un scénario par colonne, et trois scénarios font déjà quatre colonnes avec
 * celle des durées.
 */
export function milestoneMonths(months: number): number[] {
  const horizon = Math.max(0, Math.trunc(months))
  if (horizon === 0) return []

  const marks: number[] = []
  for (let quarter = 1; quarter <= 4; quarter += 1) {
    const mark = quarter === 4 ? horizon : Math.round((horizon * quarter) / 4)
    /* Un horizon de deux mois donnerait deux fois le rang 1 : on ne pose pas
       deux fois la même ligne, et le zéro n'est pas un jalon — c'est le départ,
       que la première colonne du tableau porte déjà. */
    if (mark > 0 && !marks.includes(mark)) marks.push(mark)
  }
  return marks
}
