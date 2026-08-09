/* ============================================================================
 * Les jalons, en toutes lettres — la lecture que la courbe ne donne pas.
 *
 * Elle n'est pas un doublon du graphique, elle en est la contrepartie : une
 * courbe se lit d'un coup d'œil et jamais au chiffre près, et sur un téléphone
 * elle ne se lit pas du tout au doigt — les périodes d'un tracé ne font pas
 * 44px (voir les écarts au DS dans `docs/ARCHITECTURE.md`). Le cahier §5 demande
 * d'ailleurs que tout graphique soit doublé d'une lecture textuelle, et c'est
 * ce tableau qui la porte ici plutôt qu'un curseur : il n'y a pas douze mois à
 * parcourir, il y a quatre rangs qui comptent.
 *
 * Un vrai `<table>`, et non une grille de `div` : ce sont des données à double
 * entrée — un rang de temps, une hypothèse — et c'est l'en-tête de colonne qui
 * dit à un lecteur d'écran de quelle hypothèse vient le montant qu'il annonce.
 * ==========================================================================*/

import { type Money, ZERO } from '@/domain/money'
import { formatRoundedMoney, tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import { useCurrency } from '@/ui/currency'
import { formatDuration } from './duration'

export type MilestoneColumn = {
  id: string
  /** L'en-tête : « 5 % · Hypothèse ». */
  label: string
  /** Un montant par jalon, dans l'ordre des jalons. */
  values: Money[]
}

export function MilestoneTable({
  marks,
  columns,
}: {
  /** Les rangs, en mois. */
  marks: readonly number[]
  columns: readonly MilestoneColumn[]
}) {
  const currency = useCurrency()

  return (
    /* Le défileur est celui du nuancier : trois hypothèses font quatre colonnes,
       et « ≈ 202 k€ » ne tient pas quatre fois dans les 250px utiles d'un
       téléphone. Il défile dans son cadre — la page, elle, ne déborde jamais. */
    <div className="overflow-x-auto">
      {/* Nommé : l'écran porte deux tableaux — les jalons et l'échelle des
          efforts —, et « tableau » annoncé deux fois de suite ne dit pas lequel
          on vient d'atteindre. */}
      <table className="w-full border-collapse text-left" aria-label={projection.milestones}>
        <thead>
          <tr className="t-axis">
            <th scope="col" className="py-2 pr-3 font-normal">
              {projection.milestoneWhen}
            </th>
            {columns.map((column) => (
              <th key={column.id} scope="col" className="py-2 pr-3 font-normal whitespace-nowrap">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {marks.map((mark, row) => (
            <tr key={mark} className="border-t border-border">
              <th scope="row" className="t-body py-2 pr-3 font-normal whitespace-nowrap">
                {formatDuration(mark)}
              </th>
              {columns.map((column) => (
                <td key={column.id} className="t-num-body tnum py-2 pr-3 whitespace-nowrap">
                  {/* Le « ≈ » sur chaque cellule, et non une fois en légende :
                      un montant recopié hors de son tableau — dans une note,
                      dans une conversation — doit emporter avec lui le fait
                      qu'il sort d'un modèle. */}
                  {tpl(projection.approx, formatRoundedMoney(column.values[row] ?? ZERO, currency))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
