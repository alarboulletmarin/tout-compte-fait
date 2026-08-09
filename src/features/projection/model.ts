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
 * **En revanche l'écran lit.** Il ne le faisait pas, et c'était une erreur de
 * symétrie : refuser d'écrire est ce qui protège le document, refuser de lire ne
 * protégeait rien — ça obligeait seulement à retaper un capital que l'app
 * affiche deux écrans plus haut. L'origine d'une simulation peut donc être un
 * support ou l'épargne d'une personne (`domain/projectionStart.ts`) ; le sens
 * reste unique — de l'épargne vers la simulation, jamais l'inverse.
 *
 * Ce qui est gardé l'est **hors du document**, en `localStorage`, à la façon du
 * thème et de l'accusé de lecture de la notice : ça décrit cet appareil-ci et la
 * personne devant lui, pas ses comptes. Le pire qui puisse arriver en le perdant
 * est de retaper trois chiffres.
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
import { currentYm } from '@/domain/date'
import {
  NO_START,
  type ProjectionPart,
  type ProjectionSource,
  type ProjectionStart,
} from '@/domain/projectionStart'
import { MAX_RATE_PERCENT, parseRateBp } from '@/domain/rate'
import { monthlyRateBps } from '@/domain/savingRate'
import { tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'

/** Trois emplacements fixes, et le troisième est le dernier (cahier §4.6 ter). */
export const SCENARIO_SLOTS = ['a', 'b', 'c'] as const
export type ScenarioId = (typeof SCENARIO_SLOTS)[number]

export type ProjectionMode = 'forecast' | 'target'

export type ScenarioDraft = { id: ScenarioId; rateText: string; kind: RateKind }

/**
 * Un taux qu'on essaie sur un support — pour cet écran, et pour lui seul.
 *
 * Projeter tout le portefeuille d'une personne sous un taux unique n'a aucun
 * sens : un Livret A et un PEA ne suivent pas la même courbe, et leur somme
 * n'est celle d'aucun taux moyen. L'écran donne donc une ligne à chaque compte,
 * préremplie avec ce que sa fiche porte — et modifiable, parce que « et si le
 * PEA ne faisait que 4 % ? » est exactement la question qu'on vient poser.
 *
 * **Rien ne redescend dans le document.** C'est la règle qui tient tout l'écran
 * (cahier §4.6 ter) : ce qui se tape ici vit dans `localStorage`, avec le reste
 * du brouillon, et la fiche du support reste le seul endroit où un taux
 * s'enregistre — daté.
 *
 * Un taux simulé **remplace le barème entier** du support. « Et si celui-ci
 * rendait 4 % » ne peut pas cohabiter avec une révision datée qui viendrait
 * contredire au rang 14 ce qu'on vient de taper.
 */
export type SupportRateDraft = { supportId: string; rateText: string; kind: RateKind }

export type ProjectionDraft = {
  mode: ProjectionMode
  /**
   * D'où viennent le capital et le versement : de l'épargne réelle, ou de la
   * saisie. Hors de `free`, les deux champs ne s'affichent plus — les chiffres
   * se lisent, et « Modifier pour cette simulation » les recopie dans la saisie
   * en repassant en libre. C'est ce qui garantit qu'une simulation ne peut pas
   * *avoir l'air* de modifier l'épargne : on ne tape jamais par-dessus elle.
   */
  source: ProjectionSource
  initialText: string
  monthlyText: string
  targetText: string
  /** L'horizon en années : c'est ainsi qu'on le pense, et qu'on le saisit. */
  years: number
  /**
   * Le champ libre de durée est demandé.
   *
   * Il s'affichait en permanence, à côté des quatre raccourcis : deux contrôles
   * pour une seule donnée, dont l'un ne sert qu'aux horizons que les autres ne
   * savent pas dire. Il ne se montre donc que sur demande — et il se montre tout
   * seul quand la durée gardée n'est pas un raccourci, sans quoi une durée de
   * sept ans reviendrait sans champ pour la relire.
   */
  customYears: boolean
  scenarios: ScenarioDraft[]
  /**
   * Les taux essayés sur des supports, par identifiant. Vide par défaut : chaque
   * compte part de ce que sa fiche porte, et de rien d'autre.
   *
   * Une entrée qui ne désigne plus un support n'est jamais lue — mais elle est
   * gardée : changer d'origine et revenir doit retrouver ce qu'on avait tapé,
   * exactement comme l'origine elle-même survit à une visite (`sourceFrom`).
   */
  supportRates: SupportRateDraft[]
  /** Lire en euros d'aujourd'hui. Éteint par défaut, et signalé quand il est allumé. */
  constant: boolean
  inflationText: string
}

export const YEAR_PRESETS = [5, 10, 15, 20] as const

/** La durée tombe-t-elle sur un raccourci ? Décide de l'affichage du champ libre. */
export const isPreset = (years: number): boolean =>
  (YEAR_PRESETS as readonly number[]).includes(years)

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
  mode: 'forecast',
  /* Libre au premier abord, et jamais l'épargne par défaut : un écran qui
     s'ouvrirait sur « Livret A » aurait choisi à la place de qui le lit quel
     compte mérite d'être projeté. C'est un geste, pas un réglage — et l'écran
     s'ouvre sur ce qu'il sait faire sans rien connaître. */
  source: { kind: 'free' },
  initialText: '',
  monthlyText: '100',
  targetText: '',
  years: 10,
  customYears: false,
  scenarios: [{ id: 'a', rateText: '3', kind: 'assumed' }],
  /* Aucun taux essayé d'avance : un compte part de ce que sa fiche porte, et
     l'écran ne pose rien à la place de personne. */
  supportRates: [],
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
 * Le plafond des taux essayés, et il n'est pas une règle d'écran.
 *
 * Personne ne tient vingt-quatre comptes ; la borne est là parce que
 * `localStorage` s'édite depuis la console du navigateur, et qu'un tableau de
 * mille entrées relu à chaque rendu n'aurait aucune raison d'exister.
 */
const MAX_SUPPORT_RATES = 24

/** Les taux essayés, relus du stockage — bornés comme le reste. */
function supportRatesFrom(value: unknown): SupportRateDraft[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value
    .slice(0, MAX_SUPPORT_RATES)
    .flatMap((raw): SupportRateDraft[] => {
      if (typeof raw !== 'object' || raw === null) return []
      const { supportId, rateText, kind } = raw as Record<string, unknown>
      if (typeof supportId !== 'string' || supportId === '' || supportId.length > 64) return []
      if (seen.has(supportId)) return []
      seen.add(supportId)
      return [
        {
          supportId,
          rateText: text(rateText, ''),
          kind: kind === 'guaranteed' ? 'guaranteed' : 'assumed',
        },
      ]
    })
}

/**
 * L'origine relue du stockage — et elle n'est pas crue sur parole.
 *
 * Un identifiant garde le **nom** d'un support, pas le support : celui-ci a pu
 * être supprimé depuis, ou le document remplacé par un autre à l'import. La
 * chaîne est donc bornée ici, et l'existence vérifiée à l'écran, qui seul
 * connaît la liste — une origine qui ne désigne plus rien y retombe en libre
 * plutôt que d'afficher une épargne vide sous le nom d'un compte disparu.
 */
function sourceFrom(value: unknown): ProjectionSource {
  if (typeof value !== 'object' || value === null) return DEFAULT_DRAFT.source
  const { kind, id } = value as Record<string, unknown>
  if (kind !== 'member' && kind !== 'support') return DEFAULT_DRAFT.source
  if (typeof id !== 'string' || id === '' || id.length > 64) return DEFAULT_DRAFT.source
  return { kind, id }
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

    const validYears = Number.isInteger(years) && years >= MIN_YEARS && years <= MAX_YEARS
    const kept = validYears ? years : DEFAULT_DRAFT.years

    return {
      mode: stored.mode === 'target' ? 'target' : 'forecast',
      source: sourceFrom(stored.source),
      initialText: text(stored.initialText, DEFAULT_DRAFT.initialText),
      monthlyText: text(stored.monthlyText, DEFAULT_DRAFT.monthlyText),
      targetText: text(stored.targetText, DEFAULT_DRAFT.targetText),
      years: kept,
      /* Une durée qui n'est pas un raccourci doit revenir avec son champ, sinon
         elle serait à l'écran sans rien pour la relire — et le premier appui sur
         une pilule l'écraserait sans qu'on ait pu voir ce qu'elle valait. */
      customYears: stored.customYears === true || !isPreset(kept),
      scenarios: scenariosFrom(stored.scenarios),
      supportRates: supportRatesFrom(stored.supportRates),
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

/**
 * D'où vient le taux d'un support, et les trois réponses ne se valent pas.
 *
 * - `own` — il est **posé sur la fiche**, daté. C'est le seul qui engage le
 *   document.
 * - `screen` — le support n'en porte aucun, et l'écran comble avec son
 *   hypothèse. La colonne le dit, pour qu'un compte muet ne passe pas pour un
 *   compte renseigné.
 * - `simulated` — quelqu'un l'a tapé **pour cette simulation**. Rien n'est
 *   descendu dans le document, et la ligne le dit aussi.
 */
export type RateOrigin = 'own' | 'screen' | 'simulated'

/** La trajectoire d'un support, et le taux sous lequel elle a été calculée. */
export type SupportSeries = {
  supportId: string
  label: string
  /** Le taux du **départ**. Le barème complet, lui, a servi au tracé. */
  rateBp: number
  kind: RateKind
  origin: RateOrigin
  /** Vrai quand un changement de taux daté tombe dans l'horizon simulé. */
  dated: boolean
  /**
   * Le barème qui a servi au tracé — scalaire, ou un taux par mois.
   *
   * Il est gardé et non recalculé : l'échelle des efforts reprojette chaque
   * compte à un versement différent, et le faire à un autre taux que celui de la
   * courbe donnerait une arrivée que la ligne « Simulation en cours » ne
   * retrouverait même pas (cahier §4.6 ter, « un seul moteur »).
   */
  schedule: number | readonly number[]
  series: ProjectionSeries
}

export type ProjectionResult = {
  months: number
  scenarios: ScenarioResult[]
  /**
   * La trajectoire de chaque support, quand le portefeuille se décompose.
   *
   * Vide en simulation libre, vide dès qu'on compare deux hypothèses, et vide
   * quand les versements ne se rattachent à aucun compte : dans ces trois cas
   * il n'existe pas de colonnes qui se somment au total, et un tableau dont les
   * colonnes ne font pas le total est pire qu'un tableau absent.
   *
   * Quand il n'est pas vide, la somme de ses séries **est** celle de la
   * première hypothèse — pas une lecture parallèle qu'il faudrait tenir
   * d'accord (cahier §4.6 ter, « un seul moteur »).
   */
  split: SupportSeries[]
  /** Le capital du premier jour, que le résumé décompose à côté du versé. */
  initial: Money
  /** Le versement du mode direct. `null` en mode inverse : il y en a un par hypothèse. */
  monthly: Money | null
  /**
   * L'objectif tel qu'il a été tapé, en mode inverse — et non l'arrivée que le
   * calcul produit. Les deux se ressemblent à un arrondi près, et c'est
   * justement l'arrondi qui compte : quelqu'un qui a écrit « 50 000 € » doit
   * relire 50 000 €, pas « ≈ 50 k€ ». `null` en mode direct.
   */
  target: Money | null
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

/**
 * Le taux d'un support, et les trois endroits d'où il peut venir.
 *
 * L'ordre est **simulé > posé > écran**, et il se lit de haut en bas comme une
 * précédence de spécificité : ce qu'on vient de taper l'emporte sur ce que la
 * fiche porte, qui l'emporte sur l'hypothèse générale de l'écran.
 *
 * Un taux **simulé remplace le barème entier** : « et si celui-ci rendait 4 % »
 * ne peut pas cohabiter avec une révision datée qui viendrait contredire au
 * rang 14 ce qu'on vient d'écrire. Un taux **posé** garde le sien : c'est tout
 * l'intérêt d'un palier daté, et le rang où il change est celui qu'il porte.
 *
 * Un texte illisible ne vaut pas zéro : il **retire** l'essai plutôt que de
 * projeter à plat un compte sur une faute de frappe — la règle des hypothèses
 * de l'écran, appliquée un cran plus bas.
 */
type ResolvedRate = {
  rateBp: number
  kind: RateKind
  origin: RateOrigin
  dated: boolean
  /** Ce que le moteur consomme : un scalaire, ou un taux par mois. */
  schedule: number | readonly number[]
}

function rateOf(
  part: ProjectionPart,
  tried: readonly SupportRateDraft[],
  screen: { rateBp: number; kind: RateKind },
  months: number,
): ResolvedRate {
  const attempt = tried.find((one) => one.supportId === part.supportId)
  const typed = attempt === undefined ? null : parseRateBp(attempt.rateText)
  if (attempt !== undefined && attempt.rateText.trim() !== '' && typed !== null) {
    return { rateBp: typed, kind: attempt.kind, origin: 'simulated', dated: false, schedule: typed }
  }

  if (part.rateBp === null) {
    return { ...screen, origin: 'screen', dated: false, schedule: screen.rateBp }
  }

  /* Le barème mois par mois, à partir de celui qu'on vit : un palier daté du
     1er janvier prochain s'applique au rang qui lui revient, et pas avant.
     `part.rateBp` comble les mois d'avant le premier palier — il n'y en a pas,
     puisqu'on part d'aujourd'hui et qu'un taux court déjà. */
  const schedule =
    part.steps.length > 1
      ? monthlyRateBps(part.steps, currentYm(), months, part.rateBp)
      : part.rateBp

  return {
    rateBp: part.rateBp,
    kind: part.rateKind ?? 'assumed',
    origin: 'own',
    /* Un seul palier ne « date » rien à annoncer : le taux vaut pour tout
       l'horizon, et le signaler ferait chercher un changement qui n'existe pas.
       C'est à partir du second que la colonne doit le dire — et encore
       faut-il qu'il tombe **dans** l'horizon, sinon la courbe ne le voit pas. */
    dated: Array.isArray(schedule) && new Set(schedule).size > 1,
    schedule,
  }
}

/* Les deux messages qui annoncent une borne la lisent sur la constante qui la
   fait respecter. Recopier « entre 1 et 50 » dans la prose donnerait un texte
   qui survivrait au changement de la borne, et qui mentirait alors sans que
   rien ne le dise. */
const outOfRangeYears = () => tpl(projection.durationInvalid, MIN_YEARS, MAX_YEARS)
const outOfRangeRate = () => tpl(projection.rateInvalid, MAX_RATE_PERCENT)

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
 *
 * `start` est ce que l'épargne réelle apporte quand l'origine n'est pas libre.
 * Il **remplace** les deux champs plutôt que de les préremplir : un chiffre lu
 * dans le document et un chiffre tapé à la main n'ont pas le même statut, et les
 * mélanger dans le même champ ferait croire qu'on édite l'épargne. Un capital
 * inconnu — aucun relevé — vaut zéro pour le calcul et se dit à l'écran ; il
 * n'invente pas d'erreur de saisie, puisqu'il n'y a pas eu de saisie.
 */
export function analyse(draft: ProjectionDraft, start: ProjectionStart = NO_START): Analysis {
  const linked = draft.source.kind !== 'free'
  const initial = linked ? (start.capital ?? ZERO) : amount(draft.initialText)
  const monthly = linked ? start.monthly : amount(draft.monthlyText)
  const target = amount(draft.targetText)
  const inflationBp = parseRateBp(draft.inflationText)
  const validYears =
    Number.isInteger(draft.years) && draft.years >= MIN_YEARS && draft.years <= MAX_YEARS

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
    ...(draft.mode === 'forecast' && !linked && monthly === null
      ? { monthly: projection.amountInvalid }
      : {}),
    ...(draft.mode === 'target' && target === null ? { target: projection.amountInvalid } : {}),
    ...(validYears ? {} : { years: outOfRangeYears() }),
    ...(inflationBp === null ? { inflation: outOfRangeRate() } : {}),
    rates,
  }

  /* Une inflation illisible ne vaut pas zéro : elle éteint la lecture en euros
     constants, qui est une lecture de plus et non le calcul lui-même. */
  const erosion = draft.constant ? (inflationBp ?? 0) : 0
  const months = validYears ? draft.years * 12 : 0

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
        initial,
        monthly: null,
        target,
        /* Le mode inverse cherche un versement, pas une répartition : il n'y a
           rien à décomposer tant qu'on ne sait pas encore combien verser. */
        split: [],
        contributed: null,
        targetReached: computed.every((scenario) => scenario.monthly === ZERO),
        inflationBp: erosion,
      },
    }
  }

  if (monthly === null || (monthly === ZERO && initial === ZERO)) {
    return { errors, result: null, missing: projection.nothingToPlot }
  }

  /* Le détail par support, quand il y en a un et qu'une seule hypothèse est
     posée. Deux hypothèses veulent dire qu'on compare des portefeuilles
     entiers ; les mélanger avec une décomposition par compte donnerait un
     tableau à six colonnes dont trois ne se somment pas. */
  const screenBp = scenarios[0]?.rateBp ?? 0
  const screenKind = scenarios[0]?.kind ?? 'assumed'
  const split =
    scenarios.length === 1 && start.parts.length > 0
      ? start.parts.map((part) => {
          const rate = rateOf(part, draft.supportRates, { rateBp: screenBp, kind: screenKind }, months)
          return {
            part,
            rate,
            series: projectSeries({
              initial: part.capital ?? ZERO,
              monthly: part.monthly,
              months,
              rateBp: rate.schedule,
              inflationBp: erosion,
            }),
          }
        })
      : []

  const computed = scenarios.map((scenario, index) => ({
    ...scenario,
    monthly,
    /* Un portefeuille dont les supports ont chacun leur taux ne suit **aucun**
       taux moyen : sa trajectoire est la somme des leurs, et il n'existe pas de
       troisième calcul à côté. La première hypothèse lit donc la somme des
       parts dès qu'il y en a ; les suivantes restent des taux globaux, ce qui
       est précisément ce qu'on veut comparer — « et si tout rendait 5 % ? ». */
    series:
      index === 0 && split.length > 0
        ? sumSeries(split.map((one) => one.series))
        : projectSeries({
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
      initial,
      monthly,
      target: null,
      split: split.map((one) => ({
        supportId: one.part.supportId,
        label: one.part.label,
        rateBp: one.rate.rateBp,
        kind: one.rate.kind,
        /* La colonne dit d'où vient son taux : emprunté à l'écran, posé sur la
           fiche, ou tapé pour la simulation. Sans quoi un compte muet passerait
           pour un compte renseigné, et un chiffre essayé pour un chiffre
           enregistré. */
        origin: one.rate.origin,
        dated: one.rate.dated,
        schedule: one.rate.schedule,
        series: one.series,
      })),
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

/**
 * La somme de plusieurs trajectoires, rang par rang.
 *
 * C'est ce qui fait qu'un portefeuille dont les supports ont chacun leur taux
 * garde **un seul** moteur : sa courbe n'est pas recalculée à un taux moyen —
 * qui n'existe pas —, elle est l'addition des courbes de ses supports. Le
 * tableau par colonnes et le chiffre d'arrivée lisent donc littéralement les
 * mêmes nombres.
 *
 * Les séries ont toutes le même nombre de points : elles sortent du même
 * horizon, passé au même `projectSeries`.
 */
function sumSeries(all: readonly ProjectionSeries[]): ProjectionSeries {
  const first = all[0]
  if (first === undefined) return { balance: [], contributed: [] }
  const add = (pick: (s: ProjectionSeries) => Money[]): Money[] =>
    pick(first).map((_, rank) =>
      money(all.reduce((total, one) => total + (pick(one)[rank] ?? ZERO), 0)),
    )
  return { balance: add((s) => [...s.balance]), contributed: add((s) => [...s.contributed]) }
}

/** Les intérêts : ce que le taux a produit, par différence. */
export function interestOf(series: ProjectionSeries, at: number): Money {
  return money((series.balance[at] ?? ZERO) - (series.contributed[at] ?? ZERO))
}

/* --- Ce que le résultat dit ------------------------------------------------*/

/**
 * La décomposition du chiffre d'arrivée, à un rang donné.
 *
 * Elle existe parce qu'un capital projeté est **trois choses** — ce qu'il y
 * avait, ce qu'on a mis, ce que le taux a ajouté — et qu'un nombre seul les
 * confond. « ≈ 14 000 € » impressionne ; « 12 000 € versés et 1 900 € de
 * rendement » informe, et c'est la seule pédagogie que cet écran ait à donner.
 *
 * Tout se lit sur la **même** série que le tracé et les jalons : `paid` est le
 * versé cumulé moins le capital du premier jour, `interest` l'écart entre le
 * capital et le versé. Il n'existe pas de second calcul (cahier §4.6 ter).
 */
export type Breakdown = {
  /** Le capital du premier jour. */
  initial: Money
  /** Ce qui a été versé depuis, capital de départ exclu. */
  paid: Money
  /** Ce que le taux a produit. */
  interest: Money
  /** Le capital à ce rang — la somme des trois. */
  total: Money
  /**
   * La part du rendement dans le capital final, entre 0 et 1. `null` quand il
   * n'y a rien à rapporter : un total nul ou négatif ne se met pas en fraction.
   */
  share: number | null
}

export function breakdownOf(series: ProjectionSeries, at: number): Breakdown {
  const initial = series.contributed[0] ?? ZERO
  const contributed = series.contributed[at] ?? ZERO
  const total = series.balance[at] ?? ZERO
  const interest = money(total - contributed)
  return {
    initial,
    paid: money(contributed - initial),
    interest,
    total,
    share: total > 0 ? interest / total : null,
  }
}

/**
 * Les quatre efforts d'épargne à comparer — « et si je verse davantage ? ».
 *
 * C'est la seule lecture de l'écran qui réponde à une question **actionnable**
 * en mode direct : « combien j'aurai » se contemple, « qu'est-ce que 150 € de
 * plus par mois changeraient » se décide. Elle ne conseille rien et ne
 * recommande aucun montant — elle montre une pente, à taux constant, sous la
 * première hypothèse posée.
 *
 * **Autour du versement en cours, jamais une échelle absolue.** Une liste figée
 * 100 / 250 / 500 / 1 000 € serait hors sujet pour qui met 50 € de côté comme
 * pour qui en met 2 000. Les barreaux sont donc des multiples du versement réel,
 * arrondis à un pas lisible — personne ne programme un virement à 327 € — et le
 * versement en cours reste dans la liste, à son montant exact, marqué comme tel.
 */
export const EFFORT_FACTORS = [0.5, 1, 1.5, 2] as const

/** Ce qu'un support reçoit et rend, à un barreau donné de l'échelle. */
export type EffortPart = {
  supportId: string
  label: string
  monthly: Money
  arrival: Money
}

export type EffortRung = {
  monthly: Money
  arrival: Money
  /** Le barreau qui correspond au versement simulé. */
  current: boolean
  /**
   * Le détail du barreau, compte par compte. Vide hors portefeuille décomposé.
   *
   * Il est **relu sur les mêmes séries** que l'arrivée : `arrival` en est la
   * somme, au centime. Verser 50 % de plus, c'est verser 50 % de plus partout,
   * et sans le détail on ne saurait pas sur quel compte l'effort tombe — ce qui
   * est pourtant la seule chose à faire de cette lecture.
   */
  parts: EffortPart[]
}

/**
 * Ce qu'un support reçoit par mois, relu sur sa propre série.
 *
 * Le versé cumulé compte le capital de départ à son rang zéro : la mensualité
 * est donc l'écart entre deux rangs consécutifs, et non le premier point. La
 * relire ici plutôt que de la reporter depuis `ProjectionStart` garde une seule
 * source à la trajectoire d'un support — celle qui a servi à la tracer.
 */
function partMonthly(part: SupportSeries): number {
  return (part.series.contributed[1] ?? ZERO) - (part.series.contributed[0] ?? ZERO)
}

/** Le pas d'arrondi d'un barreau : dix euros, cinquante, ou cent. */
function rungStep(monthly: Money): number {
  if (monthly < 20_000) return 1_000
  if (monthly < 100_000) return 5_000
  return 10_000
}

export function effortLadder(
  result: ProjectionResult,
  scenario: ScenarioResult | undefined,
): EffortRung[] {
  const base = result.monthly
  /* Rien à comparer sans versement : l'échelle serait quatre fois zéro. Et rien
     à comparer non plus sans hypothèse — le mode inverse a déjà son versement
     requis, qui répond à la même question par l'autre bout. */
  if (base === null || base <= 0 || scenario === undefined) return []

  const step = rungStep(base)
  const seen = new Set<number>()
  const rungs: EffortRung[] = []

  /**
   * Ce que donne un versement donné, au même horizon.
   *
   * Sur un portefeuille décomposé, l'effort supplémentaire se répartit **au
   * prorata** de ce que chaque support reçoit déjà, et chaque part garde son
   * taux : verser 50 % de plus, c'est verser 50 % de plus partout. Recalculer
   * le tout à un taux unique donnerait un chiffre que la ligne « Simulation en
   * cours » ne retrouverait même pas.
   */
  const partsAt = (value: Money): EffortPart[] => {
    const ratio = value / base
    return result.split.map((part) => {
      const monthly = money(Math.round(partMonthly(part) * ratio))
      return {
        supportId: part.supportId,
        label: part.label,
        monthly,
        arrival:
          projectSeries({
            initial: part.series.contributed[0] ?? ZERO,
            monthly,
            months: result.months,
            /* Le **barème** du compte, et non son taux de départ : reprojeter à
               taux constant un support dont le taux change au rang 14 donnerait
               une arrivée que la courbe ne connaît pas. */
            rateBp: part.schedule,
            inflationBp: result.inflationBp,
          }).balance.at(-1) ?? ZERO,
      }
    })
  }

  const arrivalAt = (value: Money, parts: readonly EffortPart[]): Money => {
    if (parts.length > 0) {
      return money(parts.reduce((total, part) => total + part.arrival, 0))
    }
    return (
      projectSeries({
        initial: result.initial,
        monthly: value,
        months: result.months,
        rateBp: scenario.rateBp,
        inflationBp: result.inflationBp,
      }).balance.at(-1) ?? ZERO
    )
  }

  for (const factor of EFFORT_FACTORS) {
    /* Le barreau du milieu garde le montant exact : c'est celui qu'on simule,
       et l'arrondir ferait afficher une arrivée qui n'est pas celle du reste de
       l'écran. */
    const value = factor === 1 ? base : money(Math.round((base * factor) / step) * step)
    if (value <= 0 || seen.has(value)) continue
    seen.add(value)
    const parts = partsAt(value)
    rungs.push({ monthly: value, arrival: arrivalAt(value, parts), current: factor === 1, parts })
  }

  return rungs.sort((a, b) => a.monthly - b.monthly)
}
