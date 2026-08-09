/* ============================================================================
 * Le jeu d'exemple — cinq ans d'un foyer, pour voir l'app pleine sans rien saisir.
 *
 * Une app neuve n'a rien à montrer : pas de courbe, pas de répartition, pas de
 * capital restant dû. Tout ce qui fait l'intérêt du produit demande des mois de
 * données, et personne ne saisit cinq ans d'historique pour décider s'il va
 * s'en servir.
 *
 * **Cinq ans, et non quinze mois.** La durée n'est pas une quantité, c'est une
 * qualité : un an et demi montre des lignes, cinq ans montrent une **vie**. Un
 * crédit auto va jusqu'à son terme et un autre le remplace ; un foyer locataire
 * achète, et le loyer cède la place à une mensualité, une taxe foncière et une
 * assurance plus chère ; un alternant devient salarié, et le prorata des charges
 * communes bascule ; la crèche s'arrête, la cantine prend le relais ; une prime
 * annuelle revient cinq fois, une assurance auto s'avance cinq fois depuis le
 * livret. Aucun de ces états ne tient dans quinze mois, et ce sont eux qui font
 * la différence entre un écran rempli et un écran qui raconte quelque chose.
 *
 * **Construit, jamais figé.** Le document est bâti à partir d'une date, donc il
 * est toujours à l'heure : le mois courant a ses échéances, l'historique remonte
 * derrière, les comparatifs ont leurs années. Un fichier commité une fois pour
 * toutes serait vide du mois courant dès le mois suivant — c'est-à-dire
 * exactement l'écran que cet exemple existe pour éviter.
 *
 * **Bâti par le code de l'app, pas à côté.** Aucune `Entry` n'est écrite à la
 * main : les récurrences sont posées, puis chaque mois est *ouvert* par
 * `openMonth`, chiffré et confirmé comme l'utilisateur le ferait. L'exemple
 * n'est donc pas ressemblant, il est produit par les mêmes règles que l'usage
 * réel — une règle qui change le change avec elle. C'est aussi pour ça que les
 * mois se font du plus ancien au plus récent : `buildPlannedEntry` lit le
 * montant d'une récurrence variable sur les échéances déjà posées, et les
 * montants se propagent donc comme ils le font dans l'app.
 *
 * **Déterministe.** Identifiants séquentiels, montants lus dans des tables
 * d'entiers. Aucun `Math.random`, aucun flottant : deux appels à la même date
 * rendent le même octet, et le test peut donc comparer.
 * ==========================================================================*/

import {
  type ISODate,
  type YearMonth,
  addMonthsToYm,
  monthRange,
  parseISO,
  startOfMonth,
  today,
  ymOf,
} from '@/domain/date'
import { money } from '@/domain/money'
import type { RateKind } from '@/domain/projection'
import { clampToMonth } from '@/domain/recurrence'
import type {
  Category,
  Data,
  Debt,
  Direction,
  Entry,
  Family,
  Recurrence,
  SavingSupport,
} from '@/domain/types'
import {
  addCategory,
  addDebt,
  addFamily,
  addMember,
  addEntry,
  addSavingRate,
  addSavingSupport,
  addSavingValuation,
  archiveCategory,
  archiveSavingSupport,
  confirmEntries,
  createAdvance,
  addRecurrence,
  openMonth,
  setHouseholdName,
  updateEntry,
  updateRecurrence,
} from '@/domain/updates'
import { emptyData, memberColorAt, nextCategoryColor } from './defaults'

/** Cinq années pleines, mois courant compris. */
const YEARS = 5

/** Mois d'historique posés derrière le mois courant. */
const HISTORY_MONTHS = YEARS * 12 - 1

/**
 * Aucun mois d'avance : afficher un mois non passé l'ouvre, donc naviguer vers
 * l'avant suffit à le peupler (cahier §4.3). En poser un ici ne montrerait rien
 * de plus, et fausserait le comparatif de mois — qui se cale sur les deux
 * derniers mois couverts, et opposerait alors un mois vécu à un mois entièrement
 * prévu.
 */
const FUTURE_MONTHS = 0

/* --- Les cinq bascules ----------------------------------------------------
 *
 * Cinq dates, exprimées en rang de mois depuis le début de l'historique. Elles
 * sont nommées parce que tout le fichier s'y réfère : une récurrence qui
 * s'arrête et celle qui la remplace doivent se croiser au même mois, sinon
 * l'historique porte un trou ou un doublon que rien à l'écran n'expliquerait.
 * --------------------------------------------------------------------------*/

/** L'achat de la résidence principale : le loyer cesse, la mensualité commence. */
const BUYS_HOME = 18

/** Sacha sort de l'alternance et signe : son revenu triple, le prorata bascule. */
const SACHA_HIRED = 24

/** Le studio mis en location : un second crédit, et un revenu qui n'est pas un salaire. */
const RENTAL_BOUGHT = 30

/** La crèche s'arrête, l'école et la cantine prennent le relais. */
const SCHOOL_STARTS = 36

/** Le crédit auto arrive à son terme, un autre le remplace. */
const NEW_CAR = 48

/* Alix et Camille, et Sacha — le fils aîné de Camille, vingt ans, en alternance
   puis embauché. Un tout-petit à la crèche complète le foyer sans y être un
   membre : il n'a pas de revenu, donc rien à répartir.

   Le troisième membre n'est pas là pour faire nombre : à deux revenus, le
   prorata est un miroir et la régularisation un aller-retour — on peut les lire
   sans les comprendre. À trois parts inégales, le reste de `largestRemainder`
   a quelque chose à placer, et « la somme des parts vaut exactement le total »
   cesse d'être une évidence arithmétique. Et sur cinq ans, la part de Sacha
   passe de 9 % à 25 % du foyer : le prorata cesse d'être un chiffre pour
   devenir une histoire. */
const ALIX = 'ex-alix'
const CAMILLE = 'ex-camille'
const SACHA = 'ex-sacha'
const PETS_FAMILY = 'ex-fam-pets'
const PETS_CATEGORY = 'ex-cat-pets'
/* Une catégorie ajoutée dans une famille **du catalogue**, là où le chien en
   crée une. Les deux gestes d'extension existent, et ils ne se ressemblent
   pas : l'un range un poste inédit sous un onglet qui l'accueille, l'autre
   ouvre un onglet. Un exemple qui n'aurait que le second laisserait croire
   qu'étendre le catalogue veut dire créer une famille. */
const COPRO_CATEGORY = 'ex-cat-copro'

/* Les supports d'épargne. Chacun est à quelqu'un, et trois d'entre eux relèvent
   du même poste — c'est précisément ce que la catégorie seule ne savait pas
   dire : le livret d'Alix, celui de Camille et celui de Sacha ne sont pas le
   même compte. */
const LIVRET_ALIX = 'ex-s-livret-alix'
const LIVRET_CAMILLE = 'ex-s-livret-camille'
const LIVRET_SACHA = 'ex-s-livret-sacha'
const PEL_ALIX = 'ex-s-pel-alix'
const ASSURANCE_VIE = 'ex-s-assurance-vie'
/* Ouvert ce trimestre, aucun relevé reçu : sa valeur est **inconnue**, ce qui
   n'est pas zéro. Il est à Alix, qui est le premier membre du foyer et donc la
   personne que l'écran d'épargne pose d'office — c'est le seul endroit d'où
   « un support sans valeur renseignée » se voit sans rien filtrer. */
const PER_ALIX = 'ex-s-per-alix'
/* Le plan d'une entreprise qu'on a quittée : archivé, et pourtant plein. */
const PEE_CAMILLE = 'ex-s-pee-camille'
/* Et celui de l'entreprise suivante, ouvert le mois d'après. Les deux portent la
   même catégorie et la même personne, et l'un est fermé quand l'autre vit :
   c'est le seul endroit où l'archivage se lit comme un état, et non comme une
   disparition — deux lignes côte à côte, dont une seule reçoit encore. */
const PEE_CAMILLE_2 = 'ex-s-pee-camille-2'

/** Compteur d'identifiants — séquentiel, pour que le document soit comparable. */
function counter(): () => string {
  let n = 0
  return () => {
    n += 1
    return `ex-${String(n)}`
  }
}

/* --- Les règles --------------------------------------------------*/

/**
 * Les récurrences, définies par leur décalage en mois par rapport au premier
 * mois d'historique — c'est ce qui rend le jeu ancrable à n'importe quelle date.
 */
type RecurrenceSeed = Omit<Recurrence, 'startedOn' | 'endedOn'> & {
  /** Rang du mois de la première échéance, 0 = début de l'historique. */
  from: number
  /** Rang du mois du dernier jour où elle peut tomber. Absent = toujours en cours. */
  until?: number
}

