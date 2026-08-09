/* ============================================================================
 * L'historique, en anglais. Le rationale de chaque formule est dans
 * `history.ts`, avec le français : il vaut pour les deux langues, et le recopier
 * ici en ferait deux exemplaires dont l'un finirait faux.
 * ==========================================================================*/

import type { HistoryStrings } from './history'

export const en: HistoryStrings = {
  title: 'History',
  evolution: 'Trend',
  trailing: 'Last twelve months',
  trailingRange: 'from %s to %s',
  trailingEmpty: 'Not enough data yet to draw a curve.',
  legendIn: 'Money in',
  legendOut: 'Money out',
  legendBalance: 'Balance',
  compare: 'Compare',
  compareAxis: 'What we compare',
  compareModeMonths: 'Months',
  compareModeYears: 'Years',
  compareLeft: 'Reference',
  compareRight: 'Compared',
  compareScope: 'Difference in money out, from the reference month to the compared month.',
  compareEmpty: 'These two months have no money out to compare.',
  compareSingleMonth:
    'Only one month of data so far. The comparison arrives with the second one.',
  compareChangedOne: '1 category changed',
  compareChangedMany: '%s categories changed',
  compareUnchanged: 'Unchanged',
  compareUnchangedHint: 'The same amount in both months.',
  compareNoChange: 'No variation between these two months.',
  compareAppeared: 'new',
  year: 'Year',
  yearsEmpty: 'No year to compare yet.',
  yearsVersus: '%s against %s',
  yearsDelta: 'Difference',
  yearsPartial: '%s stops at %s: both years are read at that month.',
  yearsNoPrevious: 'No data in %s: nothing to compare.',
  cumulative: 'Balance accumulated since January',
  srTrailing: 'Monthly balance: %s',
  srYears: 'Accumulated %s against %s, stopped at %s: %s',
  srYearsEmpty: 'Accumulated %s: no data.',
  srMonthRead: '%s: money in %s, money out %s, balance %s',
  srMonthNoData: '%s: no data',
  srCumulativeRead: '%s: %s',
  searchLabel: 'Search by label',
  searchPlaceholder: 'Search for a line…',
  searchHint: 'Across all months, recurring rules included.',
  searchEntries: 'Entries',
  searchRecurrences: 'Recurring rules',
  searchEmpty: 'No line matches “%s”.',
  searchMore: '… and %s more.',
  searchShowAll: 'Show all',
  empty: 'The history fills itself in, as the months go by.',
  emptyHint:
    'There’s nothing to compare yet: the curve, the difference between two months and the yearly total arrive with the first entries.',
}
