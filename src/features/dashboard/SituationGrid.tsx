import { useIsCommonFilter } from '@/store/selectors'
import { BentoGrid } from '@/ui/Tile'
import { BalanceTile } from './BalanceTile'
import { ChargesTile, IncomeTile } from './FlowTiles'
import type { Metric } from './MetricInfo'
import { MonthStatusTile } from './MonthStatusTile'
import { SavingTile } from './SavingTile'
import { SplitTile } from './SplitTile'

/**
 * Le premier étage de l'écran du mois : **où j'en suis**.
 *
 * La grille bento du DS §5 en portait douze, puis neuf — c'est-à-dire toutes les
 * questions du mois d'un coup, avec le même poids. On lisait six chiffres
 * d'argent d'affilée avant qu'aucune narration ne les ordonne, et la seule chose
 * qui demandait un geste — confirmer — arrivait deux écrans plus bas. La grille
 * se coupe donc en deux, et cette coupure *est* la refonte : ce qui répond à
 * « où j'en suis » reste ici, ce qui répond à « pourquoi » descend dans
 * `AnalysisGrid`, et « ce que j'ai à faire » se glisse entre les deux.
 *
 * **Six tuiles, et le pavage se referme sans un trou sur les trois paliers.**
 * Le design en pose cinq — solde `4x2`, Répartition `2x2`, puis Revenus,
 * Charges et Épargne en `2x1` —, et cinq ne pavent pas : mesuré, il reste un
 * quart de rangée vide sur une tablette et une demi-rangée sur un téléphone.
 * Passer Épargne en `2x2` referme le téléphone et **ouvre** les deux autres —
 * deux cases vides sur une tablette, quatre sur un bureau.
 *
 * C'est une impossibilité, pas un mauvais rangement : sur les quatre colonnes
 * du palier tablette, une `2x1` vaut une case et une `2x2` en vaut quatre, si
 * bien qu'un solde, une Répartition, la paire de flux et une Épargne donnent
 * 4+4+1+1+4 = 14 cases pour une grille qui n'en referme que des multiples de
 * quatre. Aucune permutation ne rattrape ça, et aucun autre format d'Épargne
 * n'y arrive non plus : à 4+4+1+1+2 = 12 la tablette se referme, mais le bureau
 * demande 8+4+2+2+4 = 20 cases pour des rangées de six. **Il faut une sixième
 * tuile, en `4x1`** — et le DS §5 l'écrit déjà mot pour mot : « c'est ce qui
 * donne son format à la tuile Suivi du mois, `4x1`, parce que c'est le seul qui
 * referme la première grille sans un trou aux trois paliers ».
 *
 * ```
 *  téléphone (2 col)   tablette (4 col)      bureau (6 col)
 *  ┌───────────────┐   ┌───────┬───────┐     ┌───────────┬───────┐
 *  │    solde      │   │ solde │ répar │     │   solde   │ répar │
 *  │     4×2       │   │  4×2  │  2×2  │     │    4×2    │  2×2  │
 *  ├───────────────┤   ├───┬───┼───────┤     ├─────┬─────┼───────┤
 *  │  répartition  │   │ € │ € │ éparg │     │  €  │  €  │ éparg │
 *  │     2×2       │   ├───┴───┤  2×2  │     ├─────┴─────┤  2×2  │
 *  ├───────┬───────┤   │ suivi │       │     │   suivi   │       │
 *  │   €   │   €   │   └───────┴───────┘     └───────────┴───────┘
 *  ├───────┴───────┤
 *  │    épargne    │
 *  ├───────────────┤
 *  │     suivi     │
 *  └───────────────┘
 * ```
 *
 * Le pavage ne tient que sur la composition complète : un foyer d'une seule
 * personne n'a pas de Répartition, et sa grille laisse alors quatre cases vides
 * au bureau. Le cas est connu et non résolu — une tuile qui n'a rien à dire
 * s'en va (cahier §4.6), et lui faire dire zéro pour boucher un trou coûterait
 * plus que le trou.
 *
 * **La paire ne bouge pas.** Sur deux colonnes, seul un `2x1` se range à côté
 * d'un autre : Revenus et Charges sont la seule chose qui fasse de cet étage une
 * grille de tailles inégales plutôt qu'une pile de cartes (DS §5). Et le cahier
 * §4.6 veut qu'ils se lisent à côté du solde, avant les lectures dérivées — un
 * solde a déjà fait la soustraction, il ne répond pas à « combien je gagne,
 * combien je paie ». Ils sont donc ici et non dans l'étage analytique, où le
 * brief les aurait volontiers rangés.
 *
 * Le prévisionnel et le reste à vivre suivent immédiatement, hors de la grille
 * et pour la raison qui les en a sortis : ils annoncent régulièrement le même
 * montant au centime, et seule une rangée sait dire pourquoi (`SituationSection`).
 *
 * **La Répartition et l'Épargne montent de l'étage analytique**, où elles
 * étaient, parce que le design en fait deux des cinq tuiles de tête. Elles y
 * gagnent d'être vues, et l'étage analytique y perd ses deux anneaux : c'est le
 * prix, et il est assumé — « où j'en suis » veut dire le mois entier, et ce
 * qu'on met de côté en fait partie autant que ce qu'on paie.
 *
 * Sur le commun, trois tuiles s'effacent — le pot n'a aucun revenu, donc le
 * solde, les ressources et la capacité d'épargne y vaudraient zéro ou les
 * charges au signe près (cahier §4.6). Le suivi du mois, lui, reste : il a
 * quelque chose à dire sous toutes les lectures, puisqu'il compte exactement
 * les échéances que la liste du mois porte en dessous, filtre compris.
 *
 * **Les deux tuiles de flux ne font plus défiler, elles mènent à `/flux`.**
 * Elles filtraient la liste du mois sur leur nature, ce qui répondait « quelles
 * lignes » et pas « de quoi » ; l'écran des revenus et des charges répond aux
 * deux, avec le partage commun/perso que la liste ne dit pas.
 *
 * La feuille d'explication ne vit pas ici mais sur la page : un `<dialog>` posé
 * parmi les tuiles occuperait une case tant qu'il est fermé.
 */
export function SituationGrid({
  onShowEntries,
  onExplain,
}: {
  /** Faire venir la liste du mois sous les yeux, depuis la tuile de suivi. */
  onShowEntries?: () => void
  onExplain: (metric: Metric) => void
}) {
  const common = useIsCommonFilter()

  return (
    <BentoGrid>
      {!common && <BalanceTile onExplain={onExplain} />}
      <SplitTile />
      {!common && <IncomeTile />}
      <ChargesTile />
      {!common && <SavingTile />}
      <MonthStatusTile {...(onShowEntries === undefined ? {} : { onShowPending: onShowEntries })} />
    </BentoGrid>
  )
}