const RECURRENCES: RecurrenceSeed[] = [
  /* --- Ressources. Une par personne, sans quoi aucun prorata ne se calcule.
         Versées en tête de mois : c'est courant, et surtout c'est ce qui fait
         que le solde du mois dit quelque chose dès le 2 — sinon l'exemple
         s'ouvre sur un zéro les premiers jours, c'est-à-dire sur l'écran vide
         qu'il existe pour éviter. */
  {
    id: 'ex-r-salaire-alix',
    label: 'Salaire',
    categoryId: 'salary',
    memberId: ALIX,
    direction: 'in',
    amount: money(275000),
    period: { unit: 'month', every: 1, anchorDay: 1 },
    from: 0,
  },
  /* Un salaire à montant variable : c'est le cas que le prorata a le plus de mal
     à tenir, et celui qui montre `estimate` — l'ordre de grandeur qui fait
     exister le calcul avant la première échéance chiffrée. */
  {
    id: 'ex-r-salaire-camille',
    label: 'Salaire',
    categoryId: 'salary',
    memberId: CAMILLE,
    direction: 'in',
    amount: null,
    estimate: money(218000),
    period: { unit: 'month', every: 1, anchorDay: 2 },
    from: 0,
    note: 'Fixe plus commissions : le montant bouge chaque mois, et le fixe monte chaque année.',
  },
  {
    id: 'ex-r-allocations',
    label: 'Allocations familiales',
    categoryId: 'family-benefits',
    memberId: CAMILLE,
    direction: 'in',
    amount: money(14100),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: 0,
  },
  /* Le troisième revenu, très inférieur aux deux autres : c'est là que le
     prorata cesse d'être un miroir et devient un calcul qu'on a envie de
     vérifier. Il s'arrête au mois de l'embauche, et la ligne suivante le
     remplace — deux règles, et non une règle qu'on augmente : ce n'est pas
     le même contrat, et l'historique de prix dirait sinon qu'une alternance
     a doublé du jour au lendemain. */
  {
    id: 'ex-r-alternance-sacha',
    label: 'Alternance',
    categoryId: 'salary',
    memberId: SACHA,
    direction: 'in',
    amount: money(95000),
    period: { unit: 'month', every: 1, anchorDay: 1 },
    from: 0,
    until: SACHA_HIRED - 1,
    note: 'Deux ans d’école et d’entreprise, puis l’entreprise seule.',
  },
  {
    id: 'ex-r-salaire-sacha',
    label: 'Salaire',
    categoryId: 'salary',
    memberId: SACHA,
    direction: 'in',
    amount: money(168000),
    period: { unit: 'month', every: 1, anchorDay: 1 },
    from: SACHA_HIRED,
  },
  /* Une seconde ressource sur la même personne. Le revenu qui pèse dans le
     prorata est la **somme** des récurrences de nature `resource` d'un membre,
     jamais une seule. Elle s'éteint avec l'alternance : une prime d'activité ne
     survit pas à l'embauche, et la voir disparaître le mois où le salaire monte
     est exactement ce qu'un historique de cinq ans peut montrer. */
  {
    id: 'ex-r-prime-activite',
    label: 'Prime d’activité',
    categoryId: 'benefits',
    memberId: SACHA,
    direction: 'in',
    amount: money(8500),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: 0,
    until: SACHA_HIRED - 1,
  },
  /* Un revenu qui n'est pas un salaire, et qui n'existe qu'à partir du mois où
     le studio est acheté. C'est la seule ressource du foyer qui ait un crédit
     et des charges en face : le loyer encaissé, la mensualité, la taxe foncière
     et l'assurance du même bien se lisent sur quatre lignes distinctes, et
     aucune vue ne les rapproche — c'est précisément ce qu'un investissement
     locatif apprend à qui le tient pour un revenu net. */
  {
    id: 'ex-r-loyer-studio',
    label: 'Loyer du studio',
    categoryId: 'rental-income',
    memberId: CAMILLE,
    direction: 'in',
    amount: money(52000),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: RENTAL_BOUGHT,
  },

  /* --- Crédits. Leurs mensualités sont des `Entry` comme les autres. */
  {
    id: 'ex-r-credit-immo',
    label: 'Crédit immobilier',
    categoryId: 'mortgage',
    direction: 'out',
    amount: money(108500),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: BUYS_HOME,
  },
  {
    id: 'ex-r-credit-studio',
    label: 'Crédit du studio',
    categoryId: 'mortgage',
    direction: 'out',
    amount: money(53800),
    period: { unit: 'month', every: 1, anchorDay: 8 },
    from: RENTAL_BOUGHT,
  },
  /* Quarante-huit mensualités, la dernière il y a un an : le crédit est allé au
     bout, et celui qui suit a commencé le mois d'après. Deux crédits d'affilée
     sur le même poste, c'est ce qu'un foyer vit et ce qu'un an et demi
     d'historique ne peut pas raconter. */
  {
    id: 'ex-r-credit-auto',
    label: 'Crédit voiture',
    categoryId: 'car-loan',
    direction: 'out',
    amount: money(27900),
    period: { unit: 'month', every: 1, anchorDay: 10 },
    from: 0,
    until: NEW_CAR - 1,
  },
  {
    id: 'ex-r-credit-break',
    label: 'Crédit break',
    categoryId: 'car-loan',
    direction: 'out',
    amount: money(31100),
    period: { unit: 'month', every: 1, anchorDay: 10 },
    from: NEW_CAR,
  },
  /* Sans taux, et soldé depuis six mois : trente mensualités qui font
     exactement le capital. C'est l'autre branche du calcul, et la seule où
     « capital moins ce qu'on a versé » serait juste. */
  {
    id: 'ex-r-pret-travaux',
    label: 'Prêt travaux',
    categoryId: 'consumer-loan',
    direction: 'out',
    amount: money(16800),
    period: { unit: 'month', every: 1, anchorDay: 15 },
    from: SACHA_HIRED,
    until: SACHA_HIRED + 29,
  },
  /* Le plus ancien, et le plus petit : douze mensualités de 200 € pour 2 400 €
     empruntés, sans taux. Il se solde au tout début de l'historique — un crédit
     dont on ne voit plus que la ligne à zéro, ce qui est l'état où l'on finit. */
  {
    id: 'ex-r-credit-electro',
    label: 'Crédit électroménager',
    categoryId: 'other-loan',
    direction: 'out',
    amount: money(20000),
    period: { unit: 'month', every: 1, anchorDay: 12 },
    from: 2,
    until: 13,
  },

  /* --- Logement. Dix-huit mois de location, puis l'achat : c'est la bascule la
         plus lourde du jeu, et celle qu'aucun historique court ne montre. Le
         loyer s'arrête, une mensualité le remplace, l'assurance double, une
         taxe foncière apparaît, et le total des charges du mois ne bouge
         presque pas — ce qui a changé, c'est ce qu'on possède. */
  {
    id: 'ex-r-loyer',
    label: 'Loyer et charges',
    categoryId: 'rent',
    direction: 'out',
    amount: money(98000),
    period: { unit: 'month', every: 1, anchorDay: 3 },
    from: 0,
    until: BUYS_HOME - 1,
    note: 'Trois pièces en location, jusqu’à l’achat.',
  },
  {
    id: 'ex-r-electricite',
    label: 'Électricité',
    categoryId: 'energy',
    direction: 'out',
    amount: null,
    estimate: money(9500),
    period: { unit: 'month', every: 1, anchorDay: 12 },
    from: 0,
  },
  {
    id: 'ex-r-gaz',
    label: 'Gaz',
    categoryId: 'energy',
    direction: 'out',
    amount: money(8200),
    period: { unit: 'month', every: 2, anchorDay: 18 },
    from: 0,
  },
  /* Variable, sans montant habituel et sans échéance chiffrée : c'est ce qui
     fait dire « montant variable » au total des récurrences au lieu d'un zéro.
     Elle commence le mois prochain — elle n'a donc aucune échéance nulle part,
     et pèse pourtant déjà dans le total, parce qu'elle a été déclarée. */
  {
    id: 'ex-r-eau',
    label: 'Eau',
    categoryId: 'energy',
    direction: 'out',
    amount: null,
    period: { unit: 'month', every: 3, anchorDay: 20 },
    from: HISTORY_MONTHS + 1,
    note: 'Compteur individuel posé ce mois-ci : on verra bien la première facture.',
  },
  {
    id: 'ex-r-assurance-habitation',
    label: 'Assurance habitation',
    categoryId: 'home-insurance',
    direction: 'out',
    amount: money(14400),
    period: { unit: 'year', every: 1, anchorDay: 3 },
    from: 1,
  },
  /* L'assurance du bien qu'on loue, qui n'est pas celle du bien qu'on habite :
     deux récurrences annuelles sur la même catégorie, à deux dates et deux
     montants. Une catégorie ne dit pas *lequel* des deux logements paie —
     exactement l'ambiguïté que les supports d'épargne ont levée de leur côté. */
  {
    id: 'ex-r-assurance-pno',
    label: 'Assurance du studio',
    categoryId: 'home-insurance',
    direction: 'out',
    amount: money(13200),
    period: { unit: 'year', every: 1, anchorDay: 12 },
    from: RENTAL_BOUGHT + 1,
  },
  {
    id: 'ex-r-taxe-fonciere',
    label: 'Taxe foncière',
    categoryId: 'property-tax',
    direction: 'out',
    amount: money(98000),
    period: { unit: 'year', every: 1, anchorDay: 15 },
    from: BUYS_HOME + 1,
  },
  {
    id: 'ex-r-taxe-fonciere-studio',
    label: 'Taxe foncière du studio',
    categoryId: 'property-tax',
    direction: 'out',
    amount: money(41000),
    period: { unit: 'year', every: 1, anchorDay: 15 },
    from: RENTAL_BOUGHT + 1,
  },
  /* Trimestrielle : la seule périodicité du modèle qu'aucune ligne n'employait
     avec de vraies échéances — l'eau la porte sans être encore tombée. */
  {
    id: 'ex-r-copropriete',
    label: 'Charges de copropriété',
    categoryId: COPRO_CATEGORY,
    direction: 'out',
    amount: money(12800),
    period: { unit: 'month', every: 3, anchorDay: 10 },
    from: RENTAL_BOUGHT + 1,
  },
  {
    id: 'ex-r-ordures',
    label: 'Redevance ordures ménagères',
    categoryId: 'other-taxes',
    direction: 'out',
    amount: money(18600),
    period: { unit: 'year', every: 1, anchorDay: 20 },
    from: BUYS_HOME + 1,
  },

  /* --- Communication. Les mobiles sont à chacun, l'internet en commun. */
  {
    id: 'ex-r-mobile-alix',
    label: 'Mobile Alix',
    categoryId: 'mobile',
    memberId: ALIX,
    direction: 'out',
    amount: money(1999),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: 0,
  },
  {
    id: 'ex-r-mobile-camille',
    label: 'Mobile Camille',
    categoryId: 'mobile',
    memberId: CAMILLE,
    direction: 'out',
    amount: money(1499),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: 0,
  },
  {
    id: 'ex-r-mobile-sacha',
    label: 'Mobile Sacha',
    categoryId: 'mobile',
    memberId: SACHA,
    direction: 'out',
    amount: money(1290),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: 0,
  },
  /* La ligne est au nom de Sacha, et le foyer la partage. C'est la troisième
     charge commune avancée par quelqu'un, et c'est ce qui fait de la
     régularisation autre chose qu'un aller-retour entre deux comptes : trois
     reports non nuls, dont la somme vaut toujours zéro. */
  {
    id: 'ex-r-internet',
    label: 'Internet',
    categoryId: 'internet',
    memberId: SACHA,
    direction: 'out',
    amount: money(3899),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    shared: true,
    from: 0,
  },
  /* Résiliée, et pourtant encore là : l'engagement court jusqu'à deux mois
     après le mois courant. C'est l'autre moitié de `endedOn`, que le jeu ne
     montrait pas — la seule règle arrêtée l'était dans le passé, si bien
     qu'« arrêtée, mais elle tombe encore » n'existait nulle part. */
  {
    id: 'ex-r-streaming',
    label: 'Abonnements TV',
    categoryId: 'streaming',
    memberId: ALIX,
    direction: 'out',
    amount: money(1798),
    period: { unit: 'month', every: 1, anchorDay: 8 },
    from: 0,
    until: HISTORY_MONTHS + 2,
    note: 'Résilié, mais l’engagement court encore deux mois.',
  },

  /* --- Transport. */
  {
    id: 'ex-r-transport-camille',
    label: 'Transports en commun',
    categoryId: 'public-transport',
    memberId: CAMILLE,
    direction: 'out',
    amount: money(8620),
    period: { unit: 'month', every: 1, anchorDay: 23 },
    from: 0,
  },
  /* La prime d'assurance était mensualisée, et elle a cessé de l'être : depuis,
     elle se règle en une fois depuis le livret et se remet mois par mois. Les
     deux montages coexistent donc dans le même document, sur la même catégorie
     et pour la même voiture — c'est la seule façon de voir ce qu'une `Advance`
     change, puisqu'elle ne change rien au montant, seulement à ce qu'il pèse. */
  {
    id: 'ex-r-assurance-auto-mensualisee',
    label: 'Assurance auto',
    categoryId: 'car-insurance',
    memberId: ALIX,
    direction: 'out',
    amount: money(6200),
    period: { unit: 'month', every: 1, anchorDay: 14 },
    shared: true,
    from: 0,
    until: 12,
    note: 'Mensualisée à l’époque : les frais de fractionnement ont eu raison d’elle.',
  },

  /* --- Santé, famille, impôts. */
  {
    id: 'ex-r-mutuelle',
    label: 'Mutuelle',
    categoryId: 'health-insurance',
    direction: 'out',
    amount: money(12600),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: 0,
  },
  {
    id: 'ex-r-creche',
    label: 'Crèche',
    categoryId: 'childcare',
    direction: 'out',
    amount: money(32000),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: 0,
    until: SCHOOL_STARTS - 1,
    note: 'Trois ans de crèche, puis l’école.',
  },
  {
    id: 'ex-r-cantine',
    label: 'Cantine et périscolaire',
    categoryId: 'school',
    direction: 'out',
    amount: money(9800),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: SCHOOL_STARTS,
  },
  {
    id: 'ex-r-eveil',
    label: 'Éveil musical',
    categoryId: 'child-activities',
    direction: 'out',
    amount: money(3500),
    period: { unit: 'month', every: 1, anchorDay: 13 },
    from: 0,
    until: SCHOOL_STARTS - 1,
  },
  {
    id: 'ex-r-foot',
    label: 'Club de football',
    categoryId: 'child-activities',
    direction: 'out',
    amount: money(2400),
    period: { unit: 'month', every: 1, anchorDay: 13 },
    from: SCHOOL_STARTS,
  },
  /* Une charge qui n'est à personne d'autre qu'à celui qui la doit : elle n'est
     ni partagée ni partageable, et elle est indexée chaque année. C'est la seule
     ligne du foyer dont le montant monte sans que rien ne soit acheté — et
     l'unique emploi honnête de `alimony-out`, qui restait sans usage faute d'une
     histoire assez longue pour qu'on puisse la raconter sans la commenter. */
  {
    id: 'ex-r-pension',
    label: 'Pension alimentaire',
    categoryId: 'alimony-out',
    memberId: ALIX,
    direction: 'out',
    amount: money(28000),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: 0,
    note: 'Pour l’aîné d’Alix, qui vit chez son autre parent. Indexée chaque année.',
  },
  {
    id: 'ex-r-impots',
    label: 'Impôt sur le revenu',
    categoryId: 'income-tax',
    direction: 'out',
    amount: money(29500),
    period: { unit: 'month', every: 1, anchorDay: 15 },
    from: 0,
    note: 'Prélevé à la source : le taux suit les revenus, avec un an de retard.',
  },

  /* --- Les deux charges qu'une personne règle mais que les deux partagent : la
         case « à partager » est ici une exception à la règle, et c'est elle qui
         fait exister la régularisation du mois suivant. */
  {
    id: 'ex-r-courses',
    label: 'Courses',
    categoryId: 'groceries',
    memberId: CAMILLE,
    direction: 'out',
    amount: null,
    estimate: money(12000),
    period: { unit: 'week', every: 1, anchorDay: 6 },
    shared: true,
    from: 0,
  },
  {
    id: 'ex-r-carburant',
    label: 'Carburant',
    categoryId: 'fuel',
    memberId: ALIX,
    direction: 'out',
    amount: null,
    estimate: money(14000),
    period: { unit: 'month', every: 1, anchorDay: 22 },
    shared: true,
    from: 0,
  },

  /* --- La famille maison, pour montrer que le catalogue s'étend. */
  {
    id: 'ex-r-croquettes',
    label: 'Croquettes',
    categoryId: PETS_CATEGORY,
    direction: 'out',
    amount: money(4500),
    period: { unit: 'month', every: 1, anchorDay: 25 },
    from: 0,
  },

  /* --- Arrêtée sans être supprimée : la règle reste, et se reprend. */
  {
    id: 'ex-r-sport',
    label: 'Salle de sport',
    categoryId: 'culture',
    memberId: ALIX,
    direction: 'out',
    amount: money(3490),
    period: { unit: 'month', every: 1, anchorDay: 3 },
    from: 0,
    until: SCHOOL_STARTS - 3,
  },

  /* --- Versements. Le 31 montre la règle d'échéance : bornée, jamais
         reportée — le 31 janvier, le 28 février, puis de nouveau le 31 mars. */
  {
    id: 'ex-r-livret-alix',
    label: 'Virement livret',
    categoryId: 'passbook',
    memberId: ALIX,
    savingSupportId: LIVRET_ALIX,
    direction: 'out',
    amount: money(30000),
    period: { unit: 'month', every: 1, anchorDay: 31 },
    from: 0,
  },
  {
    id: 'ex-r-livret-camille',
    label: 'Virement livret',
    categoryId: 'passbook',
    memberId: CAMILLE,
    savingSupportId: LIVRET_CAMILLE,
    direction: 'out',
    amount: money(25000),
    period: { unit: 'month', every: 1, anchorDay: 31 },
    from: 0,
  },
  {
    id: 'ex-r-livret-sacha',
    label: 'Virement livret jeune',
    categoryId: 'passbook',
    memberId: SACHA,
    savingSupportId: LIVRET_SACHA,
    direction: 'out',
    amount: money(5000),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: 0,
  },
  {
    id: 'ex-r-pel',
    label: 'PEL',
    categoryId: 'plans',
    memberId: ALIX,
    savingSupportId: PEL_ALIX,
    direction: 'out',
    amount: money(15000),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: 0,
  },
  /* Un versement sur un support dont on ignore la valeur : le flux est connu au
     centime, le stock ne l'est pas du tout. Les deux se lisent côte à côte sans
     que l'un serve jamais à deviner l'autre. */
  {
    id: 'ex-r-per',
    label: 'PER',
    categoryId: 'retirement',
    memberId: ALIX,
    savingSupportId: PER_ALIX,
    direction: 'out',
    amount: money(10000),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: HISTORY_MONTHS - 2,
  },
  /* Arrêté avec le départ de l'entreprise. La règle s'éteint, le support
     s'archive, et le capital reste : c'est l'ensemble qui rend la situation
     lisible — un compte fermé qui continuerait de grossir serait l'état
     incohérent que l'archivage existe pour éviter. */
  {
    id: 'ex-r-pee',
    label: 'PEE',
    categoryId: 'company-savings',
    memberId: CAMILLE,
    savingSupportId: PEE_CAMILLE,
    direction: 'out',
    amount: money(9000),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: 0,
    until: RENTAL_BOUGHT - 1,
  },
  {
    id: 'ex-r-pee-2',
    label: 'PEE',
    categoryId: 'company-savings',
    memberId: CAMILLE,
    savingSupportId: PEE_CAMILLE_2,
    direction: 'out',
    amount: money(12000),
    period: { unit: 'month', every: 1, anchorDay: 5 },
    from: RENTAL_BOUGHT + 1,
  },
  /* L'assurance-vie ne figure pas ici, et c'est délibéré : un support sans
     versement régulier vaut ce qu'il vaut, et c'est tout ce qu'on en sait. Une
     épargne existe même les mois où l'on n'y touche pas. */
]

