/* ============================================================================
 * Ce qu'un support a valu, mois après mois.
 *
 * L'app savait dire ce qu'il vaut **aujourd'hui** (`supportValue`) et ce qu'on
 * a mis de côté **cette année** (`savingYearSeries`, du flux pur). Elle ne
 * savait pas dire la trajectoire : un capital, puis des virements, puis des
 * intérêts, mois par mois. La donnée était pourtant là depuis le premier jour —
 * les relevés, les `Entry`, et maintenant les paliers de taux.
 *
 * **Une estimation, et elle s'annonce comme telle.** Ce module capitalise, donc
 * il produit des nombres que personne n'a relevés. C'est licite ici et nulle
 * part ailleurs : `supportValue`, `savingTotal` et `savingCoverage` ne l'appellent
 * pas et ne le connaissent pas. Le stock **de référence** reste ce qui a été
 * relevé plus ce qui a bougé, et huit tests d'invariant tiennent la séparation
 * (`savingInvariants.test.ts`). Ce qui se trace ici est doublé d'une réserve à
 * l'écran, et les mois qui portent un vrai relevé sont **marqués** : ce sont les
 * faits, et ils doivent rester visibles sur une courbe qui, sinon, se croirait
 * sur parole.
 *
 * **Un relevé fait foi et reprend la main.** Le mois où il tombe repart de lui.
 * C'est ce qui empêche l'estimation de dériver indéfiniment, et c'est déjà la
 * règle de `supportValue` — deux façons de répondre à « combien vaut ce
 * support » donneraient deux vérités à tenir d'accord (cahier §4.6 bis).
 * ==========================================================================*/

import {
  type ISODate,
  type YearMonth,
  addDays,
  addMonthsToYm,
  endOfMonth,
  monthRange,
  startOfMonth,
  today,
  ymOf,
} from './date'
import { type Money, ZERO, money } from './money'
import { monthlyRate } from './projection'
import { supportFlows, valuationsOf } from './saving'
import { rateOn } from './savingRate'
import type { Entry, SavingRate, SavingSupport, SavingValuation } from './types'

/** Ce que le module lit. Les mêmes collections que le reste de l'épargne. */
export type StockSource = {
  savingValuations: readonly SavingValuation[]
  savingRates: readonly SavingRate[]
  entries: readonly Entry[]
}

export type StockPoint = {
  month: YearMonth
  /**
   * Ce que le support vaut à la fin du mois : le relevé quand il y en a un, la
   * dérivée sinon.
   *
   * `null` tant qu'aucun relevé n'a jamais eu lieu — une valeur inconnue n'est
   * pas zéro, et c'est la règle qui tient tout `saving.ts`. Le tracé s'y
   * interrompt plutôt que de partir de l'origine (`charts/path.ts` coupe déjà
   * sur `null`), et un mois sans donnée ne se dessine pas (cahier §4.7).
   */
  value: Money | null
  /** Le relevé de ce mois-là, quand il y en a un : le point qu'on pose. */
  known: Money | null
  /** Versements − reprises confirmés du mois. */
  moved: Money
  /** Ce que le taux a produit ce mois-ci. Zéro sans palier. */
  interest: Money
}

/**
 * La trajectoire d'un support, un point par mois, bornes incluses.
 *
 * Trois règles, et chacune est un test.
 *
 * - **Les intérêts portent sur le capital d'entrée**, jamais sur les versements
 *   du mois : c'est la convention de fin de mois de `projectSeries`, celle qui
 *   promet le moins, et deux conventions différentes d'un écran à l'autre
 *   donneraient deux chiffres sous le même mot.
 * - **Les flux confirmés seulement.** Une échéance encore prévue n'a bougé
 *   aucun livret. Les mois à venir restent donc plats plutôt que d'anticiper
 *   une valeur que le prochain relevé démentirait.
 * - **Le taux est celui du premier jour du mois** (`rateOn`), donc un palier
 *   posé au 1er janvier ne touche aucun mois de décembre. C'est toute la raison
 *   d'être du taux daté.
 *
 * `to` est ramené au mois où l'on regarde : ceci est le **passé**, la
 * projection est l'autre module.
 */
