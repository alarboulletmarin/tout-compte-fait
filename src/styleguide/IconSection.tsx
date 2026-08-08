import { t } from '@/i18n/strings'
import * as Icons from '@/ui/Icons'
import type { IconComponent } from '@/ui/Icons'
import { Section, SubTitle } from './Section'
import { DualTheme } from './ThemePane'

/* Le catalogue entier, rangé par emploi. Ces deux listes sont ce que le DS §9
   autorise : ajouter un glyphe ailleurs, c'est décorer.

   Entier au sens strict, et c'est ce qui les rend utiles : huit exports y
   manquaient, dont deux qui doublaient un glyphe déjà présent. Un catalogue
   incomplet ne montre pas les doublons, il les cache — c'est en posant les
   vingt-cinq repères côte à côte qu'on voit deux fois le même trait.
   `Icons.test.tsx` tient l'autre bout : aucun export ne peut rendre le même
   glyphe qu'un autre. */

const ACTION: [string, IconComponent][] = [
  ['ChevronLeft', Icons.ChevronLeft],
  ['ChevronRight', Icons.ChevronRight],
  ['ChevronDown', Icons.ChevronDown],
  ['Plus', Icons.Plus],
  ['Close', Icons.Close],
  ['Check', Icons.Check],
  ['Warning', Icons.Warning],
  ['InfoIcon', Icons.InfoIcon],
  ['ExternalIcon', Icons.ExternalIcon],
]

const MARKER: [string, IconComponent][] = [
  ['NavMonth', Icons.NavMonth],
  ['NavCalendar', Icons.NavCalendar],
  ['NavSettings', Icons.NavSettings],
  ['RecurrencesIcon', Icons.RecurrencesIcon],
  ['HistoryIcon', Icons.HistoryIcon],
  ['BalanceIcon', Icons.BalanceIcon],
  ['IncomeIcon', Icons.IncomeIcon],
  ['ChargesIcon', Icons.ChargesIcon],
  ['ForecastIcon', Icons.ForecastIcon],
  ['RemainingIcon', Icons.RemainingIcon],
  ['BreakdownIcon', Icons.BreakdownIcon],
  ['SavingsIcon', Icons.SavingsIcon],
  ['UpcomingIcon', Icons.UpcomingIcon],
  ['CreditsIcon', Icons.CreditsIcon],
  ['SplitIcon', Icons.SplitIcon],
  ['ToConfirmIcon', Icons.ToConfirmIcon],
  ['EntriesIcon', Icons.EntriesIcon],
  ['HouseholdIcon', Icons.HouseholdIcon],
  ['PeopleIcon', Icons.PeopleIcon],
  ['CategoriesIcon', Icons.CategoriesIcon],
  ['SearchIcon', Icons.SearchIcon],
  ['ThemeIcon', Icons.ThemeIcon],
  ['DataIcon', Icons.DataIcon],
  ['DeviceIcon', Icons.DeviceIcon],
  ['CompareIcon', Icons.CompareIcon],
  ['YearsIcon', Icons.YearsIcon],
]

function Grid({ items }: { items: [string, IconComponent][] }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-2">
      {items.map(([name, Icon]) => (
        <li
          key={name}
          className="flex flex-col items-center gap-2 rounded-inner bg-surface-2 p-3 text-center"
        >
          <Icon size={22} />
          <span className="t-axis w-full truncate">{name}</span>
        </li>
      ))}
    </ul>
  )
}

export function IconSection() {
  return (
    <Section title={t.styleguide.sections.icons} note={t.styleguide.iconsNote}>
      <DualTheme stacked>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <SubTitle>{t.styleguide.iconAction}</SubTitle>
            <Grid items={ACTION} />
          </div>
          <div className="flex flex-col gap-2">
            <SubTitle>{t.styleguide.iconMarker}</SubTitle>
            <Grid items={MARKER} />
          </div>
        </div>
      </DualTheme>
    </Section>
  )
}
