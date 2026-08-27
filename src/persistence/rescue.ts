/* ============================================================================
 * Le filet de sortie — la copie synchrone qui survit à la page.
 *
 * IndexedDB ne sait pas écrire pendant qu'une page se démonte : la transaction
 * que le vidage de `pagehide` ouvre meurt avec l'onglet, silencieusement.
 * Toute saisie encore dans la fenêtre du debounce — ou déjà partie mais pas
 * encore commise — se perdait donc en fermant l'onglet ou en tapant une URL
 * dans la seconde. C'est la perte qui fait dire « l'app perd mes saisies » :
 * elle frappe précisément le geste de qui range son téléphone juste après
 * avoir noté une dépense.
 *
 * `localStorage`, lui, est synchrone : une copie posée dans le gestionnaire de
 * sortie est écrite quand il rend la main, quoi qu'il advienne de la page. Le
 * filet n'est pas un second stockage — il ne vit qu'entre une sortie
 * précipitée et le lancement suivant, qui l'adopte si la base est en retard et
 * l'efface sinon. Chaque écriture qui aboutit l'efface aussi : en régime
 * normal, il n'existe pas.
 *
 * La clé est partagée entre onglets, comme la base : deux onglets qui sortent
 * en même temps avec des attentes différentes se départagent au relancement,
 * par la révision — exactement comme leurs écritures se départagent déjà.
 * ==========================================================================*/

import type { Data } from '@/domain/types'
import { migrateDocument } from './schema'

const KEY = 'tout-compte-fait.rescue'

/**
 * Pose la copie. Synchrone, et sans un mot en cas d'échec : quota plein ou
 * navigation privée signifient que le filet n'existe pas — la sortie de page
 * n'est pas un endroit d'où signaler quoi que ce soit.
 */
export function saveRescue(data: Data, rev: number): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ rev, data }))
  } catch {
    /* rien à en dire, et personne pour l'entendre */
  }
}

export function clearRescue(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* idem */
  }
}

/**
 * Relit le filet, migrations et validation comprises — il peut avoir été posé
 * par une version précédente de l'app, la mise à jour ayant eu lieu entre la
 * sortie et le relancement. Tout ce qui ne se lit pas vaut absence : un filet
 * corrompu ne doit pas empêcher l'app de s'ouvrir sur son document principal.
 */
export function readRescue(): { data: Data; rev: number } | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const { rev, data } = parsed as { rev?: unknown; data?: unknown }
    if (typeof rev !== 'number' || !Number.isInteger(rev) || rev <= 0) return null
    return { data: migrateDocument(data).data, rev }
  } catch {
    return null
  }
}
