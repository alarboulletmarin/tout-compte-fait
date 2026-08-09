/* ============================================================================
 * Toutes les chaînes de la simulation, et le seul endroit où elles s'écrivent.
 *
 * **Pourquoi pas dans `fr.ts`.** La même raison que `i18n/history.ts`,
 * `i18n/landing.ts` et `i18n/legal.ts` : `fr.ts` est importé par presque tous
 * les composants, donc il vit dans le graphe initial que `scripts/size.mjs`
 * plafonne. L'écran de simulation, lui, se charge à la demande
 * (`app/Routes.tsx`) et emporte sa bibliothèque de graphique.
 *
 * **La prose a beaucoup maigri à l'écran, pas dans le fichier.** L'écran tient
 * en une page qui ne défile pas : ce qui explique vit donc dans les feuilles de
 * réglage, là où le réglage se fait, et le raisonnement complet est derrière
 * « Comprendre cette simulation ». Ce qui reste dans le flux tient en une
 * phrase — la réserve, qui ne se replie jamais.
 *
 * Deux chaînes restent dans `t.savings` : le nom de l'écran et sa phrase de
 * rangée. C'est l'écran Épargne qui porte la porte, et il est chargé d'avance —
 * il doit pouvoir nommer où elle mène sans aller chercher ce qu'il y a derrière.
 * ==========================================================================*/

import { en } from './projection.en'
import { currentLocale, subscribeLocale } from './strings'
import type { Widen } from './widen'

