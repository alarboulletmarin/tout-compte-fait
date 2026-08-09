/* ============================================================================
 * Les paliers de taux d'un support — ce qu'il sert, et depuis quand.
 *
 * Un taux n'est pas un réglage, c'est une **suite de paliers**. Le Livret A a
 * servi 3 % puis 2,40 % puis 1,70 % ; chacun est vrai sur sa période, et aucun
 * ne l'est sur celle du voisin. C'est toute la raison d'être de ce module :
 * répondre à « quel taux, ce mois-là ? » plutôt qu'à « quel taux ? », si bien
 * qu'un palier posé au 1er janvier prochain ne touche aucun mois d'avant.
 *
 * Le module est **pur** : il ne connaît ni le store, ni la persistance, ni les
 * écrans. Il ne pose aucun taux par défaut non plus — un support sans palier
 * n'a pas de taux, ce qui n'est pas 0 %, et c'est l'appelant qui décide quoi
 * faire de cette absence (l'écran des projections y met son hypothèse, la
 * courbe d'épargne n'y met aucun intérêt).
 *
 * Le pendant exact de la pile des valorisations (`saving.ts`), dont il reprend
 * l'ordre — `stackedByDate` — et pour les mêmes raisons.
 * ==========================================================================*/

import {
  type ISODate,
  type YearMonth,
  addMonthsToYm,
  stackedByDate,
  startOfMonth,
  today,
} from './date'
import type { RateKind } from './projection'
import type { SavingRate } from './types'

/**
 * Le jour d'origine d'un palier — « depuis toujours », écrit en une date.
 *
 * Il n'existe que pour le taux scalaire de la v11, qui n'était pas daté : il
 * valait pour tout le document, passé compris. Une date d'origine dit
 * exactement cela.
 *
 * `today()` aurait fait deux fautes d'un coup. Il aurait inventé un
 * **changement de taux** que personne n'a décidé, le jour où le fichier
 * s'ouvre — et la courbe d'épargne, qui lit les paliers vers l'arrière, aurait
 * montré un passé plat suivi d'un coude à aujourd'hui. Et il aurait rendu la
 * migration **non déterministe** : deux lectures du même fichier auraient donné
 * deux documents, ce qui est précisément la propriété que les migrations
 * revendiquent.
 *
 * L'écran ne l'affiche jamais tel quel — « depuis le 1er janvier 1970 » ne
 * voudrait rien dire —, il dit « depuis l'origine » (voir `isOrigin`).
 */
export const RATE_ORIGIN: ISODate = '1970-01-01'

/** Vrai quand le palier remonte plus loin que ce que le document sait dater. */
export function isOrigin(from: ISODate): boolean {
  return from <= RATE_ORIGIN
}

/**
 * Les paliers d'un support, du plus récent au plus ancien.
 *
 * L'ordre de `valuationsOf`, obtenu par la même fonction : deux paliers du même
 * jour — une saisie et sa correction — se départagent par leur ordre d'arrivée,
 * le dernier posé d'abord.
 */
export function ratesOf(rates: readonly SavingRate[], supportId: string): SavingRate[] {
  return stackedByDate(
    rates.filter((rate) => rate.supportId === supportId),
    (rate) => rate.from,
  )
}

/**
 * Le taux en vigueur le jour `on`, ou `null` si aucun palier ne l'a précédé.
 *
 * `null` et non zéro, exactement comme `latestValuation` : 0 % est une
 * hypothèse qu'on peut poser volontairement — un compte courant —, alors que
 * l'absence de palier ne dit rien du tout. Les deux se distinguent, et un
 * appelant qui les confondrait projetterait à plat un support dont personne n'a
 * rien dit.
 *
 * La date du palier est **incluse** : un taux « à partir du 1er février » court
 * dès le 1er février.
 */
export function rateOn(
  rates: readonly SavingRate[],
  supportId: string,
  on: ISODate = today(),
): SavingRate | null {
  return ratesOf(rates, supportId).find((rate) => rate.from <= on) ?? null
}

/** Un palier borné : de `from` inclus à `to` exclu. `to: null` — sans fin. */
export type RateStep = {
  rateBp: number
  kind: RateKind
  from: ISODate
  /** Le jour où le palier suivant prend la main, ou `null` s'il n'y en a pas. */
  to: ISODate | null
}

/**
 * Le barème d'un support, du plus ancien au plus récent, bornes calculées.
 *
 * Deux paliers consécutifs de même taux **et** de même nature fusionnent : ce
 * sont deux saisies d'une seule réalité, et les afficher en deux lignes ferait
 * lire un changement là où il n'y en a pas. Deux paliers de même taux et de
 * nature différente, non — c'est le seul endroit de l'app où `kind` change
 * quelque chose, et il ne change que ce qui s'écrit.
 */
export function rateSchedule(rates: readonly SavingRate[], supportId: string): RateStep[] {
  /* Du plus ancien au plus récent : un barème se lit dans le sens du temps,
     alors que la pile répond d'abord à « et maintenant ? ». */
  const stack = [...ratesOf(rates, supportId)].reverse()

  const steps: RateStep[] = []
  for (const rate of stack) {
    const last = steps.at(-1)
    /* Deux paliers du même jour : c'est une correction, et c'est le dernier
       arrivé qui gagne. `ratesOf` l'a déjà mis devant, donc renversé il arrive
       en second — il écrase le premier plutôt que d'ouvrir un palier de durée
       nulle, que personne ne saurait lire. */
    if (last !== undefined && last.from === rate.from) {
      steps[steps.length - 1] = { ...last, rateBp: rate.rateBp, kind: rate.kind }
      continue
    }
    if (last !== undefined && last.rateBp === rate.rateBp && last.kind === rate.kind) continue
    if (last !== undefined) steps[steps.length - 1] = { ...last, to: rate.from }
    steps.push({ rateBp: rate.rateBp, kind: rate.kind, from: rate.from, to: null })
  }
  return steps
}

/**
 * Un taux annuel par mois, en points de base — ce que le moteur consomme.
 *
 * Le taux en vigueur au **premier jour du mois** vaut pour le mois entier : un
 * changement au 15 ne coupe pas un mois en deux, parce que la capitalisation
 * est mensuelle et qu'un demi-mois n'existe pas dans ce moteur. Entre deux
 * conventions défendables, celle-ci a le mérite de rendre un barème lisible :
 * le mois porte un taux, et un seul.
 *
 * `fallbackBp` comble les mois d'avant le premier palier — l'hypothèse de
 * l'écran pour une projection, zéro pour une lecture du passé, et c'est
 * l'appelant qui tranche parce que lui seul sait ce que l'absence veut dire
 * chez lui.
 *
 * Le tableau porte `months` termes : c'est le taux du passage du rang *k* au
 * rang *k+1*, donc un de moins que les points de la série.
 */
export function monthlyRateBps(
  steps: readonly RateStep[],
  from: YearMonth,
  months: number,
  fallbackBp: number,
): number[] {
  const horizon = Math.max(0, Math.trunc(months))
  /* Sans aucun palier, le barème est plat : un seul tableau, pas de cas
     particulier chez l'appelant. Du plus récent au plus ancien pour que le
     premier qui a commencé soit celui qui court. */
  const stack = [...steps].reverse()

  return Array.from({ length: horizon }, (_, index) => {
    const on = startOfMonth(addMonthsToYm(from, index))
    return stack.find((step) => step.from <= on)?.rateBp ?? fallbackBp
  })
}
