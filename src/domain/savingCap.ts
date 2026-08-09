/* ============================================================================
 * Le plafond de versements — la place qui reste, et ce qu'un versement
 * dépasserait.
 *
 * Le plafond vivait déjà dans le modèle (`SavingSupport.depositCap`) et dans
 * deux **lectures** : la fiche du support l'affiche, le simulateur écrête ses
 * versements (cahier §4.6 bis et §4.6 ter). Aucune **écriture** ne le regardait
 * — verser 50 € sur un Livret A déjà plein passait sans un mot, et une règle
 * mensuelle continuait d'en poser tous les mois jusqu'à faire monter le compte
 * bien au-dessus de ce que le contrat autorise. Un plafond qu'on saisit et que
 * rien ne fait respecter se lit comme un réglage sans effet, ce qui est pire
 * que pas de champ du tout.
 *
 * La règle tient donc ici, une seule fois, pour les trois écritures qui la
 * doivent : la saisie d'un mouvement, la génération des échéances d'un mois, et
 * ce qu'une règle annonce avant d'être enregistrée.
 *
 * **Bloquer le geste, jamais le fait.** C'est la règle qui gouverne tout ce
 * module, et elle vient d'une limite que le cahier pose lui-même : le plafond
 * porte sur les versements cumulés depuis l'ouverture, que l'app ne connaît
 * pas ; ce qu'elle connaît est le capital, intérêts acquis compris. La place
 * annoncée est donc **sous-estimée par construction** — un Livret A à 22 950 €
 * dont 1 500 € viennent des intérêts a encore 1 500 € de place réelle. Se
 * tromper de ce côté-là est le bon choix pour une projection, qui promet alors
 * le moins ; c'en est un mauvais pour un refus d'écriture, qui refuserait un
 * versement que la banque a accepté. D'où la forme retenue partout : l'app
 * arrête la main, chiffre le dépassement, et laisse deux sorties nommées —
 * verser la place restante, ou verser quand même. Ce qui est refusé, c'est le
 * geste distrait ; jamais le fait.
 *
 * Le module est pur, comme `saving.ts` : ni store, ni persistance.
 * ==========================================================================*/

import { type ISODate, addMonths, today } from './date'
import { type Money, ZERO, money } from './money'
import { supportValue } from './saving'
import { type Schedule, expandRecurrence } from './recurrence'
import type {
  Direction,
  Entry,
  Recurrence,
  SavingSupport,
  SavingValuation,
} from './types'

/* --- La place restante ----------------------------------------------------*/

/**
 * Ce que l'app sait du plafond d'un support, et les trois seules réponses
 * possibles.
 *
 * Les trois se distinguent parce qu'elles n'autorisent pas les mêmes gestes, et
 * les confondre est la seule façon de se tromper ici :
 *
 * - `none` — aucun plafond n'a été posé. **Absent ne veut pas dire illimité** :
 *   c'est une question à laquelle personne n'a répondu, et rien n'est borné.
 * - `unknown` — un plafond est posé, mais le support n'a **aucun relevé** : son
 *   capital est inconnu, pas nul, et il n'y a donc rien à retrancher. L'app dit
 *   le plafond et se tait sur la place — arrêter une saisie sur une place qu'on
 *   ne sait pas calculer serait un refus tiré au sort.
 * - `room` — le plafond et la place, celle-ci **jamais négative** : un compte
 *   déjà au-dessus de son plafond a zéro de place, et ce n'est pas une erreur,
 *   c'est ce qui arrive à tout livret plein.
 */
export type CapState =
  | { kind: 'none' }
  | { kind: 'unknown'; cap: Money }
  | { kind: 'room'; cap: Money; room: Money }

/** Rien à borner — le repli de tout ce qui n'a pas de support ou pas de plafond. */
export const NO_CAP: CapState = { kind: 'none' }

/**
 * L'état du plafond d'un support à une date.
 *
 * `ahead` choisit **laquelle des deux places** on lit, et la distinction est la
 * même que celle de `supportValue` :
 *
 * - faux (le défaut) — la place d'aujourd'hui, sur les mouvements **confirmés**.
 *   C'est celle que la fiche affiche déjà (« Plafond 22 950 € · reste 300 € à
 *   verser ») et donc la seule que la saisie puisse opposer à qui verse : être
 *   arrêté à 150 € sous une fiche qui vient d'annoncer 300 € de place ne
 *   s'explique pas.
 * - vrai — la place de la **trajectoire**, échéances prévues comprises. Elle ne
 *   sert qu'à la génération, qui pose justement des prévues : sans elle, douze
 *   mois de versements à venir liraient tous la même place et aucun ne serait
 *   écrêté.
 */
export function capStateOf(
  support: Pick<SavingSupport, 'id' | 'depositCap'> | undefined,
  valuations: readonly SavingValuation[],
  entries: readonly Entry[],
  on: ISODate = today(),
  ahead = false,
): CapState {
  if (support?.depositCap === undefined) return NO_CAP
  const cap = support.depositCap
  const value = supportValue(support.id, valuations, entries, on, !ahead).estimated
  if (value === null) return { kind: 'unknown', cap }
  return { kind: 'room', cap, room: roomLeft(cap, value) }
}

/**
 * La place sous un plafond connu — le calcul nu, sans support ni document.
 *
 * Il existe séparément parce que la projection l'appelle sur un capital qu'elle
 * a déjà en main (`ProjectionPart.room`), et qu'un second `Math.max(0, …)`
 * écrit là-bas aurait été la même règle en deux exemplaires. Sans relevé, le
 * capital est **inconnu** et non nul ; la projection le compte alors pour zéro,
 * et la place vaut le plafond entier — c'est cohérent avec le reste de son
 * calcul, qui dit déjà qu'un support sans relevé ne pèse pas dans le capital.
 */
