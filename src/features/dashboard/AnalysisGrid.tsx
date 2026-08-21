import { BentoGrid } from '@/ui/Tile'
import { BreakdownTile, type ShowFamily } from './BreakdownTile'
import { CreditsTile } from './CreditsTile'
import { MemberChargesTile } from './MemberChargesTile'
import type { Metric } from './MetricInfo'
import { MemberShareTile } from './MemberShareTile'

/**
 * Le dernier étage de l'écran du mois : **pourquoi mon mois ressemble à ça**.
 *
 * Ces tuiles étaient dans la même grille que le solde, ce qui donnait le même
 * poids à « combien il me reste » et à « qui verse quoi sur le pot commun ».
 * Elles répondent pourtant à une question qu'on se pose *après* : le mois est
 * d'abord une situation et une tâche, et seulement ensuite une analyse. Elles
 * passent donc **sous la liste du mois**, sans qu'aucune ne change de format,
 * de contenu ni de calcul — c'est leur place dans la page qui change, pas elles.
 *
 * **Deux d'entre elles sont montées d'un étage** : la Répartition et la
 * capacité d'épargne sont deux des cinq tuiles de tête du design, et elles
 * vivent maintenant dans la grille de la situation. Ce qui reste ici est ce qui
 * décompose — par famille, par personne, par dette —, et non plus ce qui
 * compte. La grille y perd son pavage dans la lecture la plus courante : sans
 * filtre et sans crédit suivi, il ne reste qu'« Où part l'argent », seule sur
 * ses deux colonnes. C'est le prix du déplacement, et il est plus petit que
 * celui d'une tuile perdue.
 *
 * L'ordre suit la question, du plus général au plus circonstanciel : où part
 * l'argent, ce qui de ce montant est à soi, ce qu'on peut mettre de côté,
 * comment le foyer se répartit, puis ce qu'on doit encore.
 *
 * **« Charges du mois » vient juste après « Où part l'argent »** : les deux
 * découpent le même total, l'une par famille, l'autre par ce qui se décide
 * seul·e ou à deux. Posées côte à côte, on lit la seconde comme une autre
 * question sur le même chiffre ; séparées, comme deux chiffres sans rapport.
 *
 * Trois d'entre elles s'effacent d'elles-mêmes selon la lecture — pas de crédit
 * suivi, pas de second membre, pas de filtre, rien à porter. C'est la règle
 * du cahier §4.6 : une tuile qui n'a rien à dire ne dit pas zéro, elle s'en va.
 *
 * La régularisation avait la sienne, et elle n'en a plus : elle était déjà
 * comprise — silencieusement — dans le chiffre de tête d'« À verser sur le
 * commun », et deux montants voisins dont rien ne dit qu'ils ne s'ajoutent pas
 * s'ajoutent. Elle est redevenue le terme du calcul qu'elle est, sur la tuile
 * dont elle change le montant.
 *
 * Les deux listes de l'étage — prochaines échéances, lignes du mois — restent
 * hors de la grille : leur hauteur doit venir de leur contenu et non d'un
 * format (DS §5).
 */
export function AnalysisGrid({
  onShowFamily,
  onExplain,
}: {
  onShowFamily?: ShowFamily
  onExplain: (metric: Metric) => void
}) {
  return (
    <BentoGrid>
      <BreakdownTile {...(onShowFamily === undefined ? {} : { onShowFamily })} />
      <MemberChargesTile onExplain={onExplain} />
      <MemberShareTile />
      <CreditsTile />
    </BentoGrid>
  )
}
