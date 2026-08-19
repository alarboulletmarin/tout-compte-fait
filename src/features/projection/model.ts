/* ============================================================================
 * L'état de l'écran de simulation : ce qui est réglé, ce qui s'en déduit, et ce
 * qu'on en garde entre deux visites.
 *
 * **Rien n'entre dans le document.** Une hypothèse n'est pas un fait du foyer —
 * c'est une question qu'on pose, et la réponse change à chaque fois qu'on change
 * d'avis sur le taux. L'écrire dans `Data` la ferait voyager dans les exports,
 * apparaître dans le schéma qu'on donne à un assistant, et exiger une migration.
 * Ce qui est gardé l'est **hors du document**, en `localStorage`, à la façon du
 * thème : ça décrit cet appareil-ci et la personne devant lui, pas ses comptes.
 * Le pire qui puisse arriver en le perdant est de recocher trois cases.
 *
 * **En revanche l'écran lit.** Refuser d'écrire protège le document, refuser de
 * lire ne protégeait rien — ça obligeait à retaper un capital que l'app affiche
 * deux écrans plus haut. Tout ce qui n'est pas une hypothèse vient donc du
 * document (`domain/projectionStart.ts`) : le capital d'un compte, ce que ses
 * règles y versent, le taux posé sur sa fiche, son plafond.
 *
 * **La simulation est celle de comptes, et de rien d'autre.** L'écran savait
 * aussi projeter quatre nombres tapés à la main, et « toute l'épargne d'une
 * personne » d'un bloc. Le premier était une calculatrice qu'on trouve
 * n'importe où ; le second additionnait des comptes qui ne suivent pas la même
 * courbe pour en tirer un taux moyen qui n'existe pas. Ce qui reste est une
 * liste de cases à cocher : chaque compte coché court à **son** rendement et
 * reçoit **son** versement, et la courbe du haut est la somme de leurs
 * trajectoires — jamais un calcul de plus posé à côté (cahier §4.6 ter, « un
 * seul moteur »).
 *
 * **Trois façons de poser un rendement, et une seule à la fois par compte.** Le
 * taux de sa fiche — le seul qui engage le document —, une valeur qu'on essaie,
 * ou une fourchette dont l'écart dit ce que personne ne sait. C'est le réglage
 * qu'on vient tourner, et il se pose compte par compte parce que c'est là qu'il
 * a un sens : un Livret A n'a pas l'incertitude d'un PEA.
 *
 * Le calcul, lui, ne vit pas ici : il est dans `domain/projection.ts`, pur et
 * testé. Ce module ne fait que le brancher sur des réglages d'écran.
 * ==========================================================================*/

