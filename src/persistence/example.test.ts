import { describe, expect, it } from 'vitest'
import { advanceStatus } from '@/domain/advance'
import { type ISODate, diffMonths, endOfMonth, ymOf } from '@/domain/date'
import { debtStatus } from '@/domain/debt'
import { hasDataInYear, trailingMonths } from '@/domain/history'
import { detectPriceChange, amountOn, isCostly, priceHistory } from '@/domain/priceHistory'
import {
  savingTotal,
  latestValuation,
  savingsBySupport,
  supportMonthFlows,
  supportsDue,
  valuationAge,
} from '@/domain/saving'
import {
  advancedByMember,
  memberIncomes,
  memberShares,
  sharedEntries,
  totalDue,
  totalToPay,
} from '@/domain/split'
import {
  OTHER_CATEGORY,
  breakdownByFamily,
  recurrenceTotals,
  savingCapacity,
  totalsByKind,
} from '@/domain/stats'
import {
  type CategoryKind,
  type Recurrence,
  findCategory,
  isRunningIn,
  isSpending,
  kindOfCategory,
} from '@/domain/types'
import { EXAMPLE_YEARS, exampleBounds, exampleData } from './example'
import { CURRENT_SCHEMA_VERSION } from './schema'
import { parseImport, serializeData } from './transfer'

/* Une date fixe : le jeu est ancré sur elle, et un test qui bougerait avec le
   calendrier ne dirait plus rien le mois suivant. Le 15 place le mois courant à
   mi-parcours — la moitié confirmée, la moitié encore prévue. */
const ON: ISODate = '2027-03-15'

const data = exampleData(ON)
const anchor = ymOf(ON)

const kindOf = (id: string): CategoryKind => kindOfCategory(data.families, data.categories, id)
const amountOf = (recurrence: Recurrence) =>
  amountOn(recurrence, data.entries, endOfMonth(anchor))
const incomes = () => memberIncomes(data.household.members, data.recurrences, kindOf, amountOf, anchor)

describe('le jeu d’exemple', () => {
  it('s’importe tel quel, sans migration', () => {
    const result = parseImport(serializeData(data))
    expect(result.from).toBe(CURRENT_SCHEMA_VERSION)
    expect(result.migrated).toBe(false)
  })

  /* Critère de sortie du cahier §6 : un export réimporté restitue un état
     strictement identique. L'exemple passe par la même porte que l'export. */
  it('traverse l’aller-retour sans rien perdre ni rien inventer', () => {
    expect(parseImport(serializeData(data)).data).toEqual(data)
  })

  it('rend le même document à la même date', () => {
    expect(serializeData(exampleData(ON))).toBe(serializeData(data))
  })

  it('s’ancre sur la date qu’on lui donne, pas sur le calendrier', () => {
    const later = exampleData('2028-07-09')
    const bounds = exampleBounds('2028-07-09')
    const months = later.months.map((m) => m.ym).sort()
    expect(months.at(0)).toBe(bounds.first)
    expect(months.at(-1)).toBe(bounds.last)
  })

  /* Rien n'impose l'intégrité référentielle dans l'app : un lien mort y dégrade
     en silence — une catégorie inconnue retombe sur la nature « charge », un
     membre inconnu disparaît des deux côtés d'une régularisation. Un exemple
     qui en porterait un enseignerait un document faux. */
  it('ne cite que des familles, catégories, membres et récurrences qui existent', () => {
    const families = new Set(data.families.map((f) => f.id))
    const categories = new Set(data.categories.map((c) => c.id))
    const members = new Set(data.household.members.map((m) => m.id))
    const recurrences = new Set(data.recurrences.map((r) => r.id))

    for (const category of data.categories) expect(families).toContain(category.familyId)
    for (const recurrence of data.recurrences) {
      expect(categories).toContain(recurrence.categoryId)
      if (recurrence.memberId !== undefined) expect(members).toContain(recurrence.memberId)
    }
    for (const entry of data.entries) {
      expect(categories).toContain(entry.categoryId)
      if (entry.memberId !== undefined) expect(members).toContain(entry.memberId)
      if (entry.recurrenceId !== undefined) expect(recurrences).toContain(entry.recurrenceId)
    }
    for (const debt of data.debts) {
      expect(categories).toContain(debt.categoryId)
      if (debt.recurrenceId !== undefined) expect(recurrences).toContain(debt.recurrenceId)
    }
    for (const advance of data.advances) {
      expect(categories).toContain(advance.categoryId)
      expect(members).toContain(advance.memberId)
      if (advance.recurrenceId !== undefined) expect(recurrences).toContain(advance.recurrenceId)
    }
  })

  it('n’a pas deux fois le même identifiant', () => {
    const ids = [
      ...data.household.members.map((m) => m.id),
      ...data.families.map((f) => f.id),
      ...data.categories.map((c) => c.id),
      ...data.recurrences.map((r) => r.id),
      ...data.entries.map((e) => e.id),
      ...data.debts.map((d) => d.id),
      ...data.advances.map((a) => a.id),
    ]
    expect(new Set(ids).size).toBe(ids.length)
  })
})

/* Chaque cas ci-dessous est un seuil : en dessous, un écran s'efface ou affiche
   un état vide. C'est la liste de ce que l'exemple doit contenir pour que l'app
   se montre entière, et le seul endroit où elle est vérifiée. */
