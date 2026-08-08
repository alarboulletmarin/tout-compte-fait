import { useNavigate } from 'react-router-dom'
import { MORE_PATH } from '@/app/routes'
import { t } from '@/i18n/strings'
import { useStore } from '@/store/store'
import { prefersDark } from '@/theme/theme'
import { PageTitle } from '@/ui/PageTitle'
import { Segmented } from '@/ui/Segmented'
import { Tile } from '@/ui/Tile'
import { PaletteChoice } from './PaletteChoice'
import { Row, RowGroup } from '@/ui/RowGroup'

const themeOptions = () => [
  { value: 'light' as const, label: t.theme.light },
  { value: 'dark' as const, label: t.theme.dark },
  { value: 'system' as const, label: t.theme.system },
]

/**
 * Les deux réglages d'apparence, ensemble.
 *
 * Le thème a quitté la page d'entrée pour venir ici, et c'est un revirement
 * assumé : « trois positions ne méritent pas un écran » valait tant qu'il était
 * seul. Il ne l'est plus, et les deux réglages se regardent l'un l'autre — une
 * palette n'a pas la même allure en clair et en sombre, et « Sombre » ne veut
 * rien dire sans savoir de quelle palette il est le sombre. Les séparer aurait
 * fait régler les couleurs à deux endroits, dont un sans aperçu.
 *
 * Les vignettes montrent la palette **dans le thème résolu**, pas dans le thème
 * préféré : « Système » n'est pas une apparence, c'est une règle qui en désigne
 * une. Montrer six vignettes claires à quelqu'un dont le système est en sombre
 * lui promettrait ce qu'il ne verra pas.
 */
export function AppearancePage() {
  const navigate = useNavigate()
  const theme = useStore((s) => s.data.settings.theme)
  const palette = useStore((s) => s.data.settings.palette)
  const setTheme = useStore((s) => s.setTheme)
  const setPalette = useStore((s) => s.setPalette)

  const resolved = theme === 'system' ? (prefersDark() ? 'dark' : 'light') : theme

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <PageTitle
        title={t.appearance.title}
        onBack={() => {
          void navigate(MORE_PATH)
        }}
      />

      <RowGroup title={t.theme.label}>
        <Row
          label={t.theme.label}
          control={
            <Segmented
              options={themeOptions()}
              value={theme}
              onChange={setTheme}
              label={t.theme.label}
              className="w-fit"
            />
          }
        />
      </RowGroup>

      {/* La phrase est ici et non sur la page d'entrée : elle explique comment
          les deux réglages se combinent, ce qui ne se pose comme question qu'une
          fois devant eux. */}
      <Tile className="gap-3">
        <p className="t-label">{t.appearance.intro}</p>
        <PaletteChoice value={palette} onChange={setPalette} theme={resolved} />
      </Tile>
    </div>
  )
}
