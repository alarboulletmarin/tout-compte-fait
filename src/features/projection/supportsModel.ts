/* ============================================================================
 * Ce qu'on suppose de chaque support, et où ces suppositions vivent.
 *
 * **Hors du document, et c'est la même décision qu'en tête de `model.ts`.** Un
 * taux n'est pas un fait du foyer : c'est une question qu'on pose, et la réponse
 * change dès qu'on change d'avis. L'écrire dans `Data` le ferait voyager dans
 * les exports, apparaître dans le schéma qu'on donne à un assistant, et exiger
 * une migration ; et un `expectedReturn` posé sur un `SavingSupport` serait
 * exactement la promesse que le cahier §2 refuse d'inscrire dans le modèle — le
 * support porte ce que le compte *est*, pas ce qu'on espère qu'il rapporte.
 *
 * Ce qui est gardé l'est donc en `localStorage`, à côté des réglages du
 * simulateur, et le pire qu'on risque à le perdre est de retaper un taux.
 *
 * **La cadence (`pace`) n'est pas lue ici.** Elle dit quand un relevé est
 * attendu, pas ce qu'un support rapporte, et le cahier §4.6 bis l'écrit noir sur
 * blanc : « elle ne sert à projeter aucune valeur ». En déduire 2 % pour un
 * livret et 6 % pour un PEA ferait de l'app l'auteur d'une hypothèse qu'elle
 * afficherait ensuite comme venant de quelqu'un.
 * ==========================================================================*/

import { type Money, ZERO, parseAmount } from '@/domain/money'
import { type RateKind } from '@/domain/projection'
import { MAX_RATE_PERCENT, parseRateBp } from '@/domain/rate'
import {
  type SavingProjection,
  type SupportAssumption,
  type SupportBasis,
  type SupportPlan,
  projectSupports,
} from '@/domain/savingProjection'
import type { SavingSupport } from '@/domain/types'
import { tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'

/**
 * Ce qu'on suppose d'un support.
 *
 * `monthlyText` vaut `null` tant qu'on n'a rien essayé : le versement projeté
 * est alors **celui des récurrences**, et l'écran est une lecture. Dès qu'un
 * chiffre est tapé, il le remplace pour la durée de la question — sans toucher
 * à la récurrence, qui reste affichée à côté et qu'un bouton restaure.
 */
export type SupportSetting = {
  rateText: string
  kind: RateKind
  /** Le versement essayé, ou `null` pour suivre les récurrences. */
  monthlyText: string | null
}

/**
 * Trois pour cent, en **hypothèse** — le défaut du simulateur, pour ses raisons.
 *
 * Écrire un taux garanti reviendrait à annoncer celui d'un produit : un livret
 * réglementé est révisé au 1er février et au 1er août, donc un chiffre en dur
 * serait daté par construction. Une hypothèse n'engage que la personne qui la
 * valide, et 3 % est modeste — c'est le contraire des 11 % « constatés » que
 * présélectionne un simulateur de vente.
 */
export const DEFAULT_SUPPORT_SETTING: SupportSetting = {
  rateText: '3',
  kind: 'assumed',
  monthlyText: null,
}

export const SUPPORT_SETTINGS_KEY = 'tout-compte-fait.projection.supports'

/** Une table de réglages, par identifiant de support. */
export type SupportSettings = Record<string, SupportSetting>

/**
 * Le plafond d'entrées relues.
 *
 * Un foyer tient rarement plus de six ou sept supports, et cette table ne se
 * purge pas quand un support est supprimé : la borne évite qu'un document
 * remanié cent fois laisse derrière lui une table qu'on parcourt à chaque
 * rendu. Ce qui déborde est simplement oublié, et retombe sur le défaut.
 */
const MAX_ENTRIES = 64

/** Un champ de saisie, borné : ce qui vient du stockage vient du dehors. */
function text(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length <= 24 ? value : fallback
}

function settingFrom(raw: unknown): SupportSetting | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { rateText, kind, monthlyText } = raw as Record<string, unknown>
  return {
    rateText: text(rateText, DEFAULT_SUPPORT_SETTING.rateText),
    kind: kind === 'guaranteed' ? 'guaranteed' : 'assumed',
    monthlyText: typeof monthlyText === 'string' ? text(monthlyText, '') : null,
  }
}

/**
 * Les derniers réglages, revalidés de bout en bout.
 *
 * `localStorage` s'édite depuis la console du navigateur : une table de mille
 * entrées ou un taux à `NaN` ne doit pas casser l'écran. Même prudence que
 * `readDraft`, et que `persistence/validate.ts` sur un document importé.
 */
