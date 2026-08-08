import { describe, expect, it } from 'vitest'
import { advanceStatus, monthlyInstalment } from '@/domain/advance'
import { endOfMonth, ymOf } from '@/domain/date'
import { debtStatus } from '@/domain/debt'
import { savingTotal } from '@/domain/saving'
import { defaultCategories, defaultFamilies, emptyData } from './defaults'
import { CURRENT_SCHEMA_VERSION } from './schema'
import { SCHEMA_FILENAME, schemaDocument } from './schemaDoc'
import { parseImport, serializeData } from './transfer'

const doc = schemaDocument()

/* Le document est arrêté au 20 janvier : c'est de ce jour-là qu'il faut le lire,
   sans quoi ses échéances encore prévues seraient déjà du passé. */
const ON = '2026-01-20'

/**
 * Le bloc ```json du document — celui qu'un lecteur copiera en premier.
 *
 * Le premier, et il n'y en a qu'un : si une autre section venait à en poser un
 * second, il faudrait le désigner autrement que par « le bloc json ».
 */
function exampleDocument(): string {
  const match = /```json\n([\s\S]*?)\n```/.exec(doc)
  expect(match).not.toBeNull()
  return match![1]!
}

describe('schemaDocument', () => {
  it('annonce la version de schéma courante', () => {
    expect(doc).toContain(`Version de schéma : **${String(CURRENT_SCHEMA_VERSION)}**`)
  })

  it('porte le nom de fichier sous lequel il se télécharge', () => {
    expect(SCHEMA_FILENAME).toBe('tout-compte-fait-schema.md')
  })

  /* Le bloc de types est le source de `domain/types.ts`, embarqué par `?raw` :
     il ne peut pas dériver du modèle. Le test vérifie qu'il est bien arrivé, et
     que chaque clé du document y figure — un champ ajouté au modèle sans être
     décrit ici ne passerait pas. */
  it('embarque le source des types, sans ses imports', () => {
    expect(doc).toContain('export type Data = {')
    expect(doc).not.toContain("from './money'")
    expect(doc).not.toContain("from './date'")
  })

  /* La liste des clés se lit sur `emptyData()`, elle ne se recopie pas : elle a
     été recopiée, et elle s'est périmée en silence — `savingSupports` et
     `savingValuations` sont entrées au modèle sans que les dix noms écrits ici
     en sachent rien. Dérivée, elle ne peut plus mentir. */
  it('décrit chaque clé du document, sans qu’on ait à les recopier', () => {
    const keys = Object.keys(emptyData())
    expect(keys.length).toBeGreaterThan(10)
    for (const key of keys) expect(doc).toContain(key)
  })

  it('redonne les trois primitives que les types empruntent ailleurs', () => {
    expect(doc).toContain('type Money = number')
    expect(doc).toContain('type ISODate = string')
    expect(doc).toContain('type YearMonth = string')
  })

  /* Le catalogue est lu sur `defaults.ts` : une catégorie ajoutée au jeu par
     défaut apparaît ici sans qu'on y touche, et son identifiant est ce qu'un
     assistant doit réutiliser plutôt que d'en inventer un. */
  it('liste chaque famille du catalogue par défaut, avec sa nature', () => {
    for (const family of defaultFamilies()) {
      expect(doc).toContain(`### ${family.label} — \`${family.id}\``)
      expect(doc).toContain(`Nature \`${family.kind}\``)
    }
  })

  it('liste chaque catégorie du catalogue par défaut, avec son identifiant', () => {
    for (const category of defaultCategories()) {
      expect(doc).toContain(`| \`${category.id}\` | ${category.label} |`)
    }
  })

  it('dit les règles qu’aucun type n’exprime', () => {
    expect(doc).toContain('centimes')
    expect(doc).toContain('points de base')
    expect(doc).toContain('`months[]`')
    expect(doc).toContain('`Advance.memberId` est obligatoire')
    expect(doc).toContain('sans jamais le recalculer sur la famille')
  })

  /* Le lecteur apprenait « doit désigner quelque chose qui existe » sans savoir
     que la violation produit un document muté et non un refus. La liste dérive
     de `ImportReason` — le compilateur, et non ce test, garantit qu'elle reste
     complète ; le test vérifie seulement qu'elle est bien rendue. */
  it('dit ce que l’import répare, et ce qu’il change sans le dire', () => {
    expect(doc).toContain("## Ce que l'import répare, et ce qu'il écarte")
    expect(doc).toContain('mon-id~2')
    expect(doc).toContain('« À ranger »')
    expect(doc).toContain("### Et ce qu'elle change sans le dire")
    expect(doc).toContain('le jour de l’import')
  })

  /* Le document embarque le source des types, réservés compris : sans cette
     règle, il enseignait trois champs sans effet comme s'ils réglaient quelque
     chose — exactement l'erreur qu'il existe pour éviter chez son lecteur. */
  it('annonce les champs réservés plutôt que de les laisser passer pour des réglages', () => {
    for (const field of ['`Category.icon`', '`MonthState.closed`', '`settings.monthStartsOn`']) {
      expect(doc).toContain(field)
    }
    expect(doc).toContain('réservés et sans effet')
  })
})

