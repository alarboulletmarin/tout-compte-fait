/* ============================================================================
 * Version du document et pipeline de migrations.
 *
 * Chaque changement de forme incrémente CURRENT_SCHEMA_VERSION et ajoute une
 * entrée dans MIGRATIONS. Le pipeline existe dès la v1, y compris pour la
 * version 1 → 1 : un document déjà à jour traverse quand même l'étape de
 * normalisation, ce qui garantit qu'un fichier tronqué ou bricolé à la main
 * ressort exploitable plutôt qu'à moitié valide.
 * ==========================================================================*/

import type { Data } from '@/domain/types'
import { defaultCategories, defaultFamilies, fallbackFamilyId, memberColorAt } from './defaults'
import { type ImportNotice, normalizeDocument } from './validate'

export const CURRENT_SCHEMA_VERSION = 9

/** Un document venu du disque, avant toute validation. */
export type RawDocument = Record<string, unknown>

const isRecord = (v: unknown): v is RawDocument =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

export type Migration = {
  /** Version atteinte une fois la migration appliquée. */
  to: number
  migrate: (doc: RawDocument) => RawDocument
}

/**
 * Migration d'un document antérieur au versionnement — ou sans `schemaVersion`.
 * Elle ne fait qu'inscrire la version : la mise en forme est le travail de
 * `normalizeData`, appliqué ensuite dans tous les cas.
 */
function toVersion1(doc: RawDocument): RawDocument {
  return { ...doc, schemaVersion: 1 }
}

/**
 * Où atterrit chacune des neuf catégories du jeu d'origine, quand le document
 * est antérieur aux familles. Ce qui n'y figure pas — une catégorie créée par
 * l'utilisateur — tombe dans la famille d'accueil de son sens.
 */
const LEGACY_FAMILY: Record<string, string> = {
  housing: 'fam-housing',
  groceries: 'fam-daily',
  transport: 'fam-transport',
  health: 'fam-health',
  leisure: 'fam-leisure',
  subscriptions: 'fam-communication',
  misc: 'fam-leisure',
  salary: 'fam-resources',
  otherIncome: 'fam-resources',
}

/**
 * Introduction des familles, des natures et des crédits.
 *
 * Rien n'est effacé : chaque catégorie déjà présente est rangée sous une
 * famille et garde son identifiant, donc les entrées déjà saisies continuent
 * de la désigner. Le catalogue par défaut est ajouté à côté, pour que la
 * nouvelle arborescence soit utilisable sans avoir à la ressaisir — une
 * catégorie du catalogue dont l'identifiant existe déjà n'est pas dupliquée.
 */
function toVersion2(doc: RawDocument): RawDocument {
  const existing: unknown[] = Array.isArray(doc['categories']) ? doc['categories'] : []

  const adopted: RawDocument[] = []
  const known = new Set<string>()
  for (const raw of existing) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) continue
    const category = raw as RawDocument
    const id = typeof category['id'] === 'string' ? category['id'] : ''
    if (id !== '') known.add(id)
    const alreadyPlaced =
      typeof category['familyId'] === 'string' && category['familyId'].length > 0
    if (alreadyPlaced) {
      adopted.push(category)
      continue
    }
    const direction = category['direction'] === 'in' ? 'in' : 'out'
    adopted.push({ ...category, familyId: LEGACY_FAMILY[id] ?? fallbackFamilyId(direction) })
  }

  const families: unknown[] =
    Array.isArray(doc['families']) && doc['families'].length > 0 ? doc['families'] : defaultFamilies()

  return {
    ...doc,
    schemaVersion: 2,
    families,
    categories: [...adopted, ...defaultCategories().filter((c) => !known.has(c.id))],
    debts: Array.isArray(doc['debts']) ? (doc['debts'] as unknown[]) : [],
  }
}

/**
 * Répartition des charges entre membres : `shared` sur les entrées comme sur
 * les récurrences.
 *
 * Les deux champs sont facultatifs, et leur absence a un sens défini — une
 * entrée sans `shared` s'en remet à la règle, qui sait déjà la ranger. Un
 * document v2 est donc déjà un document v3
 * valide : la migration n'a que la version à inscrire. Elle existe quand même,
 * parce que le pipeline veut une étape par incrément et qu'une marche
 * manquante se paie la fois d'après.
 */
function toVersion3(doc: RawDocument): RawDocument {
  return { ...doc, schemaVersion: 3 }
}

/**
 * Le montant habituel d’une récurrence à montant variable — `Recurrence.estimate`.
 *
 * Facultatif, et son absence a le sens qu'elle avait déjà : la récurrence vaut
 * ce que disent ses échéances, et rien tant qu'aucune n'est chiffrée. Un
 * document v3 est donc déjà un document v4 valide, et la migration n'a que la
 * version à inscrire — elle existe quand même, parce que le pipeline veut une
 * étape par incrément et qu'une marche manquante se paie la fois d'après.
 */
function toVersion4(doc: RawDocument): RawDocument {
  return { ...doc, schemaVersion: 4 }
}

