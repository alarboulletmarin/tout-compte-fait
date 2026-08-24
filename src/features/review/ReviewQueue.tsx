import { tpl } from '@/i18n/format'
import { t } from '@/i18n/strings'
import { cn } from '@/lib/cn'
import { counterLong } from './counter'
import type { ReviewLine } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Button } from '@/ui/Button'
import { Dot } from '@/ui/Dot'
import { Eyebrow } from '@/ui/Eyebrow'
import { ToConfirmIcon } from '@/ui/Icons'

/**
 * La file entière, sur écran large — et le saut direct dedans.
 *
 * **Aucune pastille d'état.** Le prototype pose une coche ou une horloge à la
 * place de la pastille de catégorie ; le DS §9.1 l'interdit sur une ligne de
 * données, qui est identifiée par ce qu'elle contient et porte déjà un
 * marqueur. Ce qui est fait se dit donc par le fond de la rangée, ce qui est en
 * cours par `aria-current` — que le lecteur d'écran annonce, quand un glyphe
 * lime ne s'annonce pas —, et chaque rangée garde la pastille de sa catégorie,
 * comme partout ailleurs dans l'app.
 *
 * Elle ne s'affiche qu'à partir de 1024px : au doigt, la même information tient
 * dans les segments de l'en-tête, et six rangées de 44px au-dessus d'une carte
 * repousseraient les trois boutons hors de l'écran.
 */
export function ReviewQueue({
  lines,
  index,
  colorOf,
  onGoTo,
  onQuit,
}: {
  lines: readonly ReviewLine[]
  index: number
  colorOf: (categoryId: string) => string
  onGoTo: (step: number) => void
  onQuit: () => void
}) {
  /* `md:p-6` : cette colonne n'existe qu'à partir de 1024px, donc toujours
     au-delà du palier où une tuile passe à 24px de cadre — elle gardait le
     rembourrage mobile d'un écran qu'elle ne voit jamais. */
  return (
    <aside className="tile hidden flex-col gap-3 p-5 md:p-6 lg:flex">
      <Eyebrow icon={ToConfirmIcon}>{t.review.title}</Eyebrow>
      <span className="t-axis">{counterLong(index, lines.length)}</span>

      <ul className="-mx-2 flex flex-col">
        {lines.map((line, step) => {
          /* « Faite » se lit sur le document, pas sur l'index : on peut
             revenir en arrière dans la file, et une ligne confirmée qu'on
             repasse reste confirmée. */
          const done = line.entry.status === 'confirmed'
          const active = step === index
          return (
            <li key={line.entry.id}>
              <button
                type="button"
                onClick={() => {
                  onGoTo(step)
                }}
                /* Le nom accessible dit le geste : six libellés nus dans la
                   liste des contrôles d'un lecteur d'écran ne disent pas qu'on
                   peut y sauter. */
                aria-label={tpl(t.review.goTo, line.entry.label)}
                {...(active ? { 'aria-current': 'step' as const } : {})}
                className={cn(
                  'flex min-h-11 w-full items-center gap-3 rounded-inner px-2 text-left',
                  'transition-colors duration-[var(--dur)] ease-ds hover:bg-surface-2',
                  active && 'bg-surface-2',
                )}
              >
                {/* La pastille de catégorie, en pointillés tant que la ligne
                    attend — c'est la convention de `ListRow`, et c'est elle qui
                    distingue le prévu du confirmé partout dans l'app. */}
                <Dot color={colorOf(line.entry.categoryId)} outlined={!done} />
                <span className={cn('t-body min-w-0 flex-1 truncate', !active && 'text-muted')}>
                  {line.entry.label}
                </span>
                <Amount value={line.entry.amount} size="label" className="shrink-0" />
              </button>
            </li>
          )
        })}
      </ul>

      <Button variant="ghost" size="sm" className="self-start" onClick={onQuit}>
        {t.review.quit}
      </Button>
    </aside>
  )
}
