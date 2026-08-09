/* ============================================================================
 * Validation d'un document venu du disque.
 *
 * Une donnée illisible est écartée plutôt que corrigée au jugé : un montant
 * fractionnaire ou une date invalide feraient dérailler tout le domaine.
 * Ce qui est simplement absent, en revanche, reprend sa valeur par défaut.
 *
 * Deux ajouts qui vont ensemble. Le module **dit** désormais ce qu'il a écarté
 * et ce qu'il a réparé, ligne par ligne : jeter une dépense en silence dans un
 * geste qui remplace tout le document est la façon la plus sûre de ne jamais
 * s'en apercevoir. Et il **répare les liens** — une catégorie, un membre ou une
 * récurrence désignés mais absents —, parce que rien ne les vérifiait : une
 * catégorie orpheline retombait sur « charge » par un double repli, donc
 * devenait commune et partagée, et une entrée au membre inexistant disparaissait
 * de toutes les vues filtrées tout en pesant sur le foyer.
 * ==========================================================================*/

import { isValidYm, isValidISO, today, ymOf } from '@/domain/date'
import { isMoney, type Money } from '@/domain/money'
import type {
  Advance,
  Category,
  CategoryKind,
  Data,
  Debt,
  Direction,
  Entry,
  Family,
  Member,
  MonthState,
  Period,
  PeriodUnit,
  Recurrence,
  SavingGoal,
  SavingRate,
  SavingSupport,
  SavingValuation,
  Settings,
  ThemeSetting,
} from '@/domain/types'
import {
  DEFAULT_LOCALE,
  DEFAULT_PALETTE,
  isLocale,
  isPaletteSetting,
  isSavingRole,
} from '@/domain/types'
import { MAX_RATE_PERCENT } from '@/domain/rate'
import { defaultFamilies, fallbackFamilyId, repairedCategory } from './defaults'
import { CURRENT_SCHEMA_VERSION } from './schema'

/* --- Ce que la lecture a à dire -------------------------------------------*/

/** La collection du document où la ligne se trouvait. */
export type ImportCollection =
  | 'members'
  | 'families'
  | 'categories'
  | 'recurrences'
  | 'entries'
  | 'debts'
  | 'advances'
  | 'savingSupports'
  | 'savingValuations'
  | 'savingRates'
  | 'savingGoals'
  | 'months'

/**
 * Pourquoi une ligne a été écartée ou réparée.
 *
 * Un code, pas une phrase : les textes vivent dans `i18n/fr.ts`, et c'est
 * l'écran qui décide comment le dire.
 */
export type ImportReason =
  /** Ce n'est pas un objet — rien à lire. */
  | 'shape'
  /** Montant absent ou fractionnaire. */
  | 'amount'
  /** Capital d'un crédit absent ou fractionnaire. */
  | 'principal'
  /** Date absente ou inexistante au calendrier. */
  | 'date'
  /** Mois absent, mal formé, ou hors des douze. */
  | 'month'
  /** Avance sans porteur : une épargne est toujours à quelqu'un. */
  | 'noMember'
  /** Période dont la fin précède le début. */
  | 'period'
  /** Taux absent, fractionnaire, ou hors des bornes de la saisie. */
  | 'rate'
  /** Identifiant déjà porté par une autre ligne de la même collection. */
  | 'duplicateId'
  /** Désigne une catégorie qui n'existe pas dans le document. */
  | 'unknownCategory'
  /** Désigne une famille qui n'existe pas. */
  | 'unknownFamily'
  /** Désigne un membre qui n'existe pas. */
  | 'unknownMember'
  /** Désigne une récurrence qui n'existe pas. */
  | 'unknownRecurrence'
  /** Désigne un support d'épargne qui n'existe pas. */
  | 'unknownSupport'

export type ImportNotice = {
  /** Écartée : la ligne n'est plus là. Réparée : elle est là, autrement. */
  kind: 'discarded' | 'repaired'
  collection: ImportCollection
  /** Rang dans sa collection, pour retrouver la ligne dans le fichier. */
  index: number
  reason: ImportReason
  /** Son libellé, quand il était lisible — plus parlant qu'un rang. */
  label?: string
}

export type NormalizedDocument = { data: Data; notices: ImportNotice[] }

/* --- Lectures élémentaires ------------------------------------------------*/

type Raw = Record<string, unknown>

/** Une entité lue, ou la raison pour laquelle elle ne l'est pas. */
type Read<T> = T | ImportReason

const rejected = <T>(value: Read<T>): value is ImportReason => typeof value === 'string'

const isRecord = (v: unknown): v is Raw =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const str = (v: unknown, fallback: string): string =>
  typeof v === 'string' && v.length > 0 ? v : fallback

const optionalStr = (v: unknown): string | undefined =>
  typeof v === 'string' && v.length > 0 ? v : undefined