export function readSupportSettings(): SupportSettings {
  try {
    const raw = localStorage.getItem(SUPPORT_SETTINGS_KEY)
    if (raw === null) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}

    const kept: SupportSettings = {}
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (Object.keys(kept).length >= MAX_ENTRIES) break
      const setting = settingFrom(value)
      if (setting !== null) kept[id] = setting
    }
    return kept
  } catch {
    /* Mode privé d'un vieux Safari, quota plein, JSON abîmé : on retombe sur
       les défauts. Personne n'a perdu de données — il n'y en avait pas. */
    return {}
  }
}

export function writeSupportSettings(settings: SupportSettings): void {
  try {
    localStorage.setItem(SUPPORT_SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Rien à en dire : l'écran fonctionne à l'identique, il oubliera, c'est tout.
  }
}

export function settingOf(settings: SupportSettings, supportId: string): SupportSetting {
  return settings[supportId] ?? DEFAULT_SUPPORT_SETTING
}

/* --- Ce que la saisie donne ------------------------------------------------*/

/** Une ligne de l'écran : un support, ce qu'on en suppose, et ce qu'il devient. */
export type SupportRow = {
  basis: SupportBasis
  setting: SupportSetting
  rateError?: string
  monthlyError?: string
  /** `null` quand le support n'est pas projeté — sans relevé, ou saisie illisible. */
  plan: SupportPlan | null
}

export type SupportsAnalysis = {
  rows: SupportRow[]
  projection: SavingProjection
  /**
   * Les supports que la courbe laisse dehors, et ils n'y sont pas pour la même
   * raison : `unvalued` n'a jamais été relevé — l'app ne sait pas d'où partir —,
   * `unreadable` porte un taux ou un versement que la saisie ne rend pas
   * lisible. Les deux se nomment, aucun ne compte pour zéro.
   */
  unvalued: SavingSupport[]
  unreadable: SavingSupport[]
}

const outOfRangeRate = (): string => tpl(projection.rateInvalid, MAX_RATE_PERCENT)

/* Le repli du résolveur d'hypothèses, qu'aucun support n'atteint : la liste
   passée à `projectSupports` est filtrée sur celles qui existent. Il est là
   parce qu'une `Map` rend `undefined` et que ce module ne fait pas semblant du
   contraire. */
const DEFAULT_ASSUMPTION: SupportAssumption = { rateBp: 0, kind: 'assumed' }

/**
 * Ce que les supports et leurs réglages produisent : les erreurs à signaler, et
 * les trajectoires à tracer.
 *
 * Les deux d'un coup, comme `analyse` : une saisie fautive est exactement ce qui
 * empêche le calcul, et les séparer ferait exister un état où l'écran trace une
 * courbe à partir d'un champ qu'il vient de signaler comme illisible.
 *
 * **Un champ illisible retire son support, il n'efface pas les autres** — la
 * règle du simulateur, appliquée ici support par support. Le total le dit :
 * mieux vaut un total dont on nomme le trou qu'un total silencieusement
 * incomplet.
 */
export function analyseSupports(
  bases: readonly SupportBasis[],
  settings: SupportSettings,
  months: number,
  inflationBp = 0,
): SupportsAnalysis {
  const unreadable: SavingSupport[] = []
  const assumptions = new Map<string, SupportAssumption>()
  const drafts = bases.map((basis) => {
    const setting = settingOf(settings, basis.support.id)
    const rateBp = parseRateBp(setting.rateText)
    /* Un champ vidé n'est pas illisible : c'est une réponse — « et si je ne
       versais plus rien ». C'est la règle de `amount()` dans `model.ts`. */
    const tried: Money | null =
      setting.monthlyText === null
        ? null
        : setting.monthlyText.trim() === ''
          ? ZERO
          : parseAmount(setting.monthlyText)
    const unreadableMonthly = setting.monthlyText !== null && tried === null

    if (rateBp === null || unreadableMonthly) unreadable.push(basis.support)
    else {
      assumptions.set(basis.support.id, {
        rateBp,
        kind: setting.kind,
        ...(tried === null ? {} : { monthly: tried }),
      })
    }

    return {
      basis,
      setting,
      ...(rateBp === null ? { rateError: outOfRangeRate() } : {}),
      ...(unreadableMonthly ? { monthlyError: projection.amountInvalid } : {}),
    }
  })

  const projected = projectSupports(
    bases.filter((basis) => assumptions.has(basis.support.id)),
    (id) => assumptions.get(id) ?? DEFAULT_ASSUMPTION,
    months,
    inflationBp,
  )

  const planOf = new Map(projected.plans.map((plan) => [plan.basis.support.id, plan]))
  const rows: SupportRow[] = drafts.map((draft) => ({
    ...draft,
    plan: planOf.get(draft.basis.support.id) ?? null,
  }))

  return { rows, projection: projected, unvalued: projected.unvalued, unreadable }
}
