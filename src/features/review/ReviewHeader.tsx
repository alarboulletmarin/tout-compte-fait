import { tpl } from '@/i18n/format'
import { t } from '@/i18n/strings'
import { cn } from '@/lib/cn'
import { IconButton } from '@/ui/Button'
import { Close } from '@/ui/Icons'

/**
 * L'en-tête de la revue au doigt : sortir, où l'on en est, combien il reste.
 *
 * **Les segments sont décoratifs, et ils le disent.** Ils dessinent ce que le
 * compteur écrit à côté d'eux en chiffres — les annoncer ferait lire six
 * éléments vides à un lecteur d'écran pour apprendre « trois sur six », qui est
 * déjà là. Le DS §8 pose la règle : une nuance ne porte jamais seule ce qu'elle
 * dit, et ici c'est le compteur qui la porte.
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
  return (
    <div className="flex items-center gap-3 px-3 pt-3 lg:hidden">
      <IconButton label={t.review.quit} onClick={onQuit}>
        <Close />
      </IconButton>
      <span aria-hidden="true" className="flex flex-1 gap-1">
        {Array.from({ length: total }, (_, step) => (
          <span
            key={step}
            className={cn(
              'h-1 flex-1 rounded-chip transition-colors duration-[var(--dur)] ease-ds',
              step < index ? 'bg-accent' : step === index ? 'bg-accent-2' : 'bg-surface-2',
            )}
          />
        ))}
      </span>
      <span className="t-axis tnum shrink-0">
        {tpl(t.review.counter, Math.min(index + 1, total), total)}
      </span>
    </div>
  )
}