const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback)

const int = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isInteger(v) ? v : fallback

const direction = (v: unknown): Direction => (v === 'in' ? 'in' : 'out')

const isoDate = (v: unknown, fallback: string): string =>
  typeof v === 'string' && isValidISO(v) ? v : fallback

const yearMonth = (v: unknown, fallback: string): string =>
  typeof v === 'string' && isValidYm(v) ? v : fallback

const array = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

/** Un booléen facultatif dont l'absence a un sens : elle rend la main à la règle. */
const optionalBool = (v: unknown): boolean | undefined =>
  typeof v === 'boolean' ? v : undefined

function moneyOrNull(v: unknown): Money | null {
  return isMoney(v) ? v : null
}

/* --- Entités --------------------------------------------------------------*/

function member(raw: unknown, index: number): Read<Member> {
  if (!isRecord(raw)) return 'shape'
  return {
    id: str(raw['id'], `member-${String(index)}`),
    name: str(raw['name'], '—'),
    color: str(raw['color'], 'var(--member-1)'),
  }
}

const KINDS = new Set<CategoryKind>(['resource', 'charge', 'debt', 'saving'])

const kind = (v: unknown): CategoryKind =>
  typeof v === 'string' && KINDS.has(v as CategoryKind) ? (v as CategoryKind) : 'charge'

function family(raw: unknown, index: number): Read<Family> {
  if (!isRecord(raw)) return 'shape'
  return {
    id: str(raw['id'], `family-${String(index)}`),
    label: str(raw['label'], '—'),
    kind: kind(raw['kind']),
  }
}

function category(raw: unknown, index: number): Read<Category> {
  if (!isRecord(raw)) return 'shape'
  const dir = direction(raw['direction'])
  return {
    id: str(raw['id'], `category-${String(index)}`),
    label: str(raw['label'], '—'),
    familyId: str(raw['familyId'], fallbackFamilyId(dir)),
    icon: str(raw['icon'], ''),
    color: str(raw['color'], 'var(--cat-1)'),
    direction: dir,
    archived: bool(raw['archived'], false),
  }
}

/** Un crédit sans capital lisible est écarté : il ne dirait rien de juste. */
function debt(raw: unknown, index: number): Read<Debt> {
  if (!isRecord(raw)) return 'shape'
  if (!isMoney(raw['principal'])) return 'principal'
  const recurrenceId = optionalStr(raw['recurrenceId'])
  const note = optionalStr(raw['note'])
  const rate = int(raw['rateBp'], 0)
  const startedOn = isoDate(raw['startedOn'], today())
  return {
    id: str(raw['id'], `debt-${String(index)}`),
    label: str(raw['label'], '—'),
    categoryId: str(raw['categoryId'], ''),
    ...(recurrenceId === undefined ? {} : { recurrenceId }),
    principal: raw['principal'],
    startedOn,
    endsOn: isoDate(raw['endsOn'], startedOn),
    ...(rate > 0 ? { rateBp: rate } : {}),
    ...(note === undefined ? {} : { note }),
  }
}

/**
 * Une avance sans montant lisible est écartée, comme un crédit sans capital :
 * c'est le seul chiffre qu'elle apporte, et sans lui il n'y a rien à
 * reconstituer.
 *
 * Le membre, lui, ne peut pas manquer : une épargne est toujours à quelqu'un.
 * Faute de savoir à qui, on écarte plutôt que d'inventer un porteur.
 */
/**
 * Un support sans porteur est écarté, comme une avance : une épargne est
 * toujours à quelqu'un, et lui en inventer un attribuerait à une personne un
 * compte qui n'est pas le sien.
 *
 * Le capital, lui, n'est pas ici : il vit dans les valorisations, et un support
 * sans relevé est un support dont on ne connaît pas la valeur — ce qui n'est
 * pas la même chose qu'un support à zéro.
 *
 * La cadence est **omise plutôt que posée à sa valeur par défaut** quand elle
 * manque : un document d'avant le champ n'a jamais répondu à la question, et
 * écrire « annuel » à sa place ferait passer un silence pour un choix. C'est le
 * domaine qui retombe sur `DEFAULT_PACE` à la lecture, en un seul endroit.
 *
 * Le rôle suit la même règle, en plus strict encore : rien ne retombe sur une
 * valeur par défaut à la lecture non plus. Un rôle inventé ferait entrer un
 * compte dans l'autonomie — ou l'en sortirait — sans que personne l'ait dit,
 * c'est-à-dire produirait exactement le chiffre faux que ce champ corrige.
 */
