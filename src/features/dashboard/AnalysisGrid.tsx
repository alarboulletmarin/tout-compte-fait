import { useIsCommonFilter } from '@/store/selectors'
import { BentoGrid } from '@/ui/Tile'
import { BreakdownTile, type ShowFamily } from './BreakdownTile'
import { CreditsTile } from './CreditsTile'
import { MemberCostTile } from './MemberCostTile'
import { MemberShareTile } from './MemberShareTile'
import { SavingTile } from './SavingTile'
import { SplitTile } from './SplitTile'

/**
 * Le troisième étage de l'écran du mois : **pourquoi mon mois ressemble à ça**.
 *
 * Ces six tuiles étaient dans la même grille que le solde, ce qui donnait le
 * même poids à « combien il me reste » et à « qui verse quoi sur le pot commun ».
 * Elles répondent pourtant à une question qu'on se pose *après* : le mois est
 * d'abord une situation et une tâche, et seulement ensuite une analyse. Elles
 * passent donc sous « À confirmer », sans qu'aucune ne change de format, de
 * contenu ni de calcul — c'est leur place dans la page qui change, pas elles.
 *
 * L'ordre suit la question, du plus général au plus circonstanciel : où part
 * l'argent, ce qu'on peut mettre de côté, ce qu'on verse au foyer, ce que le
 * mois coûte, comment le foyer se répartit, puis ce qu'on doit encore.
 *
 * **Les deux tuiles du milieu portent la même forme, et c'est délibéré** : un
 * chiffre, puis les deux termes qui le donnent. C'est ce qui les distingue le
 * mieux l'une de l'autre — l'une additionne un virement (sa part du commun plus
 * le report du mois précédent), l'autre un coût (ce qu'elle paie pour elle plus
 * cette même part). Elles se suivent parce qu'elles partagent un terme, et le
 * terme partagé porte le même libellé sur les deux : deux noms pour un même
 * nombre se lisent comme deux nombres qui tomberaient juste par hasard.
 *
 * Cinq d'entre elles s'effacent d'elles-mêmes selon la lecture — pas de crédit
 * suivi, pas de second membre, pas de filtre, rien à séparer. C'est la règle du
 * cahier §4.6 : une tuile qui n'a rien à dire ne dit pas zéro, elle s'en va. La
 * régularisation du mois précédent avait la sienne ; elle est redevenue une
 * ligne d'« À verser sur le commun », où la place que l'anneau occupait la
 * laisse enfin tenir — et où elle rend le chiffre de tête vérifiable.
 * `SavingTile` est la seule que la grille masque elle-même, sur le commun, où
 * l'épargne ne rentre pas dans un partage.
 *
 * Les deux listes de l'étage — prochaines échéances, lignes du mois — restent
 * hors de la grille : leur hauteur doit venir de leur contenu et non d'un
 * format (DS §5).
 */
export function AnalysisGrid({ onShowFamily }: { onShowFamily?: ShowFamily }) {
  const common = useIsCommonFilter()

  return (
    <BentoGrid>
      <BreakdownTile {...(onShowFamily === undefined ? {} : { onShowFamily })} />
      {!common && <SavingTile />}
      <MemberShareTile />
      <MemberCostTile />
      <SplitTile />
      <CreditsTile />
    </BentoGrid>
  )
}
