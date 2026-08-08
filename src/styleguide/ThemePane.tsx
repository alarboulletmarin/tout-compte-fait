import type { ReactNode } from 'react'
import type { PaletteSetting } from '@/domain/types'
import { t } from '@/i18n/strings'
import { cn } from '@/lib/cn'
import { useStore } from '@/store/store'

/**
 * Force un thème sur un sous-arbre. Fonctionne parce que les tokens sont
 * déclarés sur [data-theme] et exposés en `@theme inline` : les utilitaires
 * émettent `var(--bg)` et suivent donc le thème de l'ancêtre le plus proche.
 *
 * Il porte aussi la palette, et il le doit : `palettes.css` accepte qu'un
 * sous-arbre force un thème sans palette — c'est ce que fait le panneau quand il
 * montre la palette courante —, mais la poser explicitement est ce qui permet
 * d'en montrer une autre, et c'est ce dont la section des palettes a besoin.
 * Les deux attributs sur le même élément, jamais sur deux : c'est la condition
 * que `palettes.css` énonce en tête.
 */
export function ThemePane({
  theme,
  palette,
  children,
  className,
}: {
  theme: 'light' | 'dark'
  palette?: PaletteSetting
  children: ReactNode
  className?: string
}) {
  const current = useStore((s) => s.data.settings.palette)
  return (
    <div
      data-theme={theme}
      data-palette={palette ?? current}
      className={cn('rounded-tile border border-border bg-bg p-5 text-text', className)}
    >
      <p className="t-eyebrow mb-4 text-muted">
        {theme === 'light' ? t.theme.light : t.theme.dark}
      </p>
      {children}
    </div>
  )
}

/**
 * Rend le même contenu dans les deux thèmes. `stacked` empile les deux panneaux
 * au lieu de les juxtaposer : indispensable pour la grille bento, dont les
 * points de rupture regardent la fenêtre et non le conteneur.
 */
export function DualTheme({
  children,
  stacked = false,
}: {
  children: ReactNode
  stacked?: boolean
}) {
  return (
    <div className={cn('grid gap-4', !stacked && 'md:grid-cols-2')}>
      <ThemePane theme="light">{children}</ThemePane>
      <ThemePane theme="dark">{children}</ThemePane>
    </div>
  )
}