function savingSupport(raw: unknown, index: number): Read<SavingSupport> {
  if (!isRecord(raw)) return 'shape'
  const memberId = optionalStr(raw['memberId'])
  if (memberId === undefined) return 'noMember'
  const note = optionalStr(raw['note'])
  const pace = raw['pace']
  /* `rateBp` et `rateKind` ne sont plus lus : depuis la v12 le taux vit dans
     `savingRates`, daté. Un document annoncé v12 qui les porterait encore les
     perd donc sans un mot — c'est écrit dans les coercitions silencieuses du
     document de schéma. Un document plus ancien, lui, passe par `toVersion12`,
     qui les convertit avant que cette lecture n'ait lieu. */
  /* Le plafond est **omis** dès qu'il est illisible ou nul, jamais ramené à
     zéro : un plafond de zéro dirait qu'on ne peut plus rien verser, ce qui
     n'est pas une absence de plafond mais un compte fermé — et c'est
     `archived` qui le dit. Un négatif n'est pas un plafond non plus. La ligne
     n'est pas écartée pour autant : un support est un compte, et perdre le
     compte parce que son plafond est abîmé serait hors de proportion. */
  const cap = raw['depositCap']
  const depositCap = isMoney(cap) && cap > 0 ? cap : undefined
  const role = raw['role']
  return {
    id: str(raw['id'], `saving-support-${String(index)}`),
    label: str(raw['label'], '—'),
    memberId,
    categoryId: str(raw['categoryId'], ''),
    archived: bool(raw['archived'], false),
    ...(pace === 'yearly' || pace === 'quarterly' ? { pace } : {}),
    ...(isSavingRole(role) ? { role } : {}),
    ...(depositCap === undefined ? {} : { depositCap }),
    ...(note === undefined ? {} : { note }),
  }
}

/**
 * Une valorisation sans montant lisible, sans date ou sans support n'est pas une
 * observation : c'est tout ce qu'elle porte.
 *
 * Le montant peut valoir zéro — un livret vidé est une information —, mais il
 * doit être là : l'absence de relevé et un relevé à zéro ne disent pas la même
 * chose, et les confondre ferait entrer une inconnue dans un total.
 */
function savingValuation(raw: unknown, index: number): Read<SavingValuation> {
  if (!isRecord(raw)) return 'shape'
  if (!isMoney(raw['amount'])) return 'amount'
  if (typeof raw['date'] !== 'string' || !isValidISO(raw['date'])) return 'date'
  const supportId = optionalStr(raw['supportId'])
  if (supportId === undefined) return 'unknownSupport'
  return {
    id: str(raw['id'], `saving-valuation-${String(index)}`),
    supportId,
    amount: raw['amount'],
    date: raw['date'],
  }
}

/**
 * Un palier de taux sans date, sans support ou sans taux lisible n'est pas un
 * palier : c'est tout ce qu'il porte.
 *
 * Le taux est **écarté** plutôt que ramené à zéro, et c'est la même règle que
 * pour un montant fractionnaire : 0 % est une hypothèse qu'on peut poser
 * volontairement — un compte courant, un fonds à l'arrêt —, et l'inventer à la
 * place d'un champ abîmé ferait dire à l'app ce qu'elle ne sait pas. Un support
 * sans palier retombe sur l'hypothèse de l'écran, ce qui est la bonne conduite.
 *
 * Les bornes sont celles de la saisie (`domain/rate.ts`) : ce qui entre par un
 * fichier passe le même filtre que ce qui entre par un clavier.
 */
function savingRate(raw: unknown, index: number): Read<SavingRate> {
  if (!isRecord(raw)) return 'shape'
  const supportId = optionalStr(raw['supportId'])
  if (supportId === undefined) return 'unknownSupport'
  if (typeof raw['from'] !== 'string' || !isValidISO(raw['from'])) return 'date'
  const rateBp = raw['rateBp']
  if (
    typeof rateBp !== 'number' ||
    !Number.isInteger(rateBp) ||
    rateBp < 0 ||
    rateBp > MAX_RATE_PERCENT * 100
  ) {
    return 'rate'
  }
  return {
    id: str(raw['id'], `saving-rate-${String(index)}`),
    supportId,
    rateBp,
    /* Contrairement au support d'avant la v12, la nature ne peut pas manquer :
       elle qualifie un taux qui, lui, est là. Tout ce qui n'est pas exactement
       « guaranteed » vaut hypothèse — la lecture qui promet le moins. */
    kind: raw['kind'] === 'guaranteed' ? 'guaranteed' : 'assumed',
    from: raw['from'],
  }
}