/**
 * Les avances — une charge payée en une fois, remboursée à soi-même mois par
 * mois sur le livret qui l'a financée.
 *
 * Le tableau est ajouté vide, comme `debts` l'avait été : un foyer qui n'en
 * déclare aucune n'en a aucune, et rien dans un document v4 ne permettrait d'en
 * deviner une. Le reste du document ne bouge pas — une avance ne se déduit pas
 * des récurrences existantes, elle se déclare.
 */
function toVersion5(doc: RawDocument): RawDocument {
  return { ...doc, advances: [], schemaVersion: 5 }
}

/**
 * Une palette propre aux membres, distincte de celle des catégories.
 *
 * Le premier membre recevait `var(--cat-1)`, qui vaut `--accent` au hexadécimal
 * près : sa pastille se lisait comme une sélection, et disparaissait tout à
 * fait dans une pilule de filtre active, qui passe elle-même en `--accent`.
 *
 * La réaffectation se fait au rang, sans condition. L'app n'a jamais offert de
 * sélecteur de couleur : toute couleur enregistrée sort de `nextMemberColor`,
 * donc aucune n'a été choisie et il n'y a rien à préserver. Ne recolorer que
 * les `var(--cat-N)` reconnues laisserait en plus un document bricolé à la main
 * dans un état que la palette ne décrit plus.
 */
function toVersion6(doc: RawDocument): RawDocument {
  const household = doc['household']
  if (!isRecord(household) || !Array.isArray(household['members'])) {
    return { ...doc, schemaVersion: 6 }
  }
  const members = (household['members'] as unknown[]).map((member, index) =>
    isRecord(member) ? { ...member, color: memberColorAt(index) } : member,
  )
  return { ...doc, household: { ...household, members }, schemaVersion: 6 }
}

/**
 * La palette — l'identité colorimétrique, à côté du thème.
 *
 * Le champ est ajouté par la normalisation, qui pose « classique » à toute
 * valeur absente ou inconnue : un document v6 est donc déjà un document v7
 * valide, et la migration n'a que la version à inscrire. Elle existe quand même,
 * parce que le pipeline veut une étape par incrément et qu'une marche manquante
 * se paie la fois d'après.
 *
 * Rien à convertir, contrairement à la v6 : la palette ne redéfinit que des
 * tokens, et ce qui est stocké sur une catégorie ou un membre est déjà un nom de
 * token. Changer de palette recolore ce qui existe sans réécrire une ligne.
 */
function toVersion7(doc: RawDocument): RawDocument {
  return { ...doc, schemaVersion: 7 }
}

const asRecords = (value: unknown): RawDocument[] =>
  Array.isArray(value) ? value.filter(isRecord) : []

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

/**
 * Les supports d'épargne, et la fin d'une confusion : jusqu'ici la **catégorie**
 * tenait lieu de support.
 *
 * « Livrets » disait à la fois la nature du mouvement et l'endroit où l'argent
 * allait, si bien que le livret d'Andrea et celui de Marie étaient le même
 * objet — deux personnes ne pouvaient pas avoir chacune le sien, et aucun
 * capital ne pouvait s'y attacher. La v8 sépare les deux : la catégorie garde la
 * nature, le support porte le compte et son propriétaire.
 *
 * **Un support par paire (catégorie d'épargne, personne) réellement employée**,
 * et pas un de plus : c'est la seule lecture qui ne duplique rien et n'invente
 * rien. Chaque `Entry`, chaque `Recurrence` et chaque `Advance` d'épargne reçoit
 * ensuite l'identifiant du sien — par référence, jamais par libellé.
 *
 * Ce qui n'est **à personne reste sans support** : un versement laissé « en
 * commun » n'appartient à aucun membre, et un support est toujours à quelqu'un.
 * Lui inventer un porteur attribuerait à quelqu'un une épargne qu'il n'a pas
 * faite ; l'écran d'épargne les montre à part, et un geste les rattache.
 *
 * **Aucun capital n'est inventé** : les supports naissent sans valorisation.
 * Zéro serait une information financière — un livret vide —, et rien dans un
 * document v7 ne dit ce que le livret valait.
 *
 * Les identifiants sont dérivés de la paire, donc **déterministes** : deux
 * lectures du même fichier donnent le même document, ce que le test compare.
 */
