/* ============================================================================
 * L'état de l'écran de simulation : ce qui est saisi, ce qui s'en déduit, et ce
 * qu'on en garde entre deux visites.
 *
 * **Rien n'entre dans le document.** Une hypothèse n'est pas un fait du foyer —
 * c'est une question qu'on pose, et la réponse change à chaque fois qu'on change
 * d'avis sur le taux. L'écrire dans `Data` la ferait voyager dans les exports,
 * apparaître dans le schéma qu'on donne à un assistant, et exiger une migration.
 * Ce qui *peut* entrer dans le document est d'une autre nature : une intention
 * adoptée par un geste explicite — un objectif —, et elle passe par
 * `domain/updates.ts` comme tout le reste, jamais par ce module.
 *
 * **En revanche l'écran lit.** Refuser d'écrire protège le document, refuser de
 * lire ne protégeait rien — ça obligeait seulement à retaper un capital que
 * l'app affiche deux écrans plus haut. L'origine d'une simulation peut donc être
 * un support ou l'épargne d'une personne (`domain/projectionStart.ts`).
 *
 * **Une fourchette, et non trois hypothèses.** L'écran comparait jusqu'à trois
 * taux, plus un preset, plus un second taux par compte : quatre mécanismes pour
 * poser une seule chose, l'incertitude. Un placement n'a pas trois rendements,
 * il a une fourchette — et trois courbes obligent à choisir laquelle on croit,
 * quand une fourchette montre l'écart sans rien promettre. Il n'y a plus qu'un
 * couple bas/haut, et il ne s'applique **que là où l'incertitude est** : un
 * compte dont le taux est posé sur sa fiche vaut la même chose dans les deux
 * bornes, un compte muet les écarte. Sur un portefeuille entièrement renseigné,
 * la fourchette se referme d'elle-même — et c'est juste : l'app n'a alors plus
 * d'incertitude à montrer, seulement celle qu'on a soi-même assumée.
 *
 * Ce qui est gardé l'est **hors du document**, en `localStorage`, à la façon du
 * thème : ça décrit cet appareil-ci et la personne devant lui, pas ses comptes.
 * Le pire qui puisse arriver en le perdant est de retaper trois chiffres.
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

export type ProjectionMode = 'forecast' | 'target'

/**
 * Un taux qu'on essaie sur un compte — pour cet écran, et pour lui seul.
 *
 * Projeter tout le portefeuille d'une personne sous un taux unique n'a aucun
 * sens : un Livret A et un PEA ne suivent pas la même courbe, et leur somme
 * n'est celle d'aucun taux moyen. Le détail donne donc une ligne à chaque
 * compte, préremplie avec ce que sa fiche porte — et modifiable, parce que « et
 * si le PEA ne faisait que 4 % ? » est exactement la question qu'on vient poser.
 *
 * **Rien ne redescend dans le document** : ce qui se tape ici vit dans
 * `localStorage`, et la fiche du support reste le seul endroit où un taux
 * s'enregistre — daté.
 *
 * **Un seul taux, et plus deux.** Un second champ « comparé » vivait ici, et il
 * faisait doublon avec la fourchette de l'écran : deux façons de dire la même
 * incertitude, dont l'une par compte et l'autre globale. Ce qui reste est le
 * taux **du compte** ; ce qui l'entoure est la fourchette, une fois.
 */