/**
 * Un objectif sans porteur ou sans cible n'est pas un objectif : c'est tout ce
 * qu'il porte.
 *
 * La cible doit être **strictement positive** — « viser zéro euro » n'est pas un
 * cap, et une jauge sans dénominateur ne veut rien dire, ce qui est la règle de
 * `savingRate` et de `savingCoverage`. Le porteur suit celle d'un support et
 * d'une avance : une épargne est toujours à quelqu'un, et lui en inventer un
 * attribuerait à quelqu'un ce qu'il n'a pas décidé.
 *
 * Les comptes rattachés sont **filtrés à la réparation** et non ici : ce
 * fichier lit une ligne à la fois, et savoir quels supports existent demande de
 * les avoir tous lus.
 */
function savingGoal(raw: unknown, index: number): Read<SavingGoal> {
  if (!isRecord(raw)) return 'shape'
  const memberId = optionalStr(raw['memberId'])
  if (memberId === undefined) return 'noMember'
  if (!isMoney(raw['target']) || raw['target'] <= 0) return 'amount'
  const targetOn = raw['targetOn']
  const monthly = raw['monthly']
  return {
    id: str(raw['id'], `saving-goal-${String(index)}`),
    label: str(raw['label'], '—'),
    memberId,
    supportIds: array(raw['supportIds']).flatMap((one) =>
      typeof one === 'string' && one !== '' ? [one] : [],
    ),
    target: raw['target'],
    ...(typeof targetOn === 'string' && isValidYm(targetOn) ? { targetOn } : {}),
    /* Un versement engagé nul ou négatif est **retiré** plutôt que gardé :
       « je verse 0 € » n'est pas un engagement, c'est l'absence d'engagement,
       et c'est déjà ce que l'absence du champ veut dire. */
    ...(isMoney(monthly) && monthly > 0 ? { monthly } : {}),
    startedOn: isoDate(raw['startedOn'], today()),
    archived: bool(raw['archived'], false),
  }
}

function advance(raw: unknown, index: number): Read<Advance> {
  if (!isRecord(raw)) return 'shape'
  if (!isMoney(raw['amount'])) return 'amount'
  const memberId = optionalStr(raw['memberId'])
  if (memberId === undefined) return 'noMember'
  const recurrenceId = optionalStr(raw['recurrenceId'])
  const savingSupportId = optionalStr(raw['savingSupportId'])
  const note = optionalStr(raw['note'])
  const paidOn = isoDate(raw['paidOn'], today())
  const from = yearMonth(raw['from'], ymOf(paidOn))
  const to = yearMonth(raw['to'], from)
  /* Une période qui se termine avant de commencer n'est pas une période : la
     récurrence qui reconstitue le livret s'arrête avant sa première mensualité,
     donc rien ne revient jamais et `remaining` reste éternellement plein. Le
     formulaire l'interdit déjà ; un document venu d'ailleurs, non. */
  if (to < from) return 'period'
  return {
    id: str(raw['id'], `advance-${String(index)}`),
    label: str(raw['label'], '—'),
    categoryId: str(raw['categoryId'], ''),
    memberId,
    ...(savingSupportId === undefined ? {} : { savingSupportId }),
    amount: raw['amount'],
    paidOn,
    from,
    to,
    ...(recurrenceId === undefined ? {} : { recurrenceId }),
    ...(note === undefined ? {} : { note }),
  }
}

function period(raw: unknown): Period {
  const source = isRecord(raw) ? raw : {}
  const unit = source['unit']
  const known: PeriodUnit = unit === 'week' || unit === 'year' ? unit : 'month'
  const every = int(source['every'], 1)
  return {
    unit: known,
    every: every > 0 ? every : 1,
    anchorDay: int(source['anchorDay'], 1),
  }
}

function recurrence(raw: unknown, index: number): Read<Recurrence> {
  if (!isRecord(raw)) return 'shape'
  const startedOn = isoDate(raw['startedOn'], today())
  const endedOn = typeof raw['endedOn'] === 'string' && isValidISO(raw['endedOn'])
    ? raw['endedOn']
    : undefined
  const memberId = optionalStr(raw['memberId'])
  const savingSupportId = optionalStr(raw['savingSupportId'])
  const shared = optionalBool(raw['shared'])
  const note = optionalStr(raw['note'])
  const amount = moneyOrNull(raw['amount'])
  // Un montant habituel n'a de sens que sur un montant variable, et seulement
  // s'il dit quelque chose : zéro n'est pas un ordre de grandeur.
  const estimate = amount === null ? moneyOrNull(raw['estimate']) : null
  return {
    id: str(raw['id'], `recurrence-${String(index)}`),
    label: str(raw['label'], '—'),
    categoryId: str(raw['categoryId'], ''),
    ...(memberId === undefined ? {} : { memberId }),
    ...(savingSupportId === undefined ? {} : { savingSupportId }),
    direction: direction(raw['direction']),
    amount,
    ...(estimate === null || estimate <= 0 ? {} : { estimate }),
    period: period(raw['period']),
    startedOn,
    ...(endedOn === undefined ? {} : { endedOn }),
    ...(shared === undefined ? {} : { shared }),
    ...(note === undefined ? {} : { note }),
  }
}

