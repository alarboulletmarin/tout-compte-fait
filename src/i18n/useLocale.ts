import { useEffect, useSyncExternalStore } from 'react'
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

  return active
}
