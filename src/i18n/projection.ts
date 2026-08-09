/* ============================================================================
 * Toutes les chaînes des projections, et le seul endroit où elles s'écrivent.
 *
 * **Pourquoi pas dans `fr.ts`.** La même raison que `i18n/history.ts`,
 * `i18n/landing.ts` et `i18n/legal.ts` : `fr.ts` est importé par presque tous
 * les composants, donc il vit dans le graphe initial que `scripts/size.mjs`
 * plafonne. L'écran des projections, lui, se charge à la demande
 * (`app/Routes.tsx`) et emporte son propre tracé SVG. Sa prose — et elle est
 * longue, parce que ce que l'écran refuse de faire demande plus de mots que ce
 * qu'il fait — n'a pas plus de raison qu'elle de peser sur l'écran du mois.
 *
 * Deux chaînes restent dans `t.savings` : le nom de l'écran et sa phrase de
 * rangée. C'est l'écran Épargne qui porte la porte, et il est chargé d'avance —
 * il doit pouvoir nommer où elle mène sans aller chercher ce qu'il y a derrière.
 * ==========================================================================*/

import { en } from './projection.en'
import { currentLocale, subscribeLocale } from './strings'
import type { Widen } from './widen'

const fr = {
  title: 'Projections',

  /* --- Le cadre, avant le premier chiffre ---------------------------------
     L'écran existe parce que les simulateurs bancaires font le travail à
     l'envers : taux figé et flatteur, euros courants, précision à l'euro sur
     vingt ans. Ce sont des outils de vente. Ici il n'y a rien à vendre, donc
     rien qui oblige à promettre — et le dire est la première chose que
     l'écran fait, pas une note en bas de page. */
  lead: 'Ce qu’un versement régulier devient, sous une hypothèse de taux que tu poses.',
  /* L'autre lecture, et la seule que l'app soit seule à pouvoir produire : une
     banque connaît le solde d'un livret et ignore ce qu'on y verse, un
     simulateur connaît le versement et ignore le solde. Ici les deux bouts sont
     là — d'où une projection qui ne demande **aucune** saisie sauf le taux. */
  supportsLead:
    'Ce que tes comptes deviennent, à partir de ce que l’app sait déjà : leur capital d’aujourd’hui, et les versements que tes récurrences posent chaque mois.',
  /* La phrase fixe du cahier §4.6 ter. Elle ne s'écarte pas et ne se replie
     pas : c'est la seule chose de cet écran qui soit vraie quels que soient
     les chiffres saisis. */
  caveat:
    'Un taux moyen n’est pas une trajectoire : à taux constant, le calcul dit ce qu’un taux constant donnerait, pas ce qui arrivera. Rien ici n’est une promesse, ni un conseil de placement.',
  /* Ce que l'app ne calcule pas, dit une fois, en clair. Le taux saisi est
     net : la fiscalité française change, et la figer dans le code la rendrait
     fausse au premier changement de loi — un barème périmé se lit comme un
     calcul faux. */
  netRate:
    'Les taux se saisissent nets : le rendement espéré, moins les frais annuels, moins la fiscalité qui s’appliquera aux gains. L’app ne modélise ni prélèvement forfaitaire, ni prélèvements sociaux, ni frais de gestion.',

  /* --- D'où partent les chiffres ------------------------------------------
     La seule chose qui sépare les deux lectures de l'écran. « Chiffres libres »
     et non « Simulateur » : les deux simulent, et le mot ne dirait pas ce qui
     change. Ce qui change est l'origine des nombres — les tiens, ou ceux que tu
     tapes. */
  sourceAxis: 'D’où l’on part',
  sourceSupports: 'Mes supports',
  sourceFree: 'Chiffres libres',

  /* --- Ce qu'on cherche ---------------------------------------------------
     Deux questions, et la seconde est la plus utile : « combien j'aurai » se
     contemple, « combien dois-je verser » se fait. */
  modeAxis: 'Ce qu’on cherche',
  modeForecast: 'Ce que ça donne',
  modeTarget: 'Ce qu’il faut verser',

  /* --- Les entrées --------------------------------------------------------*/
  initial: 'Capital de départ',
  initialHint: 'Ce qui est déjà placé. Vide, on part de zéro.',
  monthly: 'Versement mensuel',
  monthlyHint: 'Compté en fin de mois : celui du mois en cours ne produit encore rien.',
  target: 'Montant visé',
  targetHint: 'Ce qu’on veut avoir au bout de la durée, capital de départ compris.',
  duration: 'Durée',
  durationYears: 'Nombre d’années',
  /* Les quatre raccourcis du cahier. Le champ reste la vérité : les pilules le
     règlent, elles ne le remplacent pas — sans quoi un horizon de sept ans
     serait inatteignable. */
  durationPreset: '%s ans',
  /* Les bornes viennent des constantes qui les font respecter, jamais d'un
     nombre recopié dans la phrase : un message qui annonce une limite que le
     code n'applique plus est pire qu'un message absent. */
  durationInvalid: 'Entre %s et %s ans.',
  amountInvalid: 'Montant illisible.',
  rateInvalid: 'Entre 0 et %s %.',

  /* --- Les scénarios ------------------------------------------------------
     Trois au plus, et la limite est dure : au-delà, les courbes superposées
     ne se lisent plus sur un téléphone, et un quatrième trait n'ajoute pas une
     information — il en retire trois. */
  scenarios: 'Hypothèses de taux',
  scenariosHint: 'Jusqu’à trois, aux mêmes versements. C’est la comparaison qui informe, pas un chiffre seul.',
  scenarioRate: 'Taux annuel net',
  scenarioAdd: 'Ajouter une hypothèse',
  scenarioRemove: 'Retirer l’hypothèse à %s',
  scenarioLabel: 'Hypothèse à %s',
  /* La nature du taux : une distinction de sens, pas de calcul. Elle se lit
     dans le mot et dans la forme du trait, jamais dans la seule couleur. */
  kindAxis: 'Nature du taux',
  kindGuaranteed: 'Garanti',
  kindAssumed: 'Hypothèse',
  kindGuaranteedHint: 'Connu d’avance et révisable — livret réglementé, fonds euros.',
  kindAssumedHint: 'Rien n’est promis — actions, unités de compte. Le taux n’engage que toi.',

  /* --- Euros constants ----------------------------------------------------*/
  constant: 'Lire en euros d’aujourd’hui',
  constantHint:
    'Déflate les montants de l’inflation, pour qu’ils se comparent à ce que l’argent vaut maintenant.',
  inflation: 'Inflation annuelle',
  constantOn: 'Montants en euros d’aujourd’hui, inflation à %s.',

  /* --- Les sorties --------------------------------------------------------*/
  /* « ≈ » sur chaque montant d'arrivée : c'est lui qui dit que le nombre sort
     d'un modèle. Il vit dans les gabarits et non dans le formateur — le
     formateur dit comment un nombre s'écrit, pas ce qu'il vaut. */
  approx: '≈ %s',
  chart: 'Ce que ça devient',
  chartLabel: 'Projection du capital sur %s',
  contributed: 'Ce que tu auras versé',
  interest: 'Ce que le taux aura produit',
  /* L'aire sous les courbes : c'est elle qui rend les intérêts visibles, et
     c'est la seule chose qu'une courbe seule ne montre pas. */
  contributedArea: 'Versements cumulés',
  start: 'Aujourd’hui',

  /* Le tableau doit exister : une courbe ne se lit pas au doigt, et le cahier
     §5 demande que tout graphique soit doublé d'une lecture textuelle. */
  milestones: 'Aux jalons',
  milestonesHint: 'Montants arrondis : la précision affichée ne dépasse pas celle du calcul.',
  milestoneWhen: 'Durée',
  requiredMonthly: 'Versement requis',
  totalPaid: 'Versé en tout',
  /* Le mode inverse n'a pas de réponse à donner quand le capital de départ
     dépasse déjà la cible — et « 0,00 € par mois » n'en est pas une. */
  targetReached: 'Le capital de départ suffit déjà : il n’y a rien à verser.',
  targetMissing: 'Indique un montant visé pour savoir combien verser.',
  nothingToPlot: 'Indique un versement mensuel ou un capital de départ.',

  /* --- La lecture branchée sur les vrais comptes --------------------------
     Elle dit d'abord d'où viennent ses chiffres, parce que c'est ce qui la
     distingue de tout ce qui existe ailleurs — et parce qu'un nombre qu'on n'a
     pas tapé se croit sur parole tant qu'on ne sait pas d'où il sort. */
  supportsReads:
    'Le point de départ est ton dernier relevé, plus les mouvements confirmés depuis. Les versements viennent de tes récurrences d’épargne. Le taux vient de toi : l’app n’en connaît aucun, et n’écrit rien de tout ceci dans tes données.',
  /* L'épargne se lit au nom de quelqu'un, et le total le dit : un chiffre de
     cette taille sans propriétaire à côté se lirait comme une somme du foyer —
     celle que le cahier §4.6 bis refuse d'afficher. */
  supportsOwner: 'Épargne %s',
  supportsTotal: 'Capital total',
  supportsArrival: 'À l’arrivée',
  /* L'aire porte le capital d'aujourd'hui **et** les versements : sur cette
     lecture-ci, la ligne de départ n'est pas zéro, et l'appeler « versements
     cumulés » ferait passer un capital déjà là pour de l'argent versé demain. */
  supportsPaid: 'Capital d’aujourd’hui et versements',
  /* Une inconnue n'est pas un zéro : un support jamais relevé sort de la courbe
     et du total, et l'écran le dit plutôt que de le compter pour rien. */
  supportsUnvaluedOne: '1 support n’a aucun relevé : il n’entre ni dans la courbe ni dans le total.',
  supportsUnvalued:
    '%s supports n’ont aucun relevé : ils n’entrent ni dans la courbe ni dans le total.',
  supportsNoValue:
    'Aucun de tes supports n’a de relevé : l’app ne sait pas d’où partir. Relève tes comptes une fois — ensuite, tes versements s’y ajoutent tout seuls.',
  supportsUnreadable: 'Saisie illisible : %s n’entre pas dans le total.',

  /* La ligne d'un support. Le capital de départ est un **fait**, et il ne
     s'édite pas ici : le corriger se fait par un relevé, là où les relevés se
     posent. Le versement, lui, s'essaie — c'est la seule chose de l'écran qui
     se simule, et elle se signale quand elle est simulée. */
  supportStart: 'Capital estimé %s · %s',
  supportNoValue: 'Aucun relevé — ce support n’entre pas dans la courbe.',
  supportIn: '%s dans %s',
  supportFromRules: 'Tes récurrences posent %s par mois.',
  supportNoRule: 'Aucune récurrence n’alimente ce support : le versement projeté est celui d’ici.',
  supportTried: 'Versement simulé — tes récurrences ne bougent pas (%s par mois).',
  supportReset: 'Revenir au versement réel',
  supportVariableOne: '1 récurrence à montant variable n’est pas comptée.',
  supportVariable: '%s récurrences à montant variable ne sont pas comptées.',

  /* --- Les lectures accessibles -------------------------------------------
     Ce qui se lit à l'œil se lit à l'oreille, ou l'un des deux ment. Le
     tableau porte déjà les chiffres ligne à ligne : le graphique n'a donc
     qu'à dire ce qu'il trace et où il arrive. */
  srChart: '%s : de %s aujourd’hui à %s dans %s.',
  srScenario: 'Hypothèse à %s, %s',
  srContributed: 'Versements cumulés : %s à l’arrivée.',
  srPaid: 'Capital d’aujourd’hui et versements : %s à l’arrivée.',

  /* --- La durée, en toutes lettres ----------------------------------------
     Deux clés par unité plutôt qu'un pluriel calculé, comme partout ailleurs
     dans les fichiers d'i18n de l'app. */
  yearOne: '1 an',
  years: '%s ans',
  monthOne: '1 mois',
  months: '%s mois',
  /* « 2 ans 6 mois » : le quart d'un horizon de dix ans ne tombe pas sur une
     année pleine, et l'arrondir à « 2 ans » ferait mentir le montant posé à
     côté. */
  yearsAndMonths: '%s %s',

  /* --- Ce que chaque lecture ne fait pas -----------------------------------
     La phrase du bas du simulateur. Elle disait « cet écran ne lit rien de tes
     données » : c'était vrai de l'écran entier, ça ne l'est plus que de cette
     lecture-ci, et une phrase qui survit à ce qu'elle décrit ment. Elle nomme
     donc ce qu'elle est, et l'autre position qui fait le contraire.

     L'étage suivant reste nommé et non promis : comparer mois après mois le
     prévu au confirmé — l'adhérence, l'écart cumulé — est un chantier à part
     (cahier §4.6 ter), et un écran qui annoncerait une date se tromperait. */
  freeNote:
    'Cette lecture ne touche pas à tes données : elle part des chiffres que tu tapes, et rien d’autre. Pour partir de tes vrais comptes, choisis « Mes supports ».',
  plansAhead:
    'Comparer une hypothèse à ce qui est réellement versé, mois après mois, viendra plus tard : cet écran projette, il ne mesure pas encore l’écart.',
} as const

export type ProjectionStrings = Widen<typeof fr>

/**
 * Les chaînes des projections, dans la langue active.
 *
 * Même mécanique que `history.ts`, `landing.ts` et `legal.ts` : une liaison
 * d'export vivante, et les deux langues dans le même morceau — celui-ci est
 * déjà hors du graphe initial.
 */
export let projection: ProjectionStrings = currentLocale() === 'en' ? en : fr

subscribeLocale(() => {
  projection = currentLocale() === 'en' ? en : fr
})