/** Une entrée dont le montant ou la date est illisible est écartée. */
function entry(raw: unknown, index: number): Read<Entry> {
  if (!isRecord(raw)) return 'shape'
  if (!isMoney(raw['amount'])) return 'amount'
  if (typeof raw['date'] !== 'string' || !isValidISO(raw['date'])) return 'date'

  const recurrenceId = optionalStr(raw['recurrenceId'])
  const memberId = optionalStr(raw['memberId'])
  const savingSupportId = optionalStr(raw['savingSupportId'])
  const shared = optionalBool(raw['shared'])
  const note = optionalStr(raw['note'])
  return {
    id: str(raw['id'], `entry-${String(index)}`),
    ...(recurrenceId === undefined ? {} : { recurrenceId }),
    label: str(raw['label'], '—'),
    categoryId: str(raw['categoryId'], ''),
    ...(memberId === undefined ? {} : { memberId }),
    ...(savingSupportId === undefined ? {} : { savingSupportId }),
    direction: direction(raw['direction']),
    amount: raw['amount'],
    date: raw['date'],
    status: raw['status'] === 'confirmed' ? 'confirmed' : 'planned',
    ...(shared === undefined ? {} : { shared }),
    ...(note === undefined ? {} : { note }),
  }
}

/**
 * Un mois ouvert dont on ne sait pas lire le mois est écarté.
 *
 * La forme seule — quatre chiffres, un tiret, deux chiffres — laissait passer
 * `"2026-13"`, que `startOfMonth` puis `parseISO` traversent ensuite sans
 * bruit : le mois s'affichait sans nom. `isValidYm` borne le mois, et c'est le
 * même contrôle que celui des avances, plus haut.
 */
function monthState(raw: unknown): Read<MonthState> {
  if (!isRecord(raw)) return 'shape'
  if (typeof raw['ym'] !== 'string' || !isValidYm(raw['ym'])) return 'month'
  return {
    ym: raw['ym'],
    openedAt: isoDate(raw['openedAt'], today()),
    closed: bool(raw['closed'], false),
  }
}

function settings(raw: unknown): Settings {
  const source = isRecord(raw) ? raw : {}
  const theme = source['theme']
  const known: ThemeSetting = theme === 'light' || theme === 'dark' ? theme : 'system'
  const startsOn = int(source['monthStartsOn'], 1)
  return {
    theme: known,
    /* Une palette inconnue retombe sur Classique plutôt que d'écarter la ligne :
       c'est un réglage d'apparence, et un document par ailleurs sain n'a pas à
       être signalé parce qu'il vient d'une version qui en proposait une de plus. */
    palette: isPaletteSetting(source['palette']) ? source['palette'] : DEFAULT_PALETTE,
    /* Une langue inconnue — ou absente, dans un document d'avant le champ —
       retombe sur le français, et surtout pas sur celle du navigateur : c'est
       la valeur écrite dans le document qui fait foi, et la deviner ferait
       changer de langue un même fichier selon l'appareil qui l'ouvre. La
       détection n'a lieu qu'à la création (`emptyData`), là où il n'y a
       justement rien à lire. */
    locale: isLocale(source['locale']) ? source['locale'] : DEFAULT_LOCALE,
    currency: str(source['currency'], 'EUR'),
    monthStartsOn: startsOn >= 1 && startsOn <= 28 ? startsOn : 1,
  }
}

/* --- Document -------------------------------------------------------------*/

/** Ce qu'un libellé lisible apporte à un rapport. Absent, le rang suffit. */
function labelOf(raw: unknown): string | undefined {
  if (!isRecord(raw)) return undefined
  return optionalStr(raw['label']) ?? optionalStr(raw['name'])
}

function compact<T>(
  items: unknown[],
  collection: ImportCollection,
  parse: (raw: unknown, index: number) => Read<T>,
  notices: ImportNotice[],
): T[] {
  const parsed: T[] = []
  items.forEach((item, index) => {
    const value = parse(item, index)
    if (!rejected(value)) {
      parsed.push(value)
      return
    }
    const label = labelOf(item)
    notices.push({
      kind: 'discarded',
      collection,
      index,
      reason: value,
      ...(label === undefined ? {} : { label }),
    })
  })
  return parsed
}

/**
 * Met un document brut en forme, et dit ce qu'il lui en a coûté.
 * Ne lève jamais : il rend toujours un `Data`.
 */
