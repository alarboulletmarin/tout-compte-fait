import type { Messages } from './fr'

const billsCount = (n: number) => (n === 0 ? 'No bills' : n === 1 ? '1 bill' : `${n} bills`)

const list = new Intl.ListFormat('en-GB', { style: 'long', type: 'conjunction' })

// Libellés anglais de la maquette MainEN : « bills » pour les charges fixes
export const en: Messages = {
  brand: 'Tout Compte Fait',
  list: (items: readonly string[]) => list.format(items),
  memberFallback: (index: number) => `Person ${index + 1}`,
  chargesCount: billsCount,
  saveError: "Couldn't save on this device",
  loadError: "This device's data can't be read.",
  undo: 'Undo',
  dismiss: 'Dismiss',
  equalFallback: {
    zeroAmount: '€0',
    zero: 'One income is',
    missing: "One income hasn't been entered",
    rest: ': the split is ',
    end: ' for now.',
  },
  defaultCategories: {
    housing: 'Housing',
    energy: 'Energy',
    water: 'Water',
    telecom: 'Internet & phone',
    insurance: 'Insurance',
    subscriptions: 'Subscriptions',
    transport: 'Transport',
    misc: 'Other',
  },
  examples: [
    { label: 'Rent', categoryId: 'housing' },
    { label: 'Electricity', categoryId: 'energy' },
    { label: 'Gas', categoryId: 'energy' },
    { label: 'Water', categoryId: 'water' },
    { label: 'Internet', categoryId: 'telecom' },
    { label: 'Home insurance', categoryId: 'insurance' },
  ],
  errors: {
    amount: 'Enter an amount above €0',
    label: 'Give this bill a name',
    income: 'Enter a valid amount, for example €2,300.00',
    importFailed: "This file isn't a Tout Compte Fait export, or it's damaged.",
  },

  nav: {
    label: 'Main navigation',
    transfers: 'Transfers',
    charges: 'Bills',
    household: 'Household',
    history: 'History',
    settings: 'Settings',
    local: 'Data on this device',
  },

  dashboard: {
    total: (joint: string) => `${joint} in total, covering the joint account's bills`,
    toJoint: 'To transfer',
  },

  transfers: {
    kicker: 'Every month',
    title: 'To transfer to the joint account',
    total: (joint: string) => `${joint} in total, covering the joint account's bills`,
    split: 'Split by income',
    fixedPerMonth: 'Fixed bills / month',
    paidDirect: 'Paid directly',
    fromPersonal: 'from personal accounts',
    seeDetail: "See how it's calculated",
    titleNegative: 'What to transfer',
    nothing: 'Nothing to transfer',
    alreadyMore: (name: string) => `${name} already pays more than their share from their account.`,
    onJoint: 'to the joint account',
    directly: (name: string) => `to ${name}, directly`,
    explainPays: (name: string) => `${name} pays `,
    explainShare: ' from their account. Their share is ',
    explainEnd: (others: readonly string[]) =>
      `: ${list.format(others)} ${others.length > 1 ? 'pay' : 'pays'} them back the difference.`,
    emptyTitle: 'Nothing to transfer yet',
    emptyText:
      "Add your fixed bills: rent, energy, subscriptions. You'll see right away how much each of you transfers to the joint account.",
    emptyAdd: 'Add a bill',
  },

  detail: {
    title: 'How it’s calculated',
    back: 'Back',
    intro: (total: string) => `${total} of fixed bills a month, split by income.`,
    share: 'Share of the bills',
    alreadyPaid: 'Already paid from their account',
    toJoint: 'To transfer to the joint account',
    together: 'Together',
    togetherEnd: ', covering the bills paid from the joint account',
    directly: (name: string) => `To ${name}, directly`,
  },

  history: {
    kicker: 'Month by month',
    lead: 'Every month is kept as it was.',
    current: 'This month',
    carried: 'Carried over',
    totalLabel: 'Fixed bills per month: ',
    emptyTitle: 'Only one month so far',
    emptyText:
      "History fills itself: every month you open the app is kept as it was, and a month you skipped reuses the bills of the one before. Next month, you'll see what changed.",
    back: 'Back to history',
    carriedNote: (month: string) =>
      `Carried-over month: the app wasn't opened in ${month}. The previous month's bills are reused as they were.`,
    compare: {
      title: (previous: string) => `Compared with ${previous}`,
      first: 'First month in the history: nothing to compare.',
      total: 'Fixed bills per month',
      same: 'Unchanged',
      nothing: 'No bill added, removed or changed.',
      added: 'Added',
      removed: 'Removed',
      changed: 'Changed',
      fields: {
        label: 'name',
        amount: 'amount',
        frequency: 'frequency',
        account: 'account',
        category: 'category',
      },
      changedFields: (fields: readonly string[]) => `Changed: ${list.format(fields)}`,
      becomes: 'becomes',
    },
  },

  onboarding: {
    step: (n: number) => `${n} / 2`,
    title1: 'Who lives in this household?',
    intro1:
      'Everyone’s first name and net income. The income-based shares are worked out right away.',
    addPerson: 'Add a person',
    removePerson: (name: string) => `Remove ${name}`,
    person: (n: number) => `Person ${n}`,
    firstName: 'First name',
    income: 'Monthly net income',
    placeholders: ['E.g. Alex', 'E.g. Sam', 'E.g. Camille', 'E.g. Louis', 'E.g. Robin', 'E.g. Lou'],
    local: 'Everything stays on this device. No account to create.',
    next: 'Continue',
    import: 'I already have a file: import it',
    title2: 'Your first bills',
    intro2:
      'Tick, enter the monthly amount and the account that pays. You can change everything later.',
    paidFrom: 'Paid from:',
    jointAccount: 'Joint account',
    amountOf: (label: string) => `Amount for ${label}`,
    paidFromJoint: 'Paid from the joint account',
    paidFromMember: (name: string) => `Paid by ${name}`,
    onJoint: 'to the joint account',
    finish: 'See the transfers',
    skip: 'Skip this step',
  },

  charges: {
    kicker: 'Fixed bills',
    total: 'Total per month',
    joint: 'Joint account',
    accountOf: (name: string) => `${name}'s account`,
    add: 'Add',
    perMonth: 'per month',
    noCategory: 'No category',
    frequency: { monthly: 'monthly', quarterly: 'quarterly', yearly: 'yearly' },
    per: { monthly: 'month', quarterly: 'quarter', yearly: 'year' },
    deleted: (label: string) => `${label} deleted`,
    examples: 'Common examples',
    addExample: (label: string) => `Add ${label}`,
    empty: 'No bills yet. Tap an example or “Add”, then say which account pays it.',
  },

  form: {
    newTitle: 'New bill',
    editTitle: 'Edit bill',
    close: 'Close',
    amount: 'Amount',
    amountPlaceholder: '€0.00',
    label: 'Name',
    labelPlaceholder: 'E.g. Water',
    frequency: 'Frequency',
    frequencies: { monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' },
    paidFrom: 'Paid from',
    joint: 'Joint',
    category: 'Category',
    newCategory: '+ New category…',
    newCategoryName: 'Name of the new category',
    monthlyEquivalent: 'Monthly equivalent',
    add: 'Add bill',
    save: 'Save',
    delete: 'Delete bill',
  },

  deletion: {
    title: (label: string) => `Delete “${label}”?`,
    summary: (amount: string, per: string, account: string) =>
      `${amount} per ${per}, paid from ${account}.`,
    jointAccount: 'the joint account',
    memberAccount: (name: string) => `${name}'s account`,
    impact: 'New transfers to the joint account',
    confirm: 'Delete',
    cancel: 'Cancel',
  },

  household: {
    kicker: 'Household',
    title: 'Who is in the household',
    hint: 'Net income after tax, excluding bonuses.',
    firstName: 'First name',
    income: 'Monthly net income',
    total: 'Household total',
    add: 'Add a person',
    full: 'Six people at most.',
    remove: (name: string) => `Remove ${name}`,
    removed: (name: string) => `${name} is no longer in the household`,
    removal: {
      title: (name: string) => `Remove ${name} from the household?`,
      noCharges: 'No bill is paid from their account.',
      charges: (n: number) =>
        n === 1
          ? 'The bill paid from their account moves to the joint account.'
          : `The ${n} bills paid from their account move to the joint account.`,
      confirm: 'Remove',
      cancel: 'Cancel',
    },
  },

  settings: {
    kicker: 'Settings',
    theme: 'Theme',
    themes: { system: 'System', light: 'Light', dark: 'Dark' },
    language: 'Language',
    organisation: 'Organisation',
    categories: 'Categories',
    data: 'Data',
    export: 'Export',
    exportHint: '.json file',
    import: 'Import',
    sendTo: 'Send to…',
    erase: 'Erase everything',
    about: 'About',
    news: "What's new",
    source: 'Source code',
    licence: 'Licence',
    newTab: '(new tab)',
    promise: 'Free, no account, no tracking. Your data stays on this device.',
    exported: 'Export saved',
  },

  importSheet: {
    title: 'Replace your data?',
    summary: (date: string, charges: string, names: readonly string[]) =>
      `Exported on ${date} · ${charges} · ${list.format(names)}`,
    warning:
      'Your current incomes, names, bills and history will be replaced by those in the file. This cannot be undone.',
    replace: 'Replace',
    exportFirst: 'Export my data first',
    cancel: 'Cancel',
    replaced: 'Data imported',
    errorTitle: "Can't import",
    errorKept: "Your current data hasn't been changed.",
    another: 'Choose another file',
    close: 'Close',
  },

  eraseSheet: {
    title: 'Erase everything?',
    text: (charges: string) =>
      `The incomes, the names, the history and ${charges} will be deleted from this device. Nothing is kept anywhere else: this cannot be undone.`,
    charges: (n: number) => (n === 0 ? 'the categories' : n === 1 ? 'the bill' : `the ${n} bills`),
    confirm: 'Erase everything',
  },

  recap: {
    open: 'Send the summary',
    title: 'Send the summary',
    heading: 'Tout Compte Fait · every month',
    line: (name: string, what: string) => `${name}: ${what}`,
    nothing: 'nothing to transfer',
    onJoint: (amount: string) => `${amount} to the joint account`,
    toPerson: (amount: string, name: string) => `${amount} to ${name}`,
    total: (amount: string) => `Total: ${amount} (joint account bills)`,
    hint: 'Opens with your usual apps: Messages, WhatsApp, email…',
    share: 'Share…',
    copy: 'Copy the text',
    copied: 'Text copied',
    copyFailed: "Couldn't copy: select the text by hand",
  },

  news: {
    title: "What's new",
    back: 'Back to settings',
  },

  update: {
    available: 'New version available',
    reload: 'Reload',
  },

  install: {
    title: 'Install on iPhone',
    intro: 'Offline, full screen, like a real app.',
    step1: ['Tap ', 'Share', ' in the Safari toolbar'],
    step2: ['Choose ', 'Add to Home Screen', ''],
    step3: ['Tap ', 'Add', ''],
    ok: 'Got it',
    never: "Don't show again",
  },

  categories: {
    title: 'Categories',
    back: 'Back to settings',
    rename: (name: string) => `Rename ${name}`,
    renameLabel: (count: number) => `Rename · ${billsCount(count)}`,
    newLabel: 'New category',
    add: 'New category',
    delete: 'Delete',
    cancel: 'Cancel',
    save: 'Save',
    note: 'Deleting a category keeps its bills: they move to “No category”.',
    deleted: (name: string) => `Category “${name}” deleted`,
  },
}
