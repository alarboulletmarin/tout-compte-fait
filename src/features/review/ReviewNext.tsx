import { type YearMonth, parseISO } from '@/domain/date'
import type { Entry } from '@/domain/types'
import { de, formatMonthDay, formatMonthName, tpl } from '@/i18n/format'
import { t } from '@/i18n/strings'
import { useCategoryMap, useCurrentYm, useMonthEntries } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Button } from '@/ui/Button'
import { Dot } from '@/ui/Dot'
import { Eyebrow } from '@/ui/Eyebrow'
import { NavMonth } from '@/ui/Icons'
import { Tile } from '@/ui/Tile'

/**
 * Ce qui suit le bilan : le mois d'après, déjà rempli.
 *
 * C'est le dernier écran de la tâche, et il a une fin explicite — « tu as fini,
 * rien d'autre à faire ici ». Un parcours qui se termine sans le dire renvoie
 * chercher ce qu'on aurait oublié.
 *
 * Il lit le mois **courant**, et non un mois qu'on lui passerait : « fermer
 * août » a déjà fait passer le curseur à septembre, ce qui l'ouvre au passage —
 * l'ouverture d'un mois n'est jamais une tâche pour l'utilisateur. La liste
 * qu'on voit ici est donc celle que le mois montrera dans un instant, aux mêmes
 * lignes et aux mêmes montants.
 */
export function ReviewNext({ closed, onOpen }: { closed: YearMonth; onOpen: () => void }) {
  const ym = useCurrentYm()
  const entries = useMonthEntries()
  const categories = useCategoryMap()
  const month = formatMonthName(ym)
  /* La phrase de fin nomme le mois qu'on vient de fermer, pas celui qui
     s'ouvre : c'est de celui-là qu'on a fini. */
  const done = formatMonthName(closed)

  const planned = entries
    .filter((entry: Entry) => entry.status === 'planned')
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  const empty = planned.length === 0

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Tile variant="accent" className="gap-3">
        <Eyebrow icon={NavMonth}>{month}</Eyebrow>
        <span className="t-tile-num">
          {/* Le mois passe par `de()` et non tel quel : `Intl` rend « septembre »
              en minuscule, et une phrase française ne commence pas par là. Le
              dépôt n'a aucun helper de capitalisation, et c'est juste — la
              tournure se règle dans la phrase, pas dans le formateur. */}
          {tpl(empty ? t.review.nextEmpty : t.review.nextTitle, de(month))}
        </span>
        <p className="t-body max-w-[44ch]">
          {empty
            ? t.review.nextEmptyBody
            : tpl(
                planned.length === 1 ? t.review.nextBodyOne : t.review.nextBody,
                planned.length,
              )}
        </p>
      </Tile>

      {!empty && (
        <ul className="tile flex flex-col p-0">
          {planned.map((entry) => (
            /* Pas de `ListRow` : celle-ci porte trois colonnes — le libellé, le
               jour, le montant — quand `ListRow` en range deux et met la date
               sous le libellé. À cette place, le jour est la seule chose qu'on
               parcourt du regard, il doit s'aligner. */
            <li
              key={entry.id}
              /* `px-5` : le retrait d'une liste dans une tuile vaut 20px
                 partout ailleurs, et la tuile accentuée juste au-dessus le
                 tient. */
              className="flex min-h-14 items-center gap-3 border-t border-border px-5 first:border-t-0"
            >
              <Dot color={categories.get(entry.categoryId)?.color ?? 'var(--cat-rest)'} outlined />
              <span className="t-body min-w-0 flex-1 truncate">{entry.label}</span>
              <span className="t-axis tnum shrink-0">
                {formatMonthDay(parseISO(entry.date).d)}
              </span>
              <Amount value={entry.amount} size="body" className="shrink-0" />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3">
        <Button full onClick={onOpen}>
          {tpl(t.review.nextOpen, month)}
        </Button>
        <span className="t-axis text-center">{tpl(t.review.nextDone, done)}</span>
      </div>
    </div>
  )
}
