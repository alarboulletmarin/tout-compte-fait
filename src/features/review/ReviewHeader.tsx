import { tpl } from '@/i18n/format'
import { t } from '@/i18n/strings'
import { IconButton } from '@/ui/Button'
import { Close } from '@/ui/Icons'
import { StepBar } from '@/ui/StepBar'

/**
 * L'en-tête de la revue au doigt : sortir, où l'on en est, combien il reste.
 *
 * Les segments viennent de `ui/StepBar` : l'écriture d'une règle et les
 * questions du premier lancement posent la même file, et trois barres dessinées
 * à la main auraient fini par diverger d'une teinte. Ils sont décoratifs et le
 * disent — c'est le compteur d'à côté qui porte l'avancement (DS §8).
 *
 * Il n'existe qu'en dessous de 1024px : au-delà, la colonne de gauche montre la
 * file entière, avec le libellé de chaque ligne et un saut direct. Deux
 * représentations du même avancement côte à côte n'en font pas une meilleure.
 */
export function ReviewHeader({
  index,
  total,
  onQuit,
}: {
  /** Rang de la carte affichée, à partir de zéro. */
  index: number
  total: number
  onQuit: () => void
}) {
  /* Sans retrait : le compteur juste dessous est à ras du cadre de page, et
     douze pixels de plus rentraient la croix et la barre par rapport à lui.
     C'est la mise en page de `RecurrenceQuickPage.Progress`. */
  return (
    <div className="flex items-center gap-3 lg:hidden">
      <IconButton label={t.review.quit} onClick={onQuit}>
        <Close />
      </IconButton>
      <StepBar index={index} total={total} />
      <span className="t-axis tnum shrink-0">
        {tpl(t.review.counter, Math.min(index + 1, total), total)}
      </span>
    </div>
  )
}