export type SupportRateDraft = {
  supportId: string
  rateText: string
  kind: RateKind
}

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
   * Les deux bornes de la fourchette, telles qu'on les tape.
   *
   * Elles ne s'appliquent qu'aux comptes qui ne portent aucun taux — c'est là
   * qu'est l'incertitude, et nulle part ailleurs. En simulation libre, où il n'y
   * a pas de compte, elles s'appliquent à tout.
   *
   * Deux champs et non un taux plus un écart : « entre 2 % et 5 % » se pense et
   * se tape ainsi, quand « 3,5 % ± 1,5 point » demande un calcul mental pour
   * retrouver les deux nombres qu'on avait en tête.
   */
  lowText: string
  highText: string
  /**
   * Les taux essayés sur des comptes, par identifiant. Vide par défaut : chaque
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
 * Ce que l'écran propose à qui arrive, et le seul endroit où ces valeurs sont
 * décidées.
 *
 * **Une fourchette de 2 % à 5 %, et aucun taux garanti.** Écrire un taux garanti
 * reviendrait à annoncer celui d'un produit — un livret réglementé est révisé au
 * 1er février et au 1er août, si bien qu'un chiffre en dur serait faux dans les
 * six mois. Les deux bornes sont modestes et larges, et calées sur aucun
 * placement précis : c'est le contraire des 11 % « constatés sur la dernière
 * décennie » que les simulateurs de vente présélectionnent. Large, parce qu'une
 * fourchette étroite promet presque autant qu'un chiffre unique.
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
  lowText: '2',
  highText: '5',
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
 * et une durée à `NaN` ou un tableau de quarante entrées ne doit pas casser
 * l'écran. C'est la même prudence que `persistence/validate.ts` applique à un
 * document importé, à l'échelle de trois champs.
 *
 * La clef ne change pas alors que la forme du brouillon, elle, a changé : les
 * champs disparus ne sont plus lus et les nouveaux retombent sur leur défaut —
 * ce que cette lecture champ par champ fait déjà pour n'importe quelle saleté.
 * Une clef neuve n'aurait sauvé que l'horizon et l'origine, au prix d'une
 * seconde entrée à nettoyer un jour.
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

    return {
      mode: stored.mode === 'target' ? 'target' : 'forecast',
      source: sourceFrom(stored.source),
      initialText: text(stored.initialText, DEFAULT_DRAFT.initialText),
      monthlyText: text(stored.monthlyText, DEFAULT_DRAFT.monthlyText),
      targetText: text(stored.targetText, DEFAULT_DRAFT.targetText),
      years: validYears ? years : DEFAULT_DRAFT.years,
      lowText: text(stored.lowText, DEFAULT_DRAFT.lowText),
      highText: text(stored.highText, DEFAULT_DRAFT.highText),
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

/**
 * D'où vient le taux d'un compte, et les trois réponses ne se valent pas.
 *
 * - `own` — il est **posé sur la fiche**, daté. C'est le seul qui engage le
 *   document, et c'est aussi celui qui **ferme la fourchette** sur ce compte :
 *   son propriétaire a dit ce qu'il en attend, l'écran n'a plus d'incertitude à
 *   ajouter par-dessus.
 * - `screen` — le compte n'en porte aucun, et c'est là que la fourchette vit :
 *   il vaut la borne basse dans une trajectoire et la haute dans l'autre.
 * - `simulated` — quelqu'un l'a tapé **pour cette simulation**. Rien n'est
 *   descendu dans le document, et la ligne le dit aussi ; il ferme la fourchette
 *   comme un taux posé, pour la même raison.
 */
export type RateOrigin = 'own' | 'screen' | 'simulated'

/** La trajectoire d'un compte, sous les deux bornes de la fourchette. */
export type SupportSeries = {
  supportId: string
  label: string
  /** Le taux de **départ** à la borne basse. Le barème complet a servi au tracé. */
  rateBp: number
  /** Le même à la borne haute. Égal au précédent dès que le compte est fixé. */
  highBp: number
  kind: RateKind
  origin: RateOrigin
  /** Vrai quand un changement de taux daté tombe dans l'horizon simulé. */
  dated: boolean
  /** Le plafond de versements du contrat, ou `null` — personne n'en a posé. */
  cap: Money | null
  /** Ce qui restait à verser au départ, ou `null` sans plafond. */
  room: Money | null
  /** Le plafond a coupé des versements avant la fin de l'horizon. */
  capped: boolean
  /**
   * Le barème qui a servi au tracé de la borne basse — scalaire, ou un taux par
   * mois.
   *
   * Il est gardé et non recalculé : le pas d'effort reprojette chaque compte à
   * un versement différent, et le faire à un autre taux que celui de la courbe
   * donnerait une arrivée que le résultat en tête d'écran ne retrouverait même
   * pas (cahier §4.6 ter, « un seul moteur »).
   */
  schedule: number | readonly number[]
  /** Le barème de la borne haute. Identique au précédent sur un compte fixé. */
  highSchedule: number | readonly number[]
  series: ProjectionSeries
  highSeries: ProjectionSeries
}

