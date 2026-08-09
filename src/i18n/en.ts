/* ============================================================================
 * Le catalogue anglais. Même arbre que `fr.ts`, au mot près : le type `Strings`
 * en est dérivé, donc une clé oubliée ou une clé en trop ne compile pas.
 *
 * **Le rationale n'est pas recopié ici.** `fr.ts` porte, clé par clé, pourquoi
 * telle formule a été choisie plutôt que telle autre — pourquoi « Rétablir » et
 * non « Annuler », pourquoi la notice ne prétend pas « zéro traitement de
 * données ». Ces raisons valent pour les deux langues : les redire ici en ferait
 * deux exemplaires à maintenir, dont l'un finirait faux. On ne commente donc que
 * ce qui est propre à l'anglais — un choix que le français ne posait pas, ou une
 * tournure qui ne se traduit pas telle quelle.
 *
 * Casse normale, pas de majuscule décorative : c'est la règle du DS §7, et elle
 * vaut ici aussi. L'anglais met volontiers des capitales aux boutons (« Save
 * Changes ») ; l'app n'en met pas plus qu'en français.
 *
 * Ce morceau est chargé à la demande — voir `strings.ts`, qui dit pourquoi.
 * ==========================================================================*/

import type { Strings } from './fr'

export const en: Strings = {
  app: {
    /* Le nom ne se traduit pas : c'est celui de l'app, il est sur l'écran
       d'accueil, dans le manifeste et dans l'URL. « All things considered »
       serait une autre app. */
    name: 'Tout compte fait',
    tagline: 'Your finances, on your device.',
  },

  calendarNames: {
    months: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    monthsShort: [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ],
    /** Index 0 = lundi, conformément à `dayOfWeek` (ISO 8601). */
    weekdaysShort: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    /* Deux « T » et deux « S » se suivent : c'est l'usage anglais, et les
       en-têtes de la grille sont de toute façon `aria-hidden` — la colonne se
       dit au lecteur d'écran par le nom complet de la case. */
    weekdaysNarrow: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    weekdays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  },

  common: {
    add: 'Add',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Continue',
    skip: 'Skip',
    all: 'All',
    none: 'None',
    today: 'Today',
    optional: 'optional',
    required: 'required',
    loading: 'Loading',
    yes: 'Yes',
    no: 'No',
    more: 'Show more',
    less: 'Show less',
    other: 'Other',
    /* « Undo » et non « Cancel », pour la raison que `fr.ts` donne : le mot
       « Cancel » ferme déjà les boîtes de dialogue. L'anglais s'en tire mieux
       que le français, qui devait choisir entre deux sens d'« annuler ». */
    undo: 'Undo',
  },

  unsaved: {
    title: 'Unsaved entry',
    question: 'What you just typed will be lost.',
    leave: 'Discard',
    stay: 'Keep editing',
  },

  notice: {
    title: 'No cookies, no server',
    lead: 'A cookie banner makes you accept what it takes. This one asks for nothing: it says what there isn’t.',
    noAccount: 'No account: no email, no password, no identifier.',
    noTracking: 'No cookies, no trackers, no analytics, no ads.',
    noServer:
      'No server. Nothing you enter leaves this device, because there is nowhere to send it.',
    noReader:
      'Nobody reads your data, neither the app’s author nor a third party: no copy of it exists anywhere else to read.',
    verify: 'The code is open, precisely so that all this can be read rather than believed.',
    check: 'I’ve read this',
    checkHint: 'The button turns on when the box is ticked.',
    action: 'Got it',
  },

  direction: {
    in: 'Money in',
    out: 'Money out',
    inPlural: 'Money in',
    outPlural: 'Money out',
  },

  theme: {
    label: 'Theme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    toggle: 'Switch theme',
  },

  appearance: {
    title: 'Appearance',
    intro:
      'The theme says light or dark, the palette says with which colours. Every palette exists in both themes.',
    paletteLabel: 'Palette',
  },

  /* Les deux noms de langue sont les mêmes que dans `fr.ts`, et ce n'est pas un
     oubli de traduction : une langue se nomme dans la sienne. Voir `fr.ts`, qui
     dit pourquoi. */
  language: {
    label: 'Language',
    fr: 'Français',
    en: 'English',
    hint: 'Only the interface changes, not your entries.',
  },

  /* Les noms de palette **ne se traduisent pas** : ce sont des noms propres —
     la valeur stockée dans le document est `"classique"`, les vignettes sont
     les mêmes, et un foyer qui parle des deux langues doit reconnaître sa
     palette d'une langue à l'autre. Seules les phrases qui les décrivent
     passent en anglais. */
  palettes: {
    classique: 'Classique',
    classiqueHint: 'The original colours — pine, apple green, violet.',
    monochrome: 'Monochrome',
    monochromeHint: 'A single hue, from lightest to darkest.',
    douce: 'Douce',
    douceHint: 'The same families, less saturated.',
    vive: 'Vive',
    viveHint: 'Clear-cut hues, that tell apart from a distance.',
    neutre: 'Neutre',
    neutreHint: 'Almost colourless — except for the alert.',
    contrastee: 'Contrastée',
    contrasteeHint: 'Contrast pushed as far as it goes.',
  },

  nav: {
    label: 'Main navigation',
    credits: 'Loans',
    month: 'This month',
    calendar: 'Calendar',
    subscriptions: 'Recurring',
    history: 'History',
    styleguide: 'Styleguide',
    about: 'About',
    landing: 'The tour',
    more: 'More',
    moreHint: 'The rest of your screens, and the settings.',
    manage: 'Manage',
    organise: 'Organise',
    simulate: 'Simulate',
    data: 'Data',
    application: 'Application',
    savings: 'Savings',
    split: 'Split',
    projections: 'Projections',
    projectionsHint: 'What a regular contribution becomes, under a rate you assume.',
    subscriptionsHint: 'What comes back every month, written once.',
    savingsHint: 'What you can set aside, and where to put it.',
    splitHint: 'Who pays what towards shared costs.',
    creditsHint: 'Your loans in progress and what’s left to repay.',
    aboutHint: 'What the app does, and what it doesn’t.',
  },

  shell: {
    loading: 'Opening your data',
    quickEntry: 'Add a line',
    quickEntryClose: 'Close the entry doors',
    quickEntryLabel: 'Entry doors',
    filterByMember: 'Filter by person',
    all: 'Everyone',
    common: 'Shared',
    commonShort: 'The shared pot alone, at its full amount.',
    commonNote:
      'The shared pot alone, at its full amount: the costs and loans nobody has claimed, plus whatever is ticked “to share”. No share is worked out here — everyone pays theirs on the Split screen.',
    everyone: 'Shared',
    prorataShort: 'Figures include their share of the shared costs.',
    prorata:
      'Figures at %s’s share: their share of the shared costs is included, in proportion to income. Lists keep whole payments.',
    prorataSoloShort: 'Only person in the household: their figures are the household’s.',
    prorataSolo:
      '%s is the only person here: they carry the whole shared pot, and their figures are the household’s. Lists keep whole payments.',
    prorataSheet: 'How these figures are worked out',
    prorataMissingOne:
      'Shared costs not split, because %s’s income isn’t known: only the lines in their name are counted.',
    prorataMissingMany:
      'Shared costs not split, because the incomes of %s aren’t known: only the lines in their name are counted.',
    prorataOnlyOwn: 'Shared costs not split: only the lines in their name are counted.',
    thisMonth: 'This month',
    thisMonthTitle: 'Back to %s',
  },

  storage: {
    readFailed: 'Your data could not be read. You can start over or import an export.',
    writeFailed: 'Changes are no longer being saved',
    writeFailedBody:
      'What you see on screen is intact, but nothing is being written to this device any more. Export now: it’s the only copy that will survive closing the tab.',
    writeFailedLabel: 'Save failed',
    exportNow: 'Export now',

    durabilityTitle: 'Your data is saved on this device',
    durabilityBody:
      'This browser doesn’t guarantee it will keep it. An export is the only copy that doesn’t depend on it.',
    durabilityLabel: 'Retention not guaranteed',
    durabilityDismiss: 'Hide the retention notice',

    blocking:
      'Another tab is updating the database. This tab won’t save anything until it’s reloaded.',
    blocked: 'Another tab is using a different version of the app. Close it, then reload this page.',
    terminated:
      'The browser closed the database from under the app. Reload the page — and export first, to be safe.',
    readTimeout:
      'The database isn’t responding. Another tab may be holding it: close it, then reload.',

    otherTab: 'Updated from another tab.',
    otherTabCleared: 'The data was erased from another tab.',

    recoverTitle: 'Your data won’t open',
    recoverImport: 'Import an export',
    recoverImportHint:
      'It’s the only way out that loses nothing. If you have an export file, now is the time.',
    recoverRaw: 'Download the raw copy',
    recoverRawHint:
      'The contents exactly as stored, before any reading. A document this version of the app can’t open isn’t necessarily lost — keep it before erasing anything.',
    recoverRawEmpty: 'There’s nothing stored to copy.',
    recoverRawDone: 'Raw copy downloaded',
    recoverReload: 'Reload',
    recoverReloadHint:
      'A database that’s briefly busy often reads fine on the second try. It costs nothing.',
    discard: 'Erase and start over',
    discardHint:
      'Last resort. What’s stored goes for good, and nobody will know what was in it.',
    discardConfirm1:
      'What’s stored on this device will be erased, without anyone having been able to read it or tell you what it held.',
    discardConfirm2: 'There’s no way back. Have you downloaded the raw copy?',
    discarded: 'Data erased',

    crashTitle: 'The app stopped',
    crashBody:
      'Your data is still there, on this device. Get it back first: it’s the one thing you can’t make up for later.',
    crashExport: 'Get my data back',
    crashExportEmpty: 'There’s nothing stored on this device.',
    crashExportFailed: 'The database didn’t answer. Reload, then try again.',
    crashReload: 'Reload the app',
    crashCaches: 'Reinstall the app',
    crashCachesHint:
      'If the screen comes back broken on every reload, the cached version is to blame. This downloads it again. Your data isn’t touched: it doesn’t live in the cache.',

    title: 'On this device',
    stateKept: 'Your data is kept',
    stateFragile: 'Nothing is promised',
    stateUnknown: 'This browser says nothing',
    persisted:
      'The browser has committed to keeping your data until you erase it yourself.',
    notPersisted:
      'The browser promised nothing: it may erase your data if it runs short of space. A regular export remains the real protection.',
    persistUnknown:
      'This browser doesn’t say whether it keeps your data. That isn’t a refusal, but it can’t be relied on: a regular export remains the real protection.',
    persistAsked: 'Retention has already been asked of it.',
    installHint:
      'An app installed on the home screen is less exposed: iOS erases the data of sites you haven’t opened for about a week.',
    persistAsk: 'Ask it to keep them',
    persistGranted: 'Granted.',
    persistRefused: 'The browser refused. Nothing is lost — export more often.',
    persistSilent:
      'This browser doesn’t answer the question. Nothing is lost — export more often.',
    usage: '%s used out of %s available.',
    usageUnknown: 'This browser doesn’t say how much room it leaves you.',

    placeLabel: 'Storage',
    placeValue: 'On this device',
    keepLabel: 'Retention',
    keepPersistent: 'Persistent',
    keepFragile: 'Not guaranteed by this browser',
    keepUnknown: 'Not disclosed by this browser',
    lastExportLabel: 'Last export',
    lastExportNever: 'Never',
    statusMore: 'Storage detail for this device',

    backups: 'Local backups',
    backupsHint:
      'One backup per day of entry, the last five. Each holds the state before that day’s changes. They live in this browser: they don’t replace an export.',
    backupsEmpty: 'No backup yet. The first one arrives on the next day of entry.',
    backupContents: '%s entries, %s recurring rules',
    backupRestore: 'Restore',
    backupConfirm1: 'This backup will entirely replace the current data — %s, from %s.',
    backupConfirm2: 'Everything entered since will be lost.',
    backupRestored: 'Backup restored',
  },

  settings: {
    appearanceSummary: '%s · %s',

    currency: 'Currency',
    currencyHint: 'Nothing is converted: only the symbol changes.',
    aboutLink: 'The project, the code and the licence',
    aboutSummary: 'Version %s · the project, the code, the licence',

    household: 'People',
    householdName: 'Display name',
    householdHint: 'At the top of every screen.',
    householdPlaceholder: '',
    members: 'Members',
    membersCountOne: '%s member',
    membersCount: '%s members',
    membersNone: 'Nobody yet',
    memberAdd: 'Add a member',
    memberName: 'First name',
    memberPlaceholder: 'Alix',
    memberIncome: 'Monthly income',
    memberRename: '%s’s first name',
    memberRemove: 'Remove %s',
    memberRemoved: '%s has been removed',
    memberRemoveHint: 'Their entries are kept, simply without a label.',
    memberRemoveConfirm:
      'Their entries and recurring rules go back to shared: nothing is erased. Remove %s?',
    memberRemoveConfirmAdvanceOne:
      'Their entries and recurring rules go back to shared. Their advance can’t belong to nobody: it is deleted, and the instalments already paid stay. Remove %s?',
    memberRemoveConfirmAdvances:
      'Their entries and recurring rules go back to shared. Their %s advances can’t belong to nobody: they are deleted, and the instalments already paid stay. Remove %s?',
    memberRemoveSupportOne:
      'They own 1 savings pot: it will be deleted, along with its value history. The contributions already recorded stay, unattached.',
    memberRemoveSupports:
      'They own %s savings pots: they will be deleted, along with their value history. The contributions already recorded stay, unattached.',
    memberSupportsReassign: 'You can reassign them to someone else first, from the Savings screen.',
    memberSupportsGo: 'See their savings pots',
    membersEmpty:
      'Nobody yet: everything is attributed to you. Add someone if you share expenses.',
    memberNoIncome: 'no income recorded',
    memberIncomeUnpriced: 'income with a variable amount, not costed yet',
    memberIncomeUnpricedFix: 'Give a usual amount',
    memberIncomeZero: 'income declared as zero',
    memberIncomeZeroFix: 'Correct the amount',
    memberIncomeHint:
      'Each person’s income is read from their salary or benefit recurring rules, and is used to split shared costs in proportion.',
    memberIncomeLink: 'Add an income',
    incomeUnassignedOne: '%s belongs to nobody: this income counts towards no share.',
    incomeUnassignedMany: '%s belong to nobody: these incomes count towards no share.',
    incomeUnassignedFix: 'Attribute them to someone so they weigh in the proportion.',
    memberShareOf: '%s of the shared costs',
    splitLink: 'See this month’s split',

    categories: 'Categories',
    families: 'Families',
    familyAdd: 'Add a family',
    familyName: 'Family name',
    familyPlaceholder: 'Pets',
    familyKind: 'Kind',
    categoryAdd: 'Add a category',
    categoryName: 'Label',
    categoryPlaceholder: 'Leisure',
    categoryArchive: 'Archive %s',
    categoryRestore: 'Restore %s',
    familyCountOne: '%s category',
    familyCount: '%s categories',
    familiesCountOne: '%s family',
    familiesCount: '%s families',
    familiesEmpty: 'No family yet.',
    familyEmpty: 'No category here yet.',
    archive: 'Archive',
    restore: 'Restore',
    categoriesHint:
      'A category is never erased: it’s archived, and past entries keep it.',
    categorySearch: 'Search for a category',
    categorySearchPlaceholder: 'Fuel',
    categorySearchEmpty: 'No category matches “%s”.',

    storageSummary: 'Data kept locally',
    transfer: 'Export / import',
    transferSummary: 'Back up or restore the data',
    backupGroup: 'Backup',
    restoreGroup: 'Restore',
    export: 'Export my data',
    exportHint: 'A .json file containing everything, to keep wherever you like.',
    exported: 'Export downloaded',

    share: 'Send to…',
    shareHint:
      'The same file, handed straight to another device — AirDrop, Nearby Share, a messaging app. It doesn’t go through the downloads folder.',
    shared: 'Export sent',
    shareFailed: 'Sharing didn’t go through. The file was downloaded instead.',
    import: 'Import a file',
    importHint: 'Entirely replaces the current data.',
    importConfirm: 'Replace all data with this file?',
    importConfirm2: 'The current people, recurring rules and entries will be lost. Confirm?',
    imported: 'Data imported',
    importMigrated: 'Data imported and updated from an older format',
    importFailed: 'The import didn’t go through. Reload the page before trying again.',

    reportDiscardedOne: '1 line will not be imported:',
    reportDiscarded: '%s lines will not be imported:',
    reportRepairedOne: '1 link led nowhere and has been reattached:',
    reportRepaired: '%s links led nowhere and have been reattached:',
    reportMore: '… and %s more.',
    reportLine: '%s — %s',
    reportNamed: '%s “%s”',
    reportRanked: '%s no. %s',

    reportCollection: {
      members: 'Member',
      families: 'Family',
      categories: 'Category',
      recurrences: 'Recurring rule',
      entries: 'Entry',
      debts: 'Loan',
      advances: 'Advance',
      savingSupports: 'Savings pot',
      savingValuations: 'Valuation',
      savingRates: 'Savings rate',
      months: 'Month',
    },
    reportReason: {
      shape: 'unreadable line',
      amount: 'unreadable amount',
      principal: 'unreadable capital',
      date: 'date that doesn’t exist',
      month: 'month that doesn’t exist',
      noMember: 'nobody it belongs to',
      period: 'period back to front',
      rate: 'unreadable rate',
      duplicateId: 'duplicate identifier',
      unknownCategory: 'category not found, filed under “To sort”',
      unknownFamily: 'family not found',
      unknownMember: 'member not found, made shared',
      unknownRecurrence: 'recurring rule not found, link removed',
      unknownSupport: 'savings pot not found, link removed',
    },

    schema: 'Data schema',
    schemaHint:
      'The complete model, to hand to an assistant along with your notes: it will give you back a file to import here.',
    schemaCopy: 'Copy the schema',
    schemaDownload: 'Download the schema',
    schemaCopied: 'Schema copied',
    schemaCopyFailed: 'Copying failed. Download the file instead.',
    schemaUnavailable: 'The schema couldn’t be loaded. Check your connection, then reload.',

    example: 'Example data',
    exampleHint:
      'A complete example — three people, four loans, three advances, seven savings pots, over a year of history — to see the app full without entering anything.',
    exampleLoad: 'Load the example',
    exampleConfirm: 'Replace all data with the example?',
    exampleConfirm2: 'The current people, recurring rules and entries will be lost. Confirm?',
    exampleLoaded: 'Example data loaded',
    exampleFailed: 'The example couldn’t be loaded. Check your connection, then try again.',

    sensitive: 'Danger zone',
    resetTitle: 'Erase all data',
    reset: 'Erase everything',
    resetHint: 'Erases the people, the recurring rules and every entry. No way back.',
    resetConfirm1: 'Erase all data from this device?',
    resetConfirm2:
      'The people, the recurring rules, the loans and every entry go. There is no way back.',
    resetConfirm3: 'Last question. Export first if you want to keep a trace.',
    resetDone: 'Data erased',
    resetFailed: 'The erase didn’t go through. Reload the page and try again.',

    reminderTitle: 'Your last export is more than 30 days old.',
    reminderTitleNever: 'Your data is only saved in this browser.',
    reminderBody: 'The data lives in this browser. An export puts it out of harm’s way.',
    reminderDismiss: 'Later',
    reminderLabel: 'Backup reminder — swipe up to dismiss it',

    updateAvailable: 'A new version is ready.',
    updateAction: 'Reload',
  },

  dashboard: {
    balance: 'Month balance',
    income: 'Income',
    incomeLeft: 'of which %s still to come',
    incomeAllIn: 'everything is already in',
    incomeNone: 'no income this month',
    charges: 'Costs',
    chargesLeft: '%s left to pay',
    chargesAllPaid: 'everything is paid',
    chargesNone: 'nothing to pay this month',
    situation: 'Situation',
    forecast: 'Forecast',
    forecastHint: 'balance expected at month end, planned payments included',
    remaining: 'Left to live on',
    remainingHint: 'available until the next money in',
    remainingNoIncome: 'available until the end of the month',
    breakdown: 'Breakdown',
    upcoming: 'Next payments',
    inflow: 'Money in',
    outflow: 'Money out',
    noBreakdown: 'No cost or loan this month.',
    noUpcoming: 'No payment coming up.',
    noUpcomingStart:
      'No payment coming up. Write down once what comes back every month, and the next ones will appear here on their own.',
    progress: 'Day %s of %s',
    monthAhead: 'Month ahead',
    monthDone: 'Month over',

    monthStatus: 'Month progress',
    monthStatusConfirmed: 'operations confirmed',
    srMonthStatus: '%s operations confirmed out of %s.',
    srMonthStatusGo: '%s operations confirmed out of %s. See what’s left to confirm.',

    capacity: 'Saving capacity',
    capacityHint: 'income − costs − loans',
    savingLeft: '%s still available',
    savingPlaced: '%s put aside over the month',
    savingWithdrawn: '%s taken back from savings',
    showSavings: 'See where to put %s',
    spending: 'Where the money goes',
    spendingHint: 'costs and loans, savings aside',
    credits: 'Loans',
    creditsRemaining: 'capital still owed',
    creditsRunningOne: '%s loan running',
    creditsRunningMany: '%s loans running',
    showCredits: 'See the detail of the %s',
    showFamily: 'See the lines for %s',
    noCredits: 'No loan running.',
    split: 'Split',
    splitHint: 'shared costs of the month',
    showSplit: 'See the detail of the split',
    showMemberShare: 'See the detail of what there is to pay',

    memberShare: 'To pay into the pot',
    memberShareOf: 'To pay into the pot · %s',

    memberCharges: 'Own and shared',
    memberChargesOwn: 'Own costs',
    memberChargesCommon: 'Share of the pot',
    memberChargesOfWhich: 'of which %s is the share of the pot',
    srMemberCharges: '%s of costs for %s: %s of their own, %s as their share of the pot.',

    explain: 'Understanding: %s',
    showLines: 'See the lines: %s',
    info: {
      calculationLabel: 'The calculation',
      apartLabel: 'What sets it apart',
      balance: {
        lead: 'What actually happened this month, and nothing else.',
        calculation: 'Confirmed money in, minus confirmed money out.',
        apart:
          'A payment still planned doesn’t count here: it hasn’t happened. That’s the whole difference with the forecast, which counts them. A saving contribution does count as money out — the money does leave the account; it’s the saving capacity that sets it apart.',
      },
      forecast: {
        lead: 'Where the month lands if everything planned goes as planned.',
        calculation: 'The month balance, plus the payments still planned, on both sides.',
        apart:
          'The month balance sticks to what has happened; this one adds what is still to fall. Early in the month the two are far apart — that’s normal, almost nothing has happened yet.',
      },
      remaining: {
        lead: 'What you have available until the next money in, once everything falling before it is paid.',
        calculation: 'The forecast, stopped the day before the next money in.',
        apart:
          'It’s the forecast stopped earlier: that one runs to the end of the month, this one stops at the next pay. With no money in sight, the two meet — the horizon becomes the end of the month.',
      },
      memberCharges: {
        lead: 'What the month actually cost you: your own spending, plus the share of the household your income makes you carry.',
        calculation:
          'Your costs and loans in your name, plus your share of the shared costs and loans — in proportion to income. It’s the figure on the Costs tile, to the penny: this one doesn’t contradict it, it breaks it apart.',
        apart:
          'It isn’t what you pay into the pot. The transfer also carries last month’s settlement, and the instalment of an advance — when someone settled a household expense out of their savings and the household pays them back. Those two are transferred without costing the month anything: a cost is settled in the month the spending happened.',
      },
    },
    srBreakdown: 'Breakdown of costs and loans: %s',
    empty: 'This month is still empty. Open it, or add an expense.',
  },

  calendar: {
    dayLabel: '%s — %s',
    noEntry: 'no payment',
    oneEntry: '1 payment',
    someEntries: '%s payments',
    emptyDay: 'Nothing that day.',
    empty: 'No payment this month.',
    more: '+%s',

    /** Reçoit `de(formatYearMonth(ym))` — en anglais, « of April 2026 ». */
    gridLabel: 'Calendar %s',
    dayToday: 'today',
    dayOutside: 'outside the month shown',
    labelJoin: ', ',

    onePlanned: 'of which 1 planned',
    somePlanned: 'of which %s planned',

    legendDone: 'Confirmed',
    legendPlanned: 'Planned',
    legendToday: 'Today',
    legendDots: 'One dot per payment, in the colour of its category.',
    legendMore: 'The “+” counts those that don’t fit in the cell.',

    dayTotal: 'Day total',

    addLead: 'Add',
  },

  month: {
    title: 'This month',
    toConfirm: 'To confirm',
    confirmAll: 'Confirm the month',
    confirmedAll: 'Month confirmed',
    confirmOne: 'Confirm',
    confirmEntry: 'Confirm %s',
    confirmedOne: 'Payment confirmed',
    pendingMore: '… and %s more to confirm.',
    pendingShowAll: 'Show all',
    toFill: 'to fill in',
    confirmAllHint: 'Amounts still to fill in stay to be confirmed one by one.',
    openEntry: 'Edit %s',
    done: 'Everything is confirmed for this month.',
    unconfirm: 'Put back to confirm',
    unconfirmed: 'Payment put back to confirm',
    unconfirmAll: 'Put the month back to confirm',
    unconfirmAllConfirm:
      'The %s confirmed payments of this month go back to “To confirm”, with their amounts.',
    unconfirmedAll: 'Month put back to confirm',
    entries: 'This month',
    empty: 'Nothing for this month. Add your first expense.',
    emptyStart:
      'Nothing for this month. Write down once what comes back every month, and it will fill itself in.',
    groupBy: 'Group by',
    byDay: 'Day',
    byCategory: 'Category',
    byMember: 'Person',
    familyFilter: 'Area:',
    familyFilterClear: 'Remove this filter',
    show: 'Show',
    showAll: 'All',
    showOut: 'Costs',
    showIn: 'Income',
    showSaving: 'Savings',
    showEmptyOut: 'No cost confirmed this month.',
    showEmptyIn: 'No income confirmed this month.',
    showEmptySaving: 'No savings movement confirmed this month.',
    groupCountOne: '%s line',
    groupCount: '%s lines',
    today: 'today',
    collapseAll: 'Collapse all',
    expandAll: 'Expand all',
    balance: 'Balance',
    forecast: 'Forecast',
    remaining: 'Left to live on',
    progress: 'Progress',
    dayOf: 'day %s of %s',
  },

  entry: {
    add: 'Add an expense',
    addOut: 'Add an expense',
    addIn: 'Add an income',
    newOut: 'Expense',
    newIn: 'Income',
    edit: 'Edit the entry',
    editOut: 'Edit the expense',
    editIn: 'Edit the income',
    addedOut: 'Expense added',
    addedIn: 'Income added',
    updatedOut: 'Expense updated',
    updatedIn: 'Income updated',
    removedOut: 'Expense deleted',
    removedIn: 'Income deleted',
    remove: 'Delete the entry',
    removeConfirm: 'It disappears from the month and the history, with no way back. Delete?',
    amount: 'Amount',
    category: 'Category',
    date: 'Date',
    label: 'Label',
    labelPlaceholder: 'Groceries',
    labelPlaceholderRecurring: 'Rent',
    categoryPlaceholder: 'Choose a category',
    shared: 'Shared cost, to split between members',
    sharedHint: 'It goes into the split in proportion to income.',
    sharedLocked:
      'Nobody claims this line: it’s shared, and split in proportion.',
    member: 'Member',
    note: 'Note',
    notePlaceholder: 'Paid in cash',
    notePlaceholderRecurring: 'Can be cancelled online',
    direction: 'Direction',

    nature: 'Kind',
    natureExpense: 'Expense',
    natureIncome: 'Income',
    natureSaving: 'Savings',
    savingMovement: 'Movement',
    savingIn: 'I put in',
    savingOut: 'I take back',
    addSaving: 'Savings movement',
    addSavingAction: 'Add a savings movement',
    editSaving: 'Edit the movement',
    addedSaving: 'Savings movement saved',
    updatedSaving: 'Savings movement updated',
    removedSaving: 'Savings movement deleted',
    newSaving: 'Savings',
    amountRequired: 'Enter an amount greater than zero.',
    categoryRequired: 'Choose a category.',
    labelRequired: 'Give this entry a label.',
    labelRequiredRecurring: 'Give this recurring rule a label.',
    memberRequired:
      'Say who this line belongs to: it isn’t part of the shared costs, so with no owner it wouldn’t appear in anyone’s month.',
    memberRequiredRecurring:
      'Say who this recurring rule belongs to: it isn’t part of the shared costs, so with no owner its payments wouldn’t appear in anyone’s month.',
    planned: 'Planned',
    confirmed: 'Confirmed',

    rhythm: 'Rhythm',
    once: 'One-off',
    recurring: 'Recurring',
    firstDate: 'First payment',
    firstDatePaid: 'This one is recorded as paid; the next ones will come up to confirm.',
    firstDatePlanned: 'It will come up to confirm, like the next ones.',
    variableAmountHint:
      'The amount will be asked for at each payment. This one serves as an order of magnitude in the meantime — for the recurring total, and for the split in proportion if it’s an income. Each costed payment takes over straight away.',

    addOperation: 'Add an operation',
    saveOperation: 'Add the operation',
    saveRecurrence: 'Add the recurring rule',
  },

  recurrences: {
    title: 'Recurring',
    add: 'Add a recurring rule',
    edit: 'Edit the recurring rule',
    added: 'Recurring rule added',
    updated: 'Recurring rule updated',
    resumed: 'Recurring rule resumed',
    deleted: 'Recurring rule deleted',
    empty: 'No recurring rule yet. Add the first one.',
    creditsHint: 'Track the capital still owed',
    stoppedBadge: 'Stopped',
    cappedBadge: 'Cap reached · waiting for room',
    nextDue: 'Next payment',
    noNextDue: 'No more payments',
    monthlyCost: 'Per month',
    annualCost: 'Per year',
    perYear: '%s per year',
    totalOut: 'Money out per month',
    totalSpending: 'Costs per month',
    totalIn: 'Income per month',
    totalSaving: 'Savings per month',
    scopeOut: 'Everyone · savings and loans included',
    scopeSpending: 'Everyone · savings aside',
    scopeIn: 'Everyone',
    scopeSaving: 'Everyone · withdrawals deducted',
    groupBy: 'Group by',
    byCategory: 'Category',
    byMember: 'Person',
    sortBy: 'Sort',
    byDue: 'Payment',
    byAmount: 'Amount',
    show: 'Show',
    showAll: 'All',
    showOut: 'Costs',
    showIn: 'Income',
    showSaving: 'Savings',
    showEmptyOut: 'No recurring cost.',
    showEmptyIn: 'No recurring income.',
    showEmptySaving: 'No recurring savings.',
    showAllBack: 'See everything',
    groupCountOne: '%s recurring rule',
    groupCount: '%s recurring rules',
    collapseAll: 'Collapse all',
    expandAll: 'Expand all',
    groupVariable: '%s variable',
    variableExcludedOne: '%s variable amount not counted',
    variableExcluded: '%s variable amounts not counted',
    variable: 'Variable amount',
    fixedAmount: 'Fixed amount',
    priceChanged: 'The price changed: %s → %s',
    amountChanged: 'The amount changed: %s → %s',
    priceChangedSince: 'since %s',
    stop: 'Stop the recurring rule',
    stopAction: 'Stop',
    stopConfirm:
      'Its upcoming payments are removed, the confirmed ones stay, and the rule can be resumed. Stop?',
    stopped: 'Recurring rule stopped',
    resume: 'Resume the recurring rule',
    remove: 'Delete the recurring rule',
    removeConfirm:
      'The rule disappears along with its upcoming payments. Those already confirmed stay in the history.',
    stopHint: 'Payments already confirmed stay in the history.',

    convertToOneTime: 'Change to one-off',
    convertToOneTimeConfirmSingle:
      'It becomes a single one-off entry, at the same date and amount. Nothing else changes.',
    convertToOneTimeConfirmHistory:
      'The rule stops. Payments already confirmed become independent one-off entries; those only planned disappear.',
    convertToOneTimeAction: 'Change',
    convertedToEntry: 'Changed to one-off',
    convertToOneTimeBlocked:
      'It sets the instalment of a loan or restores an advance: it changes from that record instead.',
    convertedFromEntry: 'Changed to a recurring rule',
    form: {
      amountKind: 'Amount type',
      period: 'Frequency',
      everyWeeks: 'Every how many weeks',
      everyMonths: 'Every how many months',
      everyYears: 'Every how many years',
      weekday: 'Day of the week',
      monthDay: 'Day of the month',
      startedOn: 'First payment',
      note: 'Note',
      monthDayHint:
        'A day that doesn’t exist is brought back to the last day of the month. Enter 31 to mean “the last day”, whatever the month.',
    },
    periods: {
      weekly: 'Weekly',
      everyNWeeks: 'Every n weeks',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly',
      everyNMonths: 'Every n months',
      everyNYears: 'Every n years',
    },
    /* Les gabarits reçoivent un jour déjà mis en forme — « Monday », « 15th ».
       L'anglais place l'ordinal là où le français posait « le 15 » : c'est
       `formatMonthDay` qui rend l'un ou l'autre, la phrase ne fait que
       l'accueillir. */
    summary: {
      weekly: 'every %s',
      everyNWeeks: 'on %s, every %s weeks',
      monthly: 'on the %s of each month',
      everyN: 'on the %s, every %s months',
      yearly: 'every year on %s',
      everyNYears: 'every %s years, on %s',
      lastDay: 'last day',
    },
  },

  split: {
    title: 'Split',
    subtitle: 'What everyone pays towards the shared costs, in proportion to income.',
    subtitleSolo: 'You’re on your own here: you carry the whole pot, your share is 100 %.',
    total: 'Shared costs',
    totalHint: 'planned payments included',
    share: 'Share',
    due: 'To pay',
    income: 'Income',
    checkTotal: 'Total of the shares',
    checkHint: 'The shares add up to the total, to the penny.',
    detail: 'What is shared',
    detailCountOne: '%s line',
    detailCount: '%s lines',
    collapseAll: 'Collapse all',
    expandAll: 'Expand all',
    advancedBy: 'paid up front by %s',
    settlement: 'Settlement %s',
    settlementShare: 'Share of the pot',
    settlementRefund: 'Advance repayment',
    settlementDetail: 'What was paid up front in %s',
    settlementHint:
      'These shared costs were settled by a single person. Everyone owed their share: the month catches up here, and the payments still add up to the total.',
    settlementNotACost:
      'A settlement doesn’t change what the month cost someone, only what they pay.',
    method: 'How it’s worked out',
    methodFormula: 'Each share = their income ÷ the sum of the incomes.',
    methodIncome:
      'Income comes from everyone’s salary and benefit recurring rules, brought back to the month. A one-off bonus doesn’t move it — it happens, but it says nothing about what you earn.',
    methodVariable:
      'A salary with a variable amount is worth its last costed payment, failing that its usual amount. A recurring rule left “shared” counts towards nobody’s income.',
    methodIncluded: 'The costs and loans nobody has claimed.',
    methodFlagged: 'The expenses ticked “to share”.',
    methodExcluded:
      'Savings aren’t shared: the money leaves the account, but it stays with whoever set it aside.',
    methodAdvance:
      'One exception: when someone has settled a household expense out of their savings, the instalment that pays them back is shared. It is transferred without costing the month anything — which is why a transfer can exceed what the month cost.',
    nothing: 'No shared cost this month.',
    /* Les six phrases qui suivent reçoivent `de(prénoms)`. Voir `format.de`. */
    missingOne: 'Add the income %s to split the costs.',
    missingMany: 'Add the incomes %s to split the costs.',
    missingNone: 'Add an income for everyone to split the costs.',
    missingHint:
      'A salary or benefit recurring rule in their name is enough. With a variable amount, it’s read from the last costed payment.',
    unpricedOne: 'The income %s has a variable amount and isn’t costed yet.',
    unpricedMany: 'The incomes %s have variable amounts and aren’t costed yet.',
    unpricedHint:
      'Confirm a payment, or give a usual amount on the recurring rule: the split is worked out as soon as a figure exists.',
    zeroOne: 'The income %s is declared as zero.',
    zeroMany: 'The incomes %s are declared as zero.',
    zeroHint:
      'Correct the amount on the recurring rule, or on its payment: an income of zero can’t be split, it says nothing.',
    goToIncome: 'Add an income',
    goToSubscriptions: 'See the recurring rules',
    soloTitle: 'The split needs at least one person.',
    soloHint:
      'Add the people you share with. One is enough: they then carry the whole pot.',
    goToSettings: 'Go to settings',
    srShares: 'Everyone’s shares: %s',
  },

  advances: {
    title: 'Advances',
    section: 'Advances',
    sectionHint:
      'A cost paid in one go out of savings, that you put back on your account month by month.',
    add: 'Add an advance',
    added: 'Advance added',
    deleted: 'Advance removed',
    empty: 'No advance running.',
    emptyInvite: 'No advance running. Add the first one.',
    countOne: '%s advance',
    count: '%s advances',
    remainingTotal: '%s left to put back',

    label: 'What you paid',
    labelPlaceholder: 'Car insurance',
    labelRequired: 'Give this advance a label.',
    amount: 'Amount paid',
    amountHint: 'The single payment, in full.',
    amountRequired: 'Say what you paid.',
    paidOn: 'Paid on',
    category: 'Kind of cost',
    categoryRequired: 'Say which cost this is.',
    savingSupport: 'Taken from',
    savingSupportHint: 'The account or plan that paid, and that gets rebuilt.',
    savingSupportRequired: 'Say which pot you took the money from.',
    savingSupportNone: 'Add a savings pot to record an advance.',
    member: 'Paid up front by',
    memberRequired: 'Say who paid up front: savings always belong to someone.',
    memberNone: 'Add a person to record an advance.',
    from: 'From the month of',
    to: 'To the month of',
    periodInvalid: 'The last month can’t come before the first.',

    monthly: 'Instalment',
    monthlyOf: '%s per month over %s months',
    restored: 'Already put back',
    remaining: 'Left to put back',
    settled: 'Entirely rebuilt',
    over: 'Covers %s → %s',
    remove: 'Remove the advance',
    removeConfirm:
      'The instalments already put back on the account are kept. Only the upcoming instalment stops. Remove this advance?',

    method: 'How it’s recorded',
    methodDrawdown:
      'On the day of payment, the app records a withdrawal from your savings: the account goes down by the amount advanced, and that money becomes available again.',
    methodInstalments:
      'Every month of the period, an instalment goes back to the same pot. It counts in your savings, never in your costs — the cost has already happened.',
    methodExpense:
      'The expense this withdrawal paid for is entered like any other, on its date. The app doesn’t invent it for you.',
    methodShared:
      'Ticked “to share”, the instalment goes into the shared costs: everyone carries their share in proportion, and whoever paid up front gets paid back.',

    srStatus: '%s: %s put back out of %s, %s left.',
  },

  savings: {
    title: 'Savings',

    total: 'Savings capital',
    totalHint: 'Sum of the latest valuations',
    /* Reçoit `de(nom)` — « of Andrea » —, donc le complément vient sans sa
       préposition : « Sum of the latest valuations of Andrea ». Écrire « Sum
       of %s’s valuations » rendrait « of of Andrea ». Voir `format.de`. */
    totalHintOf: 'Sum of the latest valuations %s',
    totalNone: 'No valuation yet.',
    totalMissingOne: '1 pot with no valuation',
    totalMissing: '%s pots with no valuation',
    netMonth: 'Movements this month',

    supports: 'My pots',
    analysis: 'Analysis',
    analysisHint: 'See the analysis',
    analysisPreview: '%s in %s · %s vs %s',
    analysisPreviewOnly: '%s in %s',
    supportsEmpty:
      'No savings pot. Add an account, a plan or any other pot to track its value and your contributions.',
    supportsNoMember: 'Add a person to track your savings: a pot always belongs to someone.',
    supportAdd: 'Add a pot',
    supportNew: 'New savings pot',
    supportEdit: 'Edit the pot',
    supportAdded: 'Pot added',
    supportUpdated: 'Pot updated',
    supportRemoved: 'Pot deleted',
    supportArchived: 'Pot archived',
    supportUnarchived: 'Pot reopened',

    supportLabel: 'Pot name',
    supportLabelPlaceholder: 'Savings account',
    supportLabelRequired: 'Give this pot a name.',
    supportOwner: 'Holder',
    supportOwnerPlaceholder: 'Choose a person',
    supportOwnerRequired: 'Say who these savings belong to: they always belong to someone.',
    supportKind: 'Type',
    supportKindHint: 'Used to classify the pot.',
    supportKindRequired: 'Choose a type.',
    supportPace: 'Valuation rhythm',
    supportPaceHint:
      'A savings account only moves with your contributions: one valuation a year is enough, and the app works out the rest. A share plan, a securities account or a unit-linked policy move on their own.',
    paceYearly: 'Once a year',
    paceQuarterly: 'Every quarter',
    supportRate: 'Assumed return',
    supportRateHint:
      'Optional, and only for projections: nothing here changes your capital or your totals. Left empty, the simulator applies the assumption you set on its own screen.',
    supportRateKind: 'Kind of rate',
    supportRateGuaranteed: 'Guaranteed rate',
    supportRateAssumed: 'Assumed return',
    supportRateGuaranteedHint:
      'Only use this if the rate is contractually guaranteed for the whole term you will simulate. The rate known today for a regulated savings account is not: it gets revised.',
    rateInvalid: 'Between 0 and %s%.',
    ratePerYear: '%/year',
    supportCap: 'Contribution cap',
    supportCapHint:
      'Optional. What the contract allows you to pay in altogether — €22,950 on a Livret A, say. Interest can go above it. You set it: the app knows no product.',
    capInvalid: 'Enter a cap above zero, or leave it empty.',
    capSummary: 'cap %s',
    sectionContract: 'The contract',
    sectionValue: 'The first valuation',
    sectionValueEmpty: 'Optional',
    capOver: 'Cap exceeded by %s',
    capReached: 'Cap of %s already reached',
    capRoomBody: 'There is %s left to pay in under the cap of %s.',
    capNoRoomBody: 'This contribution would go %s above it.',
    capApproximate:
      'The room is worked out from your latest valuation, interest included, so it is slightly understated. If your bank accepted it, pay in anyway.',
    capClip: 'Pay in %s',
    capAnyway: 'Pay in anyway',
    capAccepted: 'Overshoot accepted: %s above the cap.',
    capFillOne: 'The cap of %s is reached on the very first due, on %s.',
    capFillMany: 'At this rate, the cap of %s is reached on %s, at contribution number %s.',
    capFillClipped: 'That last one will be trimmed to what is left under the cap.',
    capFillNone: 'Cap of %s already reached: this rule will post no contribution.',
    capRunningOne: 'One rule still pays in here: it will post no further due.',
    capRunning: '%s rules still pay in here: they will post no further due.',
    capStopRules: 'Stop those rules',
    capRulesStopped: 'Rules stopped',
    supportNote: 'Note',
    supportNotePlaceholder: 'Emergency fund, three months of costs',
    manage: 'Managing the pot',

    value: 'Value recorded',
    valueNew: 'New value',
    valueInitial: 'First valuation',
    valueHint: 'Optional: leave empty if you don’t know it.',
    valueDate: 'Valuation date',
    valueKnown: 'Latest valuation',
    valueNone: 'No valuation yet.',
    valueNever: 'no valuation',
    valueOn: 'valued on %s',
    valueAgeOne: 'valued 1 month ago',
    valueAge: 'valued %s months ago',
    valueStale: 'to refresh · valued %s months ago',
    valueUpdate: 'Add a valuation',
    valueFirst: 'Add a first valuation',
    valueEdit: 'Correct the valuation',
    valueAdded: 'Valuation saved',
    valueUpdated: 'Valuation corrected',
    valueRemoved: 'Valuation deleted',
    valueRequired: 'Enter the value recorded.',
    valueRemove: 'Delete this valuation',
    valueRemoveConfirm:
      'This valuation disappears from the history. The pot’s movements don’t change. Delete?',
    valueMethod:
      'A valuation isn’t a movement of money: it counts neither in the month balance, nor in the contributions, nor in the saving capacity.',
    history: 'Valuation history',
    historyEmpty: 'No valuation. Add the first one to follow how its value changes.',
    historyOne: 'The curve appears from the second valuation.',
    historyMore: 'See the %s other valuations',



    valuesUpdate: 'Update the valuations',
    valuesDueOne: '1 valuation to do',
    valuesDue: '%s valuations to do',
    valuesHint: 'Only enter the values you have checked. A field left empty changes nothing.',
    valuesDateHint: 'It applies to every valuation entered below.',
    valuesAdded: '%s valuations saved',
    valuesLast: 'Latest valuation: %s · %s',
    valuesDrift: 'estimated at %s',

    estimated: 'Estimated value',
    estimatedWarning:
      'An estimate: it doesn’t account for what the market may have done since. Add a valuation to replace it with an observed figure.',
    movedSince: 'Movements since',
    movedSinceTotal: 'Paid in since the latest valuations',

    coverage: 'How long I last',
    coverageValue: '%s months',
    coverageHint: 'with no income, at an average month’s costs',
    coverageNoMonth: 'It will take a whole month to say: this one isn’t over.',
    coverageNoCharge: 'No cost over the period: there’s nothing to divide.',
    coverageMethod: 'What this figure counts',
    coverageCapital: 'Estimated capital',
    coverageMonthly: 'An average month’s costs',
    coverageOverOne: 'average over 1 month',
    coverageOver: 'average over %s months',
    coverageMethodDenominator:
      'Costs and loan instalments count: they don’t stop when the income stops. Savings contributions don’t — that’s the first thing you cut.',
    coverageMethodMonths:
      'The current month doesn’t count: it hasn’t spent everything yet, and it would make the costs look lighter than they are.',
    coverageMethodUnvalued:
      'A pot with no valuation doesn’t go into the capital: the app doesn’t know what it’s worth, and counting it as zero would be as wrong as inventing it.',

    years: 'What you set aside',
    year: 'Year',
    yearsVersus: '%s against %s',
    yearsDelta: 'Difference',
    yearsCumulative: 'Contributions accumulated since January',
    yearsEmpty: 'No year to read yet.',
    yearsPartial: '%s stops at %s: both years are read at that month.',
    yearsNoPrevious: 'Nothing paid in during %s: nothing to compare.',
    srYears: 'Accumulated contributions %s against %s, stopped at %s: %s',
    srYearsEmpty: 'Accumulated contributions %s: no data.',

    monthFlows: 'This month',
    contributions: 'Contributions',
    withdrawals: 'Withdrawals',
    net: 'Net',
    movements: 'Movements',
    movementsEmpty: 'No movement on this pot.',
    movementsMore: 'See the %s other movements',
    archived: 'Archived',
    archivedHint:
      'An archived pot no longer shows up in forms. Its valuations and movements stay.',
    archive: 'Archive the pot',
    archiveConfirm:
      'It disappears from the entry forms. Its valuations, movements and confirmed recurring rules stay. Archive?',
    archiveRunningOne: 'This pot still receives one active recurring rule.',
    archiveRunning: 'This pot still receives %s active recurring rules.',
    archiveAndStop: 'Stop the recurring rule and archive',
    archiveAndStopMany: 'Stop the recurring rules and archive',
    unarchive: 'Reopen the pot',
    remove: 'Delete the pot',
    removeConfirm:
      'This pot has no valuation, no movement and no recurring rule: it disappears without taking anything with it. Delete?',
    removeBlocked:
      'This pot has a history — valuations, movements or a recurring rule. It gets archived rather than erased.',

    support: 'Pot',
    supportRequired: 'Say which pot this movement goes through.',
    supportNone: 'No savings pot.',
    supportCreateFirst: 'Create a pot',
    unlinked: 'Not attached',
    unlinkedHint:
      'These savings movements point to no pot: they count in the month, but they don’t say where the money went. Open them to attach them.',
    contribution: 'Contribution each month',
    contributionHint: 'Optional: sets a monthly recurring rule on this pot.',
    contributionLabel: 'Contribution %s',

    srHistory: 'Value over time, from %s on %s to %s on %s.',

    flowIncome: 'Income',
    flowCharges: 'Costs',
    flowDebts: 'Loans',
    flowOwnCharges: 'Own costs',
    flowOwnDebts: 'Own loans',
    flowCommon: 'Share of the pot',
    capacity: 'Saving capacity',
    capacityHint: 'planned payments included',
    capacityNegative: 'Costs exceed income: there’s nothing to set aside this month.',

    placed: 'Breakdown of contributions',
    placedTotal: 'Paid in this month',
    placedEmpty: 'No contribution recorded this month.',
    placedUnassigned:
      'A contribution left “shared” goes into nobody’s savings. Attribute it so that it counts.',

    left: 'Still available',
    leftNone: 'The whole capacity is set aside.',
    over: 'Overshoot',
    overHint: 'contributions exceed the capacity by %s',
    rate: '%s of income set aside',
    rateNone: 'no income this month',
    withdrawn: 'More taken back than paid in this month — an advance went through.',

    method: 'Understanding the calculation',
    methodFormula: 'Capacity = income − costs − loans.',
    methodExcluded:
      'A contribution isn’t a cost: it leaves the account, but it stays with whoever makes it. So it weighs neither in the month’s costs, nor in the split.',
    methodShared:
      'The share of the shared costs that the person carries is counted in the capacity — in proportion to income, as everywhere else. The waterfall puts it on its own line, shared loans included: what’s left above is theirs alone.',
    methodBalance:
      'The month balance, for its part, counts the contribution as money out: that’s exact in cash terms, and that’s why the two figures differ.',
  },

  credits: {
    title: 'Loans and debts',
    add: 'Add a loan',
    edit: 'Edit the loan',
    open: 'Open the %s loan',
    added: 'Loan added',
    updated: 'Loan updated',
    removed: 'Loan removed from tracking',
    remove: 'Remove from tracking',
    removeConfirm:
      'The instalments already paid are kept, as is the recurring rule that sets them. Only the capital tracking stops. Remove this loan?',
    empty: 'No loan tracked. Add the first one to see what you still owe.',
    remaining: 'Capital still owed',
    principal: 'Capital borrowed',
    paid: 'Already paid',
    monthly: 'Instalment',
    rate: 'Annual rate',
    ratePlaceholder: '4.5',
    rateHint:
      'Leave empty for an interest-free loan: the capital then goes down by exactly what is paid.',
    startedOn: 'First instalment',
    endsOn: 'Last instalment',
    /* Le français accordait deux fois — « 3 mensualités restantes » —, d'où ses
       trois substitutions. L'anglais n'en accorde qu'une : la troisième valeur
       passée par l'appelant est simplement ignorée par `tpl`. */
    monthsLeft: '%s instalment%s left',
    settled: 'Settled',
    linked: 'Recurring rule that repays it',
    linkedNone: 'None — the capital won’t move',
    linkedHint:
      'It’s the recurring rule that sets the instalments and makes the capital go down. Without it, only the amount borrowed is known.',
    total: 'Left to owe',
    totalMonthly: 'Instalments',
    progress: '%s repaid',
    labelPlaceholder: 'Car loan',
    principalRequired: 'Enter the capital borrowed.',
    labelRequired: 'Give this loan a label.',
    categoryRequired: 'Choose a category.',
  },

  onboarding: {
    step: 'Step %s of 3',
    membersTitle: 'Who do you share expenses with?',
    membersHint:
      'First names are used as labels on expenses. Their incomes are set at the next step. You can skip: everything will be attributed to you.',
    membersLabel: 'First name',
    membersPlaceholder: 'Alix',
    membersAdd: 'Add',
    membersEmpty: 'Nobody yet. Add a first name, or skip.',
    membersRename: '%s’s first name',
    membersRemove: 'Remove %s',
    membersRemoveConfirm: 'Remove %s?',
    solo: 'I’m on my own',
    start: 'Start',
    privacy: 'Your data stays on this device. Nothing is sent anywhere.',
    backup:
      'That’s the trade-off too: clearing this browser erases it. Export a file from time to time, from the settings.',
    backupFragile:
      'And this browser doesn’t guarantee it will keep it. Before entering a lot, get into the habit of exporting a file: it’s the only copy that doesn’t depend on it.',

    starterTitle: 'What comes back every month',
    starterHint:
      'A single line is enough to make the app talk: it sets the payments of the months ahead and draws the forecast from them. Nothing is required here.',
    starterSalaryOf: '%s’s salary',
    starterSalarySolo: 'Your salary',
    starterRent: 'Rent, mortgage, or whatever you pay to be housed',
    starterRentHint: 'Leave empty if you pay nothing for that.',
    starterSalaryLabel: 'Salary',
    starterRentLabel: 'Rent',
    starterDayNote:
      'Set on the 1st of each month. The day, the label and the category can be adjusted afterwards from Recurring.',
    starterSkip: 'I’ll do it later',

    savingsTitle: 'Your current savings',
    savingsHint:
      'You can say where your savings are to start tracking them. Nothing is required here, and it can be added at any time from the Savings screen.',
    savingsSkip: 'I’ll do it later',
    previewSavingsEmpty:
      'With no pot here, the app tracks what you set aside each month, but not what you own. One account is enough for both to be readable.',

    backToLanding: 'Back to the tour',
    backToStep: 'Back to step %s',
    progress: 'Progress: step %s of 3',

    previewMembersEmpty:
      'With nobody here, everything is attributed to you. That’s a use in its own right, not a fallback.',
    previewMembers:
      'Their incomes are set at the next step. Once there, the shared costs are split between them in proportion.',
    previewStarterEmpty:
      'With nothing here, the month opens at zero and everything is left to enter line by line. One salary is enough for it to write itself.',
    previewStarterMonth: 'What your month will show',
    previewStarterShare: 'Everyone’s share of the rent, in proportion to income',
  },

  about: {
    what: 'What it is',
    whatBody:
      'Tout compte fait tracks your finances: what comes in, what goes out, what’s left, and who pays what.',
    whatNotBank:
      'It isn’t a bank. No account is connected to it, no statement is read: you write what you know, the app keeps the books.',
    whatOffline:
      'Once open, it works without a network and installs on the home screen like an app.',

    how: 'How it works',
    howRecurring:
      'What comes back every month is written once. Rent, subscription, salary: the app sets their payments in the months ahead.',
    howForecast:
      'The month arrives already written, as a forecast. You confirm each payment as it falls, and the balance follows.',
    howSplit:
      'Shared costs are split in proportion to income. What a single person paid up front is given back the following month.',
    howKinds:
      'Nothing is filed under bank accounts: everything is money in or money out, under one of the four kinds — income, costs, loans, contributions.',

    data: 'Your data',
    dataBody:
      'Everything is saved in this browser, and nowhere else: no account, no server, no analytics.',
    dataLimit:
      'That’s the trade-off too: clearing the browser’s data erases it, and nobody can give it back to you. Export from time to time — the app reminds you after thirty days.',

    project: 'The project',
    projectBody:
      'The code is open, under the AGPL-3.0 licence: you can read it, copy it, run it at home. On one condition — what you publish of it stays open in turn, even if you only put it online.',
    repo: 'The code on GitHub',
    license: 'The AGPL-3.0 licence',
    version: 'Version %s',
    newWindow: '(opens in a new window)',

    seeLanding: 'See the tour again',
    changelog: 'What has changed',
    docs: 'The project documentation',
  },

  legal: {
    notice: 'Legal notice',
    privacy: 'Privacy',
    terms: 'Terms of use',
    shortNotice: 'Notice',
    shortTerms: 'Terms',
    updated: 'Up to date as of %s.',
    alsoRead: 'Also worth reading',
    thirdParty: 'Third-party component licences',
    aboutLead:
      'The detail of what is recorded and what isn’t, who publishes and who hosts, and what the service promises.',
  },

  styleguide: {
    title: 'Styleguide',
    subtitle:
      'Every token and every component of the design system, in both themes and in the chosen palette.',
    sections: {
      base: 'Base palette',
      palettes: 'Palettes',
      semantic: 'Semantic tokens',
      categories: 'Category palette',
      members: 'Member palette',
      type: 'Type scale',
      shapes: 'Shapes and motion',
      components: 'Components',
      icons: 'Icons',
      kinds: 'Kinds',
      bento: 'Bento grid',
    },
    baseNote:
      'These values are never consumed directly by a component, and no palette touches them.',
    palettesNote:
      'Six identities, each in both themes. Components know nothing of them: only the token layer changes.',
    semanticNote: 'The only layer components consume.',
    categoriesNote:
      'Six hues, in this order, provided by the palette. Beyond that, the next ones fall back to grey under “Other”.',
    membersNote:
      'The same hues, minus the accent, which says shared and the active state. A member never carries it.',
    typeNote: 'Archivo for what is read, Geist Mono for utility labels.',
    shapesNote: 'Base 4px. Motion 160ms, 240ms when a view enters.',
    bentoNote: 'Allowed formats: 2×1, 2×2, 4×1, 4×2, 6×2. Nothing else.',
    iconsNote: 'Phosphor, bold weight. Two uses and not one more: to act, or to find your way.',
    iconAction: 'Action — on a control',
    iconMarker: 'Marker — tab, tile, section',
    kindsNote:
      'The direction says whether money comes in or goes out; the kind says what becomes of it. A family carries the kind, its categories inherit it.',
    themePreview: 'Forced preview',
    sampleAmount: 'Amount',
    sampleRing: 'Ring',
    sampleEmpty: 'No recurring rule yet. Add the first one.',
    sampleEmptyAction: 'Add a recurring rule',
    variants: 'Variants',
    states: 'States',
  },

  kinds: {
    resource: 'Income',
    charge: 'Costs',
    debt: 'Loans and debts',
    saving: 'Contributions',
    resourceShort: 'Income',
    chargeShort: 'Costs',
    debtShort: 'Loans',
    savingShort: 'Savings',
  },

  /* Le catalogue par défaut d'un document créé en anglais. Les libellés suivent
     le vocabulaire d'un budget de foyer, et non celui d'un plan comptable — ni
     celui de la fiscalité française : « Taxe d'habitation » n'a pas d'équivalent
     ailleurs, et une catégorie qu'on renomme au premier usage ne rend service à
     personne. Les postes qui n'existent qu'en France sont donc rendus par ce
     qu'ils sont — un impôt local. */
  defaultFamilies: {
    resources: 'Income',
    housing: 'Housing',
    communication: 'Communication',
    transport: 'Transport',
    daily: 'Everyday life',
    health: 'Health',
    family: 'Family and schooling',
    taxes: 'Taxes',
    leisure: 'Leisure and other',
    credits: 'Loans and debts',
    savings: 'Contributions',
  },

  defaultCategories: {
    salary: 'Salary, pension or benefits',
    benefits: 'Other allowances',
    familyBenefits: 'Family benefits',
    alimonyIn: 'Maintenance received',
    housingAid: 'Housing allowance',
    rentalIncome: 'Rental income',

    rent: 'Rent and service charges',
    energy: 'Utilities (electricity, gas, water)',
    homeInsurance: 'Home insurance',
    housingTax: 'Local residence tax',
    propertyTax: 'Property tax',

    mobile: 'Mobile phone',
    internet: 'Internet and landline',
    streaming: 'TV and streaming subscriptions',

    fuel: 'Fuel',
    carInsurance: 'Vehicle insurance',
    carMaintenance: 'Servicing and repairs',
    publicTransport: 'Public transport',
    tolls: 'Tolls and parking',

    groceries: 'Groceries',
    clothing: 'Clothing',
    household: 'Household products',
    hygiene: 'Hair and toiletries',

    healthInsurance: 'Health insurance',
    medical: 'Medical costs',
    pharmacy: 'Pharmacy',

    childcare: 'Childcare',
    school: 'Schooling and studies',
    alimonyOut: 'Maintenance paid',
    childActivities: 'Children’s activities',

    incomeTax: 'Income tax',
    otherTaxes: 'Licence fee and other taxes',

    outings: 'Outings and holidays',
    culture: 'Sport and culture',
    gifts: 'Donations and gifts',
    misc: 'Other',

    carLoan: 'Car',
    mortgage: 'Mortgage',
    leasing: 'Long-term lease',
    consumerLoan: 'Consumer credit',
    otherLoan: 'Other loans',

    passbook: 'Savings accounts',
    plans: 'Plans (share plan, securities account)',
    lifeInsurance: 'Life insurance',
    retirement: 'Retirement savings',
    companySavings: 'Company savings',

    legacyLeisure: 'Leisure',
    legacySubscriptions: 'Subscriptions',
    otherIncome: 'Other income',
  },

  defaults: {
    repairedCategory: 'To sort',
  },

  a11y: {
    skipToContent: 'Skip to content',
    ringLabel: 'Progress ring',
    chartCursor: 'Choose the month to read',
    chartCursorHint: 'Left and right arrows to change month, Home and End for the ends.',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    previousMonthKey: 'Previous month (←)',
    nextMonthKey: 'Next month (→)',
    newEntryKey: 'Add an expense (n)',
    calendarGridHint:
      'Arrows to change day, Home and End for the edges of the week, Page Up and Page Down to change month.',
  },
}
