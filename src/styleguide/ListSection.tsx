import { useState } from 'react'
import { money } from '@/domain/money'
import { t } from '@/i18n/strings'
import { Amount } from '@/ui/Amount'
import { Chip } from '@/ui/Chip'
import { CategoriesIcon } from '@/ui/Icons'
import { ListRow } from '@/ui/ListRow'
import { MonthNav } from '@/ui/MonthNav'
import { Row, RowGroup } from '@/ui/RowGroup'
import { Tile } from '@/ui/Tile'
import { Section, SubTitle } from './Section'
import { DualTheme } from './ThemePane'

const CHIPS = [
  { id: 'logement', label: 'Logement', color: 'var(--cat-1)' },
  { id: 'courses', label: 'Courses', color: 'var(--cat-2)' },
  { id: 'transport', label: 'Transport', color: 'var(--cat-3)' },
  { id: 'loisirs', label: 'Loisirs', color: 'var(--cat-4)' },
]

function Chips() {
  const [active, setActive] = useState('courses')
  return (
    <div className="flex flex-wrap gap-2">
      {CHIPS.map((chip) => (
        <Chip
          key={chip.id}
          color={chip.color}
          active={active === chip.id}
          onClick={() => {
            setActive(chip.id)
          }}
        >
          {chip.label}
        </Chip>
      ))}
      <Chip>{t.common.all}</Chip>
    </div>
  )
}

function Rows() {
  return (
    <Tile className="flex flex-col">
      <ListRow
        color="var(--cat-1)"
        label="Loyer"
        meta="mensuel · le 5"
        trailing={<Amount value={money(95000)} direction="out" />}
      />
      <ListRow
        color="var(--cat-3)"
        label="Salaire"
        meta="mensuel · le 28"
        trailing={<Amount value={money(240000)} direction="in" />}
      />
      <ListRow
        color="var(--cat-4)"
        label="Récurrence musique"
        meta="12/07"
        planned
        trailing={<Amount value={money(1099)} direction="out" />}
      />
    </Tile>
  )
}

/**
 * Le groupe de rangées : une tuile, son étiquette, des filets — et trois formes
 * de rangée, parce que ce sont trois éléments HTML différents. Un lien quand
 * elle mène ailleurs, un bouton quand elle agit sur place, un bloc quand elle ne
 * fait que se lire. C'est ce qui décide de la présence du chevron.
 */
function Group() {
  return (
    <RowGroup title="Groupe de rangées" icon={CategoriesIcon}>
      <Row label="Mène ailleurs" description="Un lien, donc un chevron" to="/styleguide" />
      <Row
        label="Agit sur place"
        description="Un bouton, chevron compris"
        onClick={() => undefined}
      />
      <Row label="Se lit seulement" description="Ni lien ni bouton, donc pas de chevron" />
    </RowGroup>
  )
}

function Nav() {
  const [value, setValue] = useState('2026-07')
  return <MonthNav value={value} onChange={setValue} className="max-w-xs" />
}

export function ListSection() {
  return (
    <Section title="Chip · ListRow · RowGroup · MonthNav">
      <div className="flex flex-col gap-3">
        <SubTitle>Chip</SubTitle>
        <DualTheme>
          <Chips />
        </DualTheme>
      </div>

      <div className="flex flex-col gap-3">
        <SubTitle>ListRow</SubTitle>
        <DualTheme>
          <Rows />
        </DualTheme>
      </div>

      <div className="flex flex-col gap-3">
        <SubTitle>RowGroup</SubTitle>
        <DualTheme>
          <Group />
        </DualTheme>
      </div>

      <div className="flex flex-col gap-3">
        <SubTitle>MonthNav</SubTitle>
        <DualTheme>
          <Nav />
        </DualTheme>
      </div>
    </Section>
  )
}