/**
 * Ce qui change en cours de route, appliqué avant l'ouverture du mois de rang
 * `at`. Les échéances déjà confirmées ne bougent pas : c'est ce qui fait exister
 * l'historique de prix, et l'alerte de la fiche — rouge sur une charge qui
 * monte, muette sur un salaire qui monte.
 *
 * Sur cinq ans, ces changements cessent d'être des anecdotes : le salaire d'Alix
 * passe par quatre augmentations, la mutuelle par quatre hausses, la pension par
 * quatre indexations. La fiche d'une récurrence n'affiche plus « le prix a
 * changé une fois », elle affiche une **courbe**, et c'est la seule chose qui
 * permette de dire si une charge dérive ou si elle suit l'inflation.
 */
const CHANGES: { at: number; id: string; patch: Partial<Recurrence> }[] = [
  /* Le salaire d'Alix, une fois par an. */
  { at: 12, id: 'ex-r-salaire-alix', patch: { amount: money(283000) } },
  { at: 24, id: 'ex-r-salaire-alix', patch: { amount: money(291500) } },
  { at: 36, id: 'ex-r-salaire-alix', patch: { amount: money(304000) } },
  { at: 48, id: 'ex-r-salaire-alix', patch: { amount: money(318000) } },

  /* Celui de Sacha, une fois : deux ans après l'embauche. */
  { at: NEW_CAR, id: 'ex-r-salaire-sacha', patch: { amount: money(179000) } },

  /* La mutuelle, chaque année, et toujours vers le haut : c'est la charge qui
     déclenche l'alerte de la fiche, et cinq ans en font une évidence. */
  { at: 11, id: 'ex-r-mutuelle', patch: { amount: money(13100) } },
  { at: 23, id: 'ex-r-mutuelle', patch: { amount: money(13800) } },
  { at: 35, id: 'ex-r-mutuelle', patch: { amount: money(14600) } },
  { at: 47, id: 'ex-r-mutuelle', patch: { amount: money(15500) } },

  /* La pension, indexée : un montant qui monte sans qu'on achète rien. */
  { at: 12, id: 'ex-r-pension', patch: { amount: money(28700) } },
  { at: 24, id: 'ex-r-pension', patch: { amount: money(29400) } },
  { at: 36, id: 'ex-r-pension', patch: { amount: money(30200) } },
  { at: 48, id: 'ex-r-pension', patch: { amount: money(31100) } },

  /* Le loyer, révisé une fois avant l'achat. */
  { at: 12, id: 'ex-r-loyer', patch: { amount: money(99500) } },

  /* L'assurance habitation double au passage à la propriété : c'est la même
     récurrence annuelle, et son montant n'a plus rien à voir. */
  { at: BUYS_HOME, id: 'ex-r-assurance-habitation', patch: { amount: money(26400) } },

  /* Le gaz, au changement de logement. */
  { at: BUYS_HOME, id: 'ex-r-gaz', patch: { amount: money(9400) } },

  /* L'impôt, qui suit les revenus avec un an de retard — et qui décroche
     franchement le jour où les loyers du studio entrent dans l'assiette. */
  { at: 13, id: 'ex-r-impots', patch: { amount: money(30400) } },
  { at: 25, id: 'ex-r-impots', patch: { amount: money(32700) } },
  { at: 37, id: 'ex-r-impots', patch: { amount: money(38900) } },
  { at: 49, id: 'ex-r-impots', patch: { amount: money(41200) } },

  /* Internet augmente, le mobile d'Alix baisse : deux mouvements en sens
     inverse sur la même famille, pour que « ce qui a changé » ne soit pas une
     liste de mauvaises nouvelles. */
  { at: 20, id: 'ex-r-internet', patch: { amount: money(4299) } },
  { at: RENTAL_BOUGHT, id: 'ex-r-mobile-alix', patch: { amount: money(1199) } },

  /* L'abonnement de transport, deux fois. */
  { at: SACHA_HIRED, id: 'ex-r-transport-camille', patch: { amount: money(8880) } },
  { at: NEW_CAR, id: 'ex-r-transport-camille', patch: { amount: money(9160) } },

  /* Les prestations familiales baissent quand l'aîné cesse d'être à charge. */
  { at: SCHOOL_STARTS, id: 'ex-r-allocations', patch: { amount: money(8900) } },

  /* Le loyer du studio, révisé une fois. */
  { at: RENTAL_BOUGHT + 12, id: 'ex-r-loyer-studio', patch: { amount: money(53200) } },

  /* Le chien vieillit, sa ration change. */
  { at: RENTAL_BOUGHT, id: 'ex-r-croquettes', patch: { amount: money(5200) } },

  /* Sacha verse trois fois plus dès qu'il est payé trois fois plus. Un versement
     d'épargne qui monte n'est pas une charge qui monte : `isCostly` le sait, et
     c'est la seule ligne du jeu qui le prouve. */
  { at: SACHA_HIRED, id: 'ex-r-livret-sacha', patch: { amount: money(15000) } },
]