describe('ce que l’exemple doit contenir pour que rien ne reste vide', () => {
  /* Chacune avec un revenu, et ce n'est pas une coquetterie : `prorataWeights`
     rend `null` dès qu'**un seul** membre n'en a pas, et toute la répartition
     — parts, régularisation, tuile du commun — tombe alors en état vide. Un
     membre sans ressource ferait donc disparaître l'écran qu'il était censé
     enrichir, et c'est ce que cette boucle empêche d'ajouter par mégarde. */
  it('pose trois personnes, chacune avec un revenu lisible', () => {
    expect(data.household.members).toHaveLength(3)
    for (const income of incomes()) {
      expect(income.gap).toBeNull()
      expect(income.income).not.toBeNull()
    }
  })

  /* Le revenu d'une personne est la somme de ses récurrences de ressource, pas
     l'une d'elles : sans un membre qui en porte deux, le jeu ne distinguait pas
     les deux lectures. */
  it('donne à quelqu’un deux ressources, qui s’additionnent', () => {
    const perMember = new Map<string, number>()
    for (const recurrence of data.recurrences) {
      if (recurrence.memberId === undefined) continue
      if (kindOf(recurrence.categoryId) !== 'resource') continue
      perMember.set(recurrence.memberId, (perMember.get(recurrence.memberId) ?? 0) + 1)
    }
    expect([...perMember.values()].some((count) => count > 1)).toBe(true)
  })

  /* Les mois passés doivent être *ouverts*, pas seulement porter des entrées :
     l'app n'ouvre jamais un mois passé d'elle-même, et sans son `MonthState` un
     mois d'historique n'existe pas pour elle. Le mois à venir, lui, s'ouvre en y
     naviguant : le poser ici ne montrerait rien de plus. */
  it('ouvre cinq années de mois, jusqu’au mois courant compris', () => {
    const { first, last } = exampleBounds(ON)
    const months = data.months.map((m) => m.ym).sort()
    expect(months).toHaveLength(EXAMPLE_YEARS * 12)
    expect(months.at(0)).toBe(first)
    expect(months.at(-1)).toBe(last)
    expect(last).toBe(anchor)
    // Aucun mois vide au milieu : soixante mois ouverts, soixante mois portés.
    const covered = new Set(data.entries.map((e) => ymOf(e.date)))
    expect(covered.size).toBe(EXAMPLE_YEARS * 12)
  })

  /* Deux années suffisaient au comparatif ; cinq lui donnent une pente. C'est
     la seule chose qu'un historique long apporte et qu'aucun réglage ne
     remplace : « plus cher que l'an dernier » est une anecdote, « plus cher
     chaque année depuis quatre ans » est un constat. */
  it('couvre cinq années civiles, pour le comparatif d’années', () => {
    const year = Number(anchor.slice(0, 4))
    for (let back = 0; back < EXAMPLE_YEARS - 1; back++) {
      expect(hasDataInYear(data.entries, year - back)).toBe(true)
    }
  })

  it('remplit les douze points de la courbe, sans trou', () => {
    for (const point of trailingMonths(data.entries, anchor, 12)) {
      expect(point.hasData).toBe(true)
    }
  })

  it('laisse le mois courant à moitié fait — du confirmé, du prévu, un retard', () => {
    const month = data.entries.filter((e) => ymOf(e.date) === anchor)
    expect(month.some((e) => e.status === 'confirmed')).toBe(true)
    expect(month.some((e) => e.status === 'planned' && e.date > ON)).toBe(true)
    // Une échéance passée que personne n'a confirmée est la plus proche de
    // toutes : c'est le seul endroit de l'app où un retard se voit.
    expect(month.some((e) => e.status === 'planned' && e.date < ON)).toBe(true)
  })

  it('pose les cinq périodicités', () => {
    const periods = data.recurrences.map((r) => `${r.period.unit}-${String(r.period.every)}`)
    expect(periods).toContain('week-1')
    expect(periods).toContain('month-1')
    expect(periods).toContain('month-2')
    expect(periods).toContain('month-3')
    expect(periods).toContain('year-1')
  })

  it('pose une échéance au 31, qui se borne sans se reporter', () => {
    const monthly = data.recurrences.find((r) => r.period.anchorDay === 31)
    expect(monthly).toBeDefined()
    const days = data.entries
      .filter((e) => e.recurrenceId === monthly?.id)
      .map((e) => e.date.slice(5))
    expect(days).toContain('02-28')
    expect(days).toContain('03-31')
  })

  it('a une récurrence variable chiffrée, et une qui ne l’est pas encore', () => {
    const variables = data.recurrences.filter((r) => r.amount === null)
    expect(variables.some((r) => r.estimate !== undefined)).toBe(true)
    // Sans montant habituel ni échéance chiffrée : c'est ce qui fait dire
    // « montant variable » au total plutôt qu'un zéro.
    expect(recurrenceTotals(data.recurrences, amountOf, ON).unknownCount).toBeGreaterThan(0)
  })

  it('a une récurrence arrêtée, qui reste dans le document', () => {
    expect(data.recurrences.some((r) => r.endedOn !== undefined && r.endedOn < ON)).toBe(true)
  })

  /* L'autre moitié de `endedOn` : une règle résiliée dont l'engagement court
     encore. Elle est arrêtée et elle tombe quand même — deux choses que le jeu
     ne disait jamais ensemble, faute d'une seule ligne pour les porter. */
  it('a une récurrence qui s’arrêtera, et qui tombe encore', () => {
    const ending = data.recurrences.filter((r) => r.endedOn !== undefined && r.endedOn > ON)
    expect(ending.length).toBeGreaterThan(0)
    const stillFalling = ending.some((r) =>
      data.entries.some((e) => e.recurrenceId === r.id && ymOf(e.date) === anchor),
    )
    expect(stillFalling).toBe(true)
  })

  /* Et son miroir : déclarée, pas encore commencée. Elle ne pose aucune
     échéance et pèse pourtant dans le total des récurrences — c'est ce que dit
     `RUNNING_HORIZON_MONTHS`, et rien ne le montrait. */
  it('a une récurrence déclarée qui n’a pas encore commencé', () => {
    const ahead = data.recurrences.filter((r) => r.startedOn > ON)
    expect(ahead.length).toBeGreaterThan(0)
    for (const recurrence of ahead) {
      expect(data.entries.some((e) => e.recurrenceId === recurrence.id)).toBe(false)
      expect(isRunningIn(recurrence, anchor)).toBe(true)
    }
  })

  it('a des charges qu’une personne règle et que le foyer partage', () => {
    const shared = data.recurrences.filter((r) => r.shared === true && r.memberId !== undefined)
    expect(shared.length).toBeGreaterThanOrEqual(2)
  })

  it('signale une charge qui monte, et se tait sur un salaire qui monte', () => {
    const costly = data.recurrences.filter((recurrence) => {
      const change = detectPriceChange(data.entries, recurrence.id)
      return change !== null && isCostly(change, recurrence.direction, kindOf(recurrence.categoryId))
    })
    const raise = data.recurrences.find((r) => r.id === 'ex-r-salaire-alix')
    const change = detectPriceChange(data.entries, raise?.id ?? '')
    expect(costly.length).toBeGreaterThan(0)
    expect(change).not.toBeNull()
    expect(isCostly(change!, 'in', 'resource')).toBe(false)
  })

  /* Un prix qui a changé une fois est une anecdote ; cinq paliers font une
     trajectoire. C'est ce que cinq ans apportent à la fiche d'une récurrence et
     que quinze mois ne pouvaient pas porter — et c'est aussi ce qui distingue
     une charge qui dérive d'une charge qui suit l'inflation. */
  it('donne à une charge et à un salaire cinq paliers de prix', () => {
    for (const id of ['ex-r-mutuelle', 'ex-r-salaire-alix']) {
      const steps = new Set(priceHistory(data.entries, id).map((point) => point.amount))
      expect(steps.size).toBe(5)
    }
  })

  /* Une charge saisonnière doit l'être **selon le calendrier**, et non selon le
     rang du mois dans le document : sinon le comparatif d'années oppose un
     février à un août et n'apprend rien. Le chauffage se lit donc par mois
     calendaire, avec une dérive de tarif d'une année sur l'autre — ce qui
     produit la seule série où mars ressemble à mars sans jamais l'égaler. */
  it('fait varier une charge avec les saisons, et dériver son tarif d’année en année', () => {
    const byMonth = new Map<string, Set<number>>()
    for (const entry of data.entries) {
      if (entry.recurrenceId !== 'ex-r-electricite') continue
      const key = entry.date.slice(5, 7)
      byMonth.set(key, (byMonth.get(key) ?? new Set<number>()).add(entry.amount))
    }
    expect(byMonth.size).toBe(12)

    // Le même mois d'une année sur l'autre : proche, jamais identique.
    for (const amounts of byMonth.values()) {
      expect(amounts.size).toBeGreaterThan(1)
    }
    // Et l'hiver coûte plus cher que l'été, tous millésimes confondus.
    const peak = Math.max(...[...byMonth.values()].flatMap((s) => [...s]))
    const trough = Math.min(...[...byMonth.values()].flatMap((s) => [...s]))
    expect(peak).toBeGreaterThan(trough * 2)
  })

  it('suit six crédits, dont deux sans taux', () => {
    expect(data.debts).toHaveLength(6)
    expect(data.debts.filter((d) => d.rateBp !== undefined)).toHaveLength(4)
    expect(data.debts.filter((d) => d.rateBp === undefined)).toHaveLength(2)
    // Tous démarrent dans l'historique : le capital ne se dérive que des
    // mensualités confirmées, et un crédit ouvert avant le document
    // annoncerait un capital qu'aucune échéance n'a amorti.
    const { first } = exampleBounds(ON)
    for (const debt of data.debts) expect(ymOf(debt.startedOn) >= first).toBe(true)
  })

  /* Deux crédits d'affilée sur la même catégorie : le premier va à son terme,
     le second commence le mois d'après. C'est la forme que prend un poste de
     dépense qui dure plus longtemps qu'un crédit, et elle demande cinq ans pour
     tenir dans un document. */
  it('enchaîne deux crédits sur le même poste, sans les faire se chevaucher', () => {
    const cars = data.debts.filter((d) => d.categoryId === 'car-loan')
    expect(cars).toHaveLength(2)
    const [earlier, later] = [...cars].sort((a, b) => a.startedOn.localeCompare(b.startedOn))
    expect(earlier!.endsOn < later!.startedOn).toBe(true)
    // Et aucun mois ne porte les deux mensualités à la fois.
    const months = new Map<string, Set<string>>()
    for (const entry of data.entries) {
      const debt = cars.find((d) => d.recurrenceId === entry.recurrenceId)
      if (debt === undefined) continue
      const seen = months.get(ymOf(entry.date)) ?? new Set<string>()
      seen.add(debt.id)
      months.set(ymOf(entry.date), seen)
    }
    for (const seen of months.values()) expect(seen.size).toBe(1)
  })

  it('suit six avances, dont cinq qui entrent dans le pot commun', () => {
    expect(data.advances).toHaveLength(6)
    const linked = data.advances.map((a) =>
      data.recurrences.find((r) => r.id === a.recurrenceId),
    )
    expect(linked.filter((r) => r?.shared === true)).toHaveLength(5)
    // Chaque avance a posé sa reprise sur le livret, le jour du paiement.
    for (const advance of data.advances) {
      const drawdown = data.entries.find(
        (e) => e.date === advance.paidOn && e.direction === 'in' && e.amount === advance.amount,
      )
      expect(drawdown).toBeDefined()
    }
  })

  /* Et chaque avance porte aussi la **charge** qu'elle finance, que
     `createAdvance` ne pose pas — « l'app ne l'invente pas à la place de qui
     l'a faite ». Sans elle, le mois du paiement affiche une rentrée d'argent
     sans contrepartie : l'épargne reprise, et rien en face. Les deux doivent se
     compenser exactement, sans quoi l'avance ne montre pas ce qu'elle fait. */
  it('porte la charge que chaque avance a financée, à son montant exact', () => {
    for (const advance of data.advances) {
      const charge = data.entries.find(
        (e) =>
          e.date === advance.paidOn &&
          e.direction === 'out' &&
          e.categoryId === advance.categoryId &&
          e.amount === advance.amount,
      )
      expect(charge).toBeDefined()
      expect(charge?.memberId).toBe(advance.memberId)
      expect(charge?.savingSupportId).toBeUndefined()
    }
  })

  it('charge un jour assez pour que le calendrier déborde', () => {
    const perDay = new Map<string, number>()
    for (const entry of data.entries) {
      if (ymOf(entry.date) !== anchor) continue
      perDay.set(entry.date, (perDay.get(entry.date) ?? 0) + 1)
    }
    // Le calendrier ne pose que quatre pastilles, puis un « +N ».
    expect([...perDay.values()].some((count) => count > 4)).toBe(true)
  })

  it('déborde le camembert, qui ne garde que quatre familles', () => {
    const slices = breakdownByFamily(
      data.entries,
      anchor,
      (id) => findCategory(data.categories, id)?.familyId ?? '',
      (id) => isSpending(kindOf(id)),
      undefined,
      4,
    )
    expect(slices.map((s) => s.categoryId)).toContain(OTHER_CATEGORY)
  })

  /* Les deux gestes d'extension, et non un seul : une catégorie sous une
     famille du catalogue, et une famille entière. Un exemple qui n'aurait que
     le second laisserait croire qu'ajouter un poste veut dire ajouter un
     onglet. */
  it('étend le catalogue des deux façons, et en archive une part', () => {
    const custom = data.families.filter((f) => !f.id.startsWith('fam-'))
    expect(custom).toHaveLength(1)
    // Une catégorie maison rangée sous une famille du catalogue.
    const grafted = data.categories.filter(
      (c) => !c.id.startsWith('fam-') && c.familyId.startsWith('fam-') && c.id.startsWith('ex-'),
    )
    expect(grafted.length).toBeGreaterThan(0)
    // Et une autre sous la famille maison.
    expect(data.categories.some((c) => c.familyId === custom[0]!.id)).toBe(true)
    expect(data.categories.some((c) => c.archived)).toBe(true)
  })

  /* Cinq ans, c'est assez pour qu'une règle en remplace une autre. Chaque
     bascule est une paire : celle qui s'arrête, celle qui prend la suite, et
     aucun mois où les deux tombent ensemble. Sans elles, un historique n'est
     qu'une répétition — ce sont elles qui font un comparatif d'années autre
     chose qu'une vérification d'arrondi. */
  it.each([
    ['ex-r-loyer', 'ex-r-credit-immo'],
    ['ex-r-alternance-sacha', 'ex-r-salaire-sacha'],
    ['ex-r-creche', 'ex-r-cantine'],
    ['ex-r-eveil', 'ex-r-foot'],
    ['ex-r-credit-auto', 'ex-r-credit-break'],
    ['ex-r-pee', 'ex-r-pee-2'],
  ])('remplace %s par %s sans les faire se croiser', (before, after) => {
    const stopped = data.recurrences.find((r) => r.id === before)
    const started = data.recurrences.find((r) => r.id === after)
    expect(stopped?.endedOn).toBeDefined()
    expect(started).toBeDefined()
    expect(stopped!.endedOn! < started!.startedOn).toBe(true)

    // Les deux ont des échéances, et jamais dans le même mois.
    const monthsOf = (id: string) =>
      new Set(data.entries.filter((e) => e.recurrenceId === id).map((e) => ymOf(e.date)))
    const left = monthsOf(before)
    const right = monthsOf(after)
    expect(left.size).toBeGreaterThan(0)
    expect(right.size).toBeGreaterThan(0)
    for (const month of right) expect(left.has(month)).toBe(false)
  })

  it('place et reprend de l’épargne, pour qu’elle se compte en net', () => {
    const savings = data.entries.filter((e) => kindOf(e.categoryId) === 'saving')
    expect(savings.some((e) => e.direction === 'out')).toBe(true)
    expect(savings.some((e) => e.direction === 'in')).toBe(true)
  })

  it('saisit des ponctuels, que nulle règle ne pose', () => {
    const oneOffs = data.entries.filter((e) => e.recurrenceId === undefined)
    expect(oneOffs.length).toBeGreaterThan(20)
    // Une prime a lieu, mais elle ne dit rien de ce qu'on gagne : elle ne
    // déplace donc pas le prorata, et c'est ce qu'elle est là pour montrer.
    expect(oneOffs.some((e) => e.direction === 'in' && kindOf(e.categoryId) === 'resource')).toBe(
      true,
    )
  })

  it('porte une note sur chaque sorte d’objet qui en accepte une', () => {
    expect(data.recurrences.some((r) => r.note !== undefined)).toBe(true)
    expect(data.entries.some((e) => e.note !== undefined)).toBe(true)
    expect(data.debts.some((d) => d.note !== undefined)).toBe(true)
    expect(data.advances.some((a) => a.note !== undefined)).toBe(true)
    expect(data.savingSupports.some((s) => s.note !== undefined)).toBe(true)
  })

  /* Un seuil, pas une liste : la liste se périmerait au premier ajout au
     catalogue, alors que le seuil dit ce qu'on veut vraiment — un foyer qui
     emploie l'essentiel du jeu par défaut, et non six postes qui tournent. Ce
     qui reste dehors le reste pour une raison, et `example.ts` la donne. */
  it('emploie l’essentiel du catalogue par défaut', () => {
    const used = new Set([
      ...data.entries.map((e) => e.categoryId),
      ...data.recurrences.map((r) => r.categoryId),
      ...data.savingSupports.map((s) => s.categoryId),
    ])
    expect(used.size).toBeGreaterThanOrEqual(44)
  })
})

