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
  title: 'Projections',

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

  scenarios: 'Return assumptions',
  scenariosHint:
    'Up to three, at the same contributions. Compare several assumptions rather than taking one rate for a forecast.',
  scenarioRate: 'Net annual return',
  scenarioAdd: 'Compare an assumption',
  scenarioRemove: 'Remove the assumption at %s',
  scenarioLabel: 'Assumption at %s',
  kindAxis: 'Kind of rate',
  kindGuaranteed: 'Guaranteed rate',
  kindAssumed: 'Assumed return',
  kindGuaranteedHint:
    'Only use this if the rate is contractually guaranteed for the whole term simulated. A rate known today — that of a regulated savings account — is not: it gets revised.',
  kindAssumedHint: 'Nothing is promised — shares, unit-linked funds. The rate binds only you.',

  approx: '≈ %s',
  resultIn: 'In %s',
  resultSplit: '%s paid in · %s of return',
  resultBasis: 'Simulated with %s · %s',
  perMonth: '%s/month',
  perYear: '%s/year',
  interestShare: 'The return makes up ≈ %s of the final capital.',
  targetHeading: 'To reach %s in %s',
  requiredMonthly: 'Contribution required',
  totalPaid: 'Paid in all',
  targetReached: 'The capital today is already enough: there’s nothing to pay in.',
  targetMissing: 'Enter a goal to find out how much to pay in.',
  nothingToPlot: 'Enter a monthly contribution or a capital today.',

  breakdownInitial: 'Starting capital',
  breakdownInitialFrom: 'What you already have, today.',
  breakdownPaid: 'Contributions',
  breakdownPaidFrom: '%s for %s.',
  breakdownInterest: 'Return',
  breakdownInterestFrom: '%s, compounded monthly.',
  breakdownTotal: 'Capital projected',

  chart: 'Projection',
  chartLabel: 'Capital projected over %s',
  chartAt: 'In %s',
  chartCursor: 'Reading the projection',
  contributedArea: 'Contributions',
  interest: 'Return',
  start: 'Today',

  milestones: 'See how it unfolds',
  milestonesHint:
    'Rounded amounts: the precision shown doesn’t exceed the precision of the calculation.',
  milestoneWhen: 'Term',
  splitTotal: 'Total capital',
  splitRates: 'a rate per account',
  splitBorrowed: '%s (screen assumption)',
  splitSimulated: '%s (simulated)',
  splitDated: '%s (dated rate)',
  splitOwn:
    'Each account at its own assumption; those carrying none take the screen’s.',
  chartStack: 'Capital per account',
  chartTotal: 'Total',
  srChartStack: 'From %s to %s in %s, spread across %s accounts.',

  supportRates: 'Return per account',
  supportRatesHint:
    'Each account starts from the rate set on its own page. What you change here only applies to this simulation, and doesn’t alter your savings.',
  supportRateOwn: 'Set on this account',
  supportRateDated: 'A rate change is scheduled during the simulated term.',
  supportRateBorrowed: 'No rate set: the assumption below applies.',
  supportRateSimulated: 'Changed for this simulation',
  supportRateReset: 'Restore the account’s rate',
  supportCompare: 'Compare a second rate',
  supportComparedRate: 'Second rate',
  supportCompareDrop: 'Drop the comparison',
  supportCompareHint: 'Same contributions, same term: only the return changes.',
  supportRange: 'from %s to %s',
  comparedHeading: 'With the second rates',
  comparedTotal: 'Compared capital',
  comparedGap: '%s apart. At equal contributions, the whole gap comes from the return.',
  comparedLine: 'Second rates',
  supportCap: 'Cap %s · %s left to pay in',
  supportCapFull: 'Cap %s · already reached',
  supportCapped:
    'Contributions stop at the cap during the term simulated; the capital itself keeps growing.',
  capNote:
    'The room left is worked out from today’s capital: the interest already earned counts as contributions there, so it is slightly understated.',
  screenRateHint: 'It applies to accounts that carry no rate of their own.',

  sourceParts: 'Account by account',
  sourcePartCapital: 'Capital',
  sourcePartMonthly: 'Contributions',
  sourcePartTotal: 'Total',

  effort: 'What if I paid in more?',
  effortHint: 'At the first assumption, over the same term.',
  effortCurrent: 'Current simulation',
  effortParts: 'Of which: %s',
  effortApply: 'Simulate with %s',

  constant: 'Account for inflation',
  constantHint: 'Shows the equivalent purchasing power, in today’s money.',
  inflation: 'Annual inflation',
  constantOn: 'Amounts in today’s money, inflation at %s.',
  constantExample: '%s in %s would be worth about %s of today’s money.',

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

  srChart: '%s: from %s today to %s in %s.',
  srScenario: 'Assumption at %s, %s',
  srContributed: 'Contributions to date: %s on arrival.',

  yearOne: '1 year',
  years: '%s years',
  monthOne: '1 month',
  months: '%s months',
  yearsAndMonths: '%s %s',

  plansAhead:
    'Comparing an assumption with what is actually paid in, month after month, will come later: for now the screen reads your savings, it doesn’t track them.',
}
