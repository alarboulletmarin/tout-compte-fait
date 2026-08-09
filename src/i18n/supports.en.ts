/* ============================================================================
 * La fiche d'un support, en anglais. Le rationale de chaque formule est dans
 * `supports.ts`, avec le français : il vaut pour les deux langues, et le
 * recopier ici en ferait deux exemplaires dont l'un finirait faux.
 * ==========================================================================*/

import type { SupportStrings } from './supports'

export const en: SupportStrings = {
  rates: 'Return',
  ratesEmpty:
    'No rate set. Projections will use the assumption from their own screen, and the growth curve will count no interest.',
  ratesMore: 'See the %s other rates',
  rateFrom: 'since %s',
  rateFromOrigin: 'from the start',
  rateUntil: 'until %s',
  rateAhead: 'from %s',
  rateAdd: 'Change the rate',
  rateFirst: 'Set a rate',
  rateEdit: 'Correct the rate',
  rateValue: 'Net annual return',
  rateDate: 'Starting from',
  rateDateHint:
    'The previous rate doesn’t move: it runs until the day before. That’s what leaves the growth already recorded exactly as it happened.',
  rateAdded: 'Rate saved',
  rateUpdated: 'Rate corrected',
  rateRemoved: 'Rate deleted',
  rateRemove: 'Delete this rate',
  rateRemoveConfirm:
    'This step disappears. The rate before it takes back the period it covered. Delete?',
  rateMethod:
    'A rate creates no money in your document: it counts neither in your recorded capital, nor in contributions, nor in any monthly total. It feeds the projections and the growth curve, both of which state an estimate.',
  capLeft: 'Cap %s · %s left to pay in',
  capFull: 'Cap %s · reached',
  capUnknown: 'Cap %s · with no valuation, the room left is unknown',
  growth: 'Where your savings come from',
  growthEmpty:
    'Nothing to break down yet: the reading starts at your first valuation, and it takes two months before it says anything.',
  growthWindow: 'Period',
  growthMonths: '%s months',
  growthYears: '%s years',
  growthBase: 'At the start',
  growthPaid: 'Contributions',
  growthGain: 'Return',
  growthTotal: 'Value',
  growthShown: 'Sum shown',
  growthWhen: 'Month',
  growthDetail: 'See the month-by-month detail',
  growthLine: '%s at the start, %s paid in, %s earned',
  growthShare: 'that is %s of what you put in',
  growthAccounts: 'Account by account',
  growthRest: '%s other accounts, not plotted here.',
  growthChart: 'Breakdown of %s',
  growthMethod:
    'An estimate. The dots are your valuations; between them the value is derived from confirmed movements and the rate in force. The return isn’t recomputed from a rate: it is what the value did on top of what you put in, so it also catches what no rate models — and it can be negative. Everything is read over the chosen period: “at the start” is what the account was worth in its first month, not the first euro you ever put in.',
  srGrowth: 'From %s in %s to %s in %s: %s paid in, %s earned.',

  goalNew: 'New goal',
  goalEdit: 'Edit the goal',
  goalAdded: 'Goal added',
  goalUpdated: 'Goal updated',
  goalRemoved: 'Goal deleted',
  goalArchived: 'Goal filed away',
  goalUnarchived: 'Goal taken up again',
  goalLabel: 'What you’re after',
  goalLabelPlaceholder: 'Flat deposit',
  goalLabelRequired: 'Give this goal a name.',
  goalOwner: 'Holder',
  goalTarget: 'Amount targeted',
  goalTargetRequired: 'Enter an amount above zero.',
  goalDate: 'By when',
  goalDateHint:
    'Optional. Without a deadline the app says when you’ll get there; with one, it says whether you’re on time.',
  goalSupports: 'Accounts feeding it',
  goalSupportsHint:
    'This is the link to the real thing: the capital, the contributions and the rates are read from them. Nothing to retype here.',
  goalSupportsNone: 'No account attached: progress cannot be worked out.',
  goalMonthly: 'Contribution committed',
  goalMonthlyHint:
    'Optional. Left empty, what counts is the sum of your lasting savings rules on these accounts — the app already knows it.',
  goalMonthlyInvalid: 'Enter a contribution above zero, or leave it empty.',
  goalManage: 'Managing the goal',
  goalArchive: 'File this goal away',
  goalArchiveHint: 'It leaves the lists, its history stays.',
  goalUnarchive: 'Take this goal up again',
  goalRemove: 'Delete this goal',
  goalRemoveConfirm:
    'This goal disappears. Your accounts, valuations and contributions don’t move. Delete?',
  goalTargetOn: 'targeted for %s',
  goalNeeded: '+%s/month to hold the date',
  goalCurrent: 'Contribution',
  goalCurrentFrom: 'Read from your savings rules.',
  goalCurrentOwn: 'Committed on this goal.',
  goalAccounts: 'Accounts',
  goalRate: 'Assumption',
  goalRateNone: 'no rate set',
  goalRateHint:
    'An account with no rate is projected at 0%: the app guesses no return. The date shown is therefore the latest, never the earliest.',
  goalChart: 'Planned and recorded',
  goalChartLabel: 'Path of the goal up to %s',
  goalChartEmpty: 'The curve appears as soon as an attached account carries a valuation.',
  goalSrChart: 'From %s today to %s in %s, over %s valuations already recorded.',
}