export function normalizeDocument(raw: unknown): NormalizedDocument {
  const notices: ImportNotice[] = []
  const source = isRecord(raw) ? raw : {}
  const household = isRecord(source['household']) ? source['household'] : {}

  const data: Data = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    household: {
      /* Le nom est facultatif et purement décoratif : un document qui n'en
         porte pas n'en reçoit pas d'office. Y remettre « Maison » ferait
         rentrer par l'import le mot que l'app a cessé de supposer. */
      name: str(household['name'], ''),
      members: compact(array(household['members']), 'members', member, notices),
    },
    // Un document sans famille lisible repart du catalogue : sans premier
    // niveau, aucune catégorie ne sait plus de quelle nature elle relève.
    families: (() => {
      const parsed = compact(array(source['families']), 'families', family, notices)
      return parsed.length > 0 ? parsed : defaultFamilies()
    })(),
    categories: compact(array(source['categories']), 'categories', category, notices),
    recurrences: compact(array(source['recurrences']), 'recurrences', recurrence, notices),
    entries: compact(array(source['entries']), 'entries', entry, notices),
    debts: compact(array(source['debts']), 'debts', debt, notices),
    advances: compact(array(source['advances']), 'advances', advance, notices),
    savingSupports: compact(
      array(source['savingSupports']),
      'savingSupports',
      savingSupport,
      notices,
    ),
    savingValuations: compact(
      array(source['savingValuations']),
      'savingValuations',
      savingValuation,
      notices,
    ),
    savingRates: compact(array(source['savingRates']), 'savingRates', savingRate, notices),
    savingGoals: compact(array(source['savingGoals']), 'savingGoals', savingGoal, notices),
    months: compact(array(source['months']), 'months', monthState, notices),
    settings: settings(source['settings']),
  }

  return { data: repairReferences(data, notices), notices }
}

/** La même lecture, quand le rapport ne sert à personne. */
export function normalizeData(raw: unknown): Data {
  return normalizeDocument(raw).data
}

/* --- Réparation des liens -------------------------------------------------*/

/**
 * Rend uniques les identifiants d'une collection.
 *
 * Le doublon est renommé, jamais supprimé : rien ne dit laquelle des deux
 * lignes est la bonne, et en jeter une perdrait une dépense. Les références qui
 * pointaient vers cet identifiant se résolvent sur la première — elles étaient
 * de toute façon ambiguës, et c'est le seul choix qui ne dépend pas de l'ordre
 * de lecture. Le suffixe est déterministe : deux lectures du même fichier
 * donnent le même document.
 */
function dedupeIds<T extends { id: string }>(
  items: readonly T[],
  collection: ImportCollection,
  notices: ImportNotice[],
): T[] {
  const seen = new Set<string>()
  return items.map((item, index) => {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      return item
    }
    let suffix = 2
    let candidate = `${item.id}~${String(suffix)}`
    while (seen.has(candidate)) {
      suffix += 1
      candidate = `${item.id}~${String(suffix)}`
    }
    seen.add(candidate)
    notices.push({ kind: 'repaired', collection, index, reason: 'duplicateId' })
    return { ...item, id: candidate }
  })
}

/**
 * Recolle — ou coupe — les liens qui ne mènent nulle part.
 *
 * Rien ne les vérifiait, et chaque lien mort avait sa manière d'être faux en
 * silence. Une catégorie inconnue retombait sur « charge » par le double repli
 * de `kindOfCategory` : la dépense devenait commune, donc partagée entre les
 * membres. Un membre inconnu faisait disparaître une entrée de toutes les vues
 * filtrées tout en la laissant peser sur le foyer — la somme des mois de chacun
 * cessait de valoir celui du foyer. Une récurrence inconnue laissait `useDebt`
 * lire la mensualité d'une règle absente, donc `null`, sans rien dire.
 *
 * Trois gestes, et le plus doux qui règle chaque cas. Un lien facultatif se
 * **coupe** : la ligne rend son membre ou sa règle au foyer, comme après un
 * retrait de membre, et reste modifiable. Un lien obligatoire — la catégorie —
 * se **redirige** vers une catégorie de réparation, visible dans les listes et
 * dans les réglages : c'est la même nature que le repli d'avant, mais on la
 * voit, et on peut la corriger d'un geste. Ce qui ne peut être ni coupé ni
 * redirigé — une avance dont le porteur n'existe pas — est **écarté**, la même
 * règle que pour une avance sans membre du tout.
 */
