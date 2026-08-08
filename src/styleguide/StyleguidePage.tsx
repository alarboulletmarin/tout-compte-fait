import { PALETTES } from '@/domain/types'
import { fr } from '@/i18n/fr'
import { useStore } from '@/store/store'
import { Segmented } from '@/ui/Segmented'
import {
  BasePaletteSection,
  CategoryPaletteSection,
  MemberPaletteSection,
  PalettesSection,
  SemanticTokensSection,
} from './ColorSections'
import { ControlsSection } from './ControlsSection'
import { IconSection } from './IconSection'
import { KindSection } from './KindSection'
import { ListSection } from './ListSection'
import { RingSection } from './RingSection'
import { BentoSection, TileSection } from './TileSection'
import { ShapesSection, TypographySection } from './TypeSection'

const THEME_OPTIONS = [
  { value: 'light' as const, label: fr.theme.light },
  { value: 'dark' as const, label: fr.theme.dark },
  { value: 'system' as const, label: fr.theme.system },
]

const PALETTE_OPTIONS = PALETTES.map((value) => ({
  value,
  label: {
    classique: fr.palettes.classique,
    monochrome: fr.palettes.monochrome,
    douce: fr.palettes.douce,
    vive: fr.palettes.vive,
    neutre: fr.palettes.neutre,
    contrastee: fr.palettes.contrastee,
  }[value],
}))

/**
 * Livrable permanent : chaque token, chaque échelle typographique et chaque
 * composant du design system, dans les deux thèmes. Reste à jour tout au long
 * du projet.
 */
export function StyleguidePage() {
  const preference = useStore((s) => s.data.settings.theme)
  const setPreference = useStore((s) => s.setTheme)
  const palette = useStore((s) => s.data.settings.palette)
  const setPalette = useStore((s) => s.setPalette)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-8 md:px-8 md:py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="t-eyebrow text-muted">{fr.app.name}</p>
          <h1 className="t-hero">{fr.styleguide.title}</h1>
          <p className="t-label max-w-prose">{fr.styleguide.subtitle}</p>
        </div>
        {/* Les deux réglages d'apparence, comme sur `/apparence` : le
            nuancier montre l'app, donc il se règle comme elle. */}
        <div className="flex flex-col items-end gap-2">
          <Segmented
            options={THEME_OPTIONS}
            value={preference}
            onChange={setPreference}
            label={fr.theme.label}
          />
          <Segmented
            options={PALETTE_OPTIONS}
            value={palette}
            onChange={setPalette}
            label={fr.appearance.paletteLabel}
          />
        </div>
      </header>

      <BasePaletteSection />
      <PalettesSection />
      <SemanticTokensSection />
      <CategoryPaletteSection />
      <MemberPaletteSection />
      <TypographySection />
      <ShapesSection />
      <TileSection />
      <ListSection />
      <RingSection />
      <ControlsSection />
      <IconSection />
      <KindSection />
      <BentoSection />
    </div>
  )
}
