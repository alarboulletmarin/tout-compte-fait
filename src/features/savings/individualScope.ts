/* ============================================================================
 * L'épargne se lit toujours **au nom de quelqu'un**.
 *
 * C'est la seule lecture de l'app qui n'a pas de version « foyer ». Deux
 * personnes qui ont 12 000 € et 8 000 € de côté n'ont pas « 20 000 € » : elles
 * ont deux comptes, deux capacités et deux décisions, et le total ne se place
 * nulle part. « Commun » ne dirait rien de plus — l'épargne ne se partage
 * jamais, et la lecture ne rendrait que des zéros.
 *
 * L'écran s'en remet donc au filtre du bandeau, comme tous les autres : c'est
 * lui qui applique déjà le prorata des charges communes, et s'en donner un
 * second, local, referait ce calcul à côté du premier. Quand aucune personne
 * n'est filtrée, il retombe sur la première — **sans l'écrire** : la portée se
 * pose par-dessus le filtre (`IndividualScope`, sur
 * `MonthFilterOverrideContext`), et « Commun » ou « Tout le monde » survivent
 * au détour par l'épargne. L'écrire, c'était les perdre : on partait du mois
 * avec « Commun », on passait par la tuile Capacité, et on revenait filtré sur
 * quelqu'un sans avoir rien demandé. Seule une pilule tapée — un geste
 * explicite — change le filtre du mois.
 * ==========================================================================*/

import { useMemberFilter } from '@/store/selectors'

/**
 * La personne au nom de qui l'écran se lit, sous un `IndividualScope`.
 *
 * `null` quand le foyer n'a encore personne. Le hook ne pose plus rien : la
 * portée vient du fournisseur, et le filtre du mois n'est jamais écrit.
 */
export function useIndividualScope(): string | null {
  return useMemberFilter() ?? null
}