/** Une borne de la fourchette : son taux d'écran, son versement, sa courbe. */
export type Bound = {
  /** Le taux que cette borne prête aux comptes muets, et à eux seuls. */
  rateBp: number
  /** Le versement du mode direct, ou celui que le mode inverse a calculé. */
  monthly: Money
  series: ProjectionSeries
}

export type ProjectionResult = {
  months: number
  /** La borne basse — celle qui promet le moins, et qu'on lit en premier. */
  low: Bound
  /** La borne haute. Identique à la basse quand il n'y a rien d'incertain. */
  high: Bound
  /**
   * Les deux bornes arrivent au même chiffre : il n'y a pas de fourchette à
   * montrer.
   *
   * Lu **sur les séries** et non sur les taux saisis : un portefeuille dont tous
   * les comptes portent leur taux referme la fourchette sans qu'aucun des deux
   * champs ait bougé, et c'est exactement ce qu'il faut dire — l'app n'a plus
   * d'incertitude propre, seulement celle que quelqu'un a assumée.
   */
  single: boolean
  /** Tous les taux en jeu sont contractuels : le trait est plein, pas tireté. */
  guaranteed: boolean
  /**
   * L'étendue des taux réellement en jeu, en points de base — ce que la ligne
   * « Rendement » affiche.
   *
   * Ce n'est pas le couple saisi : un Livret A posé à 2,40 % et un PEA muet
   * entre 2 % et 7 % donnent « 2,40 % – 7 % », parce que c'est ce qui court dans
   * le calcul. Afficher les deux champs à la place mentirait sur la borne basse.
   */
  rateSpan: { low: number; high: number }
  /**
   * La trajectoire de chaque compte, quand le portefeuille se décompose.
   *
   * Vide en simulation libre, et vide quand les versements ne se rattachent à
   * aucun compte : il n'existe alors pas de colonnes qui se somment au total, et
   * un tableau dont les colonnes ne font pas le total est pire qu'un tableau
   * absent.
   *
   * Quand il n'est pas vide, la somme de ses séries **est** celle des bornes —
   * pas une lecture parallèle qu'il faudrait tenir d'accord (cahier §4.6 ter,
   * « un seul moteur »).
   */
  split: SupportSeries[]
  /** Le capital du premier jour, que le résumé décompose à côté du versé. */
  initial: Money
  /** Le versement du mode direct. `null` en mode inverse : il y en a un par borne. */
  monthly: Money | null
  /**
   * L'objectif tel qu'il a été tapé, en mode inverse — et non l'arrivée que le
   * calcul produit. Les deux se ressemblent à un arrondi près, et c'est
   * justement l'arrondi qui compte : quelqu'un qui a écrit « 50 000 € » doit
   * relire 50 000 €, pas « ≈ 50 k€ ». `null` en mode direct.
   */
  target: Money | null
  /**
   * Les versements cumulés, quand ils sont les mêmes pour les deux bornes —
   * c'est-à-dire en mode direct. Le mode inverse donne à chaque borne **son**
   * versement requis : il n'y a plus une aire commune à tracer.
   */
  contributed: readonly Money[] | null
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
  low?: string
  high?: string
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
 * Le plafond va-t-il couper quelque chose avant la fin ?
 *
 * Un versement nul ou négatif — un compte qu'on vide — ne consomme aucune
 * place : il ne rencontre jamais le plafond, et le signaler ferait chercher une
 * coupe qui n'a pas eu lieu. Une place à zéro, elle, coupe dès le premier mois,
 * et c'est ce qu'il faut dire d'un compte déjà plein.
 */
function wouldExceed(monthly: Money, months: number, room: Money): boolean {
  return monthly > 0 && monthly * months > room
}

/** Un taux, et le barème mois par mois qu'il produit. */
type Step = { rateBp: number; schedule: number | readonly number[] }

type ResolvedRate = {
  origin: RateOrigin
  kind: RateKind
  dated: boolean
  low: Step
  high: Step
}

/**
 * Le taux d'un compte, et les trois endroits d'où il peut venir.
 *
 * L'ordre est **simulé > posé > fourchette de l'écran**, et il se lit de haut en
 * bas comme une précédence de spécificité : ce qu'on vient de taper l'emporte
 * sur ce que la fiche porte, qui l'emporte sur l'hypothèse générale.
 *
 * Un taux **simulé remplace le barème entier** : « et si celui-ci rendait 4 % »
 * ne peut pas cohabiter avec une révision datée qui viendrait contredire au
 * rang 14 ce qu'on vient d'écrire. Un taux **posé** garde le sien : c'est tout
 * l'intérêt d'un palier daté, et le rang où il change est celui qu'il porte.
 *
 * **Les deux premiers ferment la fourchette sur ce compte**, le troisième
 * l'ouvre. C'est la règle qui remplace les trois scénarios : l'écart ne se pose
 * pas uniformément sur un portefeuille, il se pose là où l'app ne sait pas — et
 * elle sait, sur un compte dont quelqu'un a écrit le rendement.
 *
 * Un texte illisible ne vaut pas zéro : il **retire** l'essai plutôt que de
 * projeter à plat un compte sur une faute de frappe.
 */
function rateOf(
  part: ProjectionPart,
  tried: readonly SupportRateDraft[],
  screen: { low: number; high: number },
  months: number,
): ResolvedRate {
  const attempt = tried.find((one) => one.supportId === part.supportId)
  const typed = attempt === undefined ? null : parseRateBp(attempt.rateText)
  if (attempt !== undefined && attempt.rateText.trim() !== '' && typed !== null) {
    const step: Step = { rateBp: typed, schedule: typed }
    return { origin: 'simulated', kind: attempt.kind, dated: false, low: step, high: step }
  }

  if (part.rateBp === null) {
    return {
      origin: 'screen',
      kind: 'assumed',
      dated: false,
      low: { rateBp: screen.low, schedule: screen.low },
      high: { rateBp: screen.high, schedule: screen.high },
    }
  }

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
    origin: 'own',
    kind: part.rateKind ?? 'assumed',
    /* Un seul palier ne « date » rien à annoncer : le taux vaut pour tout
       l'horizon, et le signaler ferait chercher un changement qui n'existe pas.
       C'est à partir du second que la ligne doit le dire — et encore faut-il
       qu'il tombe **dans** l'horizon, sinon la courbe ne le voit pas. */
    dated: Array.isArray(schedule) && new Set(schedule).size > 1,
    low: step,
    high: step,
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

  /* Les deux bornes se lisent dans l'ordre où elles ont été tapées, puis se
     rangent : « entre 5 % et 2 % » est la même fourchette que « entre 2 % et
     5 % », et refuser la première apprendrait seulement à qui la tape dans
     quel ordre l'app veut ses champs. */
  const lowTyped = parseRateBp(draft.lowText)
  const highTyped = parseRateBp(draft.highText)
  const screen =
    lowTyped === null || highTyped === null
      ? null
      : { low: Math.min(lowTyped, highTyped), high: Math.max(lowTyped, highTyped) }

  const errors: DraftErrors = {
    ...(initial === null ? { initial: projection.amountInvalid } : {}),
    ...(draft.mode === 'forecast' && !linked && monthly === null
      ? { monthly: projection.amountInvalid }
      : {}),
    ...(draft.mode === 'target' && target === null ? { target: projection.amountInvalid } : {}),
    ...(validYears ? {} : { years: outOfRangeYears() }),
    ...(inflationBp === null ? { inflation: outOfRangeRate() } : {}),
    ...(lowTyped === null ? { low: outOfRangeRate() } : {}),
    ...(highTyped === null ? { high: outOfRangeRate() } : {}),
  }

  /* Une inflation illisible ne vaut pas zéro : elle éteint la lecture en euros
     constants, qui est une lecture de plus et non le calcul lui-même. */
  const erosion = draft.constant ? (inflationBp ?? 0) : 0
  const months = validYears ? draft.years * 12 : 0

  if (initial === null || months === 0 || screen === null) {
    return { errors, result: null, missing: null }
  }

  if (draft.mode === 'target') {
    if (target === null || target === ZERO) {
      return { errors, result: null, missing: projection.targetMissing }
    }
    /* Une cible lue en euros d'aujourd'hui se réinflate avant le calcul : c'est
       ce qui fait que la courbe arrive sur le chiffre tapé, et non dessous. */
    const nominal = inflate(target, erosion, months)
    /* Le mode inverse cherche un versement, pas une répartition : il n'y a rien
       à décomposer tant qu'on ne sait pas encore combien verser, donc pas de
       comptes à qui prêter un taux — la fourchette y est celle des deux champs,
       et elle s'inverse : plus le rendement est bas, plus il faut verser. */
    const boundOf = (rateBp: number): Bound => {
      const perMonth = requiredMonthly({ target: nominal, initial, months, rateBp }) ?? ZERO
      return {
        rateBp,
        monthly: perMonth,
        series: projectSeries({
          initial,
          monthly: perMonth,
          months,
          rateBp,
          inflationBp: erosion,
        }),
      }
    }
    /* La borne « basse » est celle qui promet le moins : au rendement le plus
       bas, c'est le versement le plus **haut** qui est requis. On range donc par
       ce que la réponse coûte, et non par le taux qui la produit — sans quoi la
       fourchette s'écrirait « entre 520 € et 380 € ». */
    const cheap = boundOf(screen.high)
    const dear = boundOf(screen.low)
    return {
      errors,
      missing: null,
      result: {
        months,
        low: cheap,
        high: dear,
        single: cheap.monthly === dear.monthly,
        guaranteed: false,
        rateSpan: { low: screen.low, high: screen.high },
        split: [],
        initial,
        monthly: null,
        target,
        contributed: null,
        targetReached: cheap.monthly === ZERO && dear.monthly === ZERO,
        inflationBp: erosion,
      },
    }
  }

  if (monthly === null || (monthly === ZERO && initial === ZERO)) {
    return { errors, result: null, missing: projection.nothingToPlot }
  }

  /* Le détail par compte, quand il y en a un. Chaque compte est projeté deux
     fois — une par borne —, et les deux trajectoires sont identiques dès qu'un
     taux lui est propre : c'est là que la fourchette se referme, compte par
     compte, plutôt qu'à l'échelle du portefeuille. */
  const split = start.parts.map((part) => {
    const rate = rateOf(part, draft.supportRates, screen, months)
    const run = (schedule: number | readonly number[]): ProjectionSeries =>
      projectSeries({
        initial: part.capital ?? ZERO,
        monthly: part.monthly,
        months,
        rateBp: schedule,
        inflationBp: erosion,
        /* Le plafond du contrat, quand il y en a un : les versements s'arrêtent
           quand la place est faite, le capital continue. */
        ...(part.room === null ? {} : { room: part.room }),
      })
    const series = run(rate.low.schedule)
    return {
      supportId: part.supportId,
      label: part.label,
      rateBp: rate.low.rateBp,
      highBp: rate.high.rateBp,
      kind: rate.kind,
      origin: rate.origin,
      dated: rate.dated,
      cap: part.cap,
      room: part.room,
      /* Le plafond a-t-il coupé quelque chose ? La question se pose sur les
         nombres d'entrée : un versement mensuel nul, un horizon court ou une
         reprise nette laissent un plafond sans effet, et l'annoncer ferait
         chercher une coupe qui n'a pas eu lieu. */
      capped: part.room !== null && wouldExceed(part.monthly, months, part.room),
      schedule: rate.low.schedule,
      highSchedule: rate.high.schedule,
      series,
      /* Le même calcul, au même versement et au même plafond : seul le
         rendement change, ce qui est la condition pour que l'écart se lise
         comme « ce que le taux produirait ». Et littéralement la même série
         quand le compte est fixé — pas une seconde à tenir d'accord. */
      highSeries: rate.high.schedule === rate.low.schedule ? series : run(rate.high.schedule),
    }
  })

  const bound = (rateBp: number, pick: (one: SupportSeries) => ProjectionSeries): Bound => ({
    rateBp,
    monthly,
    /* Un portefeuille dont les comptes ont chacun leur taux ne suit **aucun**
       taux moyen : sa trajectoire est la somme des leurs, et il n'existe pas de
       troisième calcul à côté. */
    series:
      split.length > 0
        ? sumSeries(split.map(pick))
        : projectSeries({ initial, monthly, months, rateBp, inflationBp: erosion }),
  })

  const low = bound(screen.low, (one) => one.series)
  const high = bound(screen.high, (one) => one.highSeries)

  return {
    errors,
    missing: null,
    result: {
      months,
      low,
      high,
      /* Sur la dernière valeur, parce que c'est la seule qui soit écrite en
         toutes lettres : deux trajectoires qui arrivent au même euro n'ont pas
         de fourchette à montrer, quel que soit le chemin. */
      single: (low.series.balance.at(-1) ?? ZERO) === (high.series.balance.at(-1) ?? ZERO),
      /* Le trait n'est plein que si **tout** ce qui court est contractuel. Un
         seul compte muet, et l'ensemble redevient une hypothèse — c'est la
         lecture qui promet le moins, et la seule qu'on ait le droit de faire. */
      guaranteed:
        split.length > 0 && split.every((one) => one.origin !== 'screen' && one.kind === 'guaranteed'),
      rateSpan:
        split.length > 0
          ? {
              low: Math.min(...split.map((one) => one.rateBp)),
              high: Math.max(...split.map((one) => one.highBp)),
            }
          : { low: screen.low, high: screen.high },
      split,
      initial,
      monthly,
      target: null,
      /* Le versé ne dépend pas du taux : les deux bornes partagent la même aire,
         et c'est ce qui rend l'écart entre elle et chaque courbe lisible comme
         « ce que le taux a produit ». */
      contributed: low.series.contributed,
      targetReached: false,
      inflationBp: erosion,
    },
  }
}

/**
 * La somme de plusieurs trajectoires, rang par rang.
 *
 * C'est ce qui fait qu'un portefeuille dont les comptes ont chacun leur taux
 * garde **un seul** moteur : sa courbe n'est pas recalculée à un taux moyen —
 * qui n'existe pas —, elle est l'addition des courbes de ses comptes. Le
 * tableau des paliers et le chiffre d'arrivée lisent donc littéralement les
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
 * Tout se lit sur la **même** série que le tracé et les paliers : `paid` est le
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

/* --- « Et si je versais… » -------------------------------------------------*/

/**
 * Le pas du réglage d'effort : dix euros, cinquante, ou cent.
 *
 * Personne ne programme un virement à 327 € : le pas suit l'ordre de grandeur du
 * versement plutôt qu'une valeur fixe, qui serait dérisoire pour qui met 2 000 €
 * de côté et brutale pour qui en met 50.
 */
export function rungStep(monthly: Money): number {
  if (monthly < 20_000) return 1_000
  if (monthly < 100_000) return 5_000
  return 10_000
}

/** Ce qu'un compte reçoit et rend, à un versement donné. */
export type EffortPart = {
  supportId: string
  label: string
  monthly: Money
  arrival: Money
}

/**
 * Ce qu'un compte reçoit par mois, relu sur sa propre série.
 *
 * Le versé cumulé compte le capital de départ à son rang zéro : la mensualité
 * est donc l'écart entre deux rangs consécutifs, et non le premier point. La
 * relire ici plutôt que de la reporter depuis `ProjectionStart` garde une seule
 * source à la trajectoire d'un compte — celle qui a servi à la tracer.
 */
function partMonthly(part: SupportSeries): number {
  return (part.series.contributed[1] ?? ZERO) - (part.series.contributed[0] ?? ZERO)
}

/**
 * Ce que donnerait un autre versement, au même horizon et sous la même
 * fourchette.
 *
 * **La seule lecture actionnable de l'écran** : « combien j'aurai » se
 * contemple, « ce que 150 € de plus changeraient » se décide. Elle a longtemps
 * eu deux dispositifs — un tableau de quatre barreaux, et un curseur qui
 * explorait le continu entre eux —, c'est-à-dire deux réponses à une seule
 * question, dont l'une était un sous-ensemble de l'autre. Il n'en reste qu'un
 * réglage d'une ligne.
 *
 * Sur un portefeuille décomposé, l'effort supplémentaire se répartit **au
 * prorata** de ce que chaque compte reçoit déjà, et chaque part garde son
 * taux : verser 50 % de plus, c'est verser 50 % de plus partout. Recalculer le
 * tout à un taux unique donnerait un chiffre que le résultat en tête d'écran ne
 * retrouverait même pas.
 */
export function effortAt(
  result: ProjectionResult,
  value: Money,
): { low: Money; high: Money; parts: EffortPart[] } {
  const base = result.monthly
  if (base === null || base <= 0) return { low: ZERO, high: ZERO, parts: [] }

  const ratio = value / base
  const run = (
    part: SupportSeries,
    monthly: Money,
    schedule: number | readonly number[],
  ): Money =>
    projectSeries({
      initial: part.series.contributed[0] ?? ZERO,
      monthly,
      months: result.months,
      /* Le **barème** du compte, et non son taux de départ : reprojeter à taux
         constant un compte dont le taux change au rang 14 donnerait une arrivée
         que la courbe ne connaît pas. */
      rateBp: schedule,
      inflationBp: result.inflationBp,
      /* Le plafond tient aussi ici, et c'est ce qui rend le calcul honnête :
         verser deux fois plus sur un livret presque plein ne donne pas deux fois
         plus, et un chiffre qui l'ignorerait promettrait un capital que le
         contrat refuse. */
      ...(part.room === null ? {} : { room: part.room }),
    }).balance.at(-1) ?? ZERO

  const parts: EffortPart[] = result.split.map((part) => {
    const monthly = money(Math.round(partMonthly(part) * ratio))
    return {
      supportId: part.supportId,
      label: part.label,
      monthly,
      arrival: run(part, monthly, part.schedule),
    }
  })

  if (parts.length > 0) {
    return {
      low: money(parts.reduce((total, part) => total + part.arrival, 0)),
      high: money(
        result.split.reduce(
          (total, part, index) =>
            total + run(part, parts[index]?.monthly ?? ZERO, part.highSchedule),
          0,
        ),
      ),
      parts,
    }
  }

  const whole = (rateBp: number): Money =>
    projectSeries({
      initial: result.initial,
      monthly: value,
      months: result.months,
      rateBp,
      inflationBp: result.inflationBp,
    }).balance.at(-1) ?? ZERO

  return { low: whole(result.low.rateBp), high: whole(result.high.rateBp), parts: [] }
}