/* L'exemple s'ouvre le jour où on le charge, et ce jour peut être le 1er.
   Le mois courant n'a alors que deux ou trois échéances derrière lui : c'est
   précisément là que le jeu risque de se présenter vide, et donc là qu'il faut
   le vérifier. */
describe('quel que soit le jour où on le charge', () => {
  const days = ['01', '02', '03', '09', '15', '28']

  it.each(days)('a de quoi lire un solde le %s du mois', (day) => {
    const when = `2027-03-${day}`
    const document = exampleData(when)
    const month = document.entries.filter(
      (entry) => ymOf(entry.date) === ymOf(when) && entry.status === 'confirmed',
    )
    expect(month.length).toBeGreaterThan(0)
    // Une paie tombe en tête de mois : sans elle, le solde du mois — la tuile
    // la plus visible de l'app — annoncerait zéro les premiers jours.
    const received = month
      .filter((entry) => entry.direction === 'in')
      .reduce<number>((sum, entry) => sum + entry.amount, 0)
    expect(received).toBeGreaterThan(0)
  })

  it.each(days)('reste importable le %s du mois', (day) => {
    const when = `2027-03-${day}`
    const document = exampleData(when)
    expect(parseImport(serializeData(document)).data).toEqual(document)
  })
})

/* La vraie preuve que les écrans seront pleins : les calculs qu'ils appellent
   rendent des chiffres, et non des `null` ou des zéros. */
