/* ============================================================================
 * Les chaînes des écrans qui s'ouvrent **sous** l'épargne — la fiche d'un
 * support, ses paliers de taux, et la courbe d'évolution.
 *
 * **Pourquoi pas dans `fr.ts`.** La même raison que `i18n/history.ts` et
 * `i18n/projection.ts`, et elle est mesurable : `fr.ts` est importé par presque
 * tous les composants, donc il vit dans le graphe initial que `scripts/size.mjs`
 * plafonne. Ces écrans-ci se chargent à la demande (`features/savings/pages.ts`
 * pour la fiche et ses formulaires, un `lazy` pour la section d'évolution), et
 * la courbe emporte déjà avec elle les aires empilées de `src/charts` : sa prose
 * n'a pas plus de raison qu'elles de voyager avec l'écran du mois.
 *
 * **Ce qui reste dans `fr.ts` y reste pour une raison.** L'écran Épargne
 * lui-même est dans le graphe initial — il s'atteint d'un geste depuis la tuile
 * Capacité —, et le formulaire d'un support l'est aussi : la feuille de création
 * s'ouvre depuis la saisie d'un versement (`SupportSelect`). Leurs chaînes ne
 * peuvent donc pas descendre ici, et les mots communs — « Rendement annuel »,
 * « Taux garanti », « %/an » — restent là-bas, lus des deux côtés.
 * ==========================================================================*/

import { en } from './supports.en'
import { currentLocale, subscribeLocale } from './strings'
import type { Widen } from './widen'