import { type Money, ZERO, money, parseAmount } from '@/domain/money'
import { type ProjectionSeries, type RateKind, projectSeries } from '@/domain/projection'
import { currentYm } from '@/domain/date'
import type { ProjectionPart } from '@/domain/projectionStart'
import { MAX_RATE_PERCENT, parseRateBp } from '@/domain/rate'
import { monthlyRateBps } from '@/domain/savingRate'
import { tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'

/* --- Ce qui se règle ------------------------------------------------------*/

/**
 * D'où sort le rendement d'un compte, et les trois réponses ne se valent pas.
 *
 * - `own` — le taux **posé sur sa fiche**, daté. C'est le seul qui engage le
 *   document, et il porte ses paliers : un livret révisé au 1er février prochain
 *   change de taux dans la projection à ce rang-là, et pas au départ.
 * - `flat` — une valeur qu'on essaie, pour cette simulation et pour elle seule.
 *   « Et si celui-ci ne faisait que 4 % ? » est exactement la question qu'on
 *   vient poser ; elle remplace le barème entier, révisions comprises, parce
 *   qu'un palier daté viendrait sinon contredire au rang 14 ce qu'on vient
 *   d'écrire.
 * - `range` — deux bornes, et l'écart entre elles est la réponse honnête :
 *   personne ne connaît le rendement des années à venir. C'est le seul mode qui
 *   ouvre une fourchette, et c'est le défaut d'un compte muet.
 *
 * `own` n'est pas proposé à un compte qui ne porte aucun taux : il n'y aurait
 * rien à reprendre, et un 0 % emprunté à l'absence passerait pour une réponse.
 */
export type RateMode = 'own' | 'flat' | 'range'

/**
 * Tous les combien on verse, en mois.
 *
 * Ce n'est pas un détail d'affichage : le moteur capitalise, donc 1 200 € versés
 * une fois l'an ne valent pas 100 € versés douze fois, et l'écart est
 * exactement ce qu'on vient regarder en changeant la cadence.
 */
export const PERIODS = [1, 3, 6, 12] as const
export type Period = (typeof PERIODS)[number]

/** Les deux lectures d'une même simulation : la figure, ou les nombres. */
export type View = 'chart' | 'table'

/**
 * Ce que l'écran simule — et les deux modes ne répondent pas à la même question.
 *
 * - `simple` — trois nombres qu'on tape : ce qu'on a déjà, ce qu'on verse, le
 *   rendement qu'on suppose. C'est la question qu'on se pose **avant** d'avoir
 *   quoi que ce soit — « et si je mettais 200 € par mois pendant quinze ans ? » —
 *   et elle ne suppose ni compte ouvert, ni relevé, ni règle récurrente. C'est
 *   aussi la seule forme qu'un simulateur peut prendre sur le téléphone de
 *   quelqu'un qui découvre l'app : deux champs et une durée.
 * - `accounts` — les comptes du document, chacun à **son** rendement et à
 *   **son** versement. C'est la lecture que personne d'autre ne produit, parce
 *   qu'elle part de ce qui existe vraiment.
 *
 * **Le moteur est le même dans les deux cas** (`domain/projection.ts`) : le mode
 * simple n'est pas un second calcul, c'est une seule trajectoire là où l'autre
 * en somme plusieurs (cahier §4.6 ter). Ce qui change est le nombre de séries à
 * additionner, jamais la façon de les produire.
 */
export type Mode = 'simple' | 'accounts'

/**
 * Ce qu'on a réglé sur un compte — pour cet écran, et pour lui seul.
 *
 * **Rien ne redescend dans le document** : ce qui se tape ici vit dans
 * `localStorage`, et la fiche du support reste le seul endroit où un taux
 * s'enregistre, daté.
 *
 * Une entrée n'existe que si quelqu'un y a touché : un compte dont on n'a rien
 * changé n'y figure pas, et il court alors au taux de sa fiche — ou à la
 * fourchette de l'écran s'il n'en porte aucun. C'est ce qui fait qu'un taux
 * corrigé sur une fiche se voit immédiatement ici.
 */
export type SupportSetting = {
  supportId: string
  mode: RateMode
  /** Le taux essayé, en mode `flat`. */
  rateText: string
  /** Les deux bornes, en mode `range`. */
  lowText: string
  highText: string
  /**
   * Ce qu'on verse **par échéance**. Vide : ce que le document sait, ramené à la
   * cadence choisie — un compte qui reçoit 350 €/mois reçoit 1 050 € par
   * trimestre, et le champ le propose plutôt que de le faire deviner.
   */
  amountText: string
}

export type SimulationDraft = {
  /** Laquelle des deux lectures est ouverte. */
  mode: Mode
  /**
   * Le capital de départ tapé, en mode simple. Vide : la simulation part de
   * zéro, ce qui est le cas de qui commence — et un zéro affiché vaut mieux
   * qu'un champ obligatoire pour dire la même chose.
   */
  startText: string
  /** Ce qui est versé à chaque échéance, en mode simple. */
  payText: string
  /**
   * Le rendement annuel essayé, en mode simple — **un seul chiffre**, et il se
   * tape.
   *
   * Un champ et non une fourchette : le mode comptes garde les deux bornes, qui
   * disent l'incertitude là où elle se pose — compte par compte. Ici il n'y a
   * qu'une trajectoire, et deux champs à remplir pour la voir en auraient fait
   * un formulaire. La valeur par défaut reste celle qui promet le moins
   * (`DEFAULT_LOW`) : l'app ne présélectionne toujours pas un taux flatteur.
   */
  rateText: string
  /**
   * Les comptes retenus, ou `null` tant que personne n'a choisi.
   *
   * `null` et non la liste complète : un compte créé demain doit entrer de
   * lui-même dans un écran qu'on n'a jamais réglé, et sortir de la liste dès
   * qu'on a coché quelque chose. Une liste figée au premier rendu aurait rendu
   * invisible le compte suivant, sans que rien ne le dise.
   */
  picked: string[] | null
  /** L'horizon en années : c'est ainsi qu'on le pense, et qu'on le saisit. */
  years: number
  every: Period
  /** Lire en euros d'aujourd'hui. Éteint par défaut, et signalé quand il est allumé. */
  constant: boolean
  inflationText: string
  settings: SupportSetting[]
  view: View
}

/**
 * Les quatre horizons proposés, et le cinquième segment qui ouvre le champ.
 *
 * Vingt-cinq et non vingt : les quatre raccourcis doivent couvrir les quatre
 * questions qu'on vient poser — un projet, un apport, une échéance longue, une
 * retraite —, et c'est la dernière qui manquait le plus.
 */
export const YEAR_PRESETS = [5, 10, 15, 25] as const

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
 * Les deux bornes que l'écran prête à un compte muet, et le seul endroit où ces
 * valeurs sont décidées.
 *
 * **De 2 % à 5 %, et aucun taux garanti.** Écrire un taux garanti reviendrait à
 * annoncer celui d'un produit — un livret réglementé est révisé au 1er février
 * et au 1er août, si bien qu'un chiffre en dur serait faux dans les six mois.
 * Les deux bornes sont modestes et larges, et calées sur aucun placement
 * précis : c'est le contraire des 11 % « constatés sur la dernière décennie »
 * que les simulateurs de vente présélectionnent. Large, parce qu'une fourchette
 * étroite promet presque autant qu'un chiffre unique.
 */
export const DEFAULT_LOW = '2'
export const DEFAULT_HIGH = '5'

export const DEFAULT_DRAFT: SimulationDraft = {
  /* Le mode simple par défaut, y compris pour qui tient déjà dix comptes : c'est
     celui qui répond sans rien demander, et la bascule est en tête d'écran. */
  mode: 'simple',
  startText: '',
  /* Un versement d'exemple, et non un champ vide : un écran de simulation qui
     s'ouvre sur « — » ne montre pas ce qu'il sait faire. Cent euros parce que
     c'est un ordre de grandeur, pas une recommandation — le champ est juste là,
     et il se retape en deux appuis. */
  payText: '100',
  rateText: DEFAULT_LOW,
  /* Aucun choix, donc tous : l'écran s'ouvre sur ce que le document contient, et
     la première case décochée en fait une liste. */
  picked: null,
  years: 10,
  every: 1,
  constant: false,
  inflationText: '2',
  settings: [],
  view: 'chart',
}

/* --- Le confort local ------------------------------------------------------*/

export const PROJECTION_STORAGE_KEY = 'tout-compte-fait.projection'

/** Un champ de saisie, borné : ce qui vient du stockage vient du dehors. */
function text(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length <= 24 ? value : fallback
}

/**
 * Le plafond des réglages relus, et il n'est pas une règle d'écran.
 *
 * Personne ne tient quarante comptes ; la borne est là parce que
 * `localStorage` s'édite depuis la console du navigateur, et qu'un tableau de
 * mille entrées relu à chaque rendu n'aurait aucune raison d'exister.
 */
const MAX_SETTINGS = 40

/** Un identifiant relu du stockage : borné, jamais cru sur parole. */
function isId(value: unknown): value is string {
  return typeof value === 'string' && value !== '' && value.length <= 64
}

function settingsFrom(value: unknown): SupportSetting[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value.slice(0, MAX_SETTINGS).flatMap((raw): SupportSetting[] => {
    if (typeof raw !== 'object' || raw === null) return []
    const { supportId, mode, rateText, lowText, highText, amountText } = raw as Record<
      string,
      unknown
    >
    if (!isId(supportId) || seen.has(supportId)) return []
    seen.add(supportId)
    return [
      {
        supportId,
        mode: mode === 'flat' || mode === 'range' ? mode : 'own',
        rateText: text(rateText, ''),
        lowText: text(lowText, DEFAULT_LOW),
        highText: text(highText, DEFAULT_HIGH),
        amountText: text(amountText, ''),
      },
    ]
  })
}

/** Les comptes cochés, relus du stockage. `null` reste `null` : c'est « tous ». */
function pickedFrom(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const ids = value.filter(isId).slice(0, MAX_SETTINGS)
  return [...new Set(ids)]
}

/**
 * Les derniers réglages, ou les valeurs par défaut.
 *
 * Tout est revalidé : `localStorage` s'édite depuis la console du navigateur,
 * et une durée à `NaN` ou un tableau de quarante entrées ne doit pas casser
 * l'écran. C'est la même prudence que `persistence/validate.ts` applique à un
 * document importé, à l'échelle de six champs.
 *
 * La clef ne change pas alors que la forme du brouillon, elle, a changé : les
 * champs disparus ne sont plus lus et les nouveaux retombent sur leur défaut —
 * ce que cette lecture champ par champ fait déjà pour n'importe quelle saleté.
 * Une clef neuve n'aurait sauvé que l'horizon, au prix d'une seconde entrée à
 * nettoyer un jour.
 */
export function readDraft(): SimulationDraft {
  try {
    const raw = localStorage.getItem(PROJECTION_STORAGE_KEY)
    if (raw === null) return DEFAULT_DRAFT
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_DRAFT
    const stored = parsed as Record<string, unknown>
    const years = Number(stored.years)
    const validYears = Number.isInteger(years) && years >= MIN_YEARS && years <= MAX_YEARS
    const every = Number(stored.every)

    return {
      mode: stored.mode === 'accounts' ? 'accounts' : 'simple',
      startText: text(stored.startText, DEFAULT_DRAFT.startText),
      payText: text(stored.payText, DEFAULT_DRAFT.payText),
      rateText: text(stored.rateText, DEFAULT_DRAFT.rateText),
      picked: pickedFrom(stored.picked),
      years: validYears ? years : DEFAULT_DRAFT.years,
      every: (PERIODS as readonly number[]).includes(every)
        ? (every as Period)
        : DEFAULT_DRAFT.every,
      constant: stored.constant === true,
      inflationText: text(stored.inflationText, DEFAULT_DRAFT.inflationText),
      settings: settingsFrom(stored.settings),
      view: stored.view === 'table' ? 'table' : 'chart',
    }
  } catch {
    /* Mode privé d'un vieux Safari, quota plein, JSON abîmé : on retombe sur
       les valeurs par défaut. Il n'y a rien à signaler — personne n'a perdu de
       données, il n'y en avait pas. */
    return DEFAULT_DRAFT
  }
}

export function writeDraft(draft: SimulationDraft): void {
  try {
    localStorage.setItem(PROJECTION_STORAGE_KEY, JSON.stringify(draft))
  } catch {
    // Rien à en dire : l'écran fonctionne à l'identique, il oubliera, c'est tout.
  }
}

/* --- Ce que les réglages disent d'un compte --------------------------------*/

/**
 * Le réglage d'un compte, complété par ce que le document sait.
 *
 * C'est la fonction qui décide de tout, et elle a une seule règle : **un mode
 * que le compte ne peut pas tenir retombe sur celui qu'il peut**. Un compte muet
 * réglé sur « le taux de sa fiche » — parce que son taux a été retiré depuis —
 * ne vaut pas 0 %, il vaut la fourchette : zéro serait une réponse, et personne
 * ne l'a donnée.
 */
export function modeOf(part: ProjectionPart, setting: SupportSetting | undefined): RateMode {
  const wanted = setting?.mode ?? (part.rateBp === null ? 'range' : 'own')
  return wanted === 'own' && part.rateBp === null ? 'range' : wanted
}

/**
 * Ce que le champ d'un versement propose quand il est vide : ce que le document
 * verse, à la cadence choisie.
 *
 * Le produit et non la mensualité : à cadence trimestrielle, un compte qui
 * reçoit 350 € par mois reçoit 1 050 € par trimestre, et c'est le même effort.
 * Proposer 350 € par trimestre à la place aurait divisé l'épargne par trois sans
 * qu'un seul champ ne bouge.
 */
export function defaultAmount(part: ProjectionPart, every: Period): Money {
  return money(part.monthly * every)
}

/**
 * « 350 €/mois », « 1 050 €/trimestre » — et le gabarit vient de la cadence.
 *
 * Quatre gabarits et non un pluriel calculé : « par période » n'est pas du
 * français, et « /3 mois » n'est pas une unité.
 */
export function perPeriod(every: Period): string {
  if (every === 3) return projection.perQuarter
  if (every === 6) return projection.perHalf
  if (every === 12) return projection.perYear
  return projection.perMonth
}

/** Ce qu'un compte verse par échéance : ce qui est tapé, ou ce que le document sait. */
function amountOf(part: ProjectionPart, setting: SupportSetting | undefined, every: Period): Money {
  const typed = setting?.amountText.trim() ?? ''
  if (typed === '') return defaultAmount(part, every)
  /* Une saisie illisible ne vaut pas zéro : elle **retire** l'essai plutôt que
     d'arrêter les versements d'un compte sur une faute de frappe. Le champ, lui,
     est signalé — voir `errorsOf`. */
  return parseAmount(typed) ?? defaultAmount(part, every)
}

/** Un taux, et le barème mois par mois qu'il produit. */
type Step = { rateBp: number; schedule: number | readonly number[] }

/**
 * Les deux barèmes d'un compte : celui de la borne basse, celui de la haute.
 *
 * Ils sont **la même référence** hors du mode fourchette, et c'est ce qui fait
 * que la fourchette se referme d'elle-même dès qu'on a dit ce qu'on attend d'un
 * compte : il n'y a plus deux séries à tenir d'accord, il y en a une.
 */
function ratesOf(
  part: ProjectionPart,
  setting: SupportSetting | undefined,
  mode: RateMode,
  months: number,
): { low: Step; high: Step; kind: RateKind; dated: boolean } {
  if (mode === 'own' && part.rateBp !== null) {
    /* Le barème mois par mois, à partir de celui qu'on vit : un palier daté du
       1er janvier prochain s'applique au rang qui lui revient, et pas avant.
       `part.rateBp` comble les mois d'avant le premier palier — il n'y en a pas,
       puisqu'on part d'aujourd'hui et qu'un taux court déjà. */
    const schedule =
      part.steps.length > 1
        ? monthlyRateBps(part.steps, currentYm(), months, part.rateBp)
        : part.rateBp
    const step: Step = { rateBp: part.rateBp, schedule }
    return {
      low: step,
      high: step,
      kind: part.rateKind ?? 'assumed',
      /* Un seul palier ne « date » rien à annoncer : le taux vaut pour tout
         l'horizon, et le signaler ferait chercher un changement qui n'existe
         pas. C'est à partir du second que la ligne doit le dire — et encore
         faut-il qu'il tombe **dans** l'horizon, sinon la courbe ne le voit pas. */
      dated: Array.isArray(schedule) && new Set(schedule).size > 1,
    }
  }

  if (mode === 'flat') {
    const typed = parseRateBp(setting?.rateText ?? '') ?? part.rateBp ?? 0
    const step: Step = { rateBp: typed, schedule: typed }
    /* Un taux essayé n'engage que celui qui l'a tapé, quelle que soit la nature
       de ce que la fiche porte : le contrat n'a jamais promis ce chiffre-là. */
    return { low: step, high: step, kind: 'assumed', dated: false }
  }

  /* La fourchette. Les deux bornes se lisent dans l'ordre où elles ont été
     tapées, puis se rangent : « entre 5 % et 2 % » est la même fourchette que
     « entre 2 % et 5 % », et refuser la première apprendrait seulement dans
     quel ordre l'app veut ses champs. */
  const first = parseRateBp(setting?.lowText ?? DEFAULT_LOW) ?? parseRateBp(DEFAULT_LOW) ?? 0
  const second = parseRateBp(setting?.highText ?? DEFAULT_HIGH) ?? parseRateBp(DEFAULT_HIGH) ?? 0
  const low = Math.min(first, second)
  const high = Math.max(first, second)
  return {
    low: { rateBp: low, schedule: low },
    high: { rateBp: high, schedule: high },
    kind: 'assumed',
    dated: false,
  }
}

/* --- Ce que la simulation rend ---------------------------------------------*/

/** La trajectoire d'un compte, sous les deux bornes de sa fourchette. */
export type SupportRun = {
  supportId: string
  label: string
  mode: RateMode
  /** Le taux de départ de la borne basse, en points de base. */
  lowBp: number
  /** Le même à la borne haute. Égal au précédent hors du mode fourchette. */
  highBp: number
  kind: RateKind
  /** Vrai quand un changement de taux daté tombe dans l'horizon simulé. */
  dated: boolean
  /** Ce qui est versé à chaque échéance. */
  amount: Money
  /** Le capital du premier jour — zéro faute de relevé, et c'est dit à côté. */
  initial: Money
  /** Aucun relevé sur ce compte : la simulation part d'un capital nul. */
  unvalued: boolean
  cap: Money | null
  room: Money | null
  /** Le plafond du contrat coupe des versements avant la fin de l'horizon. */
  capped: boolean
  /** Combien de ses règles récurrentes composent le versement proposé. */
  rules: number
  /** Combien s'arrêtent avant la fin, et sont donc laissées de côté. */
  ending: number
  /** Une règle au montant variable n'a pas de mensualité à reprendre. */
  variable: boolean
  low: ProjectionSeries
  high: ProjectionSeries
  /** Ce que ce compte vaut à l'arrivée, aux deux bornes. */
  arrival: { low: Money; high: Money }
}

/**
 * Un rang de la lecture — un mois, une ligne du tableau, un point de la figure.
 *
 * **Les trois nombres que l'écran promet**, et ils s'empilent exactement : ce
 * qu'il y avait, ce qu'on a mis depuis, ce que le taux a produit. « ≈ 14 000 € »
 * impressionne ; « 12 000 € versés et 1 900 € de rendement » informe, et c'est
 * la seule pédagogie que cet écran ait à donner.
 *
 * Tout se lit sur les **mêmes** séries que la figure et le tableau : `paid` est
 * le versé cumulé moins le capital du premier jour, `gain` l'écart entre le
 * capital et le versé. Il n'existe pas de second calcul (cahier §4.6 ter).
 */
export type SimulationPoint = {
  /** Le rang, en mois depuis aujourd'hui. Zéro est le départ. */
  month: number
  /** Le capital du premier jour. Constant d'un rang à l'autre, par construction. */
  initial: Money
  /** Ce qui a été versé depuis, capital de départ exclu. */
  paid: Money
  /**
   * Ce que le taux a produit, à la borne basse. Il peut être **négatif** en
   * euros d'aujourd'hui : un rendement sous l'inflation ne compense pas
   * l'érosion, et c'est précisément ce que la lecture en euros constants existe
   * pour montrer.
   */
  gain: Money
  /** La somme des trois : le capital à la borne basse. */
  total: Money
  /** Le capital à la borne haute. Égal au total quand il n'y a pas de fourchette. */
  high: Money
}

export type Simulation = {
  months: number
  every: Period
  /** Un compte par case cochée, dans l'ordre du document. */
  runs: SupportRun[]
  /** Un point par mois, du départ à l'horizon. */
  points: SimulationPoint[]
  /**
   * Les deux bornes arrivent au même chiffre : il n'y a pas de fourchette à
   * montrer.
   *
   * Lu **sur les séries** et non sur les modes : un portefeuille dont tous les
   * comptes portent leur taux referme la fourchette sans qu'aucun champ n'ait
   * bougé, et c'est exactement ce qu'il faut dire — l'app n'a plus d'incertitude
   * propre, seulement celle que quelqu'un a assumée.
   */
  single: boolean
  /** Tous les taux en jeu sont contractuels : le trait est plein, pas tireté. */
  guaranteed: boolean
  /**
   * L'étendue des taux réellement en jeu, en points de base — ce que la pilule
   * « Rendement » affiche.
   *
   * Ce n'est pas ce qui est tapé : un Livret A posé à 2,40 % et un PEA laissé
   * entre 3 % et 7 % donnent « 2,40 % – 7 % », parce que c'est ce qui court dans
   * le calcul. Afficher les champs à la place mentirait sur la borne basse.
   */
  rateSpan: { low: number; high: number }
  /** Le capital du premier jour, tous comptes cochés confondus. */
  initial: Money
  /** Ce qui part à chaque échéance, tous comptes confondus. */
  amount: Money
  /** Le versé cumulé à l'arrivée, capital de départ exclu. */
  paid: Money
  arrival: { low: Money; high: Money }
  /** Ce que vaut l'inflation appliquée à la lecture, zéro en euros courants. */
  inflationBp: number
  /** Combien de comptes cochés n'ont aucun relevé, et partent donc de zéro. */
  unvalued: number
  /** Combien de règles récurrentes ont été laissées de côté, toutes causes. */
  ending: number
  /** Une règle au montant variable a été laissée de côté sur un compte au moins. */
  variable: boolean
  /** Un plafond de contrat coupe des versements avant la fin. */
  capped: boolean
}

/** Ce qu'un champ de réglage refuse, par compte puis par champ. */
export type SettingErrors = {
  rate?: string
  low?: string
  high?: string
  amount?: string
}

export type DraftErrors = {
  years?: string
  inflation?: string
  /** Les trois champs du mode simple, quand ils sont illisibles. */
  start?: string
  pay?: string
  rate?: string
  /** Les champs illisibles, par identifiant de compte. */
  supports: Record<string, SettingErrors>
}

export type Analysis = {
  errors: DraftErrors
  /** `null` tant qu'il n'y a rien à tracer. */
  result: Simulation | null
  /** Ce qui manque, à écrire à la place de la figure. */
  missing: string | null
}

/* Les deux messages qui annoncent une borne la lisent sur la constante qui la
   fait respecter. Recopier « entre 1 et 50 » dans la prose donnerait un texte
   qui survivrait au changement de la borne, et qui mentirait alors sans que
   rien ne le dise. */
const outOfRangeYears = () => tpl(projection.durationInvalid, MIN_YEARS, MAX_YEARS)
const outOfRangeRate = () => tpl(projection.rateInvalid, MAX_RATE_PERCENT)

/** Un champ vide n'est pas une faute : c'est le défaut du compte. */
function badRate(value: string | undefined): boolean {
  return value !== undefined && value.trim() !== '' && parseRateBp(value) === null
}

/**
 * Les champs qu'on signale, et **rien de plus**.
 *
 * Aucun ne bloque le calcul, et c'est délibéré : un réglage vit dans une feuille
 * qu'on referme, donc une saisie à moitié tapée ne doit pas vider l'écran
 * derrière. Un champ illisible **retire l'essai** — le compte retombe sur ce que
 * sa fiche ou le document disent — et la pilule du réglage annonce de toute
 * façon ce qui *court*, jamais ce qui est tapé.
 */
function errorsOf(
  draft: SimulationDraft,
  picked: readonly ProjectionPart[],
  validYears: boolean,
  inflationBp: number | null,
): DraftErrors {
  const supports: Record<string, SettingErrors> = {}
  for (const part of picked) {
    const setting = draft.settings.find((one) => one.supportId === part.supportId)
    if (setting === undefined) continue
    const errors: SettingErrors = {
      ...(badRate(setting.rateText) ? { rate: outOfRangeRate() } : {}),
      ...(badRate(setting.lowText) ? { low: outOfRangeRate() } : {}),
      ...(badRate(setting.highText) ? { high: outOfRangeRate() } : {}),
      ...(setting.amountText.trim() !== '' && parseAmount(setting.amountText) === null
        ? { amount: projection.amountInvalid }
        : {}),
    }
    if (Object.keys(errors).length > 0) supports[part.supportId] = errors
  }

  return {
    ...(validYears ? {} : { years: outOfRangeYears() }),
    ...(inflationBp === null ? { inflation: outOfRangeRate() } : {}),
    supports,
  }
}

/** Les comptes cochés, dans l'ordre du document. `null` : tous. */
export function pickedParts(
  parts: readonly ProjectionPart[],
  picked: readonly string[] | null,
): ProjectionPart[] {
  if (picked === null) return [...parts]
  return parts.filter((part) => picked.includes(part.supportId))
}

/**
 * Le plafond va-t-il couper quelque chose avant la fin ?
 *
 * Un versement nul ou négatif — un compte qu'on vide — ne consomme aucune
 * place : il ne rencontre jamais le plafond, et le signaler ferait chercher une
 * coupe qui n'a pas eu lieu. Une place à zéro, elle, coupe dès la première
 * échéance, et c'est ce qu'il faut dire d'un compte déjà plein.
 */
function wouldExceed(amount: Money, months: number, every: Period, room: Money): boolean {
  return amount > 0 && amount * Math.floor(months / every) > room
}

/**
 * L'horizon et l'érosion — les deux réglages que **les deux modes** partagent.
 *
 * Ils se lisent au même endroit parce qu'ils veulent dire la même chose des deux
 * côtés : une durée hors bornes est ramenée dans la plage plutôt que de vider
 * l'écran, et une inflation illisible éteint la lecture en euros d'aujourd'hui
 * sans toucher au calcul. Recopier ces deux règles dans chaque mode aurait été
 * l'occasion de les faire diverger.
 */
type Horizon = {
  years: number
  months: number
  validYears: boolean
  /** `null` quand le champ est illisible — la lecture en euros constants s'éteint. */
  inflationBp: number | null
  /** Ce qui s'applique vraiment : zéro tant que la lecture n'est pas demandée. */
  erosion: number
}

function horizonOf(draft: SimulationDraft): Horizon {
  const validYears =
    Number.isInteger(draft.years) && draft.years >= MIN_YEARS && draft.years <= MAX_YEARS
  /* Une durée hors bornes ne vide pas l'écran : elle est ramenée dans la plage
     et son champ est signalé. Le champ se tape au clavier, chiffre par chiffre —
     « 1 » sur le chemin de « 12 » ne doit pas faire disparaître la figure. */
  const years = validYears ? draft.years : Math.min(MAX_YEARS, Math.max(MIN_YEARS, draft.years || 1))
  const inflationBp = parseRateBp(draft.inflationText)
  return {
    years,
    months: years * 12,
    validYears,
    inflationBp,
    /* Une inflation illisible ne vaut pas zéro : elle éteint la lecture en euros
       constants, qui est une lecture de plus et non le calcul lui-même. */
    erosion: draft.constant ? (inflationBp ?? 0) : 0,
  }
}

/** Une trajectoire et sa borne haute — un compte, ou la simulation entière. */
type Trajectory = { low: ProjectionSeries; high: ProjectionSeries }

/**
 * Les rangs de la lecture, sommés sur les trajectoires qu'on lui donne.
 *
 * Une seule en mode simple, une par compte coché dans l'autre : c'est la seule
 * différence entre les deux modes, et elle tient dans la longueur d'un tableau.
 * Les trois couches se lisent ici et nulle part ailleurs — `paid` est le versé
 * cumulé moins le capital du premier jour, `gain` l'écart entre le capital et le
 * versé —, si bien qu'aucun mode ne peut décomposer un capital à sa façon.
 */
function pointsOf(months: number, runs: readonly Trajectory[]): SimulationPoint[] {
  const points: SimulationPoint[] = []
  for (let month = 0; month <= months; month += 1) {
    let initial = 0
    let contributed = 0
    let total = 0
    let high = 0
    for (const one of runs) {
      initial += one.low.contributed[0] ?? 0
      contributed += one.low.contributed[month] ?? 0
      total += one.low.balance[month] ?? 0
      high += one.high.balance[month] ?? 0
    }
    points.push({
      month,
      initial: money(initial),
      paid: money(contributed - initial),
      /* Par différence, comme partout ailleurs dans l'app : le rendement n'est
         pas la somme des intérêts d'un barème, c'est `capital − versé`. */
      gain: money(total - contributed),
      total: money(total),
      high: money(high),
    })
  }
  return points
}

/**
 * Ce que les réglages produisent : les champs à signaler, et la simulation à
 * lire.
 *
 * Les deux d'un coup, et non deux fonctions : ce qui est signalé est
 * exactement ce dont le calcul a dû se passer, et les séparer ferait exister un
 * état où l'écran trace une courbe sans savoir quel champ il a ignoré.
 *
 * Le mode décide de la source des nombres, jamais de la façon de les projeter :
 * les deux branches finissent dans `pointsOf`, qui finit dans `projectSeries`.
 */
export function analyse(draft: SimulationDraft, parts: readonly ProjectionPart[]): Analysis {
  return draft.mode === 'simple' ? analyseSimple(draft) : analyseAccounts(draft, parts)
}

/**
 * Trois nombres tapés, une trajectoire — et rien du document.
 *
 * **Ce n'est pas la calculatrice qu'on avait retirée.** Celle-là vivait à côté
 * des comptes, dans le même écran, et proposait de simuler « autre chose » sans
 * jamais dire quoi ; celle-ci est un **mode**, annoncé, qu'on quitte d'un appui
 * pour retrouver ses comptes. La question qu'elle sert est réelle et arrive
 * avant toutes les autres : combien ça fait, si je m'y mets.
 *
 * **Un champ illisible retire l'essai, il ne vide pas l'écran** — la même règle
 * que les feuilles de l'autre mode : un montant à moitié tapé ne doit pas faire
 * disparaître la figure qu'on est en train de regarder.
 */
function analyseSimple(draft: SimulationDraft): Analysis {
  const { months, validYears, inflationBp, erosion } = horizonOf(draft)
  const rateBp = parseRateBp(draft.rateText)
  const start = parseAmount(draft.startText)
  const pay = parseAmount(draft.payText)

  const errors: DraftErrors = {
    ...(validYears ? {} : { years: outOfRangeYears() }),
    ...(inflationBp === null ? { inflation: outOfRangeRate() } : {}),
    ...(rateBp === null ? { rate: outOfRangeRate() } : {}),
    ...(draft.startText.trim() !== '' && start === null ? { start: projection.amountInvalid } : {}),
    ...(draft.payText.trim() !== '' && pay === null ? { pay: projection.amountInvalid } : {}),
    supports: {},
  }

  const initial = start ?? ZERO
  const amount = pay ?? ZERO
  /* Ni capital, ni versement : il n'y a pas de trajectoire, et une ligne plate à
     zéro n'est pas une réponse — c'est un graphique qui fait semblant. */
  if (initial === ZERO && amount === ZERO) {
    return { errors, result: null, missing: projection.simpleEmpty }
  }

  const rate = rateBp ?? 0
  const series = projectSeries({
    initial,
    monthly: amount,
    months,
    rateBp: rate,
    everyMonths: draft.every,
    inflationBp: erosion,
  })
  const points = pointsOf(months, [{ low: series, high: series }])
  const last = points.at(-1)
  const arrival = { low: last?.total ?? ZERO, high: last?.high ?? ZERO }

  return {
    errors,
    missing: null,
    result: {
      months,
      every: draft.every,
      /* Aucun compte : ce mode ne lit pas le document, et une liste vide est
         exactement ce qu'il a à en dire. */
      runs: [],
      points,
      single: true,
      /* Jamais garanti : un taux qu'on tape est une hypothèse, et le trait plein
         reste réservé à ce qu'un contrat engage. */
      guaranteed: false,
      rateSpan: { low: rate, high: rate },
      initial: points[0]?.total ?? ZERO,
      amount,
      paid: last?.paid ?? ZERO,
      arrival,
      inflationBp: erosion,
      unvalued: 0,
      ending: 0,
      variable: false,
      capped: false,
    },
  }
}

/** Les comptes cochés, chacun à son rendement — et la somme de leurs trajectoires. */
function analyseAccounts(draft: SimulationDraft, parts: readonly ProjectionPart[]): Analysis {
  const { months, validYears, inflationBp, erosion } = horizonOf(draft)

  const picked = pickedParts(parts, draft.picked)
  const errors = errorsOf(draft, picked, validYears, inflationBp)

  if (parts.length === 0) return { errors, result: null, missing: projection.noSupports }
  if (picked.length === 0) return { errors, result: null, missing: projection.pickSupports }

  const runs: SupportRun[] = picked.map((part) => {
    const setting = draft.settings.find((one) => one.supportId === part.supportId)
    const mode = modeOf(part, setting)
    const rates = ratesOf(part, setting, mode, months)
    const amount = amountOf(part, setting, draft.every)
    const initial = part.capital ?? ZERO

    const run = (schedule: number | readonly number[]): ProjectionSeries =>
      projectSeries({
        initial,
        monthly: amount,
        months,
        rateBp: schedule,
        everyMonths: draft.every,
        inflationBp: erosion,
        /* Le plafond du contrat, quand il y en a un : les versements s'arrêtent
           quand la place est faite, le capital continue. */
        ...(part.room === null ? {} : { room: part.room }),
      })

    const low = run(rates.low.schedule)
    /* Littéralement la même série hors fourchette — pas une seconde à tenir
       d'accord. */
    const high = rates.high.schedule === rates.low.schedule ? low : run(rates.high.schedule)

    return {
      supportId: part.supportId,
      label: part.label,
      mode,
      lowBp: rates.low.rateBp,
      highBp: rates.high.rateBp,
      kind: rates.kind,
      dated: rates.dated,
      amount,
      initial,
      unvalued: part.capital === null,
      cap: part.cap,
      room: part.room,
      capped: part.room !== null && wouldExceed(amount, months, draft.every, part.room),
      rules: part.rules,
      ending: part.ending,
      variable: part.variable,
      low,
      high,
      arrival: { low: low.balance.at(-1) ?? ZERO, high: high.balance.at(-1) ?? ZERO },
    }
  })

  const points = pointsOf(months, runs)

  const last = points.at(-1)
  const arrival = { low: last?.total ?? ZERO, high: last?.high ?? ZERO }

  return {
    errors,
    missing: null,
    result: {
      months,
      every: draft.every,
      runs,
      points,
      /* Sur la dernière valeur, parce que c'est la seule qui soit écrite en
         toutes lettres : deux trajectoires qui arrivent au même euro n'ont pas
         de fourchette à montrer, quel que soit le chemin. */
      single: arrival.low === arrival.high,
      /* Le trait n'est plein que si **tout** ce qui court est contractuel. Un
         seul compte laissé à la fourchette, et l'ensemble redevient une
         hypothèse — c'est la lecture qui promet le moins, et la seule qu'on ait
         le droit de faire. */
      guaranteed: runs.every((one) => one.mode === 'own' && one.kind === 'guaranteed'),
      rateSpan: {
        low: Math.min(...runs.map((one) => one.lowBp)),
        high: Math.max(...runs.map((one) => one.highBp)),
      },
      initial: points[0]?.total ?? ZERO,
      amount: money(runs.reduce((sum, one) => sum + one.amount, 0)),
      paid: last?.paid ?? ZERO,
      arrival,
      inflationBp: erosion,
      unvalued: runs.filter((one) => one.unvalued).length,
      ending: runs.reduce((sum, one) => sum + one.ending, 0),
      variable: runs.some((one) => one.variable),
      capped: runs.some((one) => one.capped),
    },
  }
}

/**
 * Les rangs où le tableau s'arrête : un par an, l'horizon compris.
 *
 * Des **années pleines**, et non des quarts d'horizon comme le faisait le
 * tableau des jalons : celui-ci vivait derrière un repli et donnait quatre
 * lignes, celui-là est une des deux lectures de l'écran et défile. Une ligne par
 * an se lit sans rien calculer de tête — « dans 7 ans » est une question qu'on
 * se pose, « au troisième quart de mon horizon » n'en est pas une.
 *
 * Le rang zéro y est, à la différence des jalons : c'est la ligne « aujourd'hui »
 * du tableau, et c'est elle qui montre d'où l'on part.
 */
export function yearMarks(months: number): number[] {
  const horizon = Math.max(0, Math.trunc(months))
  const marks: number[] = []
  for (let month = 0; month <= horizon; month += 12) marks.push(month)
  /* Un horizon qui ne tombe pas sur une année pleine garde sa dernière ligne :
     sans elle, le tableau s'arrêterait avant le chiffre que l'écran annonce. */
  if (marks.at(-1) !== horizon) marks.push(horizon)
  return marks
}
