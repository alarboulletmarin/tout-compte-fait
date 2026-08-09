import { PALETTES, type PaletteSetting } from '@/domain/types'
import { t } from '@/i18n/strings'
import { Section, SubTitle } from './Section'
import { ThemePane } from './ThemePane'
import {
  BASE_PALETTE,
  CATEGORY_PALETTE,
  MEMBER_PALETTE,
  SEMANTIC_TOKENS,
  type TokenEntry,
} from './tokens.data'

const paletteName = (): Record<PaletteSetting, string> => ({
  classique: t.palettes.classique,
  monochrome: t.palettes.monochrome,
  douce: t.palettes.douce,
  vive: t.palettes.vive,
  neutre: t.palettes.neutre,
  contrastee: t.palettes.contrastee,
})

function Swatch({ entry }: { entry: TokenEntry }) {
  return (
    <li className="flex flex-col gap-2">
      <span
        className="h-14 rounded-inner border border-border"
        style={{ backgroundColor: `var(${entry.name})` }}
      />
      <span className="t-axis">{entry.name}</span>
      <span className="t-label">{entry.value}</span>
    </li>
  )
}

export function BasePaletteSection() {
  return (
    <Section title={t.styleguide.sections.base} note={t.styleguide.baseNote}>
      {BASE_PALETTE.map((group) => (
        <div key={group.title} className="flex flex-col gap-3">
          <SubTitle>{group.title}</SubTitle>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {group.entries.map((entry) => (
              <Swatch key={entry.name} entry={entry} />
            ))}
          </ul>
        </div>
      ))}
    </Section>
  )
}

function SemanticList() {
  return (
    <ul className="flex flex-col gap-2">
      {SEMANTIC_TOKENS.map((entry) => (
        <li key={entry.name} className="flex items-center gap-3">
          <span
            className="size-8 shrink-0 rounded-inner border border-border"
            style={{ backgroundColor: `var(${entry.name})` }}
          />
          <span className="t-axis w-52 shrink-0">{entry.name}</span>
          <span className="t-label truncate">{entry.value}</span>
        </li>
      ))}
    </ul>
  )
}

export function SemanticTokensSection() {
  return (
    <Section title={t.styleguide.sections.semantic} note={t.styleguide.semanticNote}>
      <div className="grid gap-4 md:grid-cols-2">
        <ThemePane theme="light">
          <SemanticList />
        </ThemePane>
        <ThemePane theme="dark">
          <SemanticList />
        </ThemePane>
      </div>
    </Section>
  )
}

function SwatchRow({ entries }: { entries: TokenEntry[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
      {entries.map((entry) => (
        <Swatch key={entry.name} entry={entry} />
      ))}
    </ul>
  )
}

/* Les deux thèmes côte à côte, et non plus une seule rangée : depuis que les
   palettes existent, deux d'entre elles changent leur rampe d'un thème à
   l'autre — six pas assez sombres pour se voir sur du blanc sont invisibles sur
   un fond noir. Une rangée unique n'en montrait donc que la moitié. */
export function CategoryPaletteSection() {
  return (
    <Section title={t.styleguide.sections.categories} note={t.styleguide.categoriesNote}>
      <div className="grid gap-4 md:grid-cols-2">
        <ThemePane theme="light">
          <SwatchRow entries={CATEGORY_PALETTE} />
        </ThemePane>
        <ThemePane theme="dark">
          <SwatchRow entries={CATEGORY_PALETTE} />
        </ThemePane>
      </div>
    </Section>
  )
}

export function MemberPaletteSection() {
  return (
    <Section title={t.styleguide.sections.members} note={t.styleguide.membersNote}>
      <div className="grid gap-4 md:grid-cols-2">
        <ThemePane theme="light">
          <SwatchRow entries={MEMBER_PALETTE} />
        </ThemePane>
        <ThemePane theme="dark">
          <SwatchRow entries={MEMBER_PALETTE} />
        </ThemePane>
      </div>
    </Section>
  )
}

/**
 * Les six palettes, dans les deux thèmes.
 *
 * Chaque cellule est un `ThemePane` qui porte sa palette : c'est exactement le
 * mécanisme de l'aperçu des réglages, et le seul endroit du dépôt où les six se
 * regardent en même temps. Elle montre les rôles qui portent du sens — le fond,
 * la surface, l'accent et son texte, l'accent 2, l'alerte, et les six teintes.
 */
export function PalettesSection() {
  return (
    <Section title={t.styleguide.sections.palettes} note={t.styleguide.palettesNote}>
      <div className="flex flex-col gap-4">
        {PALETTES.map((palette) => (
          <div key={palette} className="flex flex-col gap-2">
            <SubTitle>{paletteName()[palette]}</SubTitle>
            <div className="grid gap-4 md:grid-cols-2">
              {(['light', 'dark'] as const).map((theme) => (
                <ThemePane key={theme} theme={theme} palette={palette}>
                  <div className="flex flex-col gap-3">
                    <div className="surface rounded-inner bg-surface p-3">
                      <p className="t-eyebrow text-muted">{paletteName()[palette]}</p>
                      <p className="t-tile-num tnum text-text">1 240</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="t-eyebrow rounded-chip bg-accent px-2 py-1 text-accent-fg">
                        {t.kinds.resource}
                      </span>
                      <span className="t-eyebrow rounded-chip bg-accent-2 px-2 py-1 text-accent-2-fg">
                        {t.kinds.charge}
                      </span>
                      <span className="t-eyebrow rounded-chip bg-danger-fill px-2 py-1 text-danger-fg">
                        !
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {CATEGORY_PALETTE.map((entry) => (
                        <span
                          key={entry.name}
                          className="h-4 flex-1 rounded-chip"
                          style={{ backgroundColor: `var(${entry.name})` }}
                        />
                      ))}
                    </div>
                  </div>
                </ThemePane>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}
