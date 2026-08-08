/* ============================================================================
 * Le catalogue actif — ce que `t` désigne, et qui décide de le changer.
 *
 * Tous les composants lisent leurs chaînes ici, en écrivant `t.mois.titre`.
 * Aucun n'importe plus `fr` ni `en` directement : le catalogue est choisi une
 * fois, au démarrage, et remplacé quand on change de langue.
 *
 * **Pourquoi une liaison de module et non un hook.** `t` est un `export let`,
 * réaffecté par `applyLocale` : les liaisons d'export ES sont vivantes, donc un
 * module qui a écrit `import { t }` voit la nouvelle valeur sans rien faire.
 * L'alternative — `useStrings()` dans chaque composant — aurait demandé un hook
 * dans cent vingt-quatre fichiers, et surtout elle n'aurait rien donné aux
 * modules qui ne sont pas des composants et qui ont pourtant des chaînes à
 * lire : le tableau des routes, le catalogue par défaut, la description d'une
 * période. Ceux-là auraient dû recevoir leurs mots en paramètre, ce qui déplace
 * le problème d'un cran sans le résoudre.
 *
 * Le prix de ce choix est réel et il est écrit ici : **une liaison vivante ne
 * prévient personne**. React ne sait pas que les mots ont changé, et un
 * composant qui ne se rend pas garde les anciens. D'où la seule règle que ce
 * module impose au reste du code, et que `App` applique :
 *
 *   1. rien ne lit `t` à l'évaluation d'un module — un tableau de libellés
 *      construit au chargement fige la langue du démarrage. Les quelques
 *      endroits qui le faisaient sont devenus des fonctions, appelées au rendu ;
 *   2. changer de langue **remonte l'arbre** (une `key` dans `App`). Un
 *      remontage garantit qu'il ne reste nulle part un mot d'avant, sans avoir
 *      à faire confiance à cent vingt-quatre abonnements. Il coûte l'état local
 *      des écrans — un accordéon replié, un champ à moitié rempli — ce qui est
 *      acceptable pour un geste qu'on fait une fois, depuis l'écran d'apparence.
 *
 * **Pourquoi l'anglais arrive par le réseau.** `fr.ts` pèse une vingtaine de
 * kibioctets compressés dans le graphe initial que `scripts/size.mjs` plafonne ;
 * un second catalogue importé statiquement les doublerait pour tout le monde,
 * y compris pour qui n'en lira jamais un mot. Le français est donc là d'emblée
 * — c'est la langue par défaut, et celle qui sert de repli si le morceau
 * anglais n'arrive pas —, et l'anglais est un `import()` que `main.tsx` attend
 * avant le premier rendu. Un aller-retour, une seule fois, chez qui a choisi
 * l'anglais.
 * ==========================================================================*/

import { DEFAULT_LOCALE, type Locale } from '@/domain/types'
import { type Strings, fr } from './fr'

/**
 * Les chaînes de l'app, dans la langue active.
 *
 * Réaffecté par `applyLocale`, et par personne d'autre. Se lit au rendu, jamais
 * à l'évaluation d'un module — voir l'en-tête.
 */
export let t: Strings = fr

let active: Locale = DEFAULT_LOCALE

/** Les catalogues déjà en mémoire. Le français y est d'entrée : il est statique. */
const loaded = new Map<Locale, Strings>([['fr', fr]])

/** La langue effectivement affichée — celle dont le catalogue est chargé. */
export function currentLocale(): Locale {
  return active
}

const listeners = new Set<() => void>()

/** S'abonne aux changements de langue. Renvoie la fonction de désabonnement. */
export function subscribeLocale(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

/**
 * Charge le catalogue d'une langue, sans rien changer à ce qui est affiché.
 *
 * Séparé de la pose pour que l'appelant puisse attendre : c'est ce qui permet à
 * `main.tsx` de ne rendre le premier écran qu'une fois les bons mots en main,
 * plutôt que d'afficher une frame de français avant de la remplacer.
 */
export async function loadCatalog(locale: Locale): Promise<Strings> {
  const already = loaded.get(locale)
  if (already !== undefined) return already
  /* Le seul `import()` de langue de l'app. Le français n'y passe jamais — il est
     dans la table dès le départ —, donc ce chemin ne se prend que pour l'anglais.
     Écrit en clair et non calculé depuis `locale` : Vite doit pouvoir voir le
     morceau à la construction pour le découper. */
  const { en } = await import('./en')
  loaded.set('en', en)
  return en
}

/**
 * Pose la langue : le catalogue, l'attribut `lang`, puis les abonnés.
 *
 * Le catalogue est chargé avant d'être posé, et une langue dont le morceau
 * n'arrive pas ne remplace rien : mieux vaut rester en français que d'afficher
 * une app à moitié traduite parce qu'un réseau a lâché entre deux écrans.
 */
export async function applyLocale(locale: Locale): Promise<Locale> {
  if (locale === active) return active
  const catalog = await loadCatalog(locale)
  t = catalog
  active = locale
  for (const listener of listeners) listener()
  return active
}

/**
 * Pose une langue déjà chargée, sans attendre. Pour les tests, qui doivent
 * pouvoir se placer dans une langue au milieu d'un rendu synchrone.
 */
export function setCatalog(locale: Locale, catalog: Strings): void {
  loaded.set(locale, catalog)
  t = catalog
  active = locale
  for (const listener of listeners) listener()
}