const fr = {
  rates: 'Rendement',
  ratesEmpty:
    'Aucun taux posé. Les projections appliqueront alors l’hypothèse de leur écran, et la courbe d’évolution ne comptera aucun intérêt.',
  ratesMore: 'Voir les %s autres taux',
  rateFrom: 'depuis le %s',
  rateFromOrigin: 'depuis l’origine',
  rateUntil: 'jusqu’au %s',
  rateAhead: 'à partir du %s',
  rateAdd: 'Changer le taux',
  rateFirst: 'Poser un taux',
  rateEdit: 'Corriger le taux',
  rateValue: 'Rendement annuel net',
  rateDate: 'À partir du',
  rateDateHint:
    'Le taux précédent ne bouge pas : il court jusqu’à la veille. C’est ce qui laisse l’évolution déjà passée telle qu’elle a eu lieu.',
  rateAdded: 'Taux enregistré',
  rateUpdated: 'Taux corrigé',
  rateRemoved: 'Taux supprimé',
  rateRemove: 'Supprimer ce taux',
  rateRemoveConfirm:
    'Ce palier disparaît. Le taux d’avant reprend alors la période qu’il couvrait. Supprimer ?',
  rateMethod:
    'Un taux ne crée aucun euro dans le document : il ne compte ni dans ton capital relevé, ni dans les versements, ni dans un total du mois. Il sert aux projections et à la courbe d’évolution, qui annoncent toutes deux une estimation.',
  capLeft: 'Plafond %s · reste %s à verser',
  capFull: 'Plafond %s · atteint',
  capUnknown: 'Plafond %s · sans relevé, la place restante est inconnue',
  evolution: 'Évolution de l’épargne',
  evolutionEmpty:
    'Rien à tracer pour l’instant : la courbe démarre au premier relevé, et il en faut deux mois pour qu’elle dise quelque chose.',
  evolutionWindow: 'Période',
  evolutionMonths: '%s mois',
  evolutionYears: '%s ans',
  evolutionTotal: 'Total',
  evolutionWhen: 'Mois',
  evolutionRest: '%s autres supports',
  evolutionDetail: 'Voir le détail, mois par mois',
  evolutionMethod:
    'Estimation : les points sont tes relevés, le reste se dérive des mouvements confirmés et du taux en vigueur ce mois-là. Un support sans relevé n’y figure pas — sa valeur est inconnue, pas nulle.',
  srEvolution: 'Épargne estimée de %s en %s à %s en %s, relevés compris.',

  /* --- Les objectifs, sous leur fiche et leur formulaire ------------------
     Ce qui reste dans `fr.ts` est ce que la **section** de l'écran Épargne lit :
     le titre, l'état vide, et les mots du verdict — cet écran-là est dans le
     graphe initial. Tout ce qui suit ne se lit que sur la fiche d'un objectif
     ou sur son formulaire, qui se chargent à la demande avec le reste de ce que
     l'épargne ouvre sous elle. */
  goalNew: 'Nouvel objectif',
  goalEdit: 'Modifier l’objectif',
  goalAdded: 'Objectif ajouté',
  goalUpdated: 'Objectif modifié',
  goalRemoved: 'Objectif supprimé',
  goalArchived: 'Objectif rangé',
  goalUnarchived: 'Objectif repris',
  goalLabel: 'Ce que tu vises',
  goalLabelPlaceholder: 'Apport appartement',
  goalLabelRequired: 'Donne un nom à cet objectif.',
  goalOwner: 'Titulaire',
  goalTarget: 'Montant visé',
  goalTargetRequired: 'Indique un montant supérieur à zéro.',
  goalDate: 'Pour quand',
  goalDateHint:
    'Facultatif. Sans échéance, l’app dit quand tu y arriveras ; avec, elle dit si tu es à l’heure.',
  goalSupports: 'Comptes qui y contribuent',
  goalSupportsHint:
    'C’est le lien au réel : le capital, les versements et les taux se lisent sur eux. Rien n’est à retaper ici.',
  goalSupportsNone: 'Aucun compte rattaché : l’avancement ne peut pas se calculer.',
  goalMonthly: 'Versement engagé',
  goalMonthlyHint:
    'Facultatif. Laissé vide, c’est la somme de tes règles d’épargne durables sur ces comptes qui compte — l’app la connaît déjà.',
  goalMonthlyInvalid: 'Indique un versement supérieur à zéro, ou laisse vide.',
  goalManage: 'Gestion de l’objectif',
  goalArchive: 'Ranger cet objectif',
  goalArchiveHint: 'Il sort des listes, son histoire reste.',
  goalUnarchive: 'Reprendre cet objectif',
  goalRemove: 'Supprimer cet objectif',
  goalRemoveConfirm:
    'Cet objectif disparaît. Tes comptes, tes relevés et tes versements ne bougent pas. Supprimer ?',
  goalTargetOn: 'visé pour %s',
  goalNeeded: '+%s/mois pour tenir la date',
  goalCurrent: 'Versement',
  goalCurrentFrom: 'Lu sur tes règles d’épargne.',
  goalCurrentOwn: 'Engagé sur cet objectif.',
  goalAccounts: 'Comptes',
  goalRate: 'Hypothèse',
  goalRateNone: 'aucun taux posé',
  goalRateHint:
    'Un compte sans taux est projeté à 0 % : l’app ne devine aucun rendement. La date annoncée est donc au plus tard, jamais au plus tôt.',
  goalChart: 'Prévu et relevé',
  goalChartLabel: 'Trajectoire de l’objectif jusqu’à %s',
  goalChartEmpty:
    'La courbe apparaîtra dès qu’un compte rattaché portera un relevé.',
  goalSrChart: 'De %s aujourd’hui à %s en %s, sur %s relevés déjà posés.',
} as const

export type SupportStrings = Widen<typeof fr>

/**
 * Les chaînes de la fiche d'un support, dans la langue active.
 *
 * Même mécanique que `strings.ts` — une liaison d'export vivante, réaffectée
 * quand la langue change —, à une différence près : les deux langues sont ici
 * dans le **même morceau**. Le découpage qui vaut pour `fr.ts` ne vaut pas pour
 * celui-ci : ce fichier est déjà hors du graphe initial, et un second
 * aller-retour de réseau pour quelques kibioctets de prose coûterait plus cher
 * que de les emporter ensemble.
 */
export let supports: SupportStrings = currentLocale() === 'en' ? en : fr

subscribeLocale(() => {
  supports = currentLocale() === 'en' ? en : fr
})
