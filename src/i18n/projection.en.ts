/* ============================================================================
 * Les projections, en anglais. Le rationale de chaque formule est dans
 * `projection.ts`, avec le français.
 *
 * Un mot sur le vocabulaire, parce qu'il porte tout l'écran : « hypothèse » se
 * dit ici **assumption** et non « hypothesis », qui appartient aux sciences et
 * promettrait une rigueur que le calcul n'a pas ; et « versement » se dit
 * **contribution**, comme dans le reste du catalogue — c'est le même geste que
 * `savings.contributions`, il garde donc le même mot.
 * ==========================================================================*/

import type { ProjectionStrings } from './projection'

export const en: ProjectionStrings = {
  title: 'Projections',

  lead: 'What a regular contribution becomes, under a rate you assume yourself.',
  supportsLead:
    'What your own accounts become, from what the app already knows: today’s capital, and the contributions your recurring rules make every month.',
  caveat:
    'An average rate isn’t a trajectory: at a constant rate, the calculation says what a constant rate would give, not what will happen. Nothing here is a promise, or investment advice.',
  netRate:
    'Rates are entered net: the return you expect, minus annual fees, minus the tax that will apply to the gains. The app models neither flat-rate withholding, nor social levies, nor management fees.',

  sourceAxis: 'Where the figures come from',
  sourceSupports: 'My accounts',
  sourceFree: 'Free figures',

  modeAxis: 'What you’re after',
  modeForecast: 'What it gives',
  modeTarget: 'What to pay in',

  initial: 'Starting capital',
  initialHint: 'What’s already invested. Empty, we start from zero.',
  monthly: 'Monthly contribution',
  monthlyHint: 'Counted at month end: the current month’s doesn’t earn anything yet.',
  target: 'Amount aimed for',
  targetHint: 'What you want to have at the end of the term, starting capital included.',
  duration: 'Term',
  durationYears: 'Number of years',
  durationPreset: '%s years',
  durationInvalid: 'Between %s and %s years.',
  amountInvalid: 'Unreadable amount.',
  rateInvalid: 'Between 0 and %s%.',

  scenarios: 'Rate assumptions',
  scenariosHint:
    'Up to three, at the same contributions. It’s the comparison that informs, not a figure on its own.',
  scenarioRate: 'Net annual rate',
  scenarioAdd: 'Add an assumption',
  scenarioRemove: 'Remove the assumption at %s',
  scenarioLabel: 'Assumption at %s',
  kindAxis: 'Kind of rate',
  kindGuaranteed: 'Guaranteed',
  kindAssumed: 'Assumed',
  kindGuaranteedHint: 'Known in advance and revisable — regulated savings account, euro fund.',
  kindAssumedHint: 'Nothing is promised — shares, unit-linked funds. The rate binds only you.',

  constant: 'Read in today’s money',
  constantHint:
    'Deflates the amounts by inflation, so they compare with what money is worth now.',
  inflation: 'Annual inflation',
  constantOn: 'Amounts in today’s money, inflation at %s.',

  approx: '≈ %s',
  chart: 'What it becomes',
  chartLabel: 'Capital projected over %s',
  contributed: 'What you’ll have paid in',
  interest: 'What the rate will have produced',
  contributedArea: 'Contributions to date',
  start: 'Today',

  milestones: 'At the milestones',
  milestonesHint:
    'Rounded amounts: the precision shown doesn’t exceed the precision of the calculation.',
  milestoneWhen: 'Term',
  requiredMonthly: 'Contribution required',
  totalPaid: 'Paid in all',
  targetReached: 'The starting capital is already enough: there’s nothing to pay in.',
  targetMissing: 'Enter an amount to aim for to find out how much to pay in.',
  nothingToPlot: 'Enter a monthly contribution or a starting capital.',

  supportsReads:
    'The starting point is your latest statement, plus the movements confirmed since. The contributions come from your recurring savings rules. The rate comes from you: the app knows none, and writes none of this into your data.',
  supportsOwner: 'Savings %s',
  supportsTotal: 'Total capital',
  supportsArrival: 'On arrival',
  supportsPaid: 'Today’s capital and contributions',
  supportsUnvaluedOne: '1 account has no statement: it enters neither the curve nor the total.',
  supportsUnvalued: '%s accounts have no statement: they enter neither the curve nor the total.',
  supportsNoValue:
    'None of your accounts has a statement: the app doesn’t know where to start from. Record them once — after that, your contributions add themselves.',
  supportsUnreadable: 'Unreadable entry: %s stays out of the total.',

  supportStart: 'Estimated capital %s · %s',
  supportNoValue: 'No statement — this account stays out of the curve.',
  supportIn: '%s in %s',
  supportFromRules: 'Your recurring rules put in %s a month.',
  supportNoRule:
    'No recurring rule feeds this account: the projected contribution is the one set here.',
  supportTried: 'Simulated contribution — your recurring rules don’t move (%s a month).',
  supportReset: 'Back to the real contribution',
  supportVariableOne: '1 recurring rule with a variable amount isn’t counted.',
  supportVariable: '%s recurring rules with variable amounts aren’t counted.',

  srChart: '%s: from %s today to %s in %s.',
  srScenario: 'Assumption at %s, %s',
  srContributed: 'Contributions to date: %s on arrival.',
  srPaid: 'Today’s capital and contributions: %s on arrival.',

  yearOne: '1 year',
  years: '%s years',
  monthOne: '1 month',
  months: '%s months',
  yearsAndMonths: '%s %s',

  freeNote:
    'This reading doesn’t touch your data: it starts from the figures you type, and nothing else. To start from your real accounts, pick “My accounts”.',
  plansAhead:
    'Comparing an assumption with what is actually paid in, month after month, will come later: this screen projects, it doesn’t measure the gap yet.',
}
