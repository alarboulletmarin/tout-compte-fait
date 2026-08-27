import { createContext } from 'react'
import type { MonthFilter } from './store'

/**
 * Une portée de lecture posée par-dessus le filtre du mois, sans l'écrire.
 *
 * Les écrans d'épargne se lisent toujours au nom de quelqu'un — c'est la seule
 * lecture de l'app qui n'a pas de version « foyer ». Ils **écrivaient** pour ça
 * le filtre global : passer par l'épargne avec « Commun » ou « Tout le monde »
 * le remplaçait par la première personne du foyer, et rien ne le rendait au
 * retour. Le détour par une tuile coûtait la portée qu'on avait choisie.
 *
 * Le fournisseur pose donc la personne **en lecture seule** : `useMonthFilter`
 * la sert aux sélecteurs de l'arbre qu'il couvre, le store n'en sait rien, et
 * seule une pilule tapée — un geste explicite — change encore le filtre du
 * mois. Partout ailleurs le contexte est `null` et rien ne change.
 *
 * Dans son propre module, et non dans `selectors.ts` ni dans l'écran qui le
 * pose : les sélecteurs le lisent, une feature le fournit, et chacun des deux
 * importerait l'autre s'il vivait chez l'un d'eux.
 */
export const MonthFilterOverrideContext = createContext<MonthFilter | null>(null)
