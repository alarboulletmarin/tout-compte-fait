/* ============================================================================
 * Ce qu'une grille du mois doit savoir de ses tuiles **avant** de les rendre.
 *
 * Une tuile qui n'a rien à dire s'en va (cahier §4.6), et c'est elle qui en
 * décide, dans son propre corps. Mais son départ laisse un trou dans le pavage,
 * et refermer ce trou demande de changer le format des tuiles restantes — donc
 * de savoir lesquelles restent, avant que React ne les rende. Une grille ne peut
 * pas lire le résultat du rendu de ses enfants ; elle doit poser la question
 * autrement, et c'est ici qu'on y répond.
 *
 * Ces lectures sont **partagées avec les tuiles elles-mêmes** : chacune appelle
 * la sienne plutôt que de porter une seconde copie de la condition. Une
 * condition écrite deux fois finit par diverger, et le jour où elle diverge, la
 * grille pave pour une composition qui n'est pas celle qui s'affiche.
 * ==========================================================================*/

import { ZERO, add, sub } from '@/domain/money'
import {
  useDebtStatuses,
  useMemberCharges,
  useMemberFilter,
  useMemberMap,
  useMonthSplit,
} from '@/store/selectors'
import type { TileSpan } from '@/ui/Tile'

/** La Répartition a-t-elle quelque chose à dire ? */
export function useHasSplit(): boolean {
  const { total, shares } = useMonthSplit()
  const members = useMemberMap()
  const filter = useMemberFilter()
  return filter === undefined && members.size >= 2 && shares !== null && total > 0
}

/** Y a-t-il un crédit ou une dette à suivre ? */
export function useHasCredits(): boolean {
  return useDebtStatuses().length > 0
}

/** Cette lecture a-t-elle une charge à décomposer par nature ? */
export function useHasMemberCharges(): boolean {
  const charges = useMemberCharges()
  const filter = useMemberFilter()
  if (filter === undefined || charges === null) return false
  return add(charges.own, add(charges.commonCharge, charges.commonDebt)) > ZERO
}

/**
 * Le format de la part du membre — ou `null` quand elle ne se rend pas.
 *
 * C'est la seule des neuf tuiles dont le format vient de **son contenu** et non
 * de la composition : avec une avance déduite, elle porte un calcul sur deux
 * rangées ; sans, un chiffre seul sur une rangée plate. La grille ne peut donc
 * pas le lui imposer — elle doit le lire, et paver autour.
 */
export function useMemberShareSpan(): TileSpan | null {
  const charges = useMemberCharges()
  const filter = useMemberFilter()
  if (filter === undefined || charges === null) return null
  if (charges.commonTotal <= 0) return null
  const refund = sub(charges.common, add(charges.commonCharge, charges.commonDebt))
  return charges.advanced !== 0 || refund !== 0 ? '4x2' : '4x1'
}

/** Les formats des quatre tuiles de l'analyse, pour une composition donnée. */
export type AnalysisPaving = {
  breakdown: TileSpan
  memberCharges: TileSpan
  credits: TileSpan
}

/**
 * Le pavage de l'analyse qui referme les trois paliers, pour la lecture en
 * cours. `AnalysisGrid` dit d'où viennent ces formats, et `pavage.test.ts` les
 * rejoue contre un simulateur de placement.
 */
export function analysisPaving(
  memberCharges: boolean,
  share: TileSpan | null,
  credits: boolean,
): AnalysisPaving {
  /* Sans lecture de membre du tout : il ne reste que l'anneau, qui prend la
     pleine largeur, et les crédits qui ferment la rangée d'en dessous. Sans
     crédit non plus, l'anneau referme seul. */
  if (!memberCharges && share === null) {
    return { breakdown: '6x2', memberCharges: '2x2', credits: '6x1' }
  }
  /* Deux anneaux, et rien à verser : ils se rangent côte à côte sur quatre
     colonnes, et les crédits ferment la rangée. */
  if (share === null) {
    return { breakdown: '2x2', memberCharges: '4x2', credits: '6x1' }
  }
  /* Avec un report, la part porte son calcul sur deux rangées : elle vaut alors
     un anneau, et c'est l'anneau des familles qui s'étale sur la rangée d'avant. */
  if (share === '4x2') {
    return memberCharges
      ? { breakdown: '6x2', memberCharges: '2x2', credits: '6x1' }
      : { breakdown: '2x2', memberCharges: '2x2', credits: '6x1' }
  }
  /* Sans report, la part est plate. Avec un crédit, les deux lectures plates
     ferment ensemble la rangée que l'anneau étalé a ouverte ; sans crédit, il
     n'en reste qu'une, et **aucune combinaison ne referme les trois paliers** —
     deux cases restent vides sur la tablette et deux au bureau. C'est le moindre
     mal mesuré, et il est ici plutôt qu'ailleurs parce qu'il faut bien qu'il
     soit quelque part. */
  if (!credits) {
    return { breakdown: '2x2', memberCharges: '4x2', credits: '4x1' }
  }
  return {
    breakdown: memberCharges ? '6x2' : '2x2',
    memberCharges: '2x2',
    credits: '4x1',
  }
}
