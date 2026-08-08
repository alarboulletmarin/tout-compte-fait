import { useIsCommonFilter } from '@/store/selectors'
import { BentoGrid } from '@/ui/Tile'
import { BreakdownTile, type ShowFamily } from './BreakdownTile'
import { CreditsTile } from './CreditsTile'
import { MemberShareTile } from './MemberShareTile'
import { SavingTile } from './SavingTile'
import { SplitTile } from './SplitTile'

/**
 * Le troisième étage de l'écran du mois : **pourquoi mon mois ressemble à ça**.
 *
 * Ces cinq tuiles étaient dans la même grille que le solde, ce qui donnait le
 * même poids à « combien il me reste » et à « qui verse quoi sur le pot commun ».
 * Elles répondent pourtant à une question qu'on se pose *après* : le mois est
 * d'abord une situation et une tâche, et seulement ensuite une analyse. Elles
 * passent donc sous « À confirmer », sans qu'aucune ne change de format, de
 * contenu ni de calcul — c'est leur place dans la page qui change, pas elles.
 *
 * L'ordre suit la question, du plus général au plus circonstanciel : où part
 * l'argent, ce qu'on peut mettre de côté, comment le foyer se répartit, puis ce
 * qu'on doit encore.
 *
 * Quatre d'entre elles s'effacent d'elles-mêmes selon la lecture — pas de crédit
 * suivi, pas de second membre, pas de filtre. C'est la règle du cahier §4.6 :
 * une tuile qui n'a rien à dire ne dit pas zéro, elle s'en va. La
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
      <SplitTile />
      <CreditsTile />
    </BentoGrid>
  )
}
