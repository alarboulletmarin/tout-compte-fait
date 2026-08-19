/* ============================================================================
 * La simulation, en anglais. Le rationale de chaque formule est dans
 * `projection.ts`, avec le français.
 *
 * Un mot sur le vocabulaire, parce qu'il porte tout l'écran : « hypothèse » se
 * dit ici **assumption** et non « hypothesis », qui appartient aux sciences et
 * promettrait une rigueur que le calcul n'a pas ; « versement » se dit
 * **contribution**, comme dans le reste du catalogue — c'est le même geste que
 * `savings.contributions`, il garde donc le même mot ; « rendement » se dit
 * **return**, jamais « performance », qui est le mot des plaquettes ; et
 * « cadence » se dit **frequency**, qui est ce qu'un virement programmé a.
 * ==========================================================================*/

import type { ProjectionStrings } from './projection'

export const en: ProjectionStrings = {
  title: 'Simulation',

  caveat: 'Constant-rate simulation, indicative: neither a promise nor investment advice.',

  viewAxis: 'Reading',
  viewChart: 'Chart',
  viewTable: 'Table',

  modeAxis: 'What is simulated',
  modeSimple: 'Simple',
  modeAccounts: 'My accounts',
  modeSimpleHint: 'Nothing you type here is saved to your accounts.',
  settings: 'Your simulation',
  more: 'Frequency and inflation',

  simpleStart: 'Starting capital',
  simpleStartHint: 'Left empty: it starts from zero.',
  simpleRate: 'Annual return',
  simpleRateHint:
    'No rate is guessed here: this one is yours, and it is entered net of fees and tax.',
  simpleEmpty: 'Enter a contribution or a starting capital to see the trajectory.',

  pillAccounts: 'Accounts simulated',
  accountsOne: '1 account',
  accountsMany: '%s accounts',
  pillRate: 'Return',
  pillAmount: 'Contribution',

  approx: '≈ %s',
  resultIn: 'In %s',
  splitFull: '%s to start · %s contributed · %s of return',
  splitPaid: '%s contributed · %s of return',
  rangeShort: '%s – %s',
  rangeUnknown: 'To be set',

  noSupports:
    'The simulation starts from your savings accounts: you need at least one, valued or not.',
  newSupport: 'Create a savings account',
  pickSupports: 'Tick an account to see where it goes.',

  chartLabel: 'Capital projected over %s',
  layerInitial: 'To start',
  layerPaid: 'Contributions',
  layerGain: 'Return',
  layerHigh: 'At best',
  start: 'Today',
  chartAt: 'In %s',

  tableCaption: 'Capital, year by year',
  colWhen: 'Term',
  colPaid: 'Contributed',
  colGain: 'Return',
  colTotal: 'Capital',
  colHigh: 'At best',
  tableInitial: 'Starting capital: %s, the same at every rank.',
  tableHint: 'Amounts are rounded: the precision shown never exceeds the model’s.',

  accountOwner: '%s · %s',
  accounts: 'Accounts simulated',
  accountsHint:
    'Each account runs at its own return, and the curve is the sum of those paths: there is no second calculation. Nothing you set here changes your savings.',
  accountAll: 'Tick all',
  accountNone: 'Untick all',
  accountArrival: '≈ %s on arrival',
  accountArrivalRange: '≈ %s to %s on arrival',
  accountNoValue: 'No valuation: the simulation starts from nothing.',
  accountFrom: 'Capital figures are the latest valuations, confirmed movements since included.',
  accountRulesOne: 'One recurring savings rule, brought to the chosen frequency.',
  accountRules: '%s recurring savings rules, brought to the chosen frequency.',
  accountEndingOne: 'One rule stops before the end of the term simulated: it isn’t counted.',
  accountEnding: '%s rules stop before the end of the term simulated: they aren’t counted.',
  accountVariable: 'A rule with a variable amount has no monthly figure to take.',
  accountNoRule: 'No recurring rule on this account: it’s up to you to say what you pay in.',
  accountCap: 'Cap %s · %s left to pay in',
  accountCapFull: 'Cap %s · already reached',
  accountCapped:
    'Contributions stop at the cap during the term simulated; the capital itself keeps growing.',
  capNote:
    'The room left is worked out from today’s capital: interest already earned counts as contributions, so it is slightly understated.',

  amount: 'Contribution',
  amountFromRules: 'Taken from your rules: %s',
  amountReset: 'Use %s',
  amountInvalid: 'Amount unreadable.',

  rate: 'Rate of return',
  rateAxis: 'Where the return comes from',
  rateOwn: 'The account’s rate',
  rateFlat: 'One value',
  rateRange: 'Range',
  rateOwnNote: 'Set on the account, dated: the range doesn’t apply to it.',
  rateDated: 'A rate change is scheduled during the term simulated.',
  rateFlatNote: 'Tried for this simulation only. The account itself isn’t changed.',
  rateRangeNote:
    'Two assumptions, and the gap between them is the honest answer: nobody knows the returns of the years to come.',
  rateNone: 'No rate set on this account: the range applies.',
  rateLow: 'At worst',
  rateHigh: 'At best',
  rateInvalid: 'Between 0 and %s%.',
  unitYear: '%/year',
  kindGuaranteed: 'Guaranteed rate',
  kindAssumed: 'Assumed return',

  duration: 'Term',
  durationYears: 'Custom term',
  durationOther: 'Other term',
  durationPreset: '%s years',
  durationInvalid: 'Between %s and %s years.',
  cadence: 'Contribution frequency',
  cadenceMonthly: 'Monthly',
  cadenceQuarterly: 'Quarterly',
  cadenceHalf: 'Half-yearly',
  cadenceYearly: 'Yearly',
  cadenceHint:
    'For the same effort, paying in once a year returns slightly less than paying in every month: the money spends less time earning.',
  perMonth: '%s/month',
  perQuarter: '%s/quarter',
  perHalf: '%s/half-year',
  perYear: '%s/year',

  inflationAxis: 'Which euros to read',
  inflationCurrent: 'Nominal',
  inflationConstant: 'Today’s money',
  inflation: 'Annual inflation',
  inflationHint:
    'In today’s money, each amount is deflated at its own date: a contribution made ten years from now doesn’t have the purchasing power of one made today.',
  constantOn: 'Amounts in today’s money, inflation at %s.',

  explain: 'Understanding this simulation',
  explainRate: 'A constant rate is not a path',
  explainRateBody:
    'The calculation says what a constant rate would give, not what will happen. An average return over ten years hides high years and low years, and the order they fall in changes the result. Nothing here is a promise, nor investment advice.',
  explainNet: 'Rates are entered net',
  explainNetBody:
    'The return you expect, less annual fees, less the tax that will apply to the gains. The app models neither flat-rate withholding, nor social levies, nor management fees: tax law changes, and a schedule frozen in the code would read as a wrong calculation at the first change in the law.',
  explainMethod: 'How it is worked out',
  explainMethodBody:
    'Contributions are counted at the end of each due date: this month’s doesn’t earn anything yet. The return is compounded monthly, at the rate equivalent to the annual rate entered — (1 + r) to the power 1/12, and not r/12, which would return slightly more each year than the rate announced.',
  explainSum: 'Account by account, then the sum',
  explainSumBody:
    'Every account ticked is projected with its own capital, contribution and return, and the curve above is the sum of those paths. A portfolio follows no average rate: a passbook at 2.40% and a share account at 6% don’t boil down to 4.20%, and pretending otherwise would give a figure the detail couldn’t reproduce.',
  explainInflation: 'Inflation',
  explainInflationBody:
    'The rate entered is net of fees and tax, but never net of inflation — these are two distinct layers, and the option separates them instead of merging them. In today’s money the return shown can turn negative: it is what the rate produced, less what erosion took.',
  explainRounding: 'Rounding',
  explainRoundingBody:
    'Amounts are rounded to what the model can actually say, never to the cent: “≈ €202k”. The cent on display is precisely what makes an assumption look like a measurement.',
  explainData: 'What the screen does with your data',
  explainDataBody:
    'It reads your accounts’ capital, the contributions your recurring rules pay into them, the rates you dated on them and their caps, so you don’t retype any of it. The reading goes one way only: nothing you simulate here is saved, enters a month, or leaves in an export.',

  srChart: 'From %s today to %s in %s.',
  srChartRange: 'From %s today to a range of %s to %s in %s.',
  srContributed: 'Contributions to date: %s on arrival.',

  yearOne: '1 year',
  years: '%s years',
  monthOne: '1 month',
  months: '%s months',
  yearsAndMonths: '%s %s',
}
