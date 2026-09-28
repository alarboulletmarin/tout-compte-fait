import type { Frequency } from '../domain/types'

const chargesCount = (n: number) =>
  n === 0 ? 'Aucune charge' : n === 1 ? '1 charge' : `${n} charges`

const list = new Intl.ListFormat('fr', { style: 'long', type: 'conjunction' })

export const fr = {
  brand: 'Tout Compte Fait',
  /** « Alex, Sam et Robin » */
  list: (items: readonly string[]) => list.format(items),
  memberFallback: (index: number) => `Membre ${index + 1}`,
  chargesCount,
  saveError: 'Enregistrement impossible sur cet appareil',
  loadError: 'Les données de cet appareil sont illisibles.',
  undo: 'Annuler',
  equalFallback: {
    zeroAmount: '0 €',
    zero: 'Un revenu est à',
    missing: "Un revenu n'est pas renseigné",
    rest: ' : la répartition passe à ',
    end: ' en attendant.',
  },
  // Noms des catégories créées au premier lancement
  defaultCategories: {
    housing: 'Logement',
    energy: 'Énergie',
    water: 'Eau',
    telecom: 'Internet & téléphone',
    insurance: 'Assurances',
    subscriptions: 'Abonnements',
    transport: 'Transport',
    misc: 'Divers',
  },
  // Charges courantes proposées à l'onboarding et dans la liste vide
  examples: [
    { label: 'Loyer', categoryId: 'housing' },
    { label: 'Électricité', categoryId: 'energy' },
    { label: 'Gaz', categoryId: 'energy' },
    { label: 'Eau', categoryId: 'water' },
    { label: 'Internet', categoryId: 'telecom' },
    { label: 'Assurance habitation', categoryId: 'insurance' },
  ],
  errors: {
    amount: 'Indiquez un montant supérieur à 0 €',
    label: 'Donnez un nom à cette charge',
    income: 'Indiquez un montant valide, par exemple 2 300,00 €',
    importFailed: "Ce fichier n'est pas un export Tout Compte Fait, ou il est endommagé.",
  },

  nav: {
    label: 'Navigation principale',
    transfers: 'Virements',
    charges: 'Charges',
    household: 'Foyer',
    history: 'Historique',
    settings: 'Réglages',
    local: 'Données sur cet appareil',
  },

  dashboard: {
    total: (joint: string) => `${joint} au total, soit les charges du joint`,
    toJoint: 'À virer',
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
    titleNegative: "Ce qu'il faut virer",
    nothing: 'Rien à virer',
    alreadyMore: (name: string) => `${name} paie déjà plus que sa part depuis son compte.`,
    onJoint: 'sur le joint',
    directly: (name: string) => `à ${name}, directement`,
    explainPays: (name: string) => `${name} paie `,
    explainShare: ' depuis son compte. Sa part est de ',
    explainEnd: (others: readonly string[]) =>
      ` : ${list.format(others)} ${others.length > 1 ? 'lui remboursent' : 'lui rembourse'} la différence.`,
    emptyTitle: "Rien à virer pour l'instant",
    emptyText:
      'Ajoutez vos charges fixes : loyer, énergie, abonnements. Vous saurez aussitôt combien chacun vire sur le compte joint.',
    emptyAdd: 'Ajouter une charge',
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
    directly: (name: string) => `À ${name}, directement`,
  },

  history: {
    kicker: 'Mois par mois',
    lead: "Chaque mois est gardé tel qu'il était.",
    current: 'Ce mois-ci',
    carried: 'Reconduit',
    totalLabel: 'Charges fixes par mois : ',
    emptyTitle: "Un seul mois pour l'instant",
    emptyText:
      "L'historique se remplit tout seul : chaque mois où vous ouvrez l'app est gardé tel quel, et un mois sans ouverture reprend les charges du précédent. Le mois prochain, vous verrez ce qui a changé.",
    back: "Retour à l'historique",
    carriedNote: (month: string) =>
      `Mois reconduit : l'app n'a pas été ouverte en ${month}. Les charges du mois précédent sont reprises telles quelles.`,
    compare: {
      title: (previous: string) => `Par rapport à ${previous}`,
      first: "Premier mois de l'historique : rien à comparer.",
      total: 'Charges fixes par mois',
      same: 'Inchangé',
      nothing: 'Aucune charge ajoutée, retirée ni modifiée.',
      added: 'Ajoutées',
      removed: 'Retirées',
      changed: 'Modifiées',
      fields: {
        label: 'libellé',
        amount: 'montant',
        frequency: 'fréquence',
        account: 'compte',
        category: 'catégorie',
      },
      changedFields: (fields: readonly string[]) => `Modifié : ${list.format(fields)}`,
      becomes: 'devient',
    },
  },

  onboarding: {
    step: (n: number) => `${n} / 2`,
    title1: 'Qui vit dans ce foyer ?',
    intro1:
      'Les prénoms et les revenus nets de chacun. Les parts au prorata se calculent tout de suite.',
    addPerson: 'Ajouter une personne',
    removePerson: (name: string) => `Retirer ${name}`,
    person: (n: number) => `Personne ${n}`,
    firstName: 'Prénom',
    income: 'Revenu net mensuel',
    placeholders: ['Ex. Alex', 'Ex. Sam', 'Ex. Camille', 'Ex. Louis', 'Ex. Robin', 'Ex. Lou'],
    local: 'Tout reste sur cet appareil. Aucun compte à créer.',
    next: 'Continuer',
    import: "J'ai déjà un fichier : importer",
    title2: 'Vos premières charges',
    intro2: 'Cochez, indiquez le montant mensuel et le compte qui paie. Tout reste modifiable.',
    paidFrom: 'Payé depuis :',
    jointAccount: 'Compte joint',
    amountOf: (label: string) => `Montant ${label}`,
    paidFromJoint: 'Payé depuis le joint',
    paidFromMember: (name: string) => `Payé depuis ${name}`,
    onJoint: 'sur le joint',
    finish: 'Voir les virements',
    skip: 'Passer cette étape',
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
    examples: 'Exemples courants',
    addExample: (label: string) => `Ajouter ${label}`,
    empty:
      'Aucune charge. Touchez un exemple ou « Ajouter », puis précisez depuis quel compte elle est payée.',
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
    add: 'Ajouter une personne',
    full: 'Six personnes au maximum.',
    remove: (name: string) => `Retirer ${name}`,
    removed: (name: string) => `${name} n’est plus dans le foyer`,
    removal: {
      title: (name: string) => `Retirer ${name} du foyer ?`,
      noCharges: 'Aucune charge n’est payée depuis son compte.',
      charges: (n: number) =>
        n === 1
          ? 'La charge payée depuis son compte passe au compte joint.'
          : `Les ${n} charges payées depuis son compte passent au compte joint.`,
      confirm: 'Retirer',
      cancel: 'Annuler',
    },
  },

  settings: {
    kicker: 'Réglages',
    theme: 'Thème',
    themes: { system: 'Système', light: 'Clair', dark: 'Sombre' },
    language: 'Langue',
    organisation: 'Organisation',
    categories: 'Catégories',
    data: 'Données',
    export: 'Exporter',
    exportHint: 'fichier .json',
    import: 'Importer',
    sendTo: 'Envoyer vers…',
    erase: 'Tout effacer',
    about: 'À propos',
    news: 'Nouveautés',
    source: 'Code source',
    licence: 'Licence',
    newTab: '(nouvel onglet)',
    promise: 'Gratuit, sans compte, sans pistage. Vos données restent sur cet appareil.',
    exported: 'Export enregistré',
  },

  importSheet: {
    title: 'Remplacer vos données ?',
    summary: (date: string, charges: string, names: readonly string[]) =>
      `Exporté le ${date} · ${charges} · ${list.format(names)}`,
    warning:
      "Vos revenus, prénoms, charges et historique actuels seront remplacés par ceux du fichier. C'est définitif.",
    replace: 'Remplacer',
    exportFirst: "Exporter d'abord mes données",
    cancel: 'Annuler',
    replaced: 'Données importées',
    errorTitle: 'Import impossible',
    errorKept: "Vos données actuelles n'ont pas été modifiées.",
    another: 'Choisir un autre fichier',
    close: 'Fermer',
  },

  eraseSheet: {
    title: 'Tout effacer ?',
    text: (charges: string) =>
      `Les revenus, les prénoms, l'historique et ${charges} seront supprimés de cet appareil. Rien n'est gardé ailleurs : c'est définitif.`,
    charges: (n: number) =>
      n === 0 ? 'les catégories' : n === 1 ? 'la charge' : `les ${n} charges`,
    confirm: 'Tout effacer',
  },

  recap: {
    open: 'Envoyer le récap',
    title: 'Envoyer le récap',
    heading: 'Tout Compte Fait · chaque mois',
    line: (name: string, what: string) => `${name} : ${what}`,
    nothing: 'rien à virer',
    onJoint: (amount: string) => `${amount} sur le joint`,
    toPerson: (amount: string, name: string) => `${amount} à ${name}`,
    total: (amount: string) => `Total : ${amount} (charges du joint)`,
    hint: "S'ouvre avec vos applis habituelles : Messages, WhatsApp, e-mail…",
    share: 'Partager…',
    copy: 'Copier le texte',
    copied: 'Texte copié',
    copyFailed: 'Copie impossible : sélectionnez le texte à la main',
  },

  news: {
    title: 'Nouveautés',
    back: 'Retour aux réglages',
  },

  update: {
    available: 'Nouvelle version disponible',
    reload: 'Recharger',
  },

  install: {
    title: "Installer sur l'iPhone",
    intro: 'Hors ligne, en plein écran, comme une vraie app.',
    step1: ['Touchez ', 'Partager', ' dans la barre de Safari'],
    step2: ['Choisissez ', "Sur l'écran d'accueil", ''],
    step3: ['Touchez ', 'Ajouter', ''],
    ok: "J'ai compris",
    never: 'Ne plus afficher',
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
