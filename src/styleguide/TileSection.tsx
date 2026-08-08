import { money } from '@/domain/money'
import { t } from '@/i18n/strings'
import { Amount } from '@/ui/Amount'
import { Eyebrow } from '@/ui/Eyebrow'
import { BalanceIcon } from '@/ui/Icons'
import { Ring } from '@/ui/Ring'
import { BentoGrid, Tile, type TileVariant } from '@/ui/Tile'
import { Section, SubTitle } from './Section'
import { DualTheme } from './ThemePane'

const VARIANTS: { variant: TileVariant; eyebrow: string }[] = [
  { variant: 'default', eyebrow: 'défaut' },
  { variant: 'accent', eyebrow: 'accent' },
  { variant: 'accent-2', eyebrow: 'accent 2' },
]

function TileVariants() {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {VARIANTS.map(({ variant, eyebrow }) => (
        <Tile key={variant} variant={variant}>
          <Eyebrow icon={BalanceIcon}>{eyebrow}</Eyebrow>
          <Amount value={money(12845)} size="tile" className="mt-4" />
          <p className="t-label mt-1">une lecture secondaire</p>
        </Tile>
      ))}
    </div>
  )
}

export function TileSection() {
  return (
    <Section title={t.styleguide.sections.components}>
      <SubTitle>Tile · Eyebrow</SubTitle>
      <DualTheme>
        <TileVariants />
      </DualTheme>
    </Section>
  )
}

/** Reproduit la grille de la section 5 du design system, à l'identique. */
export function BentoSection() {
  return (
    <Section title={t.styleguide.sections.bento} note={t.styleguide.bentoNote}>
      <DualTheme stacked>
        <BentoGrid>
          {/* L'ordre reproduit le schéma du DS §5 : solde 2×2, colonne €/%
              empilée au centre, répartition 2×2, puis la rangée de 2×1. */}
          <Tile span="2x2">
            <Eyebrow>solde</Eyebrow>
            <Amount value={money(128450)} size="hero" className="mt-auto" />
          </Tile>
          <Tile span="2x1">
            <Eyebrow>entrées</Eyebrow>
            <Amount value={money(320000)} size="tile" direction="in" className="mt-auto" />
          </Tile>
          <Tile span="2x2" className="items-center justify-center">
            <Ring
              size={120}
              value={0.62}
              color="var(--cat-2)"
              label="Répartition"
              srText="Logement 62 %"
            >
              <span className="t-eyebrow text-muted">62 %</span>
            </Ring>
          </Tile>
          <Tile span="2x1">
            <Eyebrow>sorties</Eyebrow>
            <Amount value={money(191550)} size="tile" direction="out" className="mt-auto" />
          </Tile>
          <Tile span="2x1">
            <Eyebrow>échéances</Eyebrow>
            <span className="t-tile-num tnum mt-auto">4</span>
          </Tile>
          <Tile span="2x1">
            <Eyebrow>jours</Eyebrow>
            <span className="t-tile-num tnum mt-auto">12</span>
          </Tile>
          <Tile span="2x1" variant="accent">
            <Eyebrow>récurrences</Eyebrow>
            <Amount value={money(4990)} size="tile" className="mt-auto" />
          </Tile>
          <Tile span="6x2">
            <Eyebrow>dépenses par jour</Eyebrow>
            <p className="t-label mt-auto">format 6×2</p>
          </Tile>
        </BentoGrid>
      </DualTheme>
    </Section>
  )
}