const fr = {
  /* « Simulation » et non « Projections » : le mot dit un outil qu'on ouvre pour
     essayer quelque chose, quand le pluriel nommait une section — c'est-à-dire
     un endroit où l'on rangerait des projections, ce que cet écran ne fait pas. */
  title: 'Simulation',

  /* --- La réserve ---------------------------------------------------------
     Elle ne s'écarte pas et ne se replie pas : c'est la seule chose de cet
     écran qui soit vraie quels que soient les chiffres réglés (cahier §4.6
     ter). Elle est courte parce qu'elle vit dans une page qui ne défile pas —
     le raisonnement complet est dans la feuille d'explication — mais elle dit
     toujours les trois mêmes choses : taux constant, indicatif, ni promesse ni
     conseil. */
  caveat:
    'Simulation à taux constant, indicative : ni une promesse, ni un conseil de placement.',

  /* --- Les deux lectures --------------------------------------------------
     La figure répond à « où ça va », le tableau à « combien, en telle année ».
     Ce sont deux questions et non deux styles, d'où une bascule plutôt qu'un
     repli : le cahier §5 demande de toute façon que tout graphique soit doublé
     d'une lecture textuelle, et celle-ci est à un appui. */
  viewAxis: 'Lecture',
  viewChart: 'Graphique',
  viewTable: 'Tableau',

  /* --- Les réglages, en pilules -------------------------------------------
     Quatre pilules, et chacune **dit sa valeur** plutôt que son nom : « 3
     comptes », « 2,40 % – 5 % », « 10 ans », « Inflation 2 % ». Un écran de
     réglages dont les boutons annoncent « Rendement » et « Durée » oblige à
     ouvrir chaque feuille pour savoir ce qu'on regarde. Le nom, lui, est dans
     l'étiquette accessible : ce qui se lit à l'œil se lit à l'oreille. */
  pillAccounts: 'Comptes simulés',
  accountsOne: '1 compte',
  accountsMany: '%s comptes',
  pillRate: 'Rendement',
  pillAmount: 'Versement',
  pillDuration: 'Durée et cadence',
  pillInflation: 'Inflation',
  inflationOff: 'Sans inflation',
  inflationOn: 'Inflation %s',

  /* --- Le résultat --------------------------------------------------------
     Il est en tête d'écran, avant les réglages, et il ne le quitte pas : on
     vient ici pour tourner des boutons, et régler sans voir ce qu'on change
     revient à jouer à un jeu dont le score est derrière soi. */
  /* « ≈ » sur chaque montant d'arrivée : c'est lui qui dit que le nombre sort
     d'un modèle. Il vit dans les gabarits et non dans le formateur — le
     formateur dit comment un nombre s'écrit, pas ce qu'il vaut. */
  approx: '≈ %s',
  resultIn: 'Dans %s',
  /* La décomposition sous le chiffre : un capital projeté est **trois** choses,
     et un nombre seul les confond. Deux gabarits, parce qu'un compte sans
     capital de départ n'a pas de « 0 € au départ » à annoncer. */
  splitFull: '%s au départ · %s versés · %s de rendement',
  splitPaid: '%s versés · %s de rendement',
  rangeShort: '%s – %s',
  /* Tant que rien ne se calcule, la pilule ne peut pas dire quels taux
     courent : elle dit qu'elle ne le sait pas encore, plutôt qu'un « 0 % » qui
     serait une réponse. */
  rangeUnknown: 'À régler',

  /* --- Quand il n'y a rien à tracer ---------------------------------------
     Deux absences, et elles n'appellent pas le même geste : sans aucun compte
     d'épargne, il faut en créer un — la simulation part du document, pas d'une
     page blanche ; avec des comptes tous décochés, il faut en cocher un. */
  noSupports:
    'La simulation part de tes comptes d’épargne : il en faut au moins un, avec ou sans relevé.',
  newSupport: 'Créer un compte d’épargne',
  pickSupports: 'Coche un compte pour voir sa trajectoire.',

  /* --- Le tracé -----------------------------------------------------------
     Trois aires empilées, et le sommet de la pile est le capital : au départ,
     versé, rendement. C'est ce qui rend visible d'un coup d'œil quelle part
     vient de la poche et quelle part vient du taux — la seule pédagogie que cet
     écran ait à donner. La borne haute passe par-dessus en trait tireté, et dit
     ce que le calcul ne sait pas. */
  chartLabel: 'Projection du capital sur %s',
  layerInitial: 'Au départ',
  layerPaid: 'Versements',
  layerGain: 'Rendement',
  layerHigh: 'Au plus haut',
  start: 'Aujourd’hui',
  chartAt: 'Dans %s',

  /* --- Le tableau ---------------------------------------------------------
     Une ligne par année, et non par quart d'horizon : « dans 7 ans » est une
     question qu'on se pose, « au troisième quart de mon horizon » n'en est pas
     une. */
  tableCaption: 'Le capital, année par année',
  colWhen: 'Durée',
  colPaid: 'Versés',
  colGain: 'Rendement',
  colTotal: 'Capital',
  colHigh: 'Au plus haut',
  tableInitial: 'Capital de départ : %s, le même à tous les rangs.',
  tableHint: 'Montants arrondis : la précision affichée ne dépasse pas celle du calcul.',

  /* --- Les comptes --------------------------------------------------------
     Une carte par compte, et tout ce qui le concerne dedans : la case, son
     versement, son rendement. C'est le cœur de l'écran — un Livret A plafonné
     et un PEA muet n'ont ni la même courbe ni la même incertitude, et les
     régler d'un seul jeu de champs n'aurait décrit ni l'un ni l'autre. */
  /* « Livret A · Alix » : dans un foyer d'une seule personne, le complément ne
     lèverait aucune ambiguïté et ne s'affiche pas. */
  accountOwner: '%s · %s',
  accounts: 'Comptes simulés',
  accountsHint:
    'Chaque compte court à son propre rendement, et la courbe est la somme de leurs trajectoires : il n’y a pas de second calcul. Rien de ce que tu règles ici ne modifie ton épargne.',
  accountAll: 'Tout cocher',
  accountNone: 'Tout décocher',
  accountArrival: '≈ %s à l’arrivée',
  accountArrivalRange: '≈ %s à %s à l’arrivée',
  /* Ce que le capital repris ne dit pas. Un compte sans relevé n'est pas un
     compte à zéro : le taire donnerait un patrimoine faux présenté comme exact,
     ce qui est pire que pas de chiffre du tout. */
  accountNoValue: 'Aucun relevé : la simulation part d’un capital nul.',
  accountFrom: 'Les capitaux sont les derniers relevés, mouvements confirmés depuis compris.',
  accountRulesOne: 'Une règle d’épargne récurrente, ramenée à la cadence choisie.',
  accountRules: '%s règles d’épargne récurrentes, ramenées à la cadence choisie.',
  /* Le piège du domaine, dit à l'endroit où il se produit. Une reconstitution
     d'avance qui court six mois, projetée sur dix ans, ajouterait des milliers
     d'euros que personne n'a l'intention de verser. */
  accountEndingOne: 'Une règle s’arrête avant la fin de la durée simulée : elle n’est pas comptée.',
  accountEnding: '%s règles s’arrêtent avant la fin de la durée simulée : elles ne sont pas comptées.',
  accountVariable: 'Une règle au montant variable n’a pas de mensualité à reprendre.',
  accountNoRule: 'Aucune règle récurrente sur ce compte : à toi de dire ce que tu y verses.',
  /* Le plafond : sur ce qui est versé, jamais sur le solde. Un livret plein
     rapporte encore, et une courbe qui s'arrêterait à plat dirait l'inverse. */
  accountCap: 'Plafond %s · reste %s à verser',
  accountCapFull: 'Plafond %s · déjà atteint',
  accountCapped:
    'Les versements s’arrêtent au plafond pendant la durée simulée ; le capital, lui, continue de croître.',
  capNote:
    'La place restante est calculée sur le capital d’aujourd’hui : les intérêts déjà acquis y sont comptés comme des versements, donc elle est un peu sous-estimée.',

  /* --- Le versement -------------------------------------------------------*/
  amount: 'Versement',
  amountFromRules: 'Repris de tes règles : %s',
  amountReset: 'Reprendre %s',
  amountInvalid: 'Montant illisible.',

  /* --- Le rendement, compte par compte ------------------------------------
     Trois façons de le poser, et une seule à la fois : le taux de la fiche —
     seul à engager le document et seul à porter ses paliers datés —, une valeur
     qu'on essaie, ou une fourchette. Le troisième mode est le défaut d'un
     compte muet : l'app ne devine aucun rendement, et une fourchette large est
     la seule chose honnête à mettre à la place. */
  rate: 'Taux de rendement',
  rateAxis: 'D’où vient le rendement',
  rateOwn: 'Taux du support',
  rateFlat: 'Une valeur',
  rateRange: 'Fourchette',
  rateOwnNote: 'Posé sur la fiche du support, daté : la fourchette ne s’y applique pas.',
  rateDated: 'Un changement de taux est prévu pendant la durée simulée.',
  rateFlatNote: 'Essayé pour cette simulation. La fiche du support n’est pas modifiée.',
  rateRangeNote:
    'Deux hypothèses, et l’écart entre elles est la réponse honnête : personne ne connaît le rendement des années à venir.',
  rateNone: 'Aucun taux posé sur ce compte : c’est la fourchette qui s’applique.',
  rateLow: 'Au plus bas',
  rateHigh: 'Au plus haut',
  rateInvalid: 'Entre 0 et %s %.',
  /* L'unité se lit au bord du champ, pas seulement dans son libellé : « 100 »
     et « 3 » posés l'un sous l'autre ne disent pas lequel est un montant et
     lequel est un pourcentage. */
  unitYear: '%/an',
  /* La nature du taux : une distinction de sens, pas de calcul. Elle se lit
     dans le mot, jamais dans la seule couleur. « Garanti / Hypothèse » laissait
     entendre que l'app savait lequel des deux était vrai — elle ne sait rien du
     contrat, et c'est celui qui coche qui l'affirme. */
  kindGuaranteed: 'Taux garanti',
  kindAssumed: 'Rendement hypothétique',

  /* --- La durée et la cadence ---------------------------------------------
     La cadence n'est pas un détail d'affichage : le moteur capitalise, donc
     1 200 € versés une fois l'an ne valent pas 100 € versés douze fois. C'est
     le seul endroit de l'app où une échéance **n'est pas** ramenée au mois
     (cahier §4.2), et c'est justement ce qu'on vient mesurer. */
  duration: 'Durée',
  durationYears: 'Durée personnalisée',
  durationOther: 'Autre durée',
  durationPreset: '%s ans',
  /* Les bornes viennent des constantes qui les font respecter, jamais d'un
     nombre recopié dans la phrase : un message qui annonce une limite que le
     code n'applique plus est pire qu'un message absent. */
  durationInvalid: 'Entre %s et %s ans.',
  cadence: 'Cadence des versements',
  cadenceMonthly: 'Mensuel',
  cadenceQuarterly: 'Trimestriel',
  cadenceHalf: 'Semestriel',
  cadenceYearly: 'Annuel',
  cadenceHint:
    'À effort égal, verser une fois l’an rend un peu moins que verser tous les mois : l’argent passe moins de temps à produire des intérêts.',
  perMonth: '%s/mois',
  perQuarter: '%s/trimestre',
  perHalf: '%s/semestre',
  perYear: '%s/an',

  /* --- Euros constants ----------------------------------------------------*/
  inflationAxis: 'En quels euros lire',
  inflationCurrent: 'Euros courants',
  inflationConstant: 'Euros d’aujourd’hui',
  inflation: 'Inflation annuelle',
  inflationHint:
    'En euros d’aujourd’hui, chaque montant est déflaté à sa propre date : un versement fait dans dix ans n’a pas le pouvoir d’achat de celui d’aujourd’hui.',
  constantOn: 'Montants en euros d’aujourd’hui, inflation à %s.',

  /* --- Ce qu'il faut savoir, à la demande ---------------------------------
     Sept paragraphes vivaient dans le flux de l'écran. Chacun était juste ;
     ensemble ils donnaient une impression de documentation intercalée dans une
     interface, et personne ne les lisait. Ils sont ici, d'un seul tenant. */
  explain: 'Comprendre cette simulation',
  explainRate: 'Un taux constant n’est pas une trajectoire',
  explainRateBody:
    'Le calcul dit ce qu’un taux constant donnerait, pas ce qui arrivera. Un rendement moyen sur dix ans cache des années hautes et des années basses, et l’ordre dans lequel elles tombent change le résultat. Rien ici n’est une promesse, ni un conseil de placement.',
  explainNet: 'Les taux se saisissent nets',
  explainNetBody:
    'Le rendement espéré, moins les frais annuels, moins la fiscalité qui s’appliquera aux gains. L’app ne modélise ni prélèvement forfaitaire, ni prélèvements sociaux, ni frais de gestion : la fiscalité change, et un barème figé dans le code se lirait comme un calcul faux au premier changement de loi.',
  explainMethod: 'Méthode de calcul',
  explainMethodBody:
    'Les versements sont comptés en fin d’échéance : celui du mois en cours ne produit encore rien. Le rendement est composé mensuellement, au taux équivalent du taux annuel saisi — (1 + r) puissance 1/12, et non r/12, qui rendrait chaque année un peu plus que le taux annoncé.',
  explainSum: 'Compte par compte, puis la somme',
  explainSumBody:
    'Chaque compte coché est projeté avec son capital, son versement et son rendement, et la courbe du haut est l’addition de ces trajectoires. Un portefeuille ne suit aucun taux moyen : un Livret A à 2,40 % et un PEA à 6 % ne se résument pas à 4,20 %, et prétendre le contraire donnerait un chiffre que le détail ne retrouverait pas.',
  explainInflation: 'L’inflation',
  explainInflationBody:
    'Le rendement saisi est net de frais et d’impôt, mais jamais net d’inflation — ce sont deux couches distinctes, et l’option les sépare au lieu de les confondre. En euros d’aujourd’hui, le rendement affiché peut devenir négatif : c’est ce que le taux a produit, moins ce que l’érosion a pris.',
  explainRounding: 'Les arrondis',
  explainRoundingBody:
    'Les montants sont arrondis à ce que le modèle sait dire, et jamais au centime : « ≈ 202 k€ ». Le centime affiché est précisément ce qui fait passer une hypothèse pour une mesure.',
  explainData: 'Ce que l’écran fait de tes données',
  explainDataBody:
    'Il lit le capital de tes comptes, les versements que tes règles récurrentes y posent, les taux que tu as datés sur leurs fiches et leurs plafonds, pour t’éviter de les retaper. La lecture est à sens unique : rien de ce que tu simules ici n’est enregistré, n’entre dans un mois, ni ne ressort dans un export.',

  /* --- Les lectures accessibles -------------------------------------------
     Ce qui se lit à l'œil se lit à l'oreille, ou l'un des deux ment. Le
     tableau porte les chiffres ligne à ligne, et il est à un appui : le
     graphique n'a donc qu'à dire ce qu'il trace et où il arrive. */
  srChart: 'De %s aujourd’hui à %s dans %s.',
  /* Deux gabarits et non un avec un morceau conditionnel : une fourchette et un
     chiffre unique ne se disent pas dans le même ordre à l'oreille, et coudre
     les deux donnerait une phrase qui se lit comme une liste. */
  srChartRange: 'De %s aujourd’hui à une fourchette de %s à %s dans %s.',
  srContributed: 'Versements cumulés : %s à l’arrivée.',

  /* --- La durée, en toutes lettres ----------------------------------------
     Deux clés par unité plutôt qu'un pluriel calculé, comme partout ailleurs
     dans les fichiers d'i18n de l'app. */
  yearOne: '1 an',
  years: '%s ans',
  monthOne: '1 mois',
  months: '%s mois',
  /* « 2 ans 6 mois » : un horizon en années pleines n'en a pas besoin, mais la
     dernière ligne du tableau peut tomber ailleurs. */
  yearsAndMonths: '%s %s',
} as const

export type ProjectionStrings = Widen<typeof fr>

/**
 * Les chaînes de la simulation, dans la langue active.
 *
 * Même mécanique que `history.ts`, `landing.ts` et `legal.ts` : une liaison
 * d'export vivante, et les deux langues dans le même morceau — celui-ci est
 * déjà hors du graphe initial.
 */
export let projection: ProjectionStrings = currentLocale() === 'en' ? en : fr

subscribeLocale(() => {
  projection = currentLocale() === 'en' ? en : fr
})
