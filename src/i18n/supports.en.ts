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
  evolution: 'Savings over time',
  evolutionEmpty:
    'Nothing to plot yet: the curve starts at your first valuation, and it takes two months before it says anything.',
  evolutionWindow: 'Period',
  evolutionMonths: '%s months',
  evolutionYears: '%s years',
  evolutionTotal: 'Total',
  evolutionWhen: 'Month',
  evolutionRest: '%s other pots',
  evolutionDetail: 'See the month-by-month detail',
  evolutionMethod:
    'An estimate: the dots are your valuations, the rest is derived from confirmed movements and the rate in force that month. A pot with no valuation isn’t plotted — its value is unknown, not zero.',
  srEvolution: 'Savings estimated from %s in %s to %s in %s, valuations included.',
}