describe('ce que le domaine sait en tirer', () => {
  /* À trois parts toutes distinctes, la somme qui redonne le total au centime
     cesse d'être une évidence : `largestRemainder` a un reste à placer, et
     c'est lui que ce test surveille. */
  it('calcule la répartition, à trois parts inégales', () => {
    const amounts = sharedEntries(data.entries, anchor, kindOf).map((e) => e.amount)
    const shares = memberShares(incomes(), amounts)
    expect(shares).not.toBeNull()
    expect(shares).toHaveLength(3)
    expect(new Set(shares!.map((s) => s.shareBp)).size).toBe(3)
    // La somme des parts vaut exactement le total, au centime.
    const total = amounts.reduce<number>((sum, amount) => sum + amount, 0)
    expect(shares!.reduce<number>((sum, share) => sum + share.due, 0)).toBe(total)
  })

  it('déduit du versement de chacun ce qu’il a déjà avancé sur le mois', () => {
    const monthIncomes = incomes()
    const knownIds = new Set(monthIncomes.map((i) => i.memberId))
    const advanced = advancedByMember(data.entries, anchor, kindOf, knownIds)
    // Trois personnes avancent chacune une charge commune : la déduction
    // n'est plus un aller-retour entre deux comptes, et c'est là qu'elle cesse
    // de pouvoir se lire de travers sans qu'on s'en aperçoive.
    expect(advanced.size).toBe(3)

    const amounts = sharedEntries(data.entries, anchor, kindOf).map((e) => e.amount)
    const shares = memberShares(monthIncomes, amounts, advanced)
    expect(shares).not.toBeNull()
    expect(shares!.every((s) => s.advanced > 0)).toBe(true)
    // La somme des parts vaut le pot ; celle des versements, le pot moins ce
    // qui est déjà sorti de la poche de chacun.
    const fronted = [...advanced.values()].reduce<number>((sum, value) => sum + value, 0)
    expect(totalToPay(shares!)).toBe(totalDue(shares!) - fronted)
  })

  it('amortit les crédits en cours, sans les solder', () => {
    const running = data.debts.filter((d) => !debtStatus(d, data.entries, null, ON).settled)
    expect(running).toHaveLength(3)
    for (const debt of running) {
      const status = debtStatus(debt, data.entries, null, ON)
      expect(status.payments).toBeGreaterThan(0)
      expect(status.remaining).toBeLessThan(debt.principal)
      expect(status.remaining).toBeGreaterThan(0)
    }
  })

  /* Et ceux qui sont allés au bout. Sans eux, l'état « soldé » avait sa page et
     ses mots, mais jamais de ligne pour les occuper. Sans taux, le capital
     décroît exactement de ce qui a été versé : le reste dû tombe à zéro pile,
     et non à un arrondi qu'il faudrait excuser. */
  it('solde au centime les crédits sans intérêt arrivés à leur terme', () => {
    const settled = data.debts.filter((d) => debtStatus(d, data.entries, null, ON).settled)
    expect(settled).toHaveLength(3)

    const free = settled.filter((d) => d.rateBp === undefined)
    expect(free).toHaveLength(2)
    for (const debt of free) {
      const status = debtStatus(debt, data.entries, null, ON)
      expect(status.remaining).toBe(0)
      expect(status.paid).toBe(debt.principal)
    }
  })

  /* Le troisième soldé ne l'est pas pour la même raison, et c'est tout
     l'intérêt de l'avoir : un crédit à taux coûte plus que ce qu'il prête, si
     bien que la somme versée dépasse le capital sans qu'aucune soustraction ne
     puisse le dire. Deux manières d'arriver à zéro, une seule page pour les
     montrer. */
  it('fait payer au crédit à taux arrivé à terme plus que ce qu’il a prêté', () => {
    const car = data.debts.find((d) => d.id === 'ex-d-auto')
    const status = debtStatus(car!, data.entries, null, ON)
    expect(status.settled).toBe(true)
    expect(ON > car!.endsOn).toBe(true)
    expect(status.paid).toBeGreaterThan(car!.principal)
    expect(status.remaining).toBe(0)
  })

  /* Un crédit à taux ne s'amortit pas de ce qu'on a versé : sur l'immobilier de
     l'exemple, la première année rembourse une fraction de ce qu'elle coûte. Le
     raccourci « capital moins mensualités » annoncerait le prêt soldé des années
     trop tôt, et c'est tout l'intérêt de le montrer. */
  it('montre qu’un crédit à taux amortit moins que ce qu’il coûte', () => {
    const withRate = data.debts.find((d) => d.rateBp !== undefined && d.rateBp > 300)
    const status = debtStatus(withRate!, data.entries, null, ON)
    expect(withRate!.principal - status.remaining).toBeLessThan(status.paid)
  })

  it('rembourse en partie les avances en cours', () => {
    const running = data.advances.filter((a) => !advanceStatus(a, data.entries, ON).settled)
    expect(running).toHaveLength(2)
    for (const advance of running) {
      const status = advanceStatus(advance, data.entries, ON)
      expect(status.restored).toBeGreaterThan(0)
      expect(status.remaining).toBeGreaterThan(0)
    }
  })

  it('montre des avances entièrement reconstituées', () => {
    const settled = data.advances.filter((a) => advanceStatus(a, data.entries, ON).settled)
    expect(settled).toHaveLength(4)
    for (const advance of settled) {
      const status = advanceStatus(advance, data.entries, ON)
      expect(status.restored).toBe(advance.amount)
      expect(status.remaining).toBe(0)
    }
  })

  /* La même charge, avancée quatre années de suite : c'est le seul endroit du
     jeu où l'on voit qu'une avance n'est pas un accident mais une **façon de
     payer**. Trois soldées, une en cours — et la mensualité de chacune divise
     son montant exactement, pour que le reste dû tombe à zéro plutôt qu'à un
     centime qu'il faudrait excuser. */
  it('répète la même avance d’une année sur l’autre, à quatre montants', () => {
    const yearly = data.advances.filter((a) => a.categoryId === 'car-insurance')
    expect(yearly).toHaveLength(4)
    expect(new Set(yearly.map((a) => a.amount)).size).toBe(4)
    for (const advance of yearly) {
      expect(advance.amount % 12).toBe(0)
      expect(diffMonths(advance.from, advance.to)).toBe(11)
    }
    // Une par an, jamais deux la même année : elles ne se chevauchent pas.
    expect(new Set(yearly.map((a) => a.paidOn.slice(0, 4))).size).toBe(4)
  })

  it('laisse au foyer de quoi épargner, et de quoi le ventiler', () => {
    const totals = totalsByKind(data.entries, anchor, kindOf, undefined, true)
    expect(totals.resource).toBeGreaterThan(0)
    expect(totals.charge).toBeGreaterThan(0)
    expect(totals.debt).toBeGreaterThan(0)
    expect(savingCapacity(totals)).toBeGreaterThan(0)
    expect(savingsBySupport(data.entries, anchor, kindOf).length).toBeGreaterThan(1)
  })

  /* Ce que la v1 ne pouvait pas montrer : le stock, à côté du flux. Le jeu
     d'exemple doit le démontrer, pas seulement le rendre possible. */
  it('possède une épargne relevée, avec son historique', () => {
    expect(data.savingSupports).toHaveLength(8)
    const total = savingTotal(data.savingSupports, data.savingValuations, data.entries, ON)
    expect(total.known).toBeGreaterThan(0)
    expect(total.valued).toBeGreaterThan(0)
  })

  /* Une courbe d'épargne qui ne ferait que monter n'apprendrait rien. Celle du
     livret d'Alix plonge une fois — l'apport et les frais de l'achat — et c'est
     le seul décrochement de cinq ans de relevés. Il est vérifié ici parce que
     c'est exactement le genre de cohérence qu'une retouche de montant casse
     sans bruit : les relevés sont des observations écrites à la main, rien dans
     le code ne les tient d'accord avec les mouvements. */
  it('fait plonger une courbe d’épargne, une fois, là où l’argent est sorti', () => {
    const history = data.savingValuations
      .filter((v) => v.supportId === 'ex-s-livret-alix')
      .sort((a, b) => a.date.localeCompare(b.date))
    expect(history.length).toBeGreaterThanOrEqual(EXAMPLE_YEARS)

    const drops = history.filter((v, i) => i > 0 && v.amount < history[i - 1]!.amount)
    expect(drops).toHaveLength(1)

    // Et la plus grosse reprise de tout le document tombe entre les deux
    // relevés, pour un montant qui excède la chute — les versements de l'année
    // en ont déjà rattrapé une part.
    const before = history[history.indexOf(drops[0]!) - 1]!
    const biggest = data.entries
      .filter((e) => e.savingSupportId === 'ex-s-livret-alix' && e.direction === 'in')
      .sort((a, b) => b.amount - a.amount)[0]!
    expect(biggest.date > before.date).toBe(true)
    expect(biggest.date < drops[0]!.date).toBe(true)
    expect(biggest.amount).toBeGreaterThan(before.amount - drops[0]!.amount)
  })

  /* L'écran d'épargne doit pouvoir **se taire**, et donc aussi parler. Deux
     supports le réclament pour deux raisons différentes — l'un n'a jamais été
     relevé, l'autre l'a été il y a exactement une cadence — et les six autres
     se taisent. Un jeu où tout serait à jour ne montrerait jamais l'invitation ;
     un jeu où tout serait périmé ne montrerait jamais le silence. */
  it('réclame un relevé là où il en manque un, et se tait ailleurs', () => {
    const due = supportsDue(data.savingSupports, data.savingValuations, ON)
    expect(due).toHaveLength(2)
    const never = due.filter((s) => latestValuation(data.savingValuations, s.id, ON) === null)
    expect(never).toHaveLength(1)
    const aged = due.filter((s) => latestValuation(data.savingValuations, s.id, ON) !== null)
    expect(aged).toHaveLength(1)
    expect(valuationAge(latestValuation(data.savingValuations, aged[0]!.id, ON)!.date, 'yearly', ON))
      .toMatchObject({ level: 'stale' })
  })

  /* Deux supports, même personne, même catégorie, l'un fermé et l'autre ouvert.
     Sur un historique court, l'archivage se lit comme une fin ; ici il se lit
     comme un passage — et c'est la seule disposition qui le montre, puisqu'elle
     demande que les deux comptes existent en même temps dans le document. */
  it('fait se succéder deux supports de même catégorie chez la même personne', () => {
    const plans = data.savingSupports.filter((s) => s.categoryId === 'company-savings')
    expect(plans).toHaveLength(2)
    expect(new Set(plans.map((s) => s.memberId)).size).toBe(1)
    expect(plans.filter((s) => s.archived)).toHaveLength(1)
    for (const support of plans) {
      expect(latestValuation(data.savingValuations, support.id, ON)).not.toBeNull()
    }
  })

  /* Un support sans le moindre relevé, et un seul : « inconnu » n'est pas
     « zéro », et c'est la distinction que l'app compte à part plutôt que de
     l'additionner. Le support est **nommé** et non compté — un futur support
     laissé sans relevé par inadvertance passerait sinon inaperçu. */
  it('porte un support dont la valeur est inconnue, et le compte à part', () => {
    const unvalued = data.savingSupports.filter(
      (s) => latestValuation(data.savingValuations, s.id, ON) === null,
    )
    expect(unvalued.map((s) => s.categoryId)).toEqual(['retirement'])

    const total = savingTotal(data.savingSupports, data.savingValuations, data.entries, ON)
    expect(total.unvalued).toBe(1)
    expect(total.valued).toBe(data.savingSupports.length - 1)

    // Il a bien des mouvements : le flux est connu au centime, le stock pas du
    // tout. Sans versement, il ne dirait rien de cette dissociation.
    expect(supportMonthFlows(data.entries, unvalued[0]!.id, anchor).net).toBeGreaterThan(0)
  })

  /* Archivé : il sort des formulaires, jamais des lectures. Il reste visible
     tant qu'il porte une valeur ou un mouvement du mois — et rien ne l'alimente
     plus, sans quoi un compte devenu invisible grossirait tout seul. */
  it('archive un support sans l’effacer ni le rendre illisible', () => {
    const archived = data.savingSupports.filter((s) => s.archived)
    expect(archived).toHaveLength(1)
    expect(latestValuation(data.savingValuations, archived[0]!.id, ON)).not.toBeNull()

    const feeding = data.recurrences.filter((r) => r.savingSupportId === archived[0]!.id)
    expect(feeding.length).toBeGreaterThan(0)
    expect(feeding.every((r) => r.endedOn !== undefined && r.endedOn < ON)).toBe(true)
  })

  it('emploie les cinq catégories d’épargne du catalogue', () => {
    const used = new Set(data.savingSupports.map((s) => s.categoryId))
    for (const id of ['passbook', 'plans', 'life-insurance', 'retirement', 'company-savings']) {
      expect(used.has(id)).toBe(true)
    }
  })

  /* Trois personnes, chacune son livret : c'est exactement ce qu'une catégorie
     seule ne pouvait pas représenter. */
  it('donne à trois personnes trois supports de même catégorie', () => {
    const passbooks = data.savingSupports.filter((s) => s.categoryId === 'passbook')
    expect(passbooks).toHaveLength(3)
    expect(new Set(passbooks.map((s) => s.memberId)).size).toBe(3)
  })

  /* Les trois verdicts qu'un objectif peut rendre : à l'heure ou atteint, en
     retard, et sans échéance du tout. Un jeu où tout serait « à l'heure »
     laisserait croire à un écran qui approuve, et le cas qui fait exister la
     seule ligne actionnable de l'app — « +85 €/mois pour tenir la date » — ne
     s'y produirait jamais. */
  it('pose trois objectifs, dont un sans échéance', () => {
    expect(data.savingGoals).toHaveLength(3)
    expect(data.savingGoals.filter((goal) => goal.targetOn === undefined)).toHaveLength(1)
    /* Chaque objectif est rattaché à des comptes qui existent, et à ceux de son
       porteur : sans lien au réel, il n'a ni capital, ni versement, ni taux. */
    for (const goal of data.savingGoals) {
      expect(goal.supportIds.length).toBeGreaterThan(0)
      for (const supportId of goal.supportIds) {
        const support = data.savingSupports.find((one) => one.id === supportId)
        expect(support?.memberId).toBe(goal.memberId)
      }
    }
  })

  /* Un objectif est une intention, pas un passage obligé : une personne du jeu
     n'en porte aucun, et l'écran doit savoir le dire. */
  it('laisse une personne sans aucun objectif', () => {
    const owners = new Set(data.savingGoals.map((goal) => goal.memberId))
    expect(owners.size).toBeLessThan(data.household.members.length)
  })

  /* Les quatre états du rôle, dont l'absence — sans elle, l'écran d'autonomie
     n'aurait jamais à se taire, et le cas qu'il gère le plus mal passerait pour
     impossible. Deux livrets de même catégorie et de même cadence portent des
     rôles différents : c'est ce qu'aucun autre champ ne sait dire. */
  it('sert les trois rôles, et un compte qui n’en porte aucun', () => {
    const roles = data.savingSupports.map((support) => support.role)
    for (const role of ['buffer', 'project', 'growth']) {
      expect(roles).toContain(role)
    }
    expect(roles).toContain(undefined)

    const passbooks = data.savingSupports.filter((s) => s.categoryId === 'passbook')
    expect(new Set(passbooks.map((s) => s.role)).size).toBeGreaterThan(1)
  })

  it('relie chaque mouvement d’épargne à un support existant', () => {
    const ids = new Set(data.savingSupports.map((support) => support.id))
    const savings = data.entries.filter((entry) => kindOf(entry.categoryId) === 'saving')
    expect(savings.length).toBeGreaterThan(0)
    for (const entry of savings) {
      expect(entry.savingSupportId).toBeDefined()
      expect(ids.has(entry.savingSupportId ?? '')).toBe(true)
    }
  })

  it('fait passer chaque avance par le support qu’elle reprend', () => {
    for (const advance of data.advances) {
      expect(advance.savingSupportId).toBeDefined()
      const recurrence = data.recurrences.find((r) => r.id === advance.recurrenceId)
      expect(recurrence?.savingSupportId).toBe(advance.savingSupportId)
    }
  })

  /* Un support qui bouge sans qu'on y verse rien : le seul dont la valeur ne
     s'explique que par le marché. C'est ce qui interdit de dériver le capital
     des versements. */
  it('porte un support qui vaut quelque chose sans recevoir de versement', () => {
    /* Nommé, et non pris au premier rang : le PEE archivé ne reçoit plus rien
       lui non plus, et l'ordre des supports déciderait alors de ce que ce test
       vérifie. */
    const untouched = data.savingSupports.find((s) => s.categoryId === 'life-insurance')
    expect(untouched).toBeDefined()
    expect(supportMonthFlows(data.entries, untouched!.id, anchor).net).toBe(0)
    const history = data.savingValuations.filter((v) => v.supportId === untouched!.id)
    expect(history.length).toBeGreaterThan(1)
    expect(new Set(history.map((v) => v.amount)).size).toBeGreaterThan(1)
  })
})
