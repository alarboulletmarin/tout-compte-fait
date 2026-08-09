/** Fabriques de test. Aucun module d'application ne dépend de ce fichier. */

import { CURRENT_SCHEMA_VERSION } from '@/persistence/schema'
import { type Money, money } from './money'
import type {
  Advance,
  Category,
  Data,
  Debt,
  Entry,
  Family,
  Member,
  Period,
  Recurrence,
  SavingSupport,
  SavingValuation,
} from './types'

export function makeMember(over: Partial<Member> & { id: string }): Member {
  return { name: 'Membre', color: 'var(--member-1)', ...over }
}

export function makeEntry(over: Partial<Entry> & { date: string }): Entry {
  return {
    id: `e-${over.date}-${String(over.amount ?? 0)}-${over.label ?? ''}`,
    label: 'Entrée',
    categoryId: 'cat-1',
    direction: 'out',
    amount: money(1000),
    status: 'confirmed',
    ...over,
  }
}

export function makeRecurrence(
  over: Partial<Omit<Recurrence, 'period'>> & { period: Period },
): Recurrence {
  return {
    id: 'rec-1',
    label: 'Récurrence',
    categoryId: 'cat-1',
    direction: 'out',
    amount: money(999),
    startedOn: '2026-01-01',
    ...over,
  }
}

export function makeCategory(over: Partial<Category> & { id: string }): Category {
  return {
    label: 'Catégorie',
    familyId: 'fam-leisure',
    icon: '',
    color: 'var(--cat-1)',
    direction: 'out',
    archived: false,
    ...over,
  }
}

export function makeFamily(over: Partial<Family> & { id: string }): Family {
  return { label: 'Famille', kind: 'charge', ...over }
}

export function makeDebt(over: Partial<Debt> & { id: string }): Debt {
  return {
    label: 'Crédit',
    categoryId: 'car-loan',
    principal: money(1200000),
    startedOn: '2026-01-05',
    endsOn: '2028-12-05',
    ...over,
  }
}

export function makeAdvance(over: Partial<Advance> & { id: string }): Advance {
  return {
    label: 'Assurance auto',
    categoryId: 'car-insurance',
    memberId: 'm1',
    amount: money(60000),
    paidOn: '2026-01-15',
    from: '2026-01',
    to: '2026-12',
    ...over,
  }
}

export function makeSavingSupport(
  over: Partial<SavingSupport> & { id: string },
): SavingSupport {
  return {
    label: 'Livret A',
    memberId: 'm1',
    categoryId: 'passbook',
    archived: false,
    ...over,
  }
}

export function makeSavingValuation(
  over: Partial<SavingValuation> & { id: string; supportId: string },
): SavingValuation {
  return { amount: money(1000000), date: '2026-01-01', ...over }
}

export function makeData(over: Partial<Data> = {}): Data {
  return {
    /* La version courante du document : un aller-retour export / import doit
       pouvoir se comparer à l'identique, sans qu'une migration s'intercale.
       Lue et non recopiée — le nombre écrit ici à la main devenait faux à chaque
       incrément, et faisait tomber trois tests sans rapport avec le changement. */
    schemaVersion: CURRENT_SCHEMA_VERSION,
    household: { name: 'Maison', members: [] },
    families: [makeFamily({ id: 'fam-leisure' })],
    categories: [],
    recurrences: [],
    entries: [],
    debts: [],
    advances: [],
    savingSupports: [],
    savingValuations: [],
    months: [],
    settings: {
      theme: 'system',
      palette: 'classique',
      locale: 'fr',
      currency: 'EUR',
      monthStartsOn: 1,
    },
    ...over,
  }
}

/** Générateur d'identifiants déterministe, pour que les tests soient stables. */
export function sequentialIds(prefix = 'id'): () => string {
  let n = 0
  return () => {
    n += 1
    return `${prefix}-${String(n)}`
  }
}

export const eur = (value: number): Money => money(value)
