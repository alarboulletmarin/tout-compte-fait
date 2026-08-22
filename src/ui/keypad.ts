import { type Money, parseAmount } from '@/domain/money'

/**
 * Le plafond de la saisie, en chiffres frappés.
 *
 * Douze chiffres valent 9 999 999 999,99 dans l'unité de la devise, soit un
 * centime de moins que `MAX_INPUT`, que `parseAmount` refuse. La borne est là
 * pour que la touche cesse de répondre plutôt que pour que le montant devienne
 * `null` sous le doigt : une saisie qui s'efface au treizième chiffre ne dirait
 * pas ce qui s'est passé.
 */
export const MAX_KEYS = 12

/**
 * Ce que valent les chiffres frappés, une fois relus comme des centimes.
 *
 * **Le pavé, lui, ne connaît pas les centimes** — il gère une chaîne de
 * chiffres, et rien d'autre. Cette conversion vit à côté de lui parce que ses
 * appelants la font tous, et qu'elle a exactement un endroit délicat : la
 * position du séparateur. Elle repasse par `parseAmount`, qui est le seul
 * lecteur de montants de l'app — la borne haute, le refus de ce qui n'en est
 * pas un et la construction du `Money` y sont déjà résolus, et un second
 * analyseur finirait par arrondir autrement que le premier.
 */
export function amountFromKeys(keys: string): Money | null {
  if (keys === '') return null
  /* Trois chiffres au moins, pour que « 5 » vaille cinq centimes et non cinq
     unités : on tape le montant comme il s'affiche, en partant de la droite. */
  const padded = keys.padStart(3, '0')
  return parseAmount(`${padded.slice(0, -2)}.${padded.slice(-2)}`)
}