/* --- Les montants qu'aucune règle ne fixe ---------------------------------*/

/**
 * Comment se chiffre une récurrence à montant variable, mois après mois.
 *
 * Deux façons, parce qu'il y a deux natures de variation. L'électricité, le
 * carburant et les commissions d'un salaire dépendent du **mois de l'année** :
 * on ne chauffe pas en juillet, on ne roule pas en février, et un commercial ne
 * signe pas en août. Elles se lisent donc dans une table de douze valeurs
 * indexée par le mois **calendaire**, à laquelle s'ajoute la dérive de l'année —
 * un tarif qui monte, un fixe qui est renégocié. C'est ce qui donne au
 * comparatif d'années quelque chose à comparer : mars contre mars, et non le
 * quatrième mois du document contre le seizième.
 *
 * Les courses, elles, ne dépendent d'aucune saison mais de la semaine qu'on
 * vient de passer. Elles se lisent dans une table parcourue **échéance après
 * échéance**, dont la longueur est première avec douze pour que deux années ne
 * se ressemblent jamais tout à fait.
 */
type VariableSeed =
  | { by: 'season'; months: number[]; yearly: number[] }
  | { by: 'occurrence'; amounts: number[] }

const VARIABLE: Record<string, VariableSeed> = {
  /* Le chauffage, et cinq ans de tarif réglementé : deux hausses franches, un
     palier, une hausse plus douce. */
  'ex-r-electricite': {
    by: 'season',
    months: [14200, 13600, 11900, 9800, 8100, 7000, 6800, 7100, 8400, 10200, 12100, 13800],
    yearly: [0, 900, 2100, 1800, 2600],
  },
  /* Les vacances d'été et les trajets scolaires, plus le prix à la pompe. */
  'ex-r-carburant': {
    by: 'season',
    months: [12600, 12100, 13400, 14200, 15100, 16800, 18400, 17900, 14600, 13800, 13200, 14900],
    yearly: [0, 1400, 2900, 1900, 2400],
  },
  /* Un fixe qui monte chaque année, des commissions qui font le reste : le
     creux d'août et la pointe de décembre sont dans la table des mois, la
     progression de carrière dans celle des années. */
  'ex-r-salaire-camille': {
    by: 'season',
    months: [206000, 209000, 214000, 218000, 221000, 216000, 203000, 199000, 224000, 231000, 238000, 246000],
    yearly: [0, 7000, 15000, 22000, 31000],
  },
  'ex-r-courses': {
    by: 'occurrence',
    amounts: [
      11800, 13400, 10900, 12600, 14100, 11200, 12900, 13700, 10400, 12100, 13900, 11600, 12300,
      15200, 9800, 13100, 14600, 11900, 12700, 10600, 14300, 13200, 11400, 15800, 12000, 13600,
      10200, 14900, 12800, 11100, 13300, 16200, 12400, 10800, 14100, 13800, 11700, 12200, 15400,
      13000, 11500,
    ],
  },
}

/* --- Ce qui n'est pas une règle : les dépenses ponctuelles ----------------*/

type AdHocSeed = {
  day: number
  label: string
  categoryId: string
  memberId?: string
  /** Sur un mouvement d'épargne : le compte versé ou repris. */
  savingSupportId?: string
  direction: Direction
  /** Repris en boucle sur les mois : chaque mois a les siens, et ils diffèrent. */
  amounts: number[]
  note?: string
}

/**
 * Les petites dépenses de tous les mois, celles qu'aucune règle ne mérite.
 *
 * Les tables ont des longueurs **premières entre elles** — sept, onze, treize —
 * et jamais douze : sur soixante mois, douze valeurs feraient cinq années
 * rigoureusement identiques, et le comparatif d'années afficherait zéro partout
 * là où il devrait montrer une variation. Un zéro dans une table veut dire que
 * la dépense n'a pas eu lieu ce mois-là, ce qui est la moitié de ce qu'on
 * cherche à représenter.
 */
const AD_HOC: AdHocSeed[] = [
  /* Tôt dans le mois, quand la paie vient de tomber : c'est réaliste, et ça
     donne au mois courant de quoi se lire dès ses premiers jours. */
  {
    day: 2,
    label: 'Restaurant',
    categoryId: 'outings',
    direction: 'out',
    amounts: [4200, 6800, 3400, 5600, 7900, 4700, 5100, 8300, 3900, 6100, 4400, 7200, 5800],
  },
  {
    day: 11,
    label: 'Pharmacie',
    categoryId: 'pharmacy',
    memberId: CAMILLE,
    direction: 'out',
    amounts: [1840, 2260, 940, 3120, 1560, 2780, 1320, 2050, 3480, 1180, 2610],
  },
  {
    day: 14,
    label: 'Habillement',
    categoryId: 'clothing',
    memberId: ALIX,
    direction: 'out',
    amounts: [5900, 0, 8400, 0, 4300, 0, 6700],
  },
  {
    day: 17,
    label: 'Produits d’entretien',
    categoryId: 'household',
    direction: 'out',
    amounts: [2340, 1890, 2670, 1450, 3010, 2120, 1760, 2890, 1330, 2450, 1980],
  },
  {
    day: 19,
    label: 'Coiffeur',
    categoryId: 'hygiene',
    memberId: CAMILLE,
    direction: 'out',
    amounts: [0, 4500, 0, 3800, 0, 4500, 0],
  },
  {
    day: 21,
    label: 'Cinéma',
    categoryId: 'culture',
    direction: 'out',
    amounts: [2400, 0, 3600, 1800, 0, 2400, 3000, 0, 1800, 2400, 0, 3600, 2100],
  },
  {
    day: 23,
    label: 'Stationnement',
    categoryId: 'tolls',
    memberId: ALIX,
    direction: 'out',
    amounts: [1800, 2400, 1200, 3000, 1500, 2100, 900, 2700, 1650, 2250, 1350],
  },
  /* Sacha dépense aussi : sans une ligne à lui, le filtre par membre le montre
     comme quelqu'un qui gagne de l'argent et n'en dépense jamais. */
  {
    day: 24,
    label: 'Livres et musique',
    categoryId: 'culture',
    memberId: SACHA,
    direction: 'out',
    amounts: [1900, 0, 2600, 1400, 0, 3200, 1100],
  },
  {
    day: 26,
    label: 'Cadeaux',
    categoryId: 'gifts',
    memberId: ALIX,
    direction: 'out',
    amounts: [0, 3500, 0, 0, 6200, 0, 2800, 0, 0, 4100, 0, 9500, 0],
  },
  /* Le poste où finit ce qui ne se range nulle part. Un catalogue sans lui
     force à mentir sur une ligne par mois. */
  {
    day: 27,
    label: 'Divers',
    categoryId: 'misc',
    direction: 'out',
    amounts: [1250, 890, 2140, 0, 1670, 940, 2300, 1420, 0, 1810, 1060],
  },
]

