/* ============================================================================
 * La simulation en nombres : une ligne par année, et les trois couches de la
 * figure en colonnes.
 *
 * **Ce n'est pas le doublage d'un graphique, c'est l'autre moitié de l'écran.**
 * Le cahier §5 demande que toute figure ait sa lecture textuelle, et l'app le
 * faisait jusqu'ici par un tableau replié sous la courbe — quatre jalons, qu'il
 * fallait ouvrir. Une courbe ne se lit pourtant pas au chiffre près, et
 * « combien j'aurai dans sept ans » est une question qu'on se pose vraiment :
 * le tableau est donc une **vue**, à un appui de la figure, et il porte les
 * mêmes nombres qu'elle — les mêmes séries, pas un second calcul.
 *
 * **Écrit à la main, comme les autres tableaux de l'app.** Rien ici ne se trie,
 * ne se filtre, ne se pagine ni ne se redimensionne : ce sont vingt lignes
 * connues d'avance, avec un en-tête qui reste. Une bibliothèque de tableau
 * apporterait tout ce dont on n'a pas besoin, et il faudrait quand même écrire
 * les cellules.
 *
 * **Il défile, et lui seul.** L'écran tient en une page qui ne bouge pas ; c'est
 * le corps du tableau qui prend le défilement, sous un en-tête collé. Le
 * débordement horizontal existe aussi, pour six colonnes sur 320 points — il est
 * dans le cadre du tableau, jamais dans celui de la page.
 * ==========================================================================*/

import type { Money } from '@/domain/money'
import { formatRoundedMoney, tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import { cn } from '@/lib/cn'
import { useCurrency } from '@/ui/currency'
import type { SimulationPoint } from './model'
import { formatDuration } from './duration'

export type SimulationTableProps = {
  points: readonly SimulationPoint[]
  /** Les rangs qui font une ligne — un par an, plus l'horizon. */
  marks: readonly number[]
  /** Une seule hypothèse : la colonne « au plus haut » n'a rien à dire. */
  single: boolean
  /** Le capital du premier jour — annoncé une fois, jamais en colonne. */
  initial: Money
}

export function SimulationTable({ points, marks, single, initial }: SimulationTableProps) {
  const currency = useCurrency()
  const money = (value: Money): string => formatRoundedMoney(value, currency)

  /**
   * Quatre colonnes, et le capital de départ n'en est pas une.
   *
   * Il est **constant par construction** : une colonne l'aurait répété vingt-cinq
   * fois, pour soixante-quinze pixels qui manquent ensuite à celle du capital —
   * sur un écran de 390 points, c'est la réponse elle-même qui sortait du cadre
   * par la droite. Il est donc annoncé une fois, au-dessus, et l'identité reste
   * lisible : capital = départ + versés + rendement, à tous les rangs.
   */
  const columns = [
    { id: 'paid', label: projection.colPaid } as const,
    { id: 'gain', label: projection.colGain } as const,
    { id: 'total', label: projection.colTotal } as const,
    ...(single ? [] : [{ id: 'high', label: projection.colHigh } as const]),
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {initial > 0 && <p className="t-label">{tpl(projection.tableInitial, money(initial))}</p>}
      {/* `overflow-auto` sur le cadre et non sur le tableau : c'est lui qui borne
          les deux axes, et c'est à lui que l'en-tête collant se rapporte.

          **Et il prend le focus** : sous 400 points, quatre colonnes de montants
          ne tiennent pas et le cadre défile latéralement. Une zone qui défile
          sans contenir un seul élément focalisable est inatteignable au clavier
          — les flèches ne l'atteignent que si elle peut recevoir le focus
          (WCAG 2.1.1, règle `scrollable-region-focusable`). Le tableau porte
          déjà son nom dans sa légende : le cadre n'en prend pas un second, qui
          se lirait deux fois. */}
      <div tabIndex={0} className="min-h-0 flex-1 overflow-auto overscroll-contain">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{projection.tableCaption}</caption>
          <thead>
            <tr>
              {/* L'en-tête reste en place pendant que les années défilent : sur
                  vingt-cinq lignes, un tableau dont les titres sont partis ne
                  dit plus lequel des quatre montants on lit. Il porte sa propre
                  couleur de fond, sans quoi les lignes passeraient dessous.

                  La lettre de l'axe d'un graphique, et non l'étiquette d'une
                  tuile : les capitales espacées de `t-eyebrow` demandent un
                  quart de largeur de plus, et c'est la colonne du capital — la
                  réponse — qui sortait du cadre par la droite sur un téléphone. */}
              <th
                scope="col"
                className="t-axis sticky top-0 z-10 bg-surface pb-2 text-left whitespace-nowrap"
              >
                {projection.colWhen}
              </th>
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className="t-axis sticky top-0 z-10 bg-surface pb-2 pl-2 text-right whitespace-nowrap"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {marks.map((mark) => {
              const point = points[mark]
              if (point === undefined) return null
              return (
                <tr key={mark} className="border-t border-border">
                  <th scope="row" className="t-label py-1.5 font-normal whitespace-nowrap">
                    {mark === 0 ? projection.start : formatDuration(mark)}
                  </th>
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={cn(
                        't-num-label tnum py-1.5 pl-2 text-right whitespace-nowrap',
                        /* Le capital est la réponse ; les trois autres colonnes
                           la décomposent. L'œil doit pouvoir suivre une seule
                           colonne du haut en bas sans relire les titres. */
                        column.id === 'total' && 'font-semibold',
                      )}
                    >
                      {money(point[column.id])}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* La règle de l'arrondi, sous le tableau et jamais repliée : c'est là que
          l'envie de lire un centime se présente. */}
      <p className="t-label">{projection.tableHint}</p>
    </div>
  )
}
