import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import { DEFAULT_LOCALE, type Locale } from '@/domain/types'
import { applyDocumentLocale, storeLocale } from './locale'
import { applyLocale, currentLocale, subscribeLocale } from './strings'

const getServerSnapshot = (): Locale => DEFAULT_LOCALE

/**
 * Applique la langue du document à l'app, et rend celle qui est **affichée**.
 *
 * Deux langues, et elles ne coïncident pas toujours : celle que `settings`
 * demande, et celle dont le catalogue est chargé. Entre les deux il y a un
 * `import()` — quelques dizaines de millisecondes, ou un aller-retour de réseau
 * hors cache. Ce hook rend la seconde, et c'est elle que `App` pose en `key` :
 * l'arbre se remonte quand les mots sont là, jamais avant. Sans cette
 * distinction, on remonterait l'app sur une langue demandée pour la remonter
 * une seconde fois quand elle arrive.
 *
 * Le miroir localStorage suit la préférence et non l'affichage : c'est un choix
 * qu'on note, pas un état qu'on constate. Un morceau qui n'arrive pas laisse
 * donc l'app en français pour cette session-ci, et retentera au prochain
 * démarrage — ce qui est le bon sens de l'erreur.
 */
export function useApplyLocale(preference: Locale): Locale {
  const active = useSyncExternalStore(subscribeLocale, currentLocale, getServerSnapshot)

  useEffect(() => {
    /* `applyLocale` ne pose la langue qu'une fois son catalogue en main, et ne
       remplace rien si le morceau n'arrive pas : mieux vaut rester en français
       que d'afficher une app à moitié traduite. */
    void applyLocale(preference)
    storeLocale(preference)
  }, [preference])

  /* L'attribut suit l'affichage, pas la demande : `lang="en"` posé sur une page
     encore en français ferait lire du français par une synthèse vocale
     anglaise, ce qui est pire que l'inverse. */
  useEffect(() => {
    applyDocumentLocale(active)
  }, [active])

  useRestoreScroll(active)

  return active
}

/**
 * Rend la position de défilement que le remontage emporte.
 *
 * Changer de langue remonte l'arbre (voir la `key` d'`App`), ce qui vide le
 * corps de la page puis le reconstruit. Un navigateur qui recalcule la mise en
 * page **entre les deux** voit un document réduit à rien et rabat le défilement
 * sur ce qu'il reste, c'est-à-dire zéro : on choisit sa langue en bas de l'écran
 * « Plus », et on se retrouve en haut. Chromium ne le fait pas — les deux
 * moitiés du remontage tiennent dans la même étape —, WebKit et Gecko le font ;
 * autant dire que c'est un défaut qu'on ne voit pas sur la machine où on le
 * corrige, et qu'il faut donc traiter par principe plutôt que par symptôme.
 *
 * La position se relève **avant** le rendu, dans l'abonnement à la langue : à ce
 * moment-là le catalogue vient de changer mais l'ancien DOM est encore en place,
 * donc `scrollY` est encore celui qu'on regardait. Elle se repose dans un effet
 * de mise en page — après que le nouvel arbre est écrit, avant que le navigateur
 * ne peigne : ce qui a pu être rabattu entre-temps ne s'est jamais vu.
 *
 * Rien à rendre au premier affichage, ni sur un rendu qui ne vient pas d'un
 * changement de langue : la position relevée est consommée puis oubliée.
 */
function useRestoreScroll(active: Locale): void {
  const pending = useRef<number | null>(null)

  useEffect(() => subscribeLocale(() => {
    pending.current = window.scrollY
  }), [])

  useLayoutEffect(() => {
    const top = pending.current
    if (top === null) return
    pending.current = null
    /* Jamais `smooth` : on ne défile pas, on remet là où on était. Une page plus
       courte dans sa nouvelle langue est rabattue par le navigateur, ce qui est
       exactement ce qu'il faut. */
    window.scrollTo({ top, behavior: 'auto' })
  }, [active])
}
