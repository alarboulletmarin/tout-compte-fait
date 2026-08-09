/* ============================================================================
 * Toutes les chaînes des projections, et le seul endroit où elles s'écrivent.
 *
 * **Pourquoi pas dans `fr.ts`.** La même raison que `i18n/history.ts`,
 * `i18n/landing.ts` et `i18n/legal.ts` : `fr.ts` est importé par presque tous
 * les composants, donc il vit dans le graphe initial que `scripts/size.mjs`
 * plafonne. L'écran des projections, lui, se charge à la demande
 * (`app/Routes.tsx`) et emporte son propre tracé SVG.
 *
 * **La prose a beaucoup maigri à l'écran, pas dans le fichier.** Elle était dans
 * le flux — sept paragraphes entre les champs, chacun juste, l'ensemble
 * illisible : une documentation financière intercalée dans une interface. Elle
 * est passée derrière « Comprendre cette projection », d'un seul tenant, là où
 * on la lit une fois. Ce qui reste dans le flux tient en deux phrases : la
 * réserve, qui ne se replie jamais, et la nature du taux, qui change ce que le
 * chiffre engage.
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

  /* --- La réserve ---------------------------------------------------------
     Elle ne s'écarte pas et ne se replie pas : c'est la seule chose de cet
     écran qui soit vraie quels que soient les chiffres saisis (cahier §4.6
     ter). Elle a raccourci en passant sous le résultat — le raisonnement
     complet est dans la feuille — mais elle dit toujours les trois mêmes
     choses : taux constant, indicatif, ni promesse ni conseil. */
  caveat:
    'Simulation à taux constant. Ce résultat est indicatif : ce n’est ni une promesse, ni un conseil de placement.',

  /* --- Ce qu'on cherche ---------------------------------------------------
     Deux problèmes inverses, et les libellés le disent maintenant par le
     verbe : « Ce que ça donne » et « Ce qu'il faut verser » décrivaient la
     sortie, ce qui oblige à la deviner avant de choisir. Un mode se choisit
     sur l'intention — je projette, ou je vise. */
  modeAxis: 'Ce qu’on cherche',
  modeForecast: 'Projeter mon épargne',
  modeTarget: 'Atteindre un objectif',

  /* --- Le point de départ -------------------------------------------------
     L'écran ne lisait rien du document, et repartait donc de zéro à chaque
     visite pendant que l'écran Épargne affichait le capital deux écrans plus
     haut. Il lit désormais — dans un seul sens. */
  source: 'Point de départ',
  sourceFree: 'Simulation libre',
  /* « Toute l'épargne de Camille », jamais « toute l'épargne du foyer » : deux
     personnes qui ont 12 000 € et 8 000 € de côté n'ont pas 20 000 €, elles ont
     deux comptes et deux décisions (cahier §4.6 bis). */
  sourceMine: 'Toute mon épargne',
  sourceMember: 'Toute l’épargne %s',
  sourceCapital: 'Épargne actuelle',
  sourceMonthly: 'Versements prévus',
  /* D'où sort chaque chiffre, sous le chiffre. Un montant repris sans sa
     provenance est un montant qu'il faut croire sur parole — et « 616 €/mois »
     posé sans rien à côté n'apprend pas qu'il s'agit de la somme de trois
     règles, ni lesquelles ont été laissées de côté. */
  sourceFromOne: 'Dernier relevé, mouvements confirmés depuis compris.',
  sourceFrom: 'Somme des derniers relevés de %s supports, mouvements confirmés depuis compris.',
  sourceRulesOne: 'Une règle d’épargne récurrente, ramenée au mois.',
  sourceRules: '%s règles d’épargne récurrentes, ramenées au mois.',
  /* Le piège du module, dit à l'endroit où il se produit. Une reconstitution
     d'avance qui court six mois, projetée sur dix ans, ajouterait des milliers
     d'euros que personne n'a l'intention de verser. */
  sourceEndingOne: 'Une règle s’arrête avant la fin de la durée simulée : elle n’est pas comptée.',
  sourceEnding: '%s règles s’arrêtent avant la fin de la durée simulée : elles ne sont pas comptées.',
  sourceOneOff: 'Les versements ponctuels comptent dans le capital, mais pas dans ce montant.',
  sourceNote: 'Repris de ton épargne. Rien de ce qui se simule ici ne la modifie.',
  sourceEdit: 'Modifier pour cette simulation',
  /* Ce que le capital repris ne dit pas. Un support sans relevé n'est pas un
     support à zéro : le taire donnerait un patrimoine faux présenté comme
     exact, ce qui est pire que pas de chiffre du tout. */
  sourceNoValue: 'Aucun relevé sur ce support : la simulation part d’un capital nul.',
  sourceUnvaluedOne: 'Un support sans relevé ne compte pas dans ce capital.',
  sourceUnvalued: '%s supports sans relevé ne comptent pas dans ce capital.',
  sourceNoMonthly: 'Aucun versement récurrent n’est déclaré : la simulation n’en ajoute aucun.',
  sourceVariable: 'Une règle au montant variable n’a pas de mensualité à reprendre.',
  /* Elle disait « l'app n'en prête aucun à un support », ce qui est devenu faux
     le jour où un support a pu porter son taux. Ce que la phrase visait tient
     toujours : l'app ne **devine** aucun rendement — elle relit celui que son
     propriétaire a tapé, et signale ceux qu'elle a dû emprunter à l'écran. */
  sourceNoRate:
    'Le rendement reste une hypothèse : l’app n’en devine aucun — ceux qui sont repris sont ceux que tu as posés.',

  /* --- Les entrées --------------------------------------------------------*/
  params: 'Paramètres',
  initial: 'Capital actuel',
  monthly: 'Versement mensuel',
  target: 'Objectif',
  targetHint: 'Ce qu’on veut avoir au bout de la durée, capital actuel compris.',
  duration: 'Durée',
  durationYears: 'Durée personnalisée',
  durationOther: 'Autre durée',
  /* Les quatre raccourcis du cahier. Le champ reste la vérité — sans lui, un
     horizon de sept ans serait inatteignable — mais il ne s'affiche plus en
     permanence : deux contrôles pour une seule donnée en font un de trop. */
  durationPreset: '%s ans',
  /* Les bornes viennent des constantes qui les font respecter, jamais d'un
     nombre recopié dans la phrase : un message qui annonce une limite que le
     code n'applique plus est pire qu'un message absent. */
  durationInvalid: 'Entre %s et %s ans.',
  amountInvalid: 'Montant illisible.',
  rateInvalid: 'Entre 0 et %s %.',
  /* L'unité se lit au bord du champ, pas seulement dans son libellé : « 100 »
     et « 3 » posés l'un sous l'autre ne disent pas lequel est un montant et
     lequel est un pourcentage. Celle des montants se compose à partir du symbole
     de la devise (`perMonth`) — l'app ne convertit rien, mais elle n'écrit pas
     « € » en dur non plus. */
  unitYear: '%/an',

  /* --- Les hypothèses -----------------------------------------------------
     Trois au plus, et la limite est dure : au-delà, les courbes superposées
     ne se lisent plus sur un téléphone, et un quatrième trait n'ajoute pas une
     information — il en retire trois. */
  scenarios: 'Hypothèses de rendement',
  scenariosHint:
    'Jusqu’à trois, aux mêmes versements. Compare plusieurs hypothèses plutôt que de prendre un taux pour une prévision.',
  scenarioRate: 'Rendement annuel net',
  scenarioAdd: 'Comparer une hypothèse',
  scenarioRemove: 'Retirer l’hypothèse à %s',
  scenarioLabel: 'Hypothèse à %s',
  /* La nature du taux : une distinction de sens, pas de calcul. Elle se lit
     dans le mot et dans la forme du trait, jamais dans la seule couleur.
     « Garanti / Hypothèse » laissait entendre que l'app savait lequel des deux
     était vrai — elle ne sait rien du contrat, et c'est celui qui coche qui
     l'affirme. Le libellé le dit donc au lieu de le suggérer. */
  kindAxis: 'Type de taux',
  kindGuaranteed: 'Taux garanti',
  kindAssumed: 'Rendement hypothétique',
  /* Un Livret A n'est pas « garanti à dix ans » parce que son taux du jour est
     connu : il est révisé au 1er février et au 1er août. C'est exactement la
     confusion que cette phrase existe pour empêcher. */
  kindGuaranteedHint:
    'À n’utiliser que si ce taux est contractuellement garanti sur toute la durée simulée. Un taux connu aujourd’hui — celui d’un livret réglementé — ne l’est pas : il est révisé.',
  kindAssumedHint: 'Rien n’est promis — actions, unités de compte. Le taux n’engage que toi.',

  /* --- Le résultat --------------------------------------------------------
     Il est en tête d'écran, avant les paramètres, et c'est le seul changement
     de cet écran qui compte vraiment : on ouvre /projections pour savoir où
     l'on arrive, pas pour remplir un formulaire. */
  /* « ≈ » sur chaque montant d'arrivée : c'est lui qui dit que le nombre sort
     d'un modèle. Il vit dans les gabarits et non dans le formateur — le
     formateur dit comment un nombre s'écrit, pas ce qu'il vaut. */
  approx: '≈ %s',
  resultIn: 'Dans %s',
  /* La décomposition sous le chiffre : un capital projeté est trois choses, et
     un nombre seul les confond. */
  resultSplit: '%s versés · %s de rendement',
  resultBasis: 'Simulation avec %s · %s',
  perMonth: '%s/mois',
  perYear: '%s/an',
  interestShare: 'Le rendement représente ≈ %s du capital final.',
  /* Le mode inverse répond par un versement, pas par un capital : c'est lui le
     chiffre héros, et la cible passe en surtitre. */
  targetHeading: 'Pour atteindre %s dans %s',
  requiredMonthly: 'Versement requis',
  totalPaid: 'Versé en tout',
  targetReached: 'Le capital actuel suffit déjà : il n’y a rien à verser.',
  targetMissing: 'Indique un objectif pour savoir combien verser.',
  nothingToPlot: 'Indique un versement mensuel ou un capital actuel.',

  /* Chaque ligne dit ce qu'elle est, et la suivante d'où elle sort. « Versements
     ≈ 67 k€ » ne répond pas à « c'est le total sur dix ans, ça ? » — alors que
     « 616 €/mois pendant 10 ans » y répond sans qu'on ait à poser la question. */
  breakdownInitial: 'Capital de départ',
  breakdownInitialFrom: 'Ce que tu as déjà, aujourd’hui.',
  breakdownPaid: 'Versements',
  breakdownPaidFrom: '%s pendant %s.',
  breakdownInterest: 'Rendement',
  breakdownInterestFrom: '%s, composé chaque mois.',
  breakdownTotal: 'Capital projeté',

  /* --- Le tracé -----------------------------------------------------------*/
  chart: 'Projection',
  chartLabel: 'Projection du capital sur %s',
  chartAt: 'Dans %s',
  chartCursor: 'Lecture de la projection',
  /* Les deux bandes empilées : le haut de la pile est le capital. C'est ce qui
     rend visible d'un coup d'œil quelle part vient de la poche et quelle part
     vient du taux — la seule pédagogie que cet écran ait à donner. */
  contributedArea: 'Versements',
  interest: 'Rendement',
  start: 'Aujourd’hui',

  /* --- Le détail ----------------------------------------------------------
     Le tableau doit exister : une courbe ne se lit pas au chiffre près, et le
     cahier §5 demande que tout graphique soit doublé d'une lecture textuelle.
     Il passe derrière un repli parce que le curseur du tracé répond désormais à
     la même question au doigt — mais il reste, et il s'ouvre. */
  milestones: 'Voir le détail dans le temps',
  milestonesHint: 'Montants arrondis : la précision affichée ne dépasse pas celle du calcul.',
  milestoneWhen: 'Durée',
  /* La décomposition par support : une colonne par compte, plus le total. Un
     Livret A à 3 % et un PEA à 6 % qui partent de capitaux différents ne
     suivent pas la même courbe, et leur somme n'est celle d'aucun taux moyen —
     c'est la seule lecture qui dise *où* le capital se trouve. */
  splitTotal: 'Capital total',
  splitRates: 'un taux par support',
  /* Un support sans hypothèse emprunte celle de l'écran, et la colonne le dit :
     sans cette marque, il passerait pour un support renseigné. */
  splitBorrowed: '%s (hypothèse de l’écran)',
  splitSimulated: '%s (simulé)',
  splitDated: '%s (taux daté)',
  splitOwn: 'Chaque support à son hypothèse ; ceux qui n’en portent pas prennent celle de l’écran.',
  /* Le tracé décomposé : une bande par compte, et le haut de la pile *est* le
     total. On n'empile que ce qui s'additionne — deux supports, oui ; deux
     hypothèses de rendement posées sur le même versé, jamais. */
  chartStack: 'Capital par support',
  chartTotal: 'Total',
  srChartStack: 'De %s à %s en %s, réparti sur %s supports.',

  /* --- Le rendement, support par support ----------------------------------
     Projeter tout le portefeuille d'une personne sous un taux unique n'a aucun
     sens : deux comptes ne suivent pas la même courbe, et leur somme n'est
     celle d'aucun taux moyen. Ce qui se tape ici ne vaut que pour la
     simulation — la fiche du support reste le seul endroit où un taux
     s'enregistre, daté. */
  supportRates: 'Rendement par support',
  supportRatesHint:
    'Chaque compte part du taux posé sur sa fiche. Ce que tu changes ici ne vaut que pour cette simulation, et ne modifie pas ton épargne.',
  supportRateOwn: 'Posé sur ce support',
  supportRateDated: 'Un changement de taux est prévu pendant la durée simulée.',
  supportRateBorrowed: 'Aucun taux posé : l’hypothèse ci-dessous s’applique.',
  supportRateSimulated: 'Modifié pour cette simulation',
  supportRateReset: 'Reprendre le taux du support',
  /* La fourchette : deux taux sur un même compte. C'est la seule façon honnête
     de projeter un placement qui fluctue — un PEA n'a pas *un* rendement, il en
     a eu 3 % une décennie et 11 % une autre. Une fourchette ne promet rien,
     elle montre l'écart. */
  supportCompare: 'Comparer un second taux',
  supportComparedRate: 'Second taux',
  supportCompareDrop: 'Retirer la comparaison',
  supportCompareHint: 'Mêmes versements, même durée : seul le rendement change.',
  supportRange: 'de %s à %s',
  comparedHeading: 'Avec les seconds taux',
  comparedTotal: 'Capital comparé',
  comparedGap: '%s d’écart. À versements égaux, tout l’écart vient du rendement.',
  comparedLine: 'Seconds taux',
  /* Le plafond : sur ce qui est versé, jamais sur le solde. Un livret plein
     rapporte encore, et une courbe qui s'arrêterait à plat dirait l'inverse. */
  supportCap: 'Plafond %s · reste %s à verser',
  supportCapFull: 'Plafond %s · déjà atteint',
  supportCapped:
    'Les versements s’arrêtent au plafond pendant la durée simulée ; le capital, lui, continue de croître.',
  capNote:
    'La place restante est calculée sur le capital d’aujourd’hui : les intérêts déjà acquis y sont comptés comme des versements, donc elle est un peu sous-estimée.',
  screenRateHint: 'Elle s’applique aux supports qui ne portent aucun taux.',

  /* --- Le détail du point de départ ---------------------------------------*/
  sourceParts: 'Compte par compte',
  sourcePartCapital: 'Capital',
  sourcePartMonthly: 'Versements',
  sourcePartTotal: 'Total',

  /* --- L'effort d'épargne -------------------------------------------------
     La seule lecture actionnable du mode direct : « combien j'aurai » se
     contemple, « ce que 150 € de plus changeraient » se décide. */
  effort: 'Et si je verse davantage ?',
  effortHint: 'À la première hypothèse, sur la même durée.',
  effortCurrent: 'Simulation en cours',
  /* Sur un portefeuille décomposé, l'effort se répartit au prorata : sans le
     détail, on saurait combien verser sans savoir où. */
  effortParts: 'Dont : %s',
  /* Un barreau se clique pour l'essayer, jamais pour l'adopter : c'est la même
     bascule que « Modifier pour cette simulation » (`source`), déclenchée
     depuis une ligne plutôt que depuis le panneau d'origine. L'échelle ne
     recommande toujours rien — cliquer n'est pas plus une préconisation que la
     lire ne l'était. */
  effortApply: 'Simuler avec %s',

  /* --- Euros constants ----------------------------------------------------*/
  constant: 'Tenir compte de l’inflation',
  constantHint: 'Affiche le pouvoir d’achat équivalent, en euros d’aujourd’hui.',
  inflation: 'Inflation annuelle',
  constantOn: 'Montants en euros d’aujourd’hui, inflation à %s.',
  /* Ce que l'option change, sur les chiffres qu'on a sous les yeux : la phrase
     abstraite ne suffisait pas à faire comprendre l'intérêt de la case. */
  constantExample: '%s dans %s correspondraient à environ %s d’aujourd’hui.',

  /* --- Ce qu'il faut savoir, à la demande ---------------------------------
     Sept paragraphes vivaient dans le flux de l'écran. Chacun était juste ;
     ensemble ils donnaient une impression de documentation intercalée dans une
     interface, et personne ne les lisait. Ils sont ici, d'un seul tenant. */
  explain: 'Comprendre cette projection',
  explainRate: 'Un taux constant n’est pas une trajectoire',
  explainRateBody:
    'Le calcul dit ce qu’un taux constant donnerait, pas ce qui arrivera. Un rendement moyen sur dix ans cache des années hautes et des années basses, et l’ordre dans lequel elles tombent change le résultat. Rien ici n’est une promesse, ni un conseil de placement.',
  explainNet: 'Les taux se saisissent nets',
  explainNetBody:
    'Le rendement espéré, moins les frais annuels, moins la fiscalité qui s’appliquera aux gains. L’app ne modélise ni prélèvement forfaitaire, ni prélèvements sociaux, ni frais de gestion : la fiscalité change, et un barème figé dans le code se lirait comme un calcul faux au premier changement de loi.',
  explainMethod: 'Méthode de calcul',
  explainMethodBody:
    'Les versements sont comptés en fin de mois : celui du mois en cours ne produit encore rien. Le rendement est composé mensuellement, au taux équivalent du taux annuel saisi — (1 + r) puissance 1/12, et non r/12, qui rendrait chaque année un peu plus que le taux annoncé.',
  explainInflation: 'L’inflation',
  explainInflationBody:
    'En euros d’aujourd’hui, chaque montant est déflaté à sa propre date : un versement fait dans dix ans n’a pas le pouvoir d’achat de celui d’aujourd’hui. Le rendement saisi est net de frais et d’impôt, mais jamais net d’inflation — ce sont deux couches distinctes, et l’option les sépare au lieu de les confondre.',
  explainRounding: 'Les arrondis',
  explainRoundingBody:
    'Les montants sont arrondis à ce que le modèle sait dire, et jamais au centime : « ≈ 202 k€ ». Le centime affiché est précisément ce qui fait passer une hypothèse pour une mesure.',
  explainData: 'Ce que l’écran fait de tes données',
  explainDataBody:
    'Il peut lire le capital d’un support et les versements que tes règles récurrentes y posent, pour t’éviter de les retaper. La lecture est à sens unique : rien de ce que tu simules ici n’est enregistré, n’entre dans un mois, ni ne ressort dans un export. Le rendement n’est jamais repris d’un support — c’est toi qui le poses.',

  /* --- Les lectures accessibles -------------------------------------------
     Ce qui se lit à l'œil se lit à l'oreille, ou l'un des deux ment. Le
     tableau porte déjà les chiffres ligne à ligne : le graphique n'a donc
     qu'à dire ce qu'il trace et où il arrive. */
  srChart: '%s : de %s aujourd’hui à %s dans %s.',
  srScenario: 'Hypothèse à %s, %s',
  srContributed: 'Versements cumulés : %s à l’arrivée.',

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

  /* --- L'étage suivant ----------------------------------------------------
     Nommé et non promis : comparer mois après mois le simulé au réel est un
     chantier à part (cahier §4.6 ter), et un écran qui annoncerait une date se
     tromperait. */
  plansAhead:
    'Comparer une hypothèse à ce qui est réellement versé, mois après mois, viendra plus tard : pour l’instant l’écran lit ton épargne, il ne la suit pas.',
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
