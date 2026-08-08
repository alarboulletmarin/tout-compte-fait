import { useId } from 'react'
import { PALETTES, type PaletteSetting } from '@/domain/types'
import { t } from '@/i18n/strings'
import { cn } from '@/lib/cn'
import type { ResolvedTheme } from '@/theme/theme'
import { PalettePreview } from './PalettePreview'

const paletteName = (): Record<PaletteSetting, string> => ({
  classique: t.palettes.classique,
  monochrome: t.palettes.monochrome,
  douce: t.palettes.douce,
  vive: t.palettes.vive,
  neutre: t.palettes.neutre,
  contrastee: t.palettes.contrastee,
})

const paletteHint = (): Record<PaletteSetting, string> => ({
  classique: t.palettes.classiqueHint,
  monochrome: t.palettes.monochromeHint,
  douce: t.palettes.douceHint,
  vive: t.palettes.viveHint,
  neutre: t.palettes.neutreHint,
  contrastee: t.palettes.contrasteeHint,
})

/**
 * Le choix de palette : six vignettes, et la case native derrière chacune.
 *
 * **Des `<input type="radio">` plutôt qu'un `Segmented`**, et pour deux raisons.
 * La première tient à la place : six positions en pilules ne tiennent pas dans
 * les 250px utiles d'un téléphone à 320, et une palette ne se choisit pas à la
 * lecture de son nom — il faut la voir, donc chaque option est une vignette et
 * non un mot. La seconde tient au clavier : un groupe de radios natif apporte
 * les flèches, le point de tabulation unique et l'annonce « 3 sur 6 » sans une
 * ligne à écrire, là où `Segmented` a dû les reproduire à la main. C'est la même
 * règle que `Checkbox`, qui garde sa case native masquée sous son carré.
 *
 * Le `<fieldset>` nomme le groupe ; l'aperçu est `aria-hidden` et le nom
 * accessible de chaque option est son libellé et sa phrase — une image de
 * couleurs ne s'annonce pas, et « Douce, les mêmes familles moins saturées »
 * dit ce qu'on choisit.
 */
export function PaletteChoice({
  value,
  onChange,
  theme,
}: {
  value: PaletteSetting
  onChange: (palette: PaletteSetting) => void
  theme: ResolvedTheme
}) {
  const name = useId()

  return (
    <fieldset className="min-w-0">
      <legend className="t-label mb-2">{t.appearance.paletteLabel}</legend>
      {/* Deux colonnes au pouce, trois dès qu'il y a la place : une vignette
          sous 140px ne montre plus ses quatre pastilles. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {PALETTES.map((palette) => {
          const active = palette === value
          return (
            <label
              key={palette}
              className={cn(
                'relative flex cursor-pointer flex-col gap-1 rounded-inner border p-1.5',
                'transition-colors duration-[var(--dur)] ease-ds',
                /* La case native est masquée, donc l'anneau de focus se pose sur
                   la vignette : c'est elle qu'on voit, et le DS §8 demande que
                   le focus se voie sur tout élément interactif. */
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
                'has-[:focus-visible]:outline-[var(--focus)]',
                /* L'option retenue se marque par sa bordure et non par un fond :
                   un fond en accent recouvrirait l'aperçu, qui est justement ce
                   qu'on est venu regarder. */
                active ? 'border-accent-2 bg-surface-2' : 'border-border hover:bg-surface-2',
              )}
            >
              <input
                type="radio"
                name={name}
                value={palette}
                checked={active}
                onChange={() => {
                  onChange(palette)
                }}
                /* Transparente mais pleine taille, comme la case de `Checkbox` :
                   c'est elle qui porte l'état pour un lecteur d'écran, répond
                   aux flèches et prend le focus. À taille nulle elle resterait
                   activable par son étiquette, mais elle cesserait d'être une
                   cible — or c'est la vignette entière qu'on vise au pouce, et
                   le §8 veut 44px. */
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <PalettePreview palette={palette} theme={theme} />
              <span className="t-num-label px-0.5 text-text">{paletteName()[palette]}</span>
              <span className="t-label px-0.5">{paletteHint()[palette]}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
