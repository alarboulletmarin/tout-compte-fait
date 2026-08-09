import type { CategoryKind } from '@/domain/types'
import { directionOfKind, isSpending } from '@/domain/types'
import { t } from '@/i18n/strings'
import { Eyebrow } from '@/ui/Eyebrow'
import { Section } from './Section'
import { DualTheme } from './ThemePane'

const KINDS: CategoryKind[] = ['resource', 'charge', 'debt', 'saving']

/**
 * Les quatre natures et ce qu'elles impliquent, côte à côte. C'est le tableau
 * qui rend visible la seule subtilité du modèle : `debt` et `saving` sortent
 * du compte toutes les deux, mais une seule est consommée.
 */
export function KindSection() {
  return (
    <Section title={t.styleguide.sections.kinds} note={t.styleguide.kindsNote}>
      <DualTheme stacked>
        <div className="overflow-x-auto">
          <table className="w-full min-w-100 border-collapse text-left">
            <thead>
              <tr className="t-axis">
                <th className="py-2 pr-3 font-normal">{t.settings.familyKind}</th>
                <th className="py-2 pr-3 font-normal">{t.entry.direction}</th>
                <th className="py-2 font-normal">{t.dashboard.spendingHint}</th>
              </tr>
            </thead>
            <tbody>
              {KINDS.map((kind) => (
                <tr key={kind} className="border-t border-border">
                  <td className="py-2 pr-3">
                    <Eyebrow>{t.kinds[kind]}</Eyebrow>
                  </td>
                  <td className="t-body py-2 pr-3">
                    {directionOfKind(kind) === 'in' ? t.direction.in : t.direction.out}
                  </td>
                  <td className="t-body py-2">{isSpending(kind) ? t.common.yes : t.common.no}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DualTheme>
    </Section>
  )
}
