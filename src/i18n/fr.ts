import type { Frequency } from '../domain/types'

const chargesCount = (n: number) =>
  n === 0 ? 'Aucune charge' : n === 1 ? '1 charge' : `${n} charges`

export const fr = {
  brand: 'Tout Compte Fait',
  memberFallback: (index: number) => `Membre ${index + 1}`,
  chargesCount,
  saveError: 'Enregistrement impossible sur cet appareil',
  loadError: 'Les données de cet appareil sont illisibles.',
  undo: 'Annuler',

  nav: {
    label: 'Navigation principale',
    transfers: 'Virements',
    charges: 'Charges',
    household: 'Foyer',
    settings: 'Réglages',
  },

  transfers: {
    kicker: 'Chaque mois',
    title: 'À virer sur le compte joint',
    total: (joint: string) => `${joint} au total, soit les charges du compte joint`,
    split: 'Répartition au prorata',
    fixedPerMonth: 'Charges fixes / mois',
    paidDirect: 'Payé en direct',
    fromPersonal: 'depuis les comptes perso',
    seeDetail: 'Voir le détail du calcul',
  },

  detail: {
    title: 'Détail du calcul',
    back: 'Retour',
    intro: (total: string) =>
      `${total} de charges fixes par mois, réparties au prorata des revenus.`,
    share: 'Part des charges',
    alreadyPaid: 'Déjà payé depuis son compte',
    toJoint: 'À virer sur le joint',
    together: 'Ensemble',
    togetherEnd: ', soit les charges payées par le joint',
  },

  charges: {
    kicker: 'Charges fixes',
    total: 'Total par mois',
    joint: 'Compte joint',
    accountOf: (name: string) => `Compte de ${name}`,
    add: 'Ajouter',
    perMonth: 'par mois',
    noCategory: 'Sans catégorie',
    frequency: { monthly: 'mensuel', quarterly: 'trimestriel', yearly: 'annuel' } satisfies Record<
      Frequency,
      string
    >,
    per: { monthly: 'mois', quarterly: 'trimestre', yearly: 'an' } satisfies Record<
      Frequency,
      string
    >,
    deleted: (label: string) => `${label} supprimée`,
  },

  form: {
    newTitle: 'Nouvelle charge',
    editTitle: 'Modifier la charge',
    close: 'Fermer',
    amount: 'Montant',
    amountPlaceholder: '0,00 €',
    label: 'Libellé',
    labelPlaceholder: 'Ex. Eau',
    frequency: 'Fréquence',
    frequencies: {
      monthly: 'Mensuelle',
      quarterly: 'Trimestrielle',
      yearly: 'Annuelle',
    } satisfies Record<Frequency, string>,
    paidFrom: 'Payé depuis',
    joint: 'Joint',
    category: 'Catégorie',
    newCategory: '+ Nouvelle',
    newCategoryName: 'Nom de la nouvelle catégorie',
    monthlyEquivalent: 'Équivalent mensuel',
    add: 'Ajouter la charge',
    save: 'Enregistrer',
    delete: 'Supprimer la charge',
  },

  deletion: {
    title: (label: string) => `Supprimer « ${label} » ?`,
    summary: (amount: string, per: string, account: string) =>
      `${amount} par ${per}, payé depuis ${account}.`,
    jointAccount: 'le compte joint',
    memberAccount: (name: string) => `le compte de ${name}`,
    impact: 'Nouveaux virements vers le joint',
    confirm: 'Supprimer',
    cancel: 'Annuler',
  },

  household: {
    kicker: 'Foyer',
    title: 'Qui compose le foyer',
    hint: 'Revenus nets après impôt, hors primes et 13e mois.',
    firstName: 'Prénom',
    income: 'Revenu net mensuel',
    total: 'Total du foyer',
  },

  settings: {
    kicker: 'Réglages',
    organisation: 'Organisation',
    categories: 'Catégories',
  },

  categories: {
    title: 'Catégories',
    back: 'Retour aux réglages',
    rename: (name: string) => `Renommer ${name}`,
    renameLabel: (count: number) => `Renommer · ${chargesCount(count)}`,
    newLabel: 'Nouvelle catégorie',
    add: 'Nouvelle catégorie',
    delete: 'Supprimer',
    cancel: 'Annuler',
    save: 'Enregistrer',
    note: 'Supprimer une catégorie ne supprime pas ses charges : elles passent en « Sans catégorie ».',
    deleted: (name: string) => `Catégorie « ${name} » supprimée`,
  },
}

export type Messages = typeof fr