export function supportStockSeries(
  supportId: string,
  source: StockSource,
  from: YearMonth,
  to: YearMonth,
  on: ISODate = today(),
): StockPoint[] {
  const last = ymOf(on)
  const end = to > last ? last : to
  if (from > end) return []

  const valuations = valuationsOf(source.savingValuations, supportId)

  /* Le capital d'entrée du premier mois : le dernier relevé d'avant, plus ce
     qui a bougé depuis. C'est `supportValue` arrêté à la veille du premier
     mois, écrit ici parce qu'on a besoin du même chiffre à une date arbitraire
     et non seulement aujourd'hui. */
  const openedOn = addDays(startOfMonth(from), -1)
  const before = valuations.find((valuation) => valuation.date <= openedOn) ?? null
  let carried: number | null =
    before === null
      ? null
      : before.amount +
        supportFlows(
          source.entries,
          supportId,
          { from: addDays(before.date, 1), to: openedOn },
          true,
        ).net

  return monthRange(from, end).map((month) => {
    const first = startOfMonth(month)
    const closes = endOfMonth(month)

    /* Le relevé du mois, s'il y en a un — le plus récent, par l'ordre de la
       pile. Il fait foi : ce qui le précède dans le mois est déjà dedans, et
       seuls les mouvements postérieurs s'y ajoutent. */
    const inMonth =
      valuations.find((valuation) => valuation.date >= first && valuation.date <= closes) ?? null

    if (inMonth !== null) {
      const after = supportFlows(
        source.entries,
        supportId,
        { from: addDays(inMonth.date, 1), to: closes },
        true,
      ).net
      carried = inMonth.amount + after
      return {
        month,
        value: money(Math.round(carried)),
        known: inMonth.amount,
        moved: supportFlows(source.entries, supportId, { from: first, to: closes }, true).net,
        /* Un mois relevé ne s'attribue aucun intérêt : le relevé *contient*
           déjà ce que le taux a produit, et l'écrire à côté le compterait
           deux fois. */
        interest: ZERO,
      }
    }

    const moved = supportFlows(source.entries, supportId, { from: first, to: closes }, true).net
    if (carried === null) {
      /* Avant le premier relevé, un mouvement ne fait pas une valeur : on
         saurait ce qui a été versé, pas ce qu'on possède. */
      return { month, value: null, known: null, moved, interest: ZERO }
    }

    const rateBp = rateOn(source.savingRates, supportId, first)?.rateBp ?? 0
    const interest = carried * monthlyRate(rateBp)
    carried = carried + interest + moved

    return {
      month,
      value: money(Math.round(carried)),
      known: null,
      moved,
      interest: money(Math.round(interest)),
    }
  })
}

/** Une bande de la pile : un support, son nom, et sa trajectoire. */
export type StockBand = {
  supportId: string
  label: string
  points: StockPoint[]
}

/**
 * Les trajectoires d'un jeu de supports, dans l'ordre du document.
 *
 * Une bande par support, et la somme des bandes **est** le patrimoine : c'est
 * ce qui autorise l'empilement du graphique là où trois hypothèses de rendement
 * ne s'empilent pas (cahier §4.6 ter). Les supports sans le moindre relevé
 * n'ont aucune bande — pas une bande plate à zéro : l'inconnu ne s'additionne à
 * rien, et l'empiler ferait passer une ignorance pour un compte vide.
 */
export function stockBands(
  supports: readonly SavingSupport[],
  source: StockSource,
  from: YearMonth,
  to: YearMonth,
  on: ISODate = today(),
): StockBand[] {
  return supports
    .map((support) => ({
      supportId: support.id,
      label: support.label,
      points: supportStockSeries(support.id, source, from, to, on),
    }))
    .filter((band) => band.points.some((point) => point.value !== null))
}

/**
 * La fenêtre que l'écran propose, en mois écoulés depuis celui qu'on vit.
 *
 * Elle est bornée par ce que le document couvre, jamais par une constante : un
 * foyer qui saisit depuis trois mois n'a pas cinq ans de courbe, et lui en
 * dessiner une remplirait cinquante-sept mois d'un trait qui ne dit rien.
 */
export function stockRange(months: number, on: ISODate = today()): { from: YearMonth; to: YearMonth } {
  const to = ymOf(on)
  return { from: addMonthsToYm(to, -Math.max(0, months - 1)), to }
}

/* ============================================================================
 * D'où vient ce que le compte vaut — la seule lecture que la banque ne fait pas.
 *
 * Un relevé dit **combien**. Il ne dit jamais **d'où ça vient**, et c'est
 * pourtant la seule question à laquelle une app de suivi puisse répondre mieux
 * qu'un relevé : sur ces douze mois, tu es parti de 18 000 €, tu as versé
 * 3 600 €, et le compte a produit 410 €. Trois nombres qui s'additionnent
 * exactement au quatrième, et dont aucun ne se lit ailleurs.
 *
 * **Le rendement se mesure par différence, il ne se recalcule pas.** On
 * pourrait cumuler l'intérêt mois par mois de `StockPoint.interest` ; ce serait
 * faux dès le premier relevé. Un mois relevé ne s'attribue aucun intérêt — le
 * relevé *contient* déjà ce que le taux a produit —, si bien que la somme des
 * intérêts saute précisément les mois où l'on sait le mieux ce qui s'est passé.
 * Ce qui est écrit ici est donc `valeur − départ − versé` : par construction la
 * décomposition se referme au centime, et elle attrape en plus ce qu'aucun taux
 * ne modélise — un PEA qui monte de 9 % ou qui perd 4 %.
 *
 * **Elle peut donc être négative, et c'est une lecture, pas une erreur.** Le
 * rouge est réservé aux dépassements et aux fautes (DS §2.3) : un placement qui
 * baisse n'en est pas une, il est ce qu'un placement fait. Le signe est porté
 * par le nombre et par la position de l'aire — sous le versé plutôt que
 * dessus —, jamais par une couleur d'alerte.
 *
 * **Tout est relatif à la fenêtre lue**, et c'est ce qui la rend juste : « ton
 * départ » n'est pas le premier euro jamais posé sur le compte — que le document
 * ne connaît pas —, c'est ce qu'il valait au premier mois affiché. Changer de
 * fenêtre change les trois nombres, ce qui est exactement ce qu'on lui demande.
 * ==========================================================================*/

