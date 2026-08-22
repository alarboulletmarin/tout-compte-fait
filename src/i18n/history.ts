/* ============================================================================
 * Toutes les chaînes de l'historique, et le seul endroit où elles s'écrivent.
 *
 * **Pourquoi pas dans `fr.ts`.** La même raison que `i18n/landing.ts` et
 * `i18n/legal.ts`, et elle est mesurable : `fr.ts` est importé par presque tous
 * les composants, donc il vit dans le graphe initial que `scripts/size.mjs`
 * plafonne à 200 Kio. L'historique, lui, se charge à la demande
 * (`app/Routes.tsx`) et emporte déjà avec lui les trois graphiques de
 * `src/charts`, dont aucun autre écran ne se sert : sa prose n'a pas plus de
 * raison qu'eux de voyager avec l'écran du mois.
 *
 * Rien d'autre que l'historique ne lit ce module — `t.nav.history` reste dans
 * `fr.ts`, parce que la barre d'onglets nomme l'écran sans le charger.
 *
 * Le vocabulaire commun n'est pas ici : « Entrée », « Sortie », « Autres » se
 * disent avec les clés de `fr.ts`, comme partout ailleurs.
 * ==========================================================================*/

import { en } from './history.en'
import { currentLocale, subscribeLocale } from './strings'
import type { Widen } from './widen'

