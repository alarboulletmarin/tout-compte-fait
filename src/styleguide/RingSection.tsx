import { money } from '@/domain/money'
import { t } from '@/i18n/strings'
import { Amount } from '@/ui/Amount'
import { EmptyState } from '@/ui/EmptyState'
import { Ring, type RingSegment } from '@/ui/Ring'
import { Tile } from '@/ui/Tile'
import { Section, SubTitle } from './Section'
import { DualTheme } from './ThemePane'

const segments = (): RingSegment[] => [
  { id: 'logement', value: 0.42, color: 'var(--cat-1)', label: 'Logement' },
  { id: 'courses', value: 0.24, color: 'var(--cat-2)', label: 'Courses' },
  { id: 'transport', value: 0.16, color: 'var(--cat-3)', label: 'Transport' },
  { id: 'loisirs', value: 0.1, color: 'var(--cat-4)', label: 'Loisirs' },
  { id: 'autres', value: 0.08, color: 'var(--cat-rest)', label: t.common.other },
]

function Rings() {
  return (
    <Tile className="flex flex-row flex-wrap items-center gap-8">
      <Ring size={160} value={0.42} label="Progression du mois" srText="42 % du mois écoulé">
        <span className="t-eyebrow text-muted">jour 13</span>
        <span className="t-tile-num tnum">42 %</span>
      </Ring>

      <Ring
        size={160}
        segments={segments()}
        label="Répartition par catégorie"
        srText={segments().map((s) => `${s.label} ${String(Math.round(s.value * 100))} %`).join(', ')}
      >
        <Amount value={money(191550)} size="body" direction="out" />
      </Ring>

      <Ring size={160} value={0} label="Anneau vide" />
    </Tile>
  )
}

export function RingSection() {
  return (
    <Section title="Ring · EmptyState">
      <SubTitle>{t.styleguide.sampleRing}</SubTitle>
      <DualTheme>
        <Rings />
      </DualTheme>

      <SubTitle>EmptyState</SubTitle>
      <DualTheme>
        <EmptyState
          message={t.styleguide.sampleEmpty}
          actionLabel={t.styleguide.sampleEmptyAction}
          onAction={() => undefined}
        />
      </DualTheme>
    </Section>
  )
}
