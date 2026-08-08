/* ============================================================================
 * Langue — application du `lang` sur <html>, et miroir de la préférence.
 *
 * Même mécanique que le thème et la palette, et pour la même raison : la
 * préférence fait autorité dans le document (`settings.locale`), mais IndexedDB
 * est asynchrone. Le miroir en localStorage est lu par le script inline
 * d'index.html avant le premier rendu — et ici, il l'est aussi par le module
 * d'entrée, qui doit savoir *quel catalogue charger* avant d'afficher quoi que
 * ce soit. Sans lui, une app en anglais s'ouvrirait une frame en français.
 *
 * Le type, la liste et le garde vivent dans `domain/types.ts`, avec le reste du
 * modèle : `persistence/validate.ts` les consomme aussi, et il n'a rien à faire
 * d'un module qui touche au DOM.
 * ==========================================================================*/

import { DEFAULT_LOCALE, type Locale, isLocale } from '@/domain/types'

export const LOCALE_STORAGE_KEY = 'tout-compte-fait.locale'

/**
 * La langue du navigateur, ramenée à l'une des deux qu'on parle.
 *
 * Appelée une seule fois dans la vie d'une installation — à la création du
 * document, faute de préférence à lire. On lit `languages` et non `language` :
 * quelqu'un dont le système est en anglais mais qui a placé le français juste
 * derrière préfère le français à ce que la première ligne annonce, et c'est
 * précisément ce que cette liste sert à dire.
 *
 * Seule la sous-balise de langue est regardée : `fr-CA` est du français, `en-GB`
 * de l'anglais, et rien dans l'app ne dépend de la région (voir `Locale`).
 * Une langue qu'on ne parle pas n'est pas une réponse — on continue la liste
 * plutôt que de retomber tout de suite, sans quoi un navigateur réglé sur
 * « de, en, fr » ouvrirait en français alors qu'il a dit préférer l'anglais.
 */
export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE
  const preferred = navigator.languages ?? [navigator.language]
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0]
    if (isLocale(base)) return base
  }
  return DEFAULT_LOCALE
}

/**
 * La langue du miroir, ou celle du navigateur faute de miroir.
 *
 * C'est ce que lit le démarrage à froid, avant qu'IndexedDB ait répondu. Le
 * repli sur la détection ne vaut donc *pas* décision : il n'écrit rien, et
 * l'hydratation corrigera si le document dit autre chose. Il sert à ce que le
 * tout premier écran — la présentation, chez qui n'a pas encore de document —
 * s'affiche dans la langue qu'on parle plutôt que dans celle qu'on a choisie
 * pour les autres.
 */
export function readStoredLocale(): Locale {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY)
    return isLocale(raw) ? raw : detectLocale()
  } catch {
    return detectLocale()
  }
}

export function storeLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // Mode privé, quota plein : la langue repartira sur celle du navigateur au
    // prochain démarrage à froid, puis l'hydratation rétablira celle du
    // document. Rien de bloquant.
  }
}

/**
 * Écrit la langue sur <html>.
 *
 * Ce n'est pas décoratif : `lang` décide de la voix d'un lecteur d'écran — un
 * texte anglais lu par une synthèse française est à peu près inintelligible —,
 * de la coupure des mots et des guillemets que le navigateur dessine. C'est la
 * seule des trois préférences d'apparence dont l'attribut soit *lu* par autre
 * chose que nos propres feuilles de style.
 */
export function applyLocale(locale: Locale): Locale {
  document.documentElement.lang = locale
  return locale
}