const fr = {
  title: 'Historique',
  /* L'étiquette de la tuile, et le mot le plus court qui dise ce qu'elle
     montre. La fenêtre, elle, se dit à côté : deux étiquettes empilées
     n'étaient qu'une seule information écrite deux fois. */
  evolution: 'Évolution',
  /* Les deux bornes de la fenêtre, pour le nom accessible du graphique et pour
     la lire à l'œil : elle s'arrête au mois courant, quoi qu'on regarde
     ailleurs dans l'app. Elle a remplacé « Douze derniers mois », qui devenait
     faux dès qu'on demandait six. */
  trailingRange: 'de %s à %s',
  trailingEmpty: 'Pas encore assez de données pour tracer une courbe.',
  /* La fenêtre, et les deux seules qui répondent à quelque chose : six mois est
     la saison — de quoi savoir si le mois qu'on ferme sort de l'ordinaire —,
     douze est l'année, où chaque dépense annuelle a eu lieu une fois. */
  spanLabel: 'Fenêtre',
  span6: '6 mois',
  span12: '12 mois',
  spanCurrent: 'en cours',
  /* Ce que la barre d'une rangée dit en toutes lettres : une couleur ne porte
     jamais seule ce qu'elle signifie (DS §2.3). La comparaison est à la moyenne
     de la fenêtre, c'est-à-dire au chiffre héros de la tuile juste au-dessus —
     et non « au prévu », qui vaut le réalisé au centime sur un mois derrière
     soi et n'aurait donc rien distingué. */
  spanAbove: '%s au-dessus de la moyenne',
  spanBelow: '%s en dessous de la moyenne',
  /* Le chiffre qui résume la fenêtre. Les mois vides n'y comptent pas : un mois
     sans ligne n'est pas un mois à zéro, et le compter ferait baisser la
     moyenne d'un foyer qui vient d'installer l'app. */
  average: 'Solde moyen',
  averageOn: 'sur %s mois avec des lignes',
  cumulated: 'Cumulé',
  widest: 'Le plus large',
  tightest: 'Le plus serré',
  monthByMonth: 'Mois par mois',
  legendIn: 'Entrées',
  legendOut: 'Sorties',
  legendBalance: 'Solde',
  /* Une seule étiquette pour les deux comparaisons : elles répondent à la
     même intention — mettre deux périodes côte à côte —, et deux grandes
     cartes l'une sous l'autre le disaient deux fois pour une seule question.
     C'est la bascule qui nomme la période, plus la carte. */
  compare: 'Comparer',
  compareAxis: 'Ce qu’on compare',
  compareModeMonths: 'Mois',
  compareModeYears: 'Années',
  /* Deux mots plutôt que quatre : les deux sélecteurs se partagent la largeur
     d'un téléphone, et « Mois de référence » y passait à la ligne quand le
     mot qui distingue les deux est le second. */
  compareLeft: 'Référence',
  compareRight: 'Comparé',
  /* Ce que la liste mesure, et dans quel sens. Les deux étaient à deviner : la
     comparaison ne porte que sur les **sorties** — les entrées n'y entrent
     jamais —, et un « +150 € » ne dit pas de lui-même s'il se lit du mois de
     référence vers le mois comparé ou l'inverse. Deux règles qu'aucun libellé
     n'écrivait, et un chiffre dont on ne sait pas ce qu'il compte se lit comme
     un chiffre faux. */
  compareScope: 'Écart des sorties, du mois de référence au mois comparé.',
  compareEmpty: 'Ces deux mois n’ont aucune sortie à comparer.',
  compareSingleMonth:
    'Un seul mois de données pour l’instant. La comparaison arrivera avec le deuxième.',
  /* Le compte tient lieu de synthèse : c'est la réponse à « qu'est-ce qui a
     changé » avant même de lire une ligne. Deux clés plutôt qu'un pluriel
     calculé, comme partout ailleurs dans ce fichier. */
  compareChangedOne: '1 catégorie a changé',
  compareChangedMany: '%s catégories ont changé',
  compareUnchanged: 'Inchangées',
  /* Dans le repli, la ligne porte un montant et non un écart : sans un mot,
     on ne saurait pas duquel des deux mois il vient. */
  compareUnchangedHint: 'Le même montant dans les deux mois.',
  compareNoChange: 'Aucune variation entre ces deux mois.',
  /* Le mois de référence est à zéro : il n'y a pas de proportion à écrire, et
     le cadratin laissait la question ouverte. Le mot y répond. */
  compareAppeared: 'nouvelle',
  year: 'Année',
  /* « Pas encore d'année *complète* » décrivait une autre condition que celle
     qui déclenche la phrase : elle tombe quand les données ne couvrent aucune
     année, pas quand la dernière est inachevée — une année en cours se
     compare très bien, à son horizon. */
  yearsEmpty: 'Pas encore d’année à comparer.',
  /* La comparaison n'a qu'un sélecteur et se fait toujours contre l'année
     d'avant : autant le dire plutôt que de le laisser deviner au tracé. */
  yearsVersus: '%s contre %s',
  yearsDelta: 'Écart',
  /* Une année en cours ne se compare pas en silence à une année finie : un
     chiffre juste qu'on ne comprend pas se lit comme un chiffre faux. */
  yearsPartial: '%s s’arrête à %s : les deux années se lisent à ce mois-là.',
  yearsNoPrevious: 'Aucune donnée en %s : rien à comparer.',
  /* Le nom de ce que le tracé et ses trois chiffres mesurent — et non plus la
     forme du tracé. « Mois après mois » décrivait la courbe ; ce qu'on ne
     savait pas, c'est ce que valait le nombre lu à un mois donné : le solde de
     ce mois-là, ou tout ce qui s'est accumulé depuis janvier. C'est le second,
     et il faut l'écrire. Cette chaîne sert des deux côtés — nom accessible du
     graphique, et titre visible au-dessus de la lecture. */
  cumulative: 'Cumul du solde depuis janvier',
  srTrailing: 'Solde mensuel : %s',
  /* L'horizon est nommé, et les deux cumuls s'y arrêtent tous les deux : une
     année en cours lue jusqu'à son dernier mois contre une année pleine lue
     jusqu'en décembre comparait onze mois à douze, et annonçait comme un
     écart ce qui n'était qu'un mois de plus. */
  srYears: 'Cumul %s contre %s, arrêté à %s : %s',
  srYearsEmpty: 'Cumul %s : aucune donnée.',
  /* Le nom accessible d'un mois du graphique. Il porte les trois chiffres :
     c'est lui la lecture, la ligne visible au-dessus n'en est que le double
     à l'œil. */
  srMonthRead: '%s : entrées %s, sorties %s, solde %s',
  /* Un mois sans donnée n'est pas un mois à zéro (cahier §4.7). Il se dit, il
     ne se chiffre pas. */
  srMonthNoData: '%s : aucune donnée',
  /* Le cumul porte une ou deux années : la partie variable est assemblée par
     le graphique, comme `srTrailing` l'est par la page. */
  srCumulativeRead: '%s : %s',
  /* Sur un document neuf, les trois tuiles empilaient trois phrases d'excuse —
     pas assez pour une courbe, pas deux mois à comparer, pas d'année
     complète. Trois façons de dire la même chose, et aucune ne disait quoi
     faire. Un seul état vide les remplace tant que rien n'a été saisi, comme
     sur les autres écrans. */
  /* Retrouver une ligne se faisait mois par mois, ou pas du tout. La
     recherche vit ici et non derrière un sixième onglet — la barre en porte
     cinq et n'en tient pas six à 320px — et c'est de toute façon l'écran de
     la question : « ce prélèvement de mars » est un regard en arrière.
     Le libellé ne s'affiche plus : il est dans le champ. Une étiquette au-
     dessus d'un espace réservé qui dit le même mot l'écrit deux fois, et
     cette recherche-ci ouvre l'écran — elle n'a pas de voisine avec qui
     s'aligner. Le nom accessible, lui, reste celui-là. */
  searchLabel: 'Rechercher par libellé',
  searchPlaceholder: 'Rechercher une ligne…',
  searchHint: 'Tous mois confondus, récurrences comprises.',
  searchEntries: 'Entrées',
  searchRecurrences: 'Récurrences',
  searchEmpty: 'Aucune ligne ne correspond à « %s ».',
  /* Sans « précise la recherche » : c'était un conseil, pas une commande, et
     il ne servait à rien quand tout ce qui dépasse porte réellement le même
     mot. Le bouton d'à côté fait ce que la phrase demandait. */
  searchMore: '… et %s de plus.',
  searchShowAll: 'Tout afficher',
  empty: 'L’historique se remplit tout seul, à mesure que les mois passent.',
  emptyHint:
    'Il n’y a encore rien à comparer : la courbe, l’écart entre deux mois et le cumul annuel arrivent avec les premières entrées.',
} as const

export type HistoryStrings = Widen<typeof fr>

/**
 * Les chaînes de l'historique, dans la langue active.
 *
 * Même mécanique que `strings.ts` — une liaison d'export vivante, réaffectée
 * quand la langue change —, à une différence près : les deux langues sont ici
 * dans le **même morceau**, importées statiquement l'une et l'autre. Le
 * découpage qui vaut pour `fr.ts` ne vaut pas pour celui-ci : ce fichier est
 * déjà hors du graphe initial, et un second aller-retour de réseau pour
 * quelques kibioctets de prose coûterait plus cher que de les emporter
 * ensemble.
 */
export let history: HistoryStrings = currentLocale() === 'en' ? en : fr

subscribeLocale(() => {
  history = currentLocale() === 'en' ? en : fr
})