/**
 * Ce qui n'arrive qu'une fois, posé au rang de mois indiqué.
 *
 * Trois catégories s'y mêlent, et il faut les distinguer pour lire la liste :
 *
 * 1. **Les charges que les avances financent.** `createAdvance` pose la reprise
 *    sur le livret et les mensualités, mais pas la dépense : « l'app ne
 *    l'invente pas à la place de qui l'a faite ». Sans elles, le mois du
 *    paiement affichait une rentrée d'argent venue de nulle part — l'épargne
 *    reprise, et rien en face. Avec elles, les deux se compensent au centime et
 *    le solde du mois ne bouge pas : c'est exactement ce que l'avance existe
 *    pour produire, et ça ne se voyait pas. Elles restent attribuées à qui a
 *    payé, sans `shared` : le partage passe par les mensualités, et le compter
 *    ici aussi le ferait deux fois.
 * 2. **Les grands mouvements d'épargne**, reprise et dépense appariées le même
 *    jour, pour la même raison : une reprise seule est un revenu fantôme.
 * 3. **Le reste** — ce qui arrive une fois et ne revient pas.
 */
const ONE_OFFS: (AdHocSeed & { at: number })[] = [
  /* --- 1. Les charges avancées depuis un livret. --------------------------*/
  {
    at: 2,
    day: 18,
    label: 'Réparation boîte de vitesses',
    categoryId: 'car-maintenance',
    memberId: ALIX,
    direction: 'out',
    amounts: [126000],
    note: 'Réglée depuis le livret : la reprise du même jour la compense.',
  },
  /* La prime annuelle, quatre fois de suite depuis que la mensualisation a
     cessé. Quatre avances identiques dans leur forme et différentes dans leur
     montant : c'est ce qui fait de l'écran des avances un historique plutôt
     qu'une capture. */
  {
    at: 13,
    day: 14,
    label: 'Assurance auto',
    categoryId: 'car-insurance',
    memberId: ALIX,
    direction: 'out',
    amounts: [67200],
  },
  {
    at: 25,
    day: 14,
    label: 'Assurance auto',
    categoryId: 'car-insurance',
    memberId: ALIX,
    direction: 'out',
    amounts: [69840],
  },
  {
    at: 37,
    day: 14,
    label: 'Assurance auto',
    categoryId: 'car-insurance',
    memberId: ALIX,
    direction: 'out',
    amounts: [71400],
  },
  {
    at: 49,
    day: 14,
    label: 'Assurance auto',
    categoryId: 'car-insurance',
    memberId: ALIX,
    direction: 'out',
    amounts: [78600],
    note: 'Le break coûte plus cher à assurer que la citadine.',
  },
  {
    at: HISTORY_MONTHS - 7,
    day: 6,
    label: 'Lunettes',
    categoryId: 'medical',
    memberId: CAMILLE,
    direction: 'out',
    amounts: [48000],
  },

  /* --- 2. L'épargne reprise, et ce qu'elle a payé. ------------------------*/
  /* L'achat du logement, en un mois : les frais de notaire, le déménagement et
     l'installation, financés par une reprise sur le livret d'Alix qui les vaut
     exactement. C'est le mois le plus lourd du document, et le seul où la
     courbe de l'épargne plonge de vingt-quatre mille euros. */
  {
    at: BUYS_HOME,
    day: 4,
    label: 'Reprise livret',
    categoryId: 'passbook',
    memberId: ALIX,
    savingSupportId: LIVRET_ALIX,
    direction: 'in',
    amounts: [2400000],
    note: 'Quatre ans d’épargne pour l’apport et les frais. Le livret repart de bas.',
  },
  {
    at: BUYS_HOME,
    day: 4,
    label: 'Frais de notaire',
    categoryId: 'other-taxes',
    direction: 'out',
    amounts: [1750000],
    note: 'Pour l’essentiel des droits de mutation : une taxe, pas un service.',
  },
  {
    at: BUYS_HOME,
    day: 6,
    label: 'Déménagement',
    categoryId: 'misc',
    direction: 'out',
    amounts: [320000],
  },
  {
    at: BUYS_HOME,
    day: 9,
    label: 'Travaux d’installation',
    categoryId: 'household',
    direction: 'out',
    amounts: [330000],
  },
  /* Le studio, deux ans plus tard, sur le livret de Camille. */
  {
    at: RENTAL_BOUGHT,
    day: 8,
    label: 'Reprise livret',
    categoryId: 'passbook',
    memberId: CAMILLE,
    savingSupportId: LIVRET_CAMILLE,
    direction: 'in',
    amounts: [900000],
    note: 'Les frais du studio : l’épargne se compte en net, ceci s’en retranche.',
  },
  {
    at: RENTAL_BOUGHT,
    day: 8,
    label: 'Frais de notaire du studio',
    categoryId: 'other-taxes',
    direction: 'out',
    amounts: [900000],
  },
  {
    at: HISTORY_MONTHS - 15,
    day: 16,
    label: 'Reprise livret',
    categoryId: 'passbook',
    memberId: CAMILLE,
    savingSupportId: LIVRET_CAMILLE,
    direction: 'in',
    amounts: [62000],
  },
  {
    at: HISTORY_MONTHS - 15,
    day: 16,
    label: 'Lave-linge',
    categoryId: 'household',
    direction: 'out',
    amounts: [62000],
    note: 'L’ancien a rendu l’âme un dimanche soir, comme il se doit.',
  },

  /* --- 3. Ce qui arrive une fois. -----------------------------------------*/
  /* Une prime par an, cinq fois : elle a lieu, mais elle ne dit rien de ce
     qu'on gagne — le prorata ne bouge pas, et c'est ce qu'elle est là pour
     montrer. Cinq occurrences en font aussi la seule ligne dont le comparatif
     d'années peut dire qu'elle progresse. */
  { at: 10, day: 28, label: 'Prime annuelle', categoryId: 'salary', memberId: ALIX, direction: 'in', amounts: [120000] },
  { at: 22, day: 28, label: 'Prime annuelle', categoryId: 'salary', memberId: ALIX, direction: 'in', amounts: [128000] },
  { at: 34, day: 28, label: 'Prime annuelle', categoryId: 'salary', memberId: ALIX, direction: 'in', amounts: [136000] },
  { at: 46, day: 28, label: 'Prime annuelle', categoryId: 'salary', memberId: ALIX, direction: 'in', amounts: [142000] },
  {
    at: 58,
    day: 28,
    label: 'Prime annuelle',
    categoryId: 'salary',
    memberId: ALIX,
    direction: 'in',
    amounts: [151000],
    note: 'Une prime a lieu, mais elle ne dit rien de ce qu’on gagne : le prorata ne bouge pas.',
  },

  /* Les vacances, une fois par an, et personne ne se les attribue. */
  { at: 5, day: 8, label: 'Vacances', categoryId: 'outings', direction: 'out', amounts: [128000] },
  { at: 17, day: 8, label: 'Vacances', categoryId: 'outings', direction: 'out', amounts: [96000], note: 'Année de l’achat : on est restés près.' },
  { at: 29, day: 8, label: 'Vacances', categoryId: 'outings', direction: 'out', amounts: [145000] },
  { at: 41, day: 8, label: 'Vacances', categoryId: 'outings', direction: 'out', amounts: [162000] },
  { at: 53, day: 8, label: 'Vacances', categoryId: 'outings', direction: 'out', amounts: [178000], note: 'Une semaine à quatre. Personne ne se l’attribue : c’est en commun.' },

  /* La voiture, entre deux crédits. */
  { at: 8, day: 22, label: 'Pneus hiver', categoryId: 'car-maintenance', direction: 'out', amounts: [38900] },
  { at: 32, day: 22, label: 'Pneus hiver', categoryId: 'car-maintenance', direction: 'out', amounts: [41500] },
  { at: 44, day: 12, label: 'Contrôle technique', categoryId: 'car-maintenance', memberId: ALIX, direction: 'out', amounts: [8900] },
  { at: NEW_CAR, day: 9, label: 'Carte grise du break', categoryId: 'other-taxes', memberId: ALIX, direction: 'out', amounts: [29600] },

  /* Santé, école, maison. */
  { at: 20, day: 9, label: 'Frais médicaux', categoryId: 'medical', memberId: ALIX, direction: 'out', amounts: [8500] },
  { at: 51, day: 9, label: 'Frais médicaux', categoryId: 'medical', memberId: ALIX, direction: 'out', amounts: [12400] },
  { at: 15, day: 4, label: 'Vétérinaire', categoryId: PETS_CATEGORY, direction: 'out', amounts: [13400] },
  { at: 39, day: 4, label: 'Vétérinaire', categoryId: PETS_CATEGORY, direction: 'out', amounts: [24800], note: 'Une patte cassée. Le chien va bien, le budget moins.' },
  { at: SCHOOL_STARTS, day: 3, label: 'Fournitures scolaires', categoryId: 'school', direction: 'out', amounts: [14700] },
  { at: SCHOOL_STARTS + 12, day: 3, label: 'Fournitures scolaires', categoryId: 'school', direction: 'out', amounts: [15900] },
  { at: 26, day: 20, label: 'Ordinateur portable', categoryId: 'misc', memberId: SACHA, direction: 'out', amounts: [89900], note: 'Payé par Sacha, sur son livret jeune vidé pour l’occasion.' },
  { at: 26, day: 20, label: 'Reprise livret jeune', categoryId: 'passbook', memberId: SACHA, savingSupportId: LIVRET_SACHA, direction: 'in', amounts: [89900] },
  { at: 40, day: 11, label: 'Réfection de la toiture', categoryId: 'household', direction: 'out', amounts: [268000], note: 'Ce que le prêt travaux a payé, deux ans plus tôt, n’était pas ça.' },
  { at: 45, day: 15, label: 'Régularisation d’impôt', categoryId: 'income-tax', direction: 'out', amounts: [42300], note: 'Le solde de l’année des loyers : le taux avait un an de retard.' },
]