export type GrowthPoint = {
  month: YearMonth
  /** Ce que le compte valait au premier mois de la fenêtre. Constant. */
  base: Money
  /** Versements − reprises cumulés depuis ce premier mois. Nul à son rang. */
  paid: Money
  /** Ce que le compte a produit : le reste. Négatif quand il a perdu. */
  gain: Money
  /** Ce qu'il vaut — `base + paid + gain`, au centime. */
  value: Money
  /** Le mois porte un vrai relevé : le point d'appui, et non l'estimation. */
  known: boolean
}

/** Un compte et sa décomposition. */
export type GrowthBand = {
  supportId: string
  label: string
  points: GrowthPoint[]
}

/**
 * La décomposition d'une trajectoire déjà calculée.
 *
 * Elle démarre au premier mois **connu** : avant le premier relevé, un mouvement
 * ne fait pas une valeur, et il n'existe donc pas de départ d'où décompter. Elle
 * s'arrête si la valeur redevenait inconnue — ce que `supportStockSeries` ne
 * produit pas, une fois le report amorcé il ne se perd plus, mais une série
 * trouée ferait des versements cumulés faux plutôt qu'absents, et c'est le genre
 * de silence qu'on préfère à un chiffre.
 */
export function growthOf(points: readonly StockPoint[]): GrowthPoint[] {
  const start = points.findIndex((point) => point.value !== null)
  if (start === -1) return []
  const base = points[start]?.value ?? ZERO

  const growth: GrowthPoint[] = []
  let paid = 0
  for (let index = start; index < points.length; index += 1) {
    const point = points[index]
    if (point === undefined || point.value === null) break
    if (index > start) paid += point.moved
    growth.push({
      month: point.month,
      base,
      paid: money(paid),
      gain: money(point.value - base - paid),
      value: point.value,
      known: point.known !== null,
    })
  }
  return growth
}

/** La décomposition de chaque compte, dans l'ordre où on les a donnés. */
export function growthBands(
  supports: readonly SavingSupport[],
  source: StockSource,
  from: YearMonth,
  to: YearMonth,
  on: ISODate = today(),
): GrowthBand[] {
  return supports
    .map((support) => ({
      supportId: support.id,
      label: support.label,
      points: growthOf(supportStockSeries(support.id, source, from, to, on)),
    }))
    .filter((band) => band.points.length > 0)
}

/**
 * La décomposition de l'ensemble — et elle ne s'écrit que là où tout est là.
 *
 * Les comptes n'ont pas le même premier relevé : additionner un livret suivi
 * depuis cinq ans et un PER ouvert en mars ferait, au mois de mars, un total qui
 * bondit de dix mille euros sans qu'un centime ait été versé. Le total ne
 * s'écrit donc que sur les mois où **tous** les comptes lus ont une valeur —
 * c'est déjà la règle de la pile (`charts`), et c'est la seule qui ne fabrique
 * pas de marche.
 *
 * Le départ et le versé sont recalés sur ce premier mois commun, et le rendement
 * se déduit comme partout : par différence. Un compte ouvert plus tard entre
 * donc dans le total en repoussant son début, jamais en creusant une marche.
 */
export function growthTotal(bands: readonly GrowthBand[]): GrowthPoint[] {
  if (bands.length === 0) return []

  const byMonth = bands.map((band) => new Map(band.points.map((point) => [point.month, point])))
  const months = (bands[0]?.points ?? [])
    .map((point) => point.month)
    .filter((month) => byMonth.every((index) => index.has(month)))
  const first = months[0]
  if (first === undefined) return []

  const sum = (pick: (point: GrowthPoint) => number, month: YearMonth): number =>
    byMonth.reduce((total, index) => total + pick(index.get(month) ?? ZEROED), 0)

  const base = money(sum((point) => point.value, first))
  const paidAtFirst = sum((point) => point.paid, first)

  return months.map((month) => {
    const paid = money(sum((point) => point.paid, month) - paidAtFirst)
    const value = money(sum((point) => point.value, month))
    return {
      month,
      base,
      paid,
      gain: money(value - base - paid),
      value,
      known: byMonth.some((index) => index.get(month)?.known === true),
    }
  })
}

/** Le point neutre de la somme — jamais atteint, les mois sont filtrés avant. */
const ZEROED: GrowthPoint = {
  month: '0000-01',
  base: ZERO,
  paid: ZERO,
  gain: ZERO,
  value: ZERO,
  known: false,
}
