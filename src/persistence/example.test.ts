import { describe, expect, it } from 'vitest'
import { advanceStatus } from '@/domain/advance'
import { type ISODate, addMonthsToYm, endOfMonth, ymOf } from '@/domain/date'
import { debtStatus } from '@/domain/debt'
import { hasDataInYear, trailingMonths } from '@/domain/history'
import { detectPriceChange, amountOn, isCostly } from '@/domain/priceHistory'
import {
  savingTotal,
  latestValuation,
  savingsBySupport,
  supportMonthFlows,
} from '@/domain/saving'
import { settleMonth, settlementBalance } from '@/domain/settle'
import { memberIncomes, memberShares, sharedEntries } from '@/domain/split'
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
import { exampleBounds, exampleData } from './example'
import { CURRENT_SCHEMA_VERSION } from './schema'
import { parseImport, serializeData } from './transfer'

/* Une date fixe : le jeu est ancré sur elle, et un test qui bougerait avec le
   calendrier ne dirait plus rien le mois suivant. Le 15 place le mois courant à
   mi-parcours — la moitié confirmée, la moitié encore prévue. */
const ON: ISODate = '2027-03-15'

const data = exampleData(ON)
const anchor = ymOf(ON)
const previous = addMonthsToYm(anchor, -1)

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
  it('ouvre seize mois, jusqu’au mois courant compris', () => {
    const { first, last } = exampleBounds(ON)
    const months = data.months.map((m) => m.ym).sort()
    expect(months.at(0)).toBe(first)
    expect(months.at(-1)).toBe(last)
    expect(last).toBe(anchor)
    const covered = new Set(data.entries.map((e) => ymOf(e.date)))
    expect(covered.size).toBeGreaterThanOrEqual(12)
  })

  it('couvre deux années civiles, pour le comparatif d’années', () => {
    const year = Number(anchor.slice(0, 4))
    expect(hasDataInYear(data.entries, year)).toBe(true)
    expect(hasDataInYear(data.entries, year - 1)).toBe(true)
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

  it('suit quatre crédits, dont deux sans taux', () => {
    expect(data.debts).toHaveLength(4)
    expect(data.debts.filter((d) => d.rateBp !== undefined)).toHaveLength(2)
    expect(data.debts.filter((d) => d.rateBp === undefined)).toHaveLength(2)
    // Tous démarrent dans l'historique : le capital ne se dérive que des
    // mensualités confirmées, et un crédit ouvert avant le document
    // annoncerait un capital qu'aucune échéance n'a amorti.
    const { first } = exampleBounds(ON)
    for (const debt of data.debts) expect(ymOf(debt.startedOn) >= first).toBe(true)
  })

  it('suit trois avances, dont deux qui entrent dans le pot commun', () => {
    expect(data.advances).toHaveLength(3)
    const linked = data.advances.map((a) =>
      data.recurrences.find((r) => r.id === a.recurrenceId),
    )
    expect(linked.filter((r) => r?.shared === true)).toHaveLength(2)
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

  it('étend le catalogue, et en archive une part', () => {
    expect(data.families.some((f) => !f.id.startsWith('fam-'))).toBe(true)
    expect(data.categories.some((c) => c.archived)).toBe(true)
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
    expect(used.size).toBeGreaterThanOrEqual(38)
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

  it('reporte sur le mois courant ce que le précédent a laissé de travers', () => {
    const settlements = settleMonth(data.entries, previous, kindOf, incomes())
    expect(settlements).not.toBeNull()
    expect(settlements!.some((s) => s.adjustment !== 0)).toBe(true)
    // Ce qu'une personne verse en trop, les autres le versent en moins.
    expect(settlementBalance(settlements!)).toBe(0)
    // Trois personnes avancent chacune une charge commune : la régularisation
    // n'est plus un aller-retour entre deux comptes, et c'est là qu'elle cesse
    // de pouvoir se lire de travers sans qu'on s'en aperçoive.
    expect(settlements!.filter((s) => s.advanced > 0)).toHaveLength(3)
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

  /* Et celui qui est allé au bout. Sans lui, l'état « soldé » avait sa page et
     ses mots, mais jamais de ligne pour les occuper. Sans taux, le capital
     décroît exactement de ce qui a été versé : le reste dû tombe à zéro pile,
     et non à un arrondi qu'il faudrait excuser. */
  it('solde le crédit arrivé à son terme', () => {
    const settled = data.debts.filter((d) => debtStatus(d, data.entries, null, ON).settled)
    expect(settled).toHaveLength(1)
    const status = debtStatus(settled[0]!, data.entries, null, ON)
    expect(status.payments).toBe(12)
    expect(status.remaining).toBe(0)
    expect(status.paid).toBe(settled[0]!.principal)
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

  it('montre une avance entièrement reconstituée', () => {
    const settled = data.advances.filter((a) => advanceStatus(a, data.entries, ON).settled)
    expect(settled).toHaveLength(1)
    const status = advanceStatus(settled[0]!, data.entries, ON)
    expect(status.restored).toBe(settled[0]!.amount)
    expect(status.remaining).toBe(0)
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
    expect(data.savingSupports.length).toBeGreaterThan(2)
    const total = savingTotal(data.savingSupports, data.savingValuations, data.entries, ON)
    expect(total.known).toBeGreaterThan(0)
    expect(total.valued).toBeGreaterThan(0)
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