/* --- Assemblage -----------------------------------------------------------*/

const at = <T,>(table: readonly T[], index: number): T =>
  table[((index % table.length) + table.length) % table.length] as T

/** La date du rang `day` dans un mois, bornée à son dernier jour. */
const dayOf = (ym: YearMonth, day: number): ISODate => clampToMonth(ym, day)

/** Le mois de rang `index` depuis le début de l'historique. */
const monthAt = (first: YearMonth, index: number): YearMonth => addMonthsToYm(first, index)

/**
 * Trois personnes, cinq ans d'historique, le mois courant à moitié confirmé.
 */
export function exampleData(on: ISODate = today()): Data {
  const ids = counter()
  const anchor = ymOf(on)
  const first = addMonthsToYm(anchor, -HISTORY_MONTHS)
  const months = monthRange(first, addMonthsToYm(anchor, FUTURE_MONTHS))

  let data = setHouseholdName(emptyData(), 'Maison')
  data = addMember(data, { id: ALIX, name: 'Alix', color: memberColorAt(0) })
  data = addMember(data, { id: CAMILLE, name: 'Camille', color: memberColorAt(1) })
  data = addMember(data, { id: SACHA, name: 'Sacha', color: memberColorAt(2) })

  data = withCatalogue(data)
  data = withSupports(data)
  data = withRules(data, first)
  data = withDebts(data, first)
  data = withValuations(data, anchor, ids)
  data = withRates(data, anchor, ids)
  data = withAdvances(data, first, ids)

  /* Le rang de chaque échéance variable déjà chiffrée, par récurrence. Il vit
     ici plutôt que dans la fonction qui l'emploie : une table parcourue échéance
     après échéance ne se reprend pas au début à chaque mois, sinon les courses
     de tous les mois se ressembleraient à la semaine près. */
  const ticks = new Map<string, number>()

  months.forEach((ym, index) => {
    for (const change of CHANGES) {
      if (change.at === index) data = updateRecurrence(data, change.id, change.patch)
    }
    data = openMonth(data, ym, ids, openedOn(ym, anchor, on)).data
    data = priceVariables(data, ym, index, ticks)
    data = withAdHoc(data, ym, index, on, anchor, ids)
    data = confirmWhatHappened(data, ym, anchor, on)
  })

  return data
}

/**
 * Deux extensions du catalogue, et une part archivée.
 *
 * Les deux gestes d'extension existent et ne se ressemblent pas : « Chien »
 * ouvre une famille, « Charges de copropriété » se range sous une famille du
 * catalogue. Un exemple qui n'aurait que le premier laisserait croire qu'ajouter
 * une catégorie veut dire ajouter un onglet.
 *
 * Quatre catégories du jeu par défaut restent inemployées, et c'est un choix
 * plutôt qu'un oubli : `housing-aid` suppose un foyer éligible, ce que ces
 * revenus interdisent dès le premier mois ; `housing-tax` ne s'applique plus à
 * une résidence principale, dont `property-tax` porte déjà l'impôt, et pas
 * davantage au studio, dont l'occupant n'est pas le foyer ; `alimony-in`
 * demanderait qu'une pension **entre**, alors qu'ici elle sort — et faire les
 * deux à la fois dans le même foyer raconterait une histoire familiale qu'un jeu
 * d'exemple n'a pas à trancher ; `leasing` est justement celle qu'on archive
 * ci-dessous. Un catalogue exhaustif ne fait pas un foyer cohérent, et c'est la
 * cohérence que cet exemple doit enseigner.
 */
function withCatalogue(data: Data): Data {
  const pets: Family = { id: PETS_FAMILY, label: 'Animaux', kind: 'charge' }
  const dog: Category = {
    id: PETS_CATEGORY,
    label: 'Chien',
    familyId: PETS_FAMILY,
    icon: '',
    color: nextCategoryColor(PETS_FAMILY),
    direction: 'out',
    archived: false,
  }
  const copro: Category = {
    id: COPRO_CATEGORY,
    label: 'Charges de copropriété',
    familyId: 'fam-housing',
    icon: '',
    color: nextCategoryColor('fam-housing'),
    direction: 'out',
    archived: false,
  }
  /* Archiver n'efface rien et se défait : la location longue durée n'a jamais
     servi ici, elle sort des listes de saisie sans quitter le document. */
  return archiveCategory(addCategory(addCategory(addFamily(data, pets), dog), copro), 'leasing')
}

/**
 * Les huit supports d'épargne — où l'argent est placé, et à qui.
 *
 * Trois d'entre eux relèvent du même poste (« Livrets ») et appartiennent à
 * trois personnes : c'est exactement ce qu'une catégorie seule ne savait pas
 * dire, et la raison d'être de cette entité. L'assurance-vie ne reçoit aucun
 * versement régulier — une épargne existe aussi les mois où l'on n'y touche
 * pas. Les cinq catégories d'épargne du catalogue sont ainsi toutes servies.
 *
 * Deux d'entre eux sont là pour un état, et non pour un montant : le PER n'a
 * aucun relevé — sa valeur est inconnue, ce que l'app compte à part plutôt que
 * d'additionner à zéro —, et le PEE est archivé sans cesser d'être lisible,
 * parce qu'il porte une valeur. Et il ne l'est pas seul : le PEE de l'entreprise
 * suivante vit à côté de lui, même catégorie, même personne, l'un fermé et
 * l'autre ouvert. Sur quinze mois, l'archivage se lisait comme une fin ; sur
 * cinq ans, il se lit comme un **passage**, ce qu'il est.
 *
 * **Les deux cadences sont servies, et elles ne sont pas décoratives** : les
 * trois livrets et le PEL ne bougent que de ce qu'on y verse, donc un relevé par
 * an suffit. L'assurance-vie en unités de compte, le PER et les deux PEE bougent
 * avec les marchés, donc au trimestre. Le PEL, relevé il y a douze mois pile,
 * est celui que l'écran réclame ; les autres se taisent.
 *
 * Aucun capital n'est écrit ici : il vit dans les valorisations, et nulle part
 * ailleurs.
 */
function withSupports(data: Data): Data {
  const supports: SavingSupport[] = [
    {
      id: LIVRET_ALIX,
      label: 'Livret A',
      memberId: ALIX,
      categoryId: 'passbook',
      archived: false,
      pace: 'yearly',
      note: 'Vidé pour l’achat, refait depuis : cinq ans tiennent dans sa courbe.',
    },
    {
      id: LIVRET_CAMILLE,
      label: 'Livret A',
      memberId: CAMILLE,
      categoryId: 'passbook',
      archived: false,
      pace: 'yearly',
      note: 'C’est lui qui encaisse les coups durs : l’avance des lunettes en vient.',
    },
    {
      id: LIVRET_SACHA,
      label: 'Livret jeune',
      memberId: SACHA,
      categoryId: 'passbook',
      archived: false,
      pace: 'yearly',
    },
    {
      id: PEL_ALIX,
      label: 'PEL',
      memberId: ALIX,
      categoryId: 'plans',
      archived: false,
      pace: 'yearly',
    },
    {
      id: ASSURANCE_VIE,
      label: 'Assurance-vie',
      memberId: CAMILLE,
      categoryId: 'life-insurance',
      archived: false,
      pace: 'quarterly',
      note: 'Aucun versement programmé : sa valeur bouge avec les marchés.',
    },
    {
      id: PER_ALIX,
      label: 'PER',
      memberId: ALIX,
      categoryId: 'retirement',
      archived: false,
      pace: 'quarterly',
      note: 'Ouvert ce trimestre. Aucun relevé reçu : sa valeur est inconnue, pas nulle.',
    },
    {
      id: PEE_CAMILLE,
      label: 'PEE (ancien employeur)',
      memberId: CAMILLE,
      categoryId: 'company-savings',
      archived: false,
      pace: 'quarterly',
      note: 'Entreprise quittée : le plan est fermé, l’épargne reste.',
    },
    {
      id: PEE_CAMILLE_2,
      label: 'PEE',
      memberId: CAMILLE,
      categoryId: 'company-savings',
      archived: false,
      pace: 'quarterly',
    },
  ]
  /* Archivé par la mutation, jamais par le littéral — comme `archiveCategory`
     pour « leasing » juste au-dessus. La règle qui l'alimentait est déjà
     arrêtée par son `until` : archiver un support que rien n'arrête laisserait
     un compte invisible grossir tout seul. */
  return archiveSavingSupport(supports.reduce(addSavingSupport, data), PEE_CAMILLE)
}

/**
 * Les taux servis, et depuis quand.
 *
 * Trois supports sur huit en portent, et c'est voulu : un jeu où tout serait
 * renseigné laisserait croire que le taux est obligatoire, alors qu'un support
 * sans palier est le cas le plus courant — et celui que l'écran des projections
 * doit savoir combler sans mentir.
 *
 * Les rangs sont **relatifs au mois courant**, comme tout le reste du fichier :
 * le jeu se reconstruit à chaque chargement, et une date écrite en dur
 * vieillirait au premier mois suivant.
 */
type RateSeed = {
  supportId: string
  rateBp: number
  kind: RateKind
  /** Rang du premier jour d'application, en mois depuis le mois courant. */
  at: number
}

const RATES: RateSeed[] = [
  /* Un taux **hypothétique**, et jamais garanti, sur un livret dont le taux du
     jour est pourtant connu : c'est précisément la distinction que l'écran des
     projections existe pour tenir. Un Livret A est révisé au 1er février et au
     1er août — connaître son taux aujourd'hui ne le garantit pas sur dix ans.
     Le jeu d'exemple ne peut pas se permettre de montrer le contraire (cahier
     §4.6 ter).
     Deux paliers, et c'est ce qui rend le taux daté visible plutôt que
     seulement explicable : la courbe d'épargne capitalise 3 % jusqu'à la
     révision, puis 2,50 %, et le premier palier ne bouge pas quand le second
     est posé. */
  { supportId: LIVRET_ALIX, rateBp: 300, kind: 'assumed', at: -HISTORY_MONTHS },
  { supportId: LIVRET_ALIX, rateBp: 250, kind: 'assumed', at: -14 },
  /* Le seul **garanti** du jeu, et le seul qui puisse l'être : le taux d'un PEL
     est fixé à l'ouverture pour toute la durée du plan. Un palier, donc, et il
     ne bougera jamais — c'est ce que « garanti » veut dire. */
  { supportId: PEL_ALIX, rateBp: 175, kind: 'guaranteed', at: -HISTORY_MONTHS },
  /* Une révision **à venir** : le contrat a annoncé son taux servi pour l'an
     prochain. La projection l'applique à son rang et pas avant, et l'évolution
     déjà passée n'en bouge pas d'un centime. */
  { supportId: ASSURANCE_VIE, rateBp: 400, kind: 'assumed', at: -HISTORY_MONTHS },
  { supportId: ASSURANCE_VIE, rateBp: 350, kind: 'assumed', at: 13 },
]

