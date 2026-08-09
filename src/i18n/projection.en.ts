/* ============================================================================
 * Les projections, en anglais. Le rationale de chaque formule est dans
 * `projection.ts`, avec le français.
 *
 * Un mot sur le vocabulaire, parce qu'il porte tout l'écran : « hypothèse » se
 * dit ici **assumption** et non « hypothesis », qui appartient aux sciences et
 * promettrait une rigueur que le calcul n'a pas ; « versement » se dit
 * **contribution**, comme dans le reste du catalogue — c'est le même geste que
 * `savings.contributions`, il garde donc le même mot ; et « rendement » se dit
 * **return**, jamais « performance », qui est le mot des plaquettes.
 * ==========================================================================*/

import type { ProjectionStrings } from './projection'

export const en: ProjectionStrings = {
  title: 'Simulation',

  caveat:
    'Constant-rate simulation. This result is indicative: it is neither a promise nor investment advice.',

  modeAxis: 'What you’re after',
  modeForecast: 'Project my savings',
  modeTarget: 'Reach a goal',

  source: 'Starting point',
  sourceFree: 'Free simulation',
  sourceMine: 'All my savings',
  sourceMember: 'All the savings %s',
  sourceCapital: 'Savings today',
  sourceMonthly: 'Planned contributions',
  sourceFromOne: 'Latest valuation, confirmed movements since included.',
  sourceFrom: 'Sum of the latest valuations of %s accounts, confirmed movements since included.',
  sourceRulesOne: 'One recurring savings rule, brought back to the month.',
  sourceRules: '%s recurring savings rules, brought back to the month.',
  sourceEndingOne: 'One rule stops before the end of the term simulated: it isn’t counted.',
  sourceEnding: '%s rules stop before the end of the term simulated: they aren’t counted.',
  sourceOneOff: 'One-off contributions count towards the capital, but not towards this amount.',
  sourceNote: 'Taken from your savings. Nothing simulated here changes them.',
  sourceEdit: 'Adjust for this simulation',
  sourceNoValue: 'No valuation on this account: the simulation starts from nothing.',
  sourceUnvaluedOne: 'One account without a valuation isn’t counted in this capital.',
  sourceUnvalued: '%s accounts without a valuation aren’t counted in this capital.',
  sourceNoMonthly: 'No recurring contribution is declared: the simulation adds none.',
  sourceVariable: 'A rule with a variable amount has no monthly figure to take.',
  sourceNoRate:
    'The return stays an assumption: the app guesses none — the ones picked up are the ones you set.',

  params: 'Parameters',
  initial: 'Capital today',
  monthly: 'Monthly contribution',
  target: 'Goal',
  targetHint: 'What you want to have at the end of the term, capital today included.',
  duration: 'Term',
  durationYears: 'Custom term',
  durationOther: 'Another term',
  durationPreset: '%s years',
  durationInvalid: 'Between %s and %s years.',
  amountInvalid: 'Unreadable amount.',
  rateInvalid: 'Between 0 and %s%.',
  unitYear: '%/year',
  capacityLeft: 'Saving capacity still available this month: %s',
  capacityUse: 'Use %s',

  rate: 'Rate of return',
  rangeAxis: 'Return range',
  rangeLow: 'At the low end',
  rangeHigh: 'At the high end',
  rangeHint:
    'Two assumptions, and the gap between them is the honest answer: nobody knows the return of the years ahead.',
  rangeHintSplit:
    'It only applies to accounts with no rate. An account whose rate is set on its own page is worth the same on both sides — you said so yourself.',
  rangeShort: '%s – %s',
  rangeGap: '%s between the two assumptions.',
  rangeUnknown: 'To be set',
  rangeLowColumn: 'At the low end',
  rangeHighColumn: 'At the high end',
  kindAxis: 'Kind of rate',
  kindGuaranteed: 'Guaranteed rate',
  kindAssumed: 'Assumed return',

  approx: '≈ %s',
  resultIn: 'In %s',
  resultSplit: '%s paid in · %s of return',
  perMonth: '%s/month',
  perYear: '%s/year',
  targetHeading: 'To reach %s in %s',
  targetReached: 'The capital today is already enough: there’s nothing to pay in.',
  targetMissing: 'Enter a goal to find out how much to pay in.',
  nothingToPlot: 'Enter a monthly contribution or a capital today.',

  breakdownTotal: 'Capital projected',

  chartLabel: 'Capital projected over %s',
  chartAt: 'In %s',
  chartCursor: 'Reading the projection',
  contributedArea: 'Contributions',
  chartCapital: 'Capital projected',
  chartRange: 'Range',
  start: 'Today',

  milestones: 'See how it unfolds',
  milestonesHint:
    'Rounded amounts: the precision shown doesn’t exceed the precision of the calculation.',
  milestoneWhen: 'Term',

  accounts: 'What each account does',
  accountsHint:
    'Each account runs at its own return, and the sum of these paths is exactly the curve above: there is no second calculation.',
  accountBase: 'At the start',
  accountGain: 'Return',
  accountShown: 'Sum shown',
  accountLine: '%s at the start, %s paid in, %s of return',
  accountRange: 'Between %s and %s on arrival, depending on the return',
  accountChart: 'Path of %s',
  accountCapped: 'The contract ceiling stops contributions before the end.',
  accountPaidTable: 'See contributions, year by year',
  accountPaidHint:
    'What each account receives, accumulated from today. The return isn’t in it: this is what leaves your pocket.',
  srAccount: 'From %s to %s in %s: %s paid in, %s of return.',
  supportRates: 'Account by account',
  supportRatesHint:
    'Each account starts from the rate set on its own page, and the range only applies to those carrying none. What you change here only applies to this simulation, and doesn’t alter your savings.',
  supportRateOwn: 'Set on this account: the range doesn’t apply to it.',
  supportRateDated: 'A rate change is scheduled during the simulated term.',
  supportRateBorrowed: 'No rate set: the range applies.',
  supportRateSimulated: 'Changed for this simulation',
  supportRateReset: 'Restore the account’s rate',
  supportCap: 'Cap %s · %s left to pay in',
  supportCapFull: 'Cap %s · already reached',
  supportCapped:
    'Contributions stop at the cap during the term simulated; the capital itself keeps growing.',
  capNote:
    'The room left is worked out from today’s capital: the interest already earned counts as contributions there, so it is slightly understated.',

  sourceParts: 'Account by account',
  sourcePartCapital: 'Capital',
  sourcePartMonthly: 'Contributions',
  sourcePartTotal: 'Total',

  effort: 'What if I paid in…',
  effortHint: 'Over the same term, at the same range.',
  effortLess: 'Take away %s',
  effortMore: 'Add %s',
  effortGap: '%s on arrival.',
  effortArrival: 'that is %s',
  effortApply: 'Simulate with %s',

  constant: 'Account for inflation',
  constantHint: 'Shows the equivalent purchasing power, in today’s money.',
  inflation: 'Annual inflation',
  constantOn: 'Amounts in today’s money, inflation at %s.',

  explain: 'Understanding this projection',
  explainRate: 'A constant rate isn’t a trajectory',
  explainRateBody:
    'The calculation says what a constant rate would give, not what will happen. An average return over ten years hides high years and low ones, and the order they fall in changes the result. Nothing here is a promise, or investment advice.',
  explainNet: 'Rates are entered net',
  explainNetBody:
    'The return you expect, minus annual fees, minus the tax that will apply to the gains. The app models neither flat-rate withholding, nor social levies, nor management fees: tax rules change, and a schedule frozen into the code would read as a wrong calculation the first time the law moved.',
  explainMethod: 'How it is calculated',
  explainMethodBody:
    'Contributions are counted at month end: the current month’s doesn’t earn anything yet. The return compounds monthly, at the rate equivalent to the annual rate entered — (1 + r) to the power 1/12, not r/12, which would return slightly more each year than the rate announced.',
  explainInflation: 'Inflation',
  explainInflationBody:
    'In today’s money, each amount is deflated at its own date: a contribution made ten years from now doesn’t have the purchasing power of one made today. The rate entered is net of fees and tax, but never net of inflation — these are two distinct layers, and the option separates them instead of merging them.',
  explainRounding: 'Rounding',
  explainRoundingBody:
    'Amounts are rounded to what the model can actually say, never to the cent: “≈ €202k”. The cent on display is precisely what makes an assumption look like a measurement.',
  explainData: 'What the screen does with your data',
  explainDataBody:
    'It can read an account’s capital and the contributions your recurring rules pay into it, so you don’t retype them. The reading goes one way only: nothing you simulate here is saved, enters a month, or leaves in an export. The return is never taken from an account — you are the one who sets it.',

  srChart: 'From %s today to %s in %s.',
  srChartRange: 'From %s today to a range of %s to %s in %s.',
  srContributed: 'Contributions to date: %s on arrival.',

  yearOne: '1 year',
  years: '%s years',
  monthOne: '1 month',
  months: '%s months',
  yearsAndMonths: '%s %s',
}
