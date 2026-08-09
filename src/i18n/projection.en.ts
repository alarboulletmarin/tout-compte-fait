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
  caveat:
    'An average rate isn’t a trajectory: at a constant rate, the calculation says what a constant rate would give, not what will happen. Nothing here is a promise, or investment advice.',
  netRate:
    'Rates are entered net: the return you expect, minus annual fees, minus the tax that will apply to the gains. The app models neither flat-rate withholding, nor social levies, nor management fees.',

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

  srChart: '%s: from %s today to %s in %s.',
  srScenario: 'Assumption at %s, %s',
  srContributed: 'Contributions to date: %s on arrival.',

  yearOne: '1 year',
  years: '%s years',
  monthOne: '1 month',
  months: '%s months',
  yearsAndMonths: '%s %s',

  plansAhead:
    'Comparing an assumption with what is actually paid in month after month will come later: for now, this screen reads nothing from your data and writes nothing to it.',
}
