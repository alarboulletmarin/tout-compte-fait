import type { AppData } from '../domain/data'

/** Données de test valides : une charge mensuelle sur le joint, une annuelle sans catégorie. */
export const sample = (): AppData => ({
  household: {
    members: [
      { id: 'lui', name: 'Lui', income: 230000 },
      { id: 'elle', name: 'Elle', income: 194800 },
    ],
  },
  categories: [
    { id: 'housing', name: 'Logement' },
    { id: 'insurance', name: 'Assurances' },
  ],
  charges: [
    {
      id: 'a',
      label: 'Loyer',
      amount: 143129,
      frequency: 'monthly',
      paidFrom: 'joint',
      categoryId: 'housing',
    },
    {
      id: 'b',
      label: 'Assurance habitation',
      amount: 24000,
      frequency: 'yearly',
      paidFrom: 'm:elle',
      categoryId: null,
    },
  ],
  history: {},
})