function toVersion8(doc: RawDocument): RawDocument {
  const families = asRecords(doc['families'])
  const categories = asRecords(doc['categories'])
  const recurrences = asRecords(doc['recurrences'])
  const entries = asRecords(doc['entries'])
  const advances = asRecords(doc['advances'])

  const savingFamilies = new Set(
    families.flatMap((family) => (family['kind'] === 'saving' ? [text(family['id']) ?? ''] : [])),
  )
  const savingCategories = new Map(
    categories
      .filter((category) => savingFamilies.has(text(category['familyId']) ?? ''))
      .map((category) => [text(category['id']) ?? '', text(category['label']) ?? '—']),
  )
  if (savingCategories.size === 0) {
    return { ...doc, savingSupports: [], savingValuations: [], schemaVersion: 8 }
  }

  const supports: RawDocument[] = []
  const known = new Map<string, string>()

  /** L'identifiant du support d'une paire, créé à la première rencontre. */
  const supportFor = (categoryId: string | undefined, memberId: string | undefined): string | undefined => {
    if (categoryId === undefined || memberId === undefined) return undefined
    const label = savingCategories.get(categoryId)
    if (label === undefined) return undefined
    const key = `${categoryId} ${memberId}`
    const seen = known.get(key)
    if (seen !== undefined) return seen
    const id = `sav-${categoryId}-${memberId}`
    known.set(key, id)
    supports.push({ id, label, memberId, categoryId, archived: false })
    return id
  }

  const link = (item: RawDocument, categoryId: string | undefined, memberId: string | undefined): RawDocument => {
    const supportId = supportFor(categoryId, memberId)
    return supportId === undefined ? item : { ...item, savingSupportId: supportId }
  }

  /* Les règles d'abord : une avance désigne son support par la catégorie de la
     récurrence qui la reconstitue, et une échéance hérite du sien. Les parcourir
     dans cet ordre fait que la même paire retombe toujours sur le même support,
     quel que soit celui des trois qui la rencontre en premier. */
  const nextRecurrences = recurrences.map((recurrence) =>
    link(recurrence, text(recurrence['categoryId']), text(recurrence['memberId'])),
  )
  const categoryOfRecurrence = new Map(
    recurrences.map((recurrence) => [text(recurrence['id']) ?? '', text(recurrence['categoryId'])]),
  )

  const nextEntries = entries.map((entry) =>
    link(entry, text(entry['categoryId']), text(entry['memberId'])),
  )

  const nextAdvances = advances.map((advance) => {
    const recurrenceId = text(advance['recurrenceId'])
    const categoryId =
      recurrenceId === undefined ? undefined : categoryOfRecurrence.get(recurrenceId)
    return link(advance, categoryId, text(advance['memberId']))
  })

  return {
    ...doc,
    recurrences: nextRecurrences,
    entries: nextEntries,
    advances: nextAdvances,
    savingSupports: supports,
    savingValuations: [],
    schemaVersion: 8,
  }
}

/**
 * La cadence des relevés, portée par chaque support.
 *
 * Rien à convertir, et surtout **rien à poser** : contrairement à la palette de
 * la v7, l'absence de cadence n'est pas remplacée par sa valeur par défaut. Un
 * document d'avant le champ n'a jamais répondu à la question, et écrire
 * « annuel » sur sept supports ferait passer un silence pour sept choix — dont
 * l'écran de modification affirmerait ensuite qu'ils viennent de quelqu'un.
 * C'est le domaine qui retombe sur `DEFAULT_PACE` à la lecture, en un seul
 * endroit, et le formulaire qui recueille la vraie réponse quand on la lui
 * donne.
 *
 * La marche existe quand même, pour la raison qui a fait exister la v7 : le
 * pipeline veut une étape par incrément, et une version non incrémentée
 * laisserait une app plus ancienne ouvrir sans broncher un document dont elle
 * perdrait le champ à la réécriture.
 */
function toVersion9(doc: RawDocument): RawDocument {
  return { ...doc, schemaVersion: 9 }
}

export const MIGRATIONS: Migration[] = [
  { to: 1, migrate: toVersion1 },
  { to: 2, migrate: toVersion2 },
  { to: 3, migrate: toVersion3 },
  { to: 4, migrate: toVersion4 },
  { to: 5, migrate: toVersion5 },
  { to: 6, migrate: toVersion6 },
  { to: 7, migrate: toVersion7 },
  { to: 8, migrate: toVersion8 },
  { to: 9, migrate: toVersion9 },
]

export class ImportError extends Error {
  override name = 'ImportError'
}

function readVersion(doc: RawDocument): number {
  const raw = doc['schemaVersion']
  return typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 ? raw : 0
}

export type MigrationResult = {
  data: Data
  /** Version d'origine du document, avant migration. */
  from: number
  /** Vrai si au moins une migration a été appliquée. */
  migrated: boolean
  /**
   * Ce que la lecture a écarté et réparé, ligne par ligne.
   *
   * Un import remplace tout le document : jeter une dépense en silence dans un
   * geste pareil est la façon la plus sûre de ne jamais s'en apercevoir. Ce que
   * l'écran en fait le regarde — la lecture, elle, ne se tait plus.
   */
  notices: ImportNotice[]
}

/**
 * Amène un document quelconque à la version courante, puis le valide.
 * Lève une `ImportError` si le document est inexploitable.
 */
export function migrateDocument(raw: unknown): MigrationResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ImportError('Le fichier ne contient pas un document Tout compte fait.')
  }

  let doc = raw as RawDocument
  const from = readVersion(doc)

  if (from > CURRENT_SCHEMA_VERSION) {
    throw new ImportError(
      `Ce fichier vient d'une version plus récente de l'app (schéma ${String(from)}). Mets Tout compte fait à jour avant de l'importer.`,
    )
  }

  const applied = MIGRATIONS.filter((m) => m.to > from).sort((a, b) => a.to - b.to)
  for (const migration of applied) doc = migration.migrate(doc)

  const { data, notices } = normalizeDocument(doc)
  return { data, from, migrated: applied.length > 0, notices }
}
