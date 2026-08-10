/* ============================================================================
 * Projection d'épargne à taux constant par palier.
 *
 * Ce module ne sait faire qu'une chose : dire ce que devient un capital qu'on
 * alimente à cadence régulière, sous une hypothèse de taux qu'on lui donne. Il
 * ne choisit aucun taux, ne connaît aucun produit, et ne connaît pas le
 * document. D'où viennent ses nombres ne le regarde pas — le capital et les
 * versements d'un support (`projectionStart.ts`), un taux essayé à l'écran : la
 * capitalisation est la même (cahier §4.6 ter).
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
  /**
   * Ce qu'on ajoute à chaque échéance, en fin de mois — voir `everyMonths` pour
   * la cadence de ces échéances, qui n'est pas forcément mensuelle.
   */
  monthly: Money
  /** L'horizon, en mois. La série porte `months + 1` points, le départ compris. */
  months: number
  /**
   * Taux annuel **net**, en points de base. 600 = 6,00 %.
   *
   * Un **tableau** quand le taux change en cours de route : `rateBp[k]` est
   * celui du passage du rang `k` au rang `k+1`, et le dernier terme tient
   * jusqu'à l'horizon. Un livret révisé au 1er janvier prochain se projette
   * ainsi à son taux d'aujourd'hui jusqu'au rang qui lui revient, et au
   * suivant après — sans que rien avant ce rang ne bouge.
   *
   * Un scalaire est le cas particulier d'un barème plat. Il n'y a **pas deux
   * moteurs** : il y en a un, dont l'un des arguments peut varier (cahier
   * §4.6 ter).
   */
  rateBp: number | readonly number[]
  /**
   * Tous les combien tombe un versement, en mois. Un — le défaut — verse chaque
   * mois ; trois verse en fin de trimestre, douze en fin d'année.
   *
   * **Ce n'est pas un amortissement, et c'est là tout l'intérêt.** L'app ramène
   * partout ailleurs une échéance au mois (cahier §4.2) parce qu'elle compare
   * des rythmes ; ici elle capitalise, et 1 200 € versés le douzième mois ne
   * valent pas 100 € versés douze fois — le premier n'a produit d'intérêts sur
   * rien pendant onze mois. Verser trimestriellement rend donc un peu moins que
   * verser mensuellement à effort égal, et c'est exactement ce que quelqu'un
   * vient vérifier en changeant la cadence.
   *
   * Le versement tombe sur les rangs multiples de la cadence : le mois 3 pour un
   * trimestre, le 12 pour une année. Le premier mois d'un horizon annuel ne
   * verse donc rien, ce qui est la même convention prudente que « en fin de
   * mois » — entre deux lectures défendables, celle qui promet le moins.
   */
  everyMonths?: number
  /**
   * Inflation annuelle en points de base, pour la lecture en euros constants.
   * Zéro — le défaut — laisse les montants en euros courants.
   */
  inflationBp?: number
  /**
   * Ce qui reste à verser avant le plafond du contrat, capital de départ exclu.
   * Absent — le défaut — ne borne rien.
   *
   * **Les versements s'arrêtent, le capital continue.** Un Livret A plein
   * n'arrête pas de rapporter : son plafond porte sur ce qu'on y **verse**, et
   * ses intérêts passent au-dessus. Une courbe qui s'arrêterait à plat au
   * plafond dirait l'inverse de ce qui se passe.
   *
   * Le dernier versement est **écrêté** plutôt que refusé en entier : il reste
   * 120 € de place et le virement est de 200 € — on verse les 120.
   *
   * Zéro est une réponse : la place est faite, plus rien ne rentre. C'est le cas
   * d'un compte déjà au plafond, et il doit se calculer sans cas particulier.
   */
  room?: number
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
  everyMonths = 1,
  inflationBp = 0,
  room,
}: ProjectionInput): ProjectionSeries {
  const horizon = Math.max(0, Math.trunc(months))
  /* Une cadence au moins mensuelle, et entière : « tous les 0 mois » ne décrit
     rien, et un reste de division par zéro verserait à chaque rang ou jamais
     selon l'humeur du calcul. */
  const every = Math.max(1, Math.trunc(everyMonths))
  /* Le facteur de croissance du mois `k`. Un barème plat n'appelle `Math.pow`
     qu'une fois — le cache le retient par taux, pas par rang —, si bien que le
     vecteur de référence du cahier reste bit à bit celui d'avant le barème. */
  const factors = new Map<number, number>()
  const growthAt = (month: number): number => {
    const annual = typeof rateBp === 'number' ? rateBp : (rateBp[month] ?? rateBp.at(-1) ?? 0)
    const known = factors.get(annual)
    if (known !== undefined) return known
    const factor = 1 + monthlyRate(annual)
    factors.set(annual, factor)
    return factor
  }
  const erosion = 1 + monthlyRate(inflationBp)

  let capital: number = initial
  /* Le versé se compte en euros du jour zéro dès qu'une inflation est posée,
     d'où son propre accumulateur : sans lui, il faudrait déflater une somme
     dont chaque terme est daté différemment. Sans inflation, `discount` reste
     à 1 et les deux accumulateurs redeviennent le même nombre — un seul chemin
     de code, pas deux à tenir d'accord. */
  let paid: number = initial
  let discount = 1
  /* La place restante se décompte en euros **courants** : un plafond de contrat
     est un nombre écrit dans un contrat, il ne se déflate pas avec l'inflation.
     D'où ce compteur à part, quand `paid` peut, lui, être en euros du jour
     zéro.
     Un versement négatif — un compte qu'on vide — ne consomme aucune place :
     borner une reprise n'aurait aucun sens, et le `Math.min` s'en charge sans
     cas particulier puisque la place ne descend jamais. */
  let left = room === undefined ? Number.POSITIVE_INFINITY : Math.max(0, room)

  const balance: Money[] = [money(Math.round(capital))]
  const contributed: Money[] = [money(Math.round(paid))]

  for (let month = 1; month <= horizon; month += 1) {
    /* Le versement du mois, écrêté par ce qui reste de place. Le capital, lui,
       continue de croître : un livret plein rapporte encore.
       Hors échéance, il n'y a rien à verser — et le capital croît quand même,
       ce qui est toute la différence entre une cadence et un amortissement. */
    const due = month % every === 0 ? monthly : ZERO
    const put = due > 0 ? Math.min(due, left) : due
    if (put > 0) left -= put
    capital = capital * growthAt(month - 1) + put
    discount /= erosion
    paid += put * discount
    balance.push(money(Math.round(capital * discount)))
    contributed.push(money(Math.round(paid)))
  }

  return { balance, contributed }
}