export function roomLeft(cap: Money, capital: Money | null): Money {
  return money(Math.max(0, cap - (capital ?? ZERO)))
}

/** La place restante, ou `null` quand rien n'est borné ou que le capital manque. */
export function roomOf(state: CapState): Money | null {
  return state.kind === 'room' ? state.room : null
}

/** Vrai quand le plafond est atteint : la place vaut zéro. */
export function isFull(state: CapState): boolean {
  return state.kind === 'room' && state.room <= ZERO
}

/* --- Ce qu'un versement dépasserait ---------------------------------------*/

/**
 * Le verdict d'un versement contre le plafond — rendu seulement quand il y a
 * quelque chose à dire.
 *
 * Les trois chiffres sont ceux dont l'écran a besoin pour proposer ses deux
 * sorties sans en recalculer aucun : ce que le contrat autorise, ce qui reste,
 * et de combien on passe au-dessus.
 */
export type CapExcess = {
  cap: Money
  /** La place restante — c'est aussi le montant écrêté que l'écran propose. */
  room: Money
  /** Ce qui passe au-dessus du plafond. Toujours strictement positif. */
  over: Money
}

/**
 * Ce qu'un mouvement dépasserait, ou `null` s'il tient.
 *
 * Seuls les **versements** sont bornés : une reprise rend de la place, et la
 * borner reviendrait à interdire de vider un compte plein. Un montant nul ou
 * négatif ne dépasse rien non plus — c'est un autre message que celui-ci.
 */
export function capExcess(
  state: CapState,
  amount: Money,
  direction: Direction = 'out',
): CapExcess | null {
  if (state.kind !== 'room' || direction !== 'out' || amount <= ZERO) return null
  const over = amount - state.room
  return over <= 0 ? null : { cap: state.cap, room: state.room, over: money(over) }
}

/**
 * Le montant qu'on peut verser sans dépasser — l'**écrêtage**.
 *
 * C'est déjà la règle du simulateur (cahier §4.6 ter) : « le dernier versement
 * est écrêté plutôt que refusé en entier — il reste 120 € de place et le
 * virement est de 200 €, on verse les 120 ». Elle vaut ici pour la même raison,
 * et l'écran en fait sa première sortie.
 */
export function clipToCap(state: CapState, amount: Money, direction: Direction = 'out'): Money {
  const excess = capExcess(state, amount, direction)
  return excess === null ? amount : excess.room
}

/* --- Quand une règle remplit le support -----------------------------------*/

/**
 * Jusqu'où l'on cherche la date à laquelle une règle remplit le support.
 *
 * Trente ans : au-delà, « ton plafond sera atteint en 2071 » n'est plus une
 * information sur laquelle qui que ce soit décide quoi que ce soit — c'est le
 * seuil où l'annonce cesse d'aider et devient du bruit. Et sur une règle qui
 * verse trop peu pour remplir le compte avant cet horizon, l'app se tait :
 * c'est la bonne réponse, pas un calcul manqué.
 */
export const CAP_HORIZON_YEARS = 30

/**
 * Ce qu'une règle fera du plafond — quand elle le remplit, et en combien
 * d'échéances.
 *
 * Le calcul marche sur les **échéances réelles** de la règle plutôt que sur son
 * équivalent mensuel : une trimestrielle de 600 € ne remplit pas un compte au
 * même rythme que 200 € par mois, et l'annonce porte une date, qui doit tomber
 * un jour où quelque chose se passe.
 */
export type CapFill = {
  /** La date de la dernière échéance que le plafond laisse encore passer. */
  date: ISODate
  /** Combien d'échéances tombent d'ici là, celle-ci comprise. Zéro : c'est plein. */
  dues: number
  /** Vrai quand cette dernière échéance est écrêtée, donc partielle. */
  clipped: boolean
}

/**
 * La date à laquelle une règle remplit le support, ou `null` quand elle ne le
 * remplit pas — parce qu'elle ne verse pas, parce qu'il n'y a pas de plafond,
 * ou parce que l'horizon passe avant.
 *
 * Un support **déjà plein** rend `dues: 0` à la date de la prochaine échéance :
 * c'est ce qui permet à l'écran de dire « cette règle ne posera plus rien »
 * plutôt que d'annoncer une date au futur qui n'arrivera jamais.
 */
export function capFill(
  recurrence: Schedule & Pick<Recurrence, 'amount' | 'direction'>,
  state: CapState,
  from: ISODate = today(),
): CapFill | null {
  if (state.kind !== 'room' || recurrence.direction !== 'out') return null
  /* Une règle à montant variable n'a aucun chiffre à opposer au plafond : son
     ordre de grandeur est une supposition, et annoncer une date sur une
     supposition ferait passer une hypothèse pour une échéance. */
  const each = recurrence.amount
  if (each === null || each <= ZERO) return null

  const horizon = addMonths(from, CAP_HORIZON_YEARS * 12)
  const dues = expandRecurrence(recurrence, from, horizon)
  if (dues.length === 0) return null

  let left = state.room
  for (const [index, due] of dues.entries()) {
    if (left <= ZERO) return { date: due.date, dues: index, clipped: false }
    if (each >= left) return { date: due.date, dues: index + 1, clipped: each > left }
    left = money(left - each)
  }
  return null
}
