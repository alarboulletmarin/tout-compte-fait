/* ============================================================================
 * L'état de l'écran des projections : ce qui est saisi, ce qui s'en déduit, et
 * ce qu'on en garde entre deux visites.
 *
 * **Rien n'entre dans le document.** Une projection n'est pas un fait du foyer
 * — c'est une question qu'on pose, et la réponse change à chaque fois qu'on
 * change d'avis sur le taux. L'écrire dans `Data` la ferait voyager dans les
 * exports, apparaître dans le schéma qu'on donne à un assistant, et exiger une
 * migration ; et un `expectedReturn` posé sur un support serait exactement la
 * promesse que le cahier §2 refuse de poser « au cas où ».
 *
 * Ce qui est gardé l'est donc **hors du document**, en `localStorage`, à la
 * façon du thème et de l'accusé de lecture de la notice : ça décrit cet
 * appareil-ci et la personne devant lui, pas ses comptes. Le pire qui puisse
 * arriver en le perdant est de retaper trois chiffres.
 *
 * Le calcul, lui, ne vit pas ici : il est dans `domain/projection.ts`, pur et
 * testé. Ce module ne fait que le brancher sur des champs de saisie.
 * ==========================================================================*/

import { type Money, ZERO, money, parseAmount } from '@/domain/money'
import {
  type ProjectionSeries,
  type RateKind,
  inflate,
  projectSeries,
  requiredMonthly,
} from '@/domain/projection'
import { MAX_RATE_PERCENT, parseRateBp } from '@/domain/rate'
import { tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'

/** Trois emplacements fixes, et le troisième est le dernier (cahier §4.6 ter). */
export const SCENARIO_SLOTS = ['a', 'b', 'c'] as const
export type ScenarioId = (typeof SCENARIO_SLOTS)[number]

export type ProjectionMode = 'forecast' | 'target'

/**
 * D'où partent les chiffres : de tes comptes, ou de ce que tu tapes.
 *
 * `null` est un troisième état, et il compte : il dit qu'**on n'a pas encore
 * choisi**, ce qui n'est pas la même chose que d'avoir choisi les chiffres
 * libres. Tant qu'il vaut `null`, l'écran ouvre la lecture qui a quelque chose
 * à montrer — tes supports s'il en existe un de relevé, le simulateur sinon. Un
 * choix explicite l'emporte ensuite, et pour toujours : sans cette distinction,
 * quelqu'un qui préfère le simulateur se ferait renvoyer sur ses comptes au
 * premier relevé posé.
 */
export type ProjectionSource = 'supports' | 'free'

export type ScenarioDraft = { id: ScenarioId; rateText: string; kind: RateKind }

export type ProjectionDraft = {
  /** `null` tant que personne n'a choisi — voir `ProjectionSource`. */
  source: ProjectionSource | null
  mode: ProjectionMode
  initialText: string
  monthlyText: string
  targetText: string
  /** L'horizon en années : c'est ainsi qu'on le pense, et qu'on le saisit. */
  years: number
  scenarios: ScenarioDraft[]
  /** Lire en euros d'aujourd'hui. Éteint par défaut, et signalé quand il est allumé. */
  constant: boolean
  inflationText: string
}

/** La modification d'un brouillon, telle que la coquille la distribue. */
export type Patch = (next: Partial<ProjectionDraft>) => void

export const YEAR_PRESETS = [5, 10, 15, 20] as const
export const MIN_YEARS = 1
/**
 * Cinquante ans, et c'est déjà beaucoup. Au-delà, une projection à taux
 * constant ne décrit plus rien : ni le taux, ni l'inflation, ni la personne qui
 * la lit ne seront les mêmes. La borne n'est pas technique — le calcul tiendrait
 * — elle dit où le modèle cesse d'avoir un sens.
 */
export const MAX_YEARS = 50

/**
 * Ce que l'écran propose à qui arrive, et le seul endroit où ces valeurs sont
 * décidées.
 *
 * **Une hypothèse à 3 %, et non un taux garanti.** Écrire un taux garanti
 * reviendrait à annoncer celui d'un produit — un livret réglementé est révisé
 * au 1er février et au 1er août, si bien qu'un chiffre en dur serait faux dans
 * les six mois et daté par construction. Une *hypothèse* n'engage que la
 * personne qui la valide, et 3 % est modeste : c'est le contraire des 11 %
 * « constatés sur la dernière décennie » que les simulateurs de vente
 * présélectionnent.
 *
 * 100 €/mois sur dix ans pour la même raison : de quoi que l'écran montre
 * quelque chose à l'ouverture, sans que le chiffre ressemble à une
 * recommandation.
 */
export const DEFAULT_DRAFT: ProjectionDraft = {
  source: null,
  mode: 'forecast',
  initialText: '',
  monthlyText: '100',
  targetText: '',
  years: 10,
  scenarios: [{ id: 'a', rateText: '3', kind: 'assumed' }],
  constant: false,
  inflationText: '2',
}

/* --- Le confort local ------------------------------------------------------*/

export const PROJECTION_STORAGE_KEY = 'tout-compte-fait.projection'

/** Un champ de saisie, borné : ce qui vient du stockage vient du dehors. */
function text(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length <= 24 ? value : fallback
}

function scenariosFrom(value: unknown): ScenarioDraft[] {
  if (!Array.isArray(value)) return DEFAULT_DRAFT.scenarios
  const kept = value
    .slice(0, SCENARIO_SLOTS.length)
    .map((raw, index): ScenarioDraft | null => {
      if (typeof raw !== 'object' || raw === null) return null
      const { rateText, kind } = raw as Record<string, unknown>
      const slot = SCENARIO_SLOTS[index]
      if (slot === undefined) return null
      return {
        id: slot,
        rateText: text(rateText, ''),
        kind: kind === 'guaranteed' ? 'guaranteed' : 'assumed',
      }
    })
    .filter((scenario): scenario is ScenarioDraft => scenario !== null)
  return kept.length === 0 ? DEFAULT_DRAFT.scenarios : kept
}

/**
 * Les derniers réglages, ou les valeurs par défaut.
 *
 * Tout est revalidé : `localStorage` s'édite depuis la console du navigateur,
 * et une durée à `NaN` ou un tableau de quarante scénarios ne doit pas casser
 * l'écran. C'est la même prudence que `persistence/validate.ts` applique à un
 * document importé, à l'échelle de trois champs.
 */
export function readDraft(): ProjectionDraft {
  try {
    const raw = localStorage.getItem(PROJECTION_STORAGE_KEY)
    if (raw === null) return DEFAULT_DRAFT
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_DRAFT
    const stored = parsed as Record<string, unknown>
    const years = Number(stored.years)

    return {
      source: stored.source === 'supports' || stored.source === 'free' ? stored.source : null,
      mode: stored.mode === 'target' ? 'target' : 'forecast',
      initialText: text(stored.initialText, DEFAULT_DRAFT.initialText),
      monthlyText: text(stored.monthlyText, DEFAULT_DRAFT.monthlyText),
      targetText: text(stored.targetText, DEFAULT_DRAFT.targetText),
      years:
        Number.isInteger(years) && years >= MIN_YEARS && years <= MAX_YEARS
          ? years
          : DEFAULT_DRAFT.years,
      scenarios: scenariosFrom(stored.scenarios),
      constant: stored.constant === true,
      inflationText: text(stored.inflationText, DEFAULT_DRAFT.inflationText),
    }
  } catch {
    /* Mode privé d'un vieux Safari, quota plein, JSON abîmé : on retombe sur
       les valeurs par défaut. Il n'y a rien à signaler — personne n'a perdu de
       données, il n'y en avait pas. */
    return DEFAULT_DRAFT
  }
}

export function writeDraft(draft: ProjectionDraft): void {
  try {
    localStorage.setItem(PROJECTION_STORAGE_KEY, JSON.stringify(draft))
  } catch {
    // Rien à en dire : l'écran fonctionne à l'identique, il oubliera, c'est tout.
  }
}

/* --- Ce que la saisie donne ------------------------------------------------*/

export type ScenarioResult = {
  id: ScenarioId
  rateBp: number
  kind: RateKind
  /** Le versement du mode direct, ou celui que le mode inverse a calculé. */
  monthly: Money
  series: ProjectionSeries
}

export type ProjectionResult = {
  months: number
  scenarios: ScenarioResult[]
  /**
   * Les versements cumulés, quand ils sont les mêmes pour tous — c'est-à-dire
   * en mode direct. Le mode inverse donne à chaque hypothèse **son** versement
   * requis : il n'y a plus une aire commune à tracer, et le tableau porte alors
   * le total versé, hypothèse par hypothèse.
   */
  contributed: Money[] | null
  /** Le capital de départ atteint déjà la cible : il n'y a rien à verser. */
  targetReached: boolean
  /** Ce que vaut l'inflation appliquée à la lecture, zéro en euros courants. */
  inflationBp: number
}

export type DraftErrors = {
  initial?: string
  monthly?: string
  target?: string
  years?: string
  inflation?: string
  rates: Partial<Record<ScenarioId, string>>
}

export type Analysis = {
  errors: DraftErrors
  /** `null` tant qu'il manque de quoi tracer quoi que ce soit. */
  result: ProjectionResult | null
  /** Ce qui manque, à écrire à la place du graphique. */
  missing: string | null
}

/** Un champ vide vaut zéro ; un champ illisible ne vaut rien. */
function amount(value: string): Money | null {
  return value.trim() === '' ? ZERO : parseAmount(value)
}

/* Les deux messages qui annoncent une borne la lisent sur la constante qui la
   fait respecter. Recopier « entre 1 et 50 » dans la prose donnerait un texte
   qui survivrait au changement de la borne, et qui mentirait alors sans que
   rien ne le dise. */
const outOfRangeRate = () => tpl(projection.rateInvalid, MAX_RATE_PERCENT)

/**
 * L'horizon est-il lisible, et sinon comment le dire.
 *
 * Exporté parce que les deux lectures de l'écran posent la même question au même
 * champ : deux validations de la durée finiraient par ne plus refuser les mêmes
 * saisies, sur un contrôle qui est justement partagé (`YearsField`).
 */
export function yearsError(years: number): string | undefined {
  return Number.isInteger(years) && years >= MIN_YEARS && years <= MAX_YEARS
    ? undefined
    : tpl(projection.durationInvalid, MIN_YEARS, MAX_YEARS)
}

/** L'horizon en mois, ou zéro quand il n'est pas lisible — rien à tracer. */
export function monthsOf(years: number): number {
  return yearsError(years) === undefined ? years * 12 : 0
}

/**
 * Ce que la saisie produit : les erreurs à signaler, et le résultat à tracer.
 *
 * Les deux d'un coup, et non deux fonctions : une erreur de saisie est
 * exactement ce qui empêche le calcul, et les séparer ferait exister un état où
 * l'écran trace une courbe à partir d'un champ qu'il vient de signaler comme
 * illisible.
 *
 * L'écran ne refuse jamais de *tout* montrer pour un champ fautif : un taux
 * illisible retire son hypothèse, il n'efface pas les deux autres. C'est la
 * règle qui vaut déjà pour les lectures qui n'ont pas de réponse — s'effacer
 * plutôt qu'afficher un nombre, et seulement là où la réponse manque.
 */
export function analyse(draft: ProjectionDraft): Analysis {
  const initial = amount(draft.initialText)
  const monthly = amount(draft.monthlyText)
  const target = amount(draft.targetText)
  const inflationBp = parseRateBp(draft.inflationText)
  const years = yearsError(draft.years)

  const rates: Partial<Record<ScenarioId, string>> = {}
  const scenarios = draft.scenarios.flatMap((scenario) => {
    const rateBp = parseRateBp(scenario.rateText)
    if (rateBp === null) {
      rates[scenario.id] = outOfRangeRate()
      return []
    }
    return [{ id: scenario.id, rateBp, kind: scenario.kind }]
  })

  const errors: DraftErrors = {
    ...(initial === null ? { initial: projection.amountInvalid } : {}),
    ...(draft.mode === 'forecast' && monthly === null ? { monthly: projection.amountInvalid } : {}),
    ...(draft.mode === 'target' && target === null ? { target: projection.amountInvalid } : {}),
    ...(years === undefined ? {} : { years }),
    ...(inflationBp === null ? { inflation: outOfRangeRate() } : {}),
    rates,
  }

  /* Une inflation illisible ne vaut pas zéro : elle éteint la lecture en euros
     constants, qui est une lecture de plus et non le calcul lui-même. */
  const erosion = draft.constant ? (inflationBp ?? 0) : 0
  const months = monthsOf(draft.years)

  if (initial === null || months === 0 || scenarios.length === 0) {
    return { errors, result: null, missing: null }
  }

  if (draft.mode === 'target') {
    if (target === null || target === ZERO) {
      return { errors, result: null, missing: projection.targetMissing }
    }
    /* Une cible lue en euros d'aujourd'hui se réinflate avant le calcul : c'est
       ce qui fait que la courbe arrive sur le chiffre tapé, et non dessous. */
    const nominal = inflate(target, erosion, months)
    const computed = scenarios.map((scenario) => {
      const required = requiredMonthly({
        target: nominal,
        initial,
        months,
        rateBp: scenario.rateBp,
      })
      const perMonth = required ?? ZERO
      return {
        ...scenario,
        monthly: perMonth,
        series: projectSeries({
          initial,
          monthly: perMonth,
          months,
          rateBp: scenario.rateBp,
          inflationBp: erosion,
        }),
      }
    })
    return {
      errors,
      missing: null,
      result: {
        months,
        scenarios: computed,
        contributed: null,
        targetReached: computed.every((scenario) => scenario.monthly === ZERO),
        inflationBp: erosion,
      },
    }
  }

  if (monthly === null || (monthly === ZERO && initial === ZERO)) {
    return { errors, result: null, missing: projection.nothingToPlot }
  }

  const computed = scenarios.map((scenario) => ({
    ...scenario,
    monthly,
    series: projectSeries({
      initial,
      monthly,
      months,
      rateBp: scenario.rateBp,
      inflationBp: erosion,
    }),
  }))

  return {
    errors,
    missing: null,
    result: {
      months,
      scenarios: computed,
      /* Le versé ne dépend pas du taux : les trois hypothèses partagent la même
         aire, et c'est ce qui rend l'écart entre elle et chaque courbe lisible
         comme « ce que le taux a produit ». */
      contributed: computed[0]?.series.contributed ?? null,
      targetReached: false,
      inflationBp: erosion,
    },
  }
}

/** Le prochain emplacement libre, ou `null` quand les trois sont pris. */
export function nextSlot(scenarios: readonly ScenarioDraft[]): ScenarioId | null {
  return SCENARIO_SLOTS.find((slot) => !scenarios.some((s) => s.id === slot)) ?? null
}

/** Les intérêts : ce que le taux a produit, par différence. */
export function interestOf(series: ProjectionSeries, at: number): Money {
  return money((series.balance[at] ?? ZERO) - (series.contributed[at] ?? ZERO))
}