function withRates(data: Data, anchor: YearMonth, ids: () => string): Data {
  return RATES.reduce(
    (acc, seed) =>
      addSavingRate(acc, {
        id: ids(),
        supportId: seed.supportId,
        rateBp: seed.rateBp,
        kind: seed.kind,
        from: startOfMonth(addMonthsToYm(anchor, seed.at)),
      }),
    data,
  )
}

/**
 * L'historique de valeur : ce que chaque support valait, aux dates relevées.
 *
 * Une série par support, définie par sa première date et son pas — c'est la
 * seule forme qui tienne sur cinq ans sans devenir illisible, et elle dit ce que
 * la liste de lignes disait moins bien : la **cadence** du relevé est une
 * propriété du support, pas une décision prise relevé par relevé.
 *
 * Les montants sont des paliers écrits en dur, jamais dérivés des versements :
 * un capital relevé est une observation, pas un calcul — le déduire des `Entry`
 * reviendrait à effacer la distinction que ce jeu d'exemple existe pour montrer.
 * Ils restent cohérents avec les mouvements, ce qui est autre chose : le livret
 * d'Alix perd bien vingt-quatre mille euros entre le relevé qui précède l'achat
 * et celui qui le suit, et c'est le seul décrochement de toute la courbe.
 */
type ValuationSeed = {
  supportId: string
  /** Rang du premier relevé, en mois **avant** le mois courant. */
  from: number
  /** Mois entre deux relevés — douze ou trois, selon la cadence du support. */
  every: number
  amounts: number[]
}

const VALUATIONS: ValuationSeed[] = [
  /* Cinq relevés annuels, et l'achat au milieu : trente-deux mille euros mis de
     côté en quatre ans, douze mille le lendemain de la signature. */
  {
    supportId: LIVRET_ALIX,
    from: 48,
    every: 12,
    amounts: [3260000, 1220000, 1610000, 1990000, 2360000],
  },
  {
    supportId: LIVRET_CAMILLE,
    from: 48,
    every: 12,
    amounts: [1850000, 2150000, 1550000, 1788000, 2090000],
  },
  /* Cinquante euros par mois, puis cent cinquante dès l'embauche, moins
     l'ordinateur : la courbe d'un jeune adulte, pas celle d'un patrimoine. */
  {
    supportId: LIVRET_SACHA,
    from: 48,
    every: 12,
    amounts: [60000, 120000, 210000, 400000, 585000],
  },
  /* Quatre relevés seulement : le dernier a douze mois pile, donc le PEL est le
     seul support actif que l'écran d'épargne réclame. Un jeu où tout est à jour
     ne montre jamais l'invitation à relever. */
  {
    supportId: PEL_ALIX,
    from: 48,
    every: 12,
    amounts: [1640000, 1830000, 2020000, 2215000],
  },
  /* Sans versement, et pourtant en mouvement : le seul support dont la valeur
     ne s'explique que par le marché. Vingt relevés trimestriels sur cinq ans,
     avec trois reculs — une courbe qui ne ferait que monter ne dirait pas ce
     qu'est un placement. */
  {
    supportId: ASSURANCE_VIE,
    from: 57,
    every: 3,
    amounts: [
      780000, 802000, 795000, 831000, 858000, 842000, 869000, 901000, 887000, 918000, 946000,
      933000, 964000, 991000, 975000, 1008000, 1042000, 1027000, 1063000, 1098000,
    ],
  },
  /* Le PEE s'arrête avec l'entreprise : dix relevés, le dernier il y a trente
     mois. C'est lui qui le garde visible à l'écran malgré l'archivage, et rien
     n'a bougé après lui — le total n'annonce donc aucune estimation sur un
     compte fermé. */
  {
    supportId: PEE_CAMILLE,
    from: 57,
    every: 3,
    amounts: [52000, 82000, 110000, 139000, 168000, 194000, 223000, 251000, 278000, 302000],
  },
  /* Et celui qui l'a remplacé, relevé jusqu'à ce mois-ci. */
  {
    supportId: PEE_CAMILLE_2,
    from: 27,
    every: 3,
    amounts: [38000, 76000, 116000, 152000, 194000, 231000, 275000, 312000, 358000, 396000],
  },

  /* Le PER n'a aucune ligne ici, et c'est tout ce qu'il vient dire : un support
     sans relevé vaut « inconnu », jamais zéro. */
]

function withValuations(data: Data, anchor: YearMonth, ids: () => string): Data {
  return VALUATIONS.reduce(
    (acc, seed) =>
      seed.amounts.reduce(
        (inner, amount, rank) =>
          addSavingValuation(inner, {
            id: ids(),
            supportId: seed.supportId,
            amount: money(amount),
            date: dayOf(addMonthsToYm(anchor, rank * seed.every - seed.from), 8),
          }),
        acc,
      ),
    data,
  )
}

function withRules(data: Data, first: YearMonth): Data {
  return RECURRENCES.reduce((acc, seed) => {
    const { from, until, ...rest } = seed
    const startedOn = startOfMonth(monthAt(first, from))
    const recurrence: Recurrence = {
      ...rest,
      startedOn:
        rest.period.unit === 'year' ? dayOf(monthAt(first, from), rest.period.anchorDay) : startedOn,
      ...(until === undefined ? {} : { endedOn: dayOf(monthAt(first, until), 28) }),
    }
    return addRecurrence(acc, recurrence)
  }, data)
}

/**
 * Six crédits, dont deux sans taux, deux soldés au terme et un dépassé.
 *
 * Tous démarrent dans l'historique : le capital restant dû ne se dérive que des
 * mensualités **confirmées**, et un crédit ouvert avant le premier mois du
 * document annoncerait un capital qu'aucune échéance n'a amorti. Cinq ans
 * rendent la contrainte tenable là où quinze mois la rendaient absurde : un
 * crédit immobilier posé au premier mois d'un document d'un an et demi
 * n'affichait qu'un capital intact.
 *
 * Trois états coexistent, et il faut les trois pour que l'écran ait un sens :
 * en cours (l'immobilier, le studio, le break), soldé au centime (le prêt
 * travaux et le crédit électroménager, tous deux sans intérêt), et arrivé à son
 * terme (la citadine, dont le taux fait que le dernier centime se règle par la
 * date d'échéance plutôt que par la soustraction).
 */
function withDebts(data: Data, first: YearMonth): Data {
  const debts: Debt[] = [
    {
      id: 'ex-d-immo',
      label: 'Crédit immobilier',
      categoryId: 'mortgage',
      recurrenceId: 'ex-r-credit-immo',
      principal: money(21000000),
      startedOn: startOfMonth(monthAt(first, BUYS_HOME)),
      endsOn: endOfSpan(monthAt(first, BUYS_HOME), 300),
      rateBp: 385,
      note: 'Vingt-cinq ans. La somme des mensualités ne dit pas ce qu’il reste à devoir.',
    },
    {
      id: 'ex-d-studio',
      label: 'Crédit du studio',
      categoryId: 'mortgage',
      recurrenceId: 'ex-r-credit-studio',
      principal: money(9500000),
      startedOn: startOfMonth(monthAt(first, RENTAL_BOUGHT)),
      endsOn: endOfSpan(monthAt(first, RENTAL_BOUGHT), 240),
      rateBp: 320,
      note: 'Le loyer perçu couvre la mensualité — la taxe foncière et l’assurance, non.',
    },
    /* Quarante-huit mensualités de 279 € pour 12 120 € empruntés : le foyer a
       versé 13 392 €, et la différence est ce que le taux a coûté. C'est le
       seul crédit du jeu où « ce qu'on a payé » et « ce qu'on devait » ne se
       ressemblent pas — l'inverse exact du prêt travaux, juste en dessous, et
       c'est le contraste qui enseigne. Le capital est calibré pour retomber à
       zéro et non à quelques centimes : une banque ajuste sa dernière échéance,
       et un reliquat d'un euro à côté du mot « soldé » se lirait comme une
       erreur de l'app plutôt que comme une propriété de l'amortissement. */
    {
      id: 'ex-d-auto',
      label: 'Crédit voiture',
      categoryId: 'car-loan',
      recurrenceId: 'ex-r-credit-auto',
      principal: money(1212000),
      startedOn: startOfMonth(first),
      endsOn: dayOf(monthAt(first, NEW_CAR - 1), 10),
      rateBp: 490,
    },
    {
      id: 'ex-d-break',
      label: 'Crédit break',
      categoryId: 'car-loan',
      recurrenceId: 'ex-r-credit-break',
      principal: money(1680000),
      startedOn: startOfMonth(monthAt(first, NEW_CAR)),
      endsOn: endOfSpan(monthAt(first, NEW_CAR), 60),
      rateBp: 415,
    },
    /* Sans taux, le capital décroît exactement de ce qui a été versé. Trente
       mensualités de 168 € pour 5 040 € : le reste dû tombe à zéro pile, et non
       à un arrondi qu'il faudrait excuser. */
    {
      id: 'ex-d-travaux',
      label: 'Prêt travaux',
      categoryId: 'consumer-loan',
      recurrenceId: 'ex-r-pret-travaux',
      principal: money(504000),
      startedOn: startOfMonth(monthAt(first, SACHA_HIRED)),
      endsOn: dayOf(monthAt(first, SACHA_HIRED + 29), 15),
      note: 'Sans intérêt, et arrivé à son terme : ce qu’on a versé est exactement ce qu’on devait.',
    },
    /* Le plus ancien, éteint depuis quatre ans : douze mensualités de 200 €
       pour 2 400 € empruntés. `endsOn` se cale sur le jour de la dernière
       mensualité, et non sur le 5 comme les autres — un crédit dont la dernière
       échéance tomberait après sa fin annoncée n'aurait pas de sens. */
    {
      id: 'ex-d-electro',
      label: 'Crédit électroménager',
      categoryId: 'other-loan',
      recurrenceId: 'ex-r-credit-electro',
      principal: money(240000),
      startedOn: startOfMonth(monthAt(first, 2)),
      endsOn: dayOf(monthAt(first, 13), 12),
    },
  ]
  return debts.reduce(addDebt, data)
}