describe('le document d’exemple', () => {
  /* C'est le seul garde-fou possible sur un littéral, et il attrape la faute qui
     compte : un exemple que l'app refuserait. Quelqu'un le copiera tel quel. */
  it('s’importe sans migration', () => {
    const result = parseImport(exampleDocument())
    expect(result.from).toBe(CURRENT_SCHEMA_VERSION)
    expect(result.migrated).toBe(false)
  })

  /* Plus exigeant que « il s'importe » : il s'importe **intact**. Un exemple que
     l'app réparerait en silence enseignerait la réparation au lieu du format —
     et le lecteur croirait avoir écrit ce qu'il n'a pas écrit. */
  it('ne donne à l’import rien à réparer ni à écarter', () => {
    expect(parseImport(exampleDocument()).notices).toEqual([])
  })

  it('traverse l’import sans rien perdre', () => {
    const once = parseImport(exampleDocument()).data
    const twice = parseImport(serializeData(once)).data
    expect(twice).toEqual(once)
  })

  it('ne cite que des catégories et des membres qui existent', () => {
    const { data } = parseImport(exampleDocument())
    const families = new Set(data.families.map((f) => f.id))
    const categories = new Set(data.categories.map((c) => c.id))
    const members = new Set(data.household.members.map((m) => m.id))
    const recurrences = new Set(data.recurrences.map((r) => r.id))
    const supports = new Set(data.savingSupports.map((s) => s.id))

    for (const category of data.categories) expect(families).toContain(category.familyId)
    for (const recurrence of data.recurrences) {
      expect(categories).toContain(recurrence.categoryId)
      if (recurrence.memberId !== undefined) expect(members).toContain(recurrence.memberId)
      if (recurrence.savingSupportId !== undefined)
        expect(supports).toContain(recurrence.savingSupportId)
    }
    for (const entry of data.entries) {
      expect(categories).toContain(entry.categoryId)
      if (entry.memberId !== undefined) expect(members).toContain(entry.memberId)
      if (entry.recurrenceId !== undefined) expect(recurrences).toContain(entry.recurrenceId)
      if (entry.savingSupportId !== undefined) expect(supports).toContain(entry.savingSupportId)
    }
    for (const advance of data.advances) {
      expect(members).toContain(advance.memberId)
      expect(supports).toContain(advance.savingSupportId ?? '')
    }
  })

  /* Le prorata est ce que le foyer vient chercher en premier, et il ne se
     calcule qu'à deux revenus lisibles : l'exemple doit donc en poser deux, sans
     quoi il enseigne un document que l'app affiche à moitié. */
  it('pose un revenu par personne, pour que la répartition existe', () => {
    const { data } = parseImport(exampleDocument())
    for (const member of data.household.members) {
      const income = data.recurrences.filter(
        (r) => r.memberId === member.id && r.direction === 'in',
      )
      expect(income.length).toBeGreaterThan(0)
    }
  })

  /* Une récurrence produit des échéances, jamais un chiffre : un mois couvert
     par des entrées sans son `MonthState` n'existe pas pour l'app, et l'exemple
     qui porte cette règle ne peut pas être celui qui l'enfreint. */
  it('ouvre chaque mois que ses entrées couvrent', () => {
    const { data } = parseImport(exampleDocument())
    const opened = new Set(data.months.map((m) => m.ym))
    for (const entry of data.entries) expect(opened.has(ymOf(entry.date))).toBe(true)
  })

  it('montre du confirmé et du prévu, pas seulement l’un des deux', () => {
    const { data } = parseImport(exampleDocument())
    expect(data.entries.some((e) => e.status === 'confirmed')).toBe(true)
    expect(data.entries.some((e) => e.status === 'planned')).toBe(true)
  })

  /* `estimate` est retiré en silence sur un montant fixe : un exemple qui en
     porterait un enseignerait un champ que l'import supprime. */
  it('n’attache un montant habituel qu’à un montant variable', () => {
    const { data } = parseImport(exampleDocument())
    expect(data.recurrences.some((r) => r.amount === null && r.estimate !== undefined)).toBe(true)
    for (const r of data.recurrences) if (r.amount !== null) expect(r.estimate).toBeUndefined()
  })

  /* Le crédit et l'avance sont les deux objets qu'on écrit le plus mal, et ils
     ont longtemps été livrés vides. Les tests ci-dessous disent ce que « livré
     complet » veut dire : pas la ligne seule, mais tout ce qui la fait vivre. */
  it('porte un crédit que l’app sait amortir', () => {
    const { data } = parseImport(exampleDocument())
    const debt = data.debts[0]
    expect(debt).toBeDefined()
    expect(data.recurrences.some((r) => r.id === debt?.recurrenceId)).toBe(true)
    const status = debtStatus(debt!, data.entries, null, ON)
    expect(status.payments).toBeGreaterThan(0)
    expect(status.remaining).toBeLessThan(debt!.principal)
  })

  it('porte une avance avec sa reprise et sa mensualité', () => {
    const { data } = parseImport(exampleDocument())
    const advance = data.advances[0]
    expect(advance).toBeDefined()

    // La reprise du jour du paiement : aucun type ne l'impose, et sans elle
    // l'argent a quitté le livret sans que rien ne le dise.
    expect(
      data.entries.some(
        (e) =>
          e.date === advance?.paidOn &&
          e.direction === 'in' &&
          e.amount === advance.amount &&
          e.savingSupportId === advance.savingSupportId,
      ),
    ).toBe(true)

    const rule = data.recurrences.find((r) => r.id === advance?.recurrenceId)
    expect(rule).toBeDefined()
    expect(rule?.savingSupportId).toBe(advance?.savingSupportId)
    expect(rule?.amount).toBe(monthlyInstalment(advance!))
    expect(rule?.endedOn).toBe(endOfMonth(advance!.to))
    expect(advanceStatus(advance!, data.entries, ON).restored).toBeGreaterThan(0)
  })

  it('relève la valeur d’un support, et l’écart tient dans ses mouvements', () => {
    const { data } = parseImport(exampleDocument())
    const total = savingTotal(data.savingSupports, data.savingValuations, data.entries, ON)
    expect(total.valued).toBeGreaterThan(0)
    // Deux relevés au moins : un seul n'aurait pas d'historique à montrer.
    expect(data.savingValuations.length).toBeGreaterThan(1)
  })
})