function repairReferences(data: Data, notices: ImportNotice[]): Data {
  const members = dedupeIds(data.household.members, 'members', notices)
  const families = dedupeIds(data.families, 'families', notices)
  const categories = dedupeIds(data.categories, 'categories', notices)
  const recurrences = dedupeIds(data.recurrences, 'recurrences', notices)
  const entries = dedupeIds(data.entries, 'entries', notices)
  const debts = dedupeIds(data.debts, 'debts', notices)
  const advances = dedupeIds(data.advances, 'advances', notices)
  const supports = dedupeIds(data.savingSupports, 'savingSupports', notices)
  const valuations = dedupeIds(data.savingValuations, 'savingValuations', notices)
  const rates = dedupeIds(data.savingRates, 'savingRates', notices)
  const goals = dedupeIds(data.savingGoals, 'savingGoals', notices)

  const memberIds = new Set(members.map((m) => m.id))
  const familyIds = new Set(families.map((f) => f.id))
  const recurrenceIds = new Set(recurrences.map((r) => r.id))
  const categoryIds = new Set(categories.map((c) => c.id))

  /* Les catégories de réparation ne sont ajoutées que si elles servent : un
     document sain ne gagne pas deux lignes dans ses réglages. */
  const repairs = new Map<Direction, Category>()
  const rerouted = (dir: Direction): string => {
    const existing = categories.find((c) => c.id === repairedCategory(dir).id)
    if (existing !== undefined) return existing.id
    const category = repairs.get(dir) ?? repairedCategory(dir)
    repairs.set(dir, category)
    return category.id
  }

  const note = (
    collection: ImportCollection,
    index: number,
    reason: ImportReason,
    label?: string,
  ): void => {
    notices.push({
      kind: 'repaired',
      collection,
      index,
      reason,
      ...(label === undefined ? {} : { label }),
    })
  }

  const repairedFamilies = categories.map((category, index) => {
    if (familyIds.has(category.familyId)) return category
    note('categories', index, 'unknownFamily', category.label)
    return { ...category, familyId: fallbackFamilyId(category.direction) }
  })

  /* Les supports d'épargne. Un porteur inconnu **écarte** le support — son
     `memberId` n'est pas facultatif, exactement comme sur une avance, et lui en
     inventer un attribuerait à quelqu'un un compte qui n'est pas le sien. Une
     catégorie inconnue — ou qui n'est pas d'épargne — se **répare** en revanche :
     le support est un compte, sa catégorie n'en dit que la nature, et la perdre
     ne justifie pas de perdre le compte. Faute de la moindre catégorie
     d'épargne dans le document, il n'y a rien vers quoi rediriger : le support
     part alors, et ses valorisations avec lui. */
  const familyKinds = new Map(families.map((f) => [f.id, f.kind]))
  const isSavingCategory = (id: string): boolean => {
    const category = repairedFamilies.find((one) => one.id === id)
    return category !== undefined && familyKinds.get(category.familyId) === 'saving'
  }
  const savingHome = repairedFamilies.find((category) => isSavingCategory(category.id))

  const keptSupports: SavingSupport[] = []
  supports.forEach((support, index) => {
    if (!memberIds.has(support.memberId)) {
      notices.push({
        kind: 'discarded',
        collection: 'savingSupports',
        index,
        reason: 'unknownMember',
        label: support.label,
      })
      return
    }
    if (isSavingCategory(support.categoryId)) {
      keptSupports.push(support)
      return
    }
    if (savingHome === undefined) {
      notices.push({
        kind: 'discarded',
        collection: 'savingSupports',
        index,
        reason: 'unknownCategory',
        label: support.label,
      })
      return
    }
    note('savingSupports', index, 'unknownCategory', support.label)
    keptSupports.push({ ...support, categoryId: savingHome.id })
  })

  const supportIds = new Set(keptSupports.map((support) => support.id))

  /* Une valorisation orpheline ne décrit rien : le compte qu'elle photographie
     n'existe pas, et rien ne permettrait de la rattacher à un autre. */
  const keptValuations: SavingValuation[] = []
  valuations.forEach((valuation, index) => {
    if (supportIds.has(valuation.supportId)) {
      keptValuations.push(valuation)
      return
    }
    notices.push({
      kind: 'discarded',
      collection: 'savingValuations',
      index,
      reason: 'unknownSupport',
    })
  })

  /* Un palier orphelin ne qualifie rien : le compte auquel il prêtait un taux
     n'existe pas. La même règle qu'une valorisation, et non celle du lien coupé
     — un taux sans support ne vaut plus rien du tout. */
  const keptRates: SavingRate[] = []
  rates.forEach((rate, index) => {
    if (supportIds.has(rate.supportId)) {
      keptRates.push(rate)
      return
    }
    notices.push({
      kind: 'discarded',
      collection: 'savingRates',
      index,
      reason: 'unknownSupport',
    })
  })

  /* Les objectifs. Un porteur inconnu **écarte** l'objectif — comme un support
     et une avance, une épargne est toujours à quelqu'un. Un compte inconnu, lui,
     se **coupe** : l'objectif reste, il vise toujours la même somme, et sa
     lecture repart sur les comptes qui restent. C'est le geste le plus doux qui
     règle le cas, et c'est la règle de tout lien facultatif — le taire ferait
     chuter un avancement sans cause visible. */
  const keptGoals: SavingGoal[] = []
  goals.forEach((goal, index) => {
    if (!memberIds.has(goal.memberId)) {
      notices.push({
        kind: 'discarded',
        collection: 'savingGoals',
        index,
        reason: 'unknownMember',
        label: goal.label,
      })
      return
    }
    const linked = goal.supportIds.filter((id) => supportIds.has(id))
    if (linked.length !== goal.supportIds.length) {
      note('savingGoals', index, 'unknownSupport', goal.label)
    }
    keptGoals.push({ ...goal, supportIds: linked })
  })

  /** Un lien de support mort se coupe, comme celui d'un membre ou d'une règle. */
  const unlinkSupport = <T extends { savingSupportId?: string }>(
    item: T,
    collection: ImportCollection,
    index: number,
    label: string,
  ): T => {
    if (item.savingSupportId === undefined || supportIds.has(item.savingSupportId)) return item
    note(collection, index, 'unknownSupport', label)
    const { savingSupportId: _dropped, ...rest } = item
    return rest as T
  }

  /** Les trois liens que portent une entrée comme une récurrence. */
  const relink = <
    T extends {
      categoryId: string
      memberId?: string
      savingSupportId?: string
      direction: Direction
    },
  >(
    item: T,
    collection: ImportCollection,
    index: number,
    label: string,
  ): T => {
    let next = item
    if (!categoryIds.has(next.categoryId)) {
      note(collection, index, 'unknownCategory', label)
      next = { ...next, categoryId: rerouted(next.direction) }
    }
    if (next.memberId !== undefined && !memberIds.has(next.memberId)) {
      note(collection, index, 'unknownMember', label)
      const { memberId: _dropped, ...rest } = next
      next = rest as T
    }
    return unlinkSupport(next, collection, index, label)
  }

  const repairedRecurrences = recurrences.map((item, index) =>
    relink(item, 'recurrences', index, item.label),
  )

  const repairedEntries = entries.map((item, index) => {
    let next = relink(item, 'entries', index, item.label)
    if (next.recurrenceId !== undefined && !recurrenceIds.has(next.recurrenceId)) {
      note('entries', index, 'unknownRecurrence', next.label)
      const { recurrenceId: _dropped, ...rest } = next
      next = rest
    }
    return next
  })

  const repairedDebts = debts.map((item, index) => {
    let next = item
    if (!categoryIds.has(next.categoryId)) {
      note('debts', index, 'unknownCategory', next.label)
      // Un crédit sort toujours du compte : il n'a pas de sens à porter.
      next = { ...next, categoryId: rerouted('out') }
    }
    if (next.recurrenceId !== undefined && !recurrenceIds.has(next.recurrenceId)) {
      note('debts', index, 'unknownRecurrence', next.label)
      const { recurrenceId: _dropped, ...rest } = next
      next = rest
    }
    return next
  })

  const repairedAdvances: Advance[] = []
  advances.forEach((item, index) => {
    /* Une avance dont le porteur n'existe pas ne se répare pas : `memberId`
       n'est pas facultatif, et lui en inventer un attribuerait à quelqu'un une
       épargne qu'il n'a pas reprise. */
    if (!memberIds.has(item.memberId)) {
      notices.push({
        kind: 'discarded',
        collection: 'advances',
        index,
        reason: 'unknownMember',
        label: item.label,
      })
      return
    }
    let next = item
    if (!categoryIds.has(next.categoryId)) {
      note('advances', index, 'unknownCategory', next.label)
      next = { ...next, categoryId: rerouted('out') }
    }
    if (next.recurrenceId !== undefined && !recurrenceIds.has(next.recurrenceId)) {
      note('advances', index, 'unknownRecurrence', next.label)
      const { recurrenceId: _dropped, ...rest } = next
      next = rest
    }
    repairedAdvances.push(unlinkSupport(next, 'advances', index, next.label))
  })

  /* Un mois ouvert deux fois est une redite, pas une donnée : personne ne l'a
     saisi, et le second n'apporte rien que le premier n'ait déjà. */
  const seenMonths = new Set<string>()
  const months: MonthState[] = []
  data.months.forEach((state, index) => {
    if (seenMonths.has(state.ym)) {
      notices.push({ kind: 'discarded', collection: 'months', index, reason: 'duplicateId' })
      return
    }
    seenMonths.add(state.ym)
    months.push(state)
  })

  return {
    ...data,
    household: { ...data.household, members },
    families,
    categories: [...repairedFamilies, ...repairs.values()],
    recurrences: repairedRecurrences,
    entries: repairedEntries,
    debts: repairedDebts,
    advances: repairedAdvances,
    savingSupports: keptSupports,
    savingValuations: keptValuations,
    savingRates: keptRates,
    savingGoals: keptGoals,
    months,
  }
}