const endOfSpan = (from: YearMonth, months: number): ISODate =>
  dayOf(addMonthsToYm(from, months - 1), 5)

/**
 * Ce qu'une avance a besoin qu'on lui dise, en rangs de mois.
 *
 * Les six lignes ci-dessous sont l'unique endroit du fichier où le même fait —
 * une prime réglée en une fois — se répète assez pour qu'on en voie la forme :
 * quatre assurances auto d'affilée, dont trois entièrement reconstituées et une
 * en cours. Un jeu de quinze mois n'en portait qu'une, et une avance seule ne
 * ressemble à rien d'autre qu'à une dépense compliquée.
 */
type AdvanceSeed = {
  label: string
  categoryId: string
  memberId: string
  savingSupportId: string
  amount: number
  /** Rang du mois du paiement, et jour dans ce mois. */
  at: number
  day: number
  /** Nombre de mois sur lesquels l'épargne se reconstitue, bornes comprises. */
  span: number
  shared?: boolean
  note?: string
}

const ADVANCES: AdvanceSeed[] = [
  {
    label: 'Réparation boîte de vitesses',
    categoryId: 'car-maintenance',
    memberId: ALIX,
    savingSupportId: LIVRET_ALIX,
    amount: 126000,
    at: 2,
    day: 18,
    span: 6,
    shared: true,
    note: 'La voiture sert à tout le monde : la charge entre dans le pot commun. Entièrement remise depuis.',
  },
  {
    label: 'Assurance auto',
    categoryId: 'car-insurance',
    memberId: ALIX,
    savingSupportId: LIVRET_ALIX,
    amount: 67200,
    at: 13,
    day: 14,
    span: 12,
    shared: true,
    note: 'La première année sans mensualisation : réglée en une fois, remise 56 € par mois.',
  },
  {
    label: 'Assurance auto',
    categoryId: 'car-insurance',
    memberId: ALIX,
    savingSupportId: LIVRET_ALIX,
    amount: 69840,
    at: 25,
    day: 14,
    span: 12,
    shared: true,
  },
  {
    label: 'Assurance auto',
    categoryId: 'car-insurance',
    memberId: ALIX,
    savingSupportId: LIVRET_ALIX,
    amount: 71400,
    at: 37,
    day: 14,
    span: 12,
    shared: true,
  },
  /* Celle de l'année en cours : onze mensualités versées sur douze, donc un
     reste dû qui n'est ni nul ni entier. C'est le seul état que les trois
     précédentes ne montrent plus. */
  {
    label: 'Assurance auto',
    categoryId: 'car-insurance',
    memberId: ALIX,
    savingSupportId: LIVRET_ALIX,
    amount: 78600,
    at: 49,
    day: 14,
    span: 12,
    shared: true,
  },
  /* La seule qui ne soit pas partagée : des lunettes sont à qui les porte, et
     le pot commun n'a rien à voir là-dedans. */
  {
    label: 'Lunettes',
    categoryId: 'medical',
    memberId: CAMILLE,
    savingSupportId: LIVRET_CAMILLE,
    amount: 48000,
    at: HISTORY_MONTHS - 7,
    day: 6,
    span: 10,
  },
]

/**
 * Les avances — une charge payée en une fois depuis l'épargne, remboursée à
 * soi-même mois par mois. Cinq sont partagées, une non : les premières entrent
 * dans le pot commun, la dernière reste à qui l'a avancée.
 */
function withAdvances(data: Data, first: YearMonth, ids: () => string): Data {
  return ADVANCES.reduce((acc, seed) => {
    const month = monthAt(first, seed.at)
    return createAdvance(
      acc,
      {
        label: seed.label,
        categoryId: seed.categoryId,
        memberId: seed.memberId,
        savingSupportId: seed.savingSupportId,
        amount: money(seed.amount),
        paidOn: dayOf(month, seed.day),
        from: month,
        to: addMonthsToYm(month, seed.span - 1),
        ...(seed.shared === undefined ? {} : { shared: seed.shared }),
        ...(seed.note === undefined ? {} : { note: seed.note }),
      },
      ids,
      startOfMonth(month),
    ).data
  }, data)
}

/** Le jour où le mois a été ouvert : le premier du mois, sauf pour l'à-venir. */
const openedOn = (ym: YearMonth, anchor: YearMonth, on: ISODate): ISODate =>
  ym > anchor ? on : startOfMonth(ym)

/**
 * Chiffre les échéances à montant variable du mois.
 *
 * Elles arrivent déjà valorisées — `openMonth` propose ce que la récurrence vaut
 * à cette date — mais toutes au même montant. Les tables leur donnent le
 * mouvement qui fait exister les courbes, les comparatifs et la détection de
 * changement de prix.
 *
 * `ticks` compte les échéances déjà chiffrées de chaque récurrence, tous mois
 * confondus : c'est ce qui permet à une table parcourue échéance après échéance
 * de continuer d'un mois sur l'autre au lieu de se rembobiner.
 */
function priceVariables(
  data: Data,
  ym: YearMonth,
  index: number,
  ticks: Map<string, number>,
): Data {
  return data.entries.reduce((acc, entry) => {
    if (entry.recurrenceId === undefined || ymOf(entry.date) !== ym) return acc
    const seed = VARIABLE[entry.recurrenceId]
    if (seed === undefined || entry.status === 'confirmed') return acc
    const tick = ticks.get(entry.recurrenceId) ?? 0
    ticks.set(entry.recurrenceId, tick + 1)
    return updateEntry(acc, entry.id, { amount: money(variableAmount(seed, entry.date, index, tick)) })
  }, data)
}

/** Le montant d'une échéance variable : saison plus dérive, ou table parcourue. */
function variableAmount(seed: VariableSeed, date: ISODate, index: number, tick: number): number {
  if (seed.by === 'occurrence') return at(seed.amounts, tick)
  return at(seed.months, parseISO(date).m - 1) + at(seed.yearly, Math.floor(index / 12))
}

/** Les dépenses ponctuelles du mois — celles qu'aucune règle ne pose. */
function withAdHoc(
  data: Data,
  ym: YearMonth,
  index: number,
  on: ISODate,
  anchor: YearMonth,
  ids: () => string,
): Data {
  if (ym > anchor) return data
  const seeds: AdHocSeed[] = [
    ...AD_HOC.map((seed) => ({ ...seed, amounts: [at(seed.amounts, index)] })),
    ...ONE_OFFS.filter((seed) => seed.at === index),
  ]

  return seeds.reduce((acc, seed) => {
    const amount = seed.amounts[0] ?? 0
    const date = dayOf(ym, seed.day)
    // Un ponctuel est un fait : il ne se pose pas dans un jour qui n'est pas
    // encore arrivé, et un montant nul veut dire qu'il n'a pas eu lieu ce mois.
    if (amount === 0 || date > on) return acc
    const entry: Entry = {
      id: ids(),
      label: seed.label,
      categoryId: seed.categoryId,
      ...(seed.memberId === undefined ? {} : { memberId: seed.memberId }),
      ...(seed.savingSupportId === undefined
        ? {}
        : { savingSupportId: seed.savingSupportId }),
      direction: seed.direction,
      amount: money(amount),
      date,
      status: 'confirmed',
      ...(seed.note === undefined ? {} : { note: seed.note }),
    }
    return addEntry(acc, entry)
  }, data)
}

/**
 * Confirme ce qui a eu lieu, laisse prévu ce qui reste à venir.
 *
 * Le mois courant garde une échéance passée **non confirmée** — la plus légère,
 * pour que l'exemple ne s'ouvre pas sur un loyer impayé : une échéance que
 * personne n'a confirmée est la plus proche de toutes, et « Prochaines
 * échéances » la compte en jours négatifs. C'est le seul endroit de l'app où un
 * retard se voit, et il n'existe pas sans une ligne pour le porter.
 */
function confirmWhatHappened(data: Data, ym: YearMonth, anchor: YearMonth, on: ISODate): Data {
  if (ym > anchor) return data

  const due = data.entries.filter(
    (entry) => ymOf(entry.date) === ym && entry.status === 'planned' && entry.date <= on,
  )
  if (ym < anchor) return confirmEntries(data, due.map((entry) => entry.id))

  /* Un retard ne se met en scène que s'il reste un mois à côté de lui. Les
     premiers jours d'un mois, deux ou trois échéances seulement sont tombées :
     en retenir une laisserait un solde à zéro, et le retard qu'on voulait
     montrer aurait mangé tout ce qu'il y avait à voir. */
  const overdue =
    due.length < MIN_CONFIRMED_FOR_OVERDUE
      ? undefined
      : due
          .filter((entry) => entry.direction === 'out' && entry.date < on)
          .sort((a, b) => a.amount - b.amount || a.date.localeCompare(b.date))
          .at(0)

  return confirmEntries(
    data,
    due.filter((entry) => entry.id !== overdue?.id).map((entry) => entry.id),
  )
}

/** En deçà, tout se confirme : le mois n'a pas encore de quoi porter un retard. */
const MIN_CONFIRMED_FOR_OVERDUE = 4

/** Les bornes couvertes par le jeu, pour que le test n'ait pas à les recopier. */
export function exampleBounds(on: ISODate = today()): { first: YearMonth; last: YearMonth } {
  const anchor = ymOf(on)
  return { first: addMonthsToYm(anchor, -HISTORY_MONTHS), last: addMonthsToYm(anchor, FUTURE_MONTHS) }
}

/** Combien d'années le jeu couvre, mois courant compris. */
export const EXAMPLE_YEARS = YEARS
