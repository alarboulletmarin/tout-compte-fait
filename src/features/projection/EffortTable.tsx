/* ============================================================================
 * « Et si je verse davantage ? » — la seule lecture actionnable du mode direct.
 *
 * « Combien j'aurai » se contemple ; « ce que 150 € de plus par mois
 * changeraient » se décide. C'est la question que la deuxième moitié d'une
 * projection pose vraiment, et à laquelle aucun chiffre unique ne répond : la
 * capitalisation est convexe, donc l'intuition se trompe toujours dans le même
 * sens — on sous-estime ce qu'un effort supplémentaire produit sur vingt ans.
 *
 * **Elle ne recommande rien.** Les barreaux sont des multiples du versement en
 * cours, pas des paliers que l'app jugerait raisonnables : il n'y a ni montant
 * conseillé, ni « effort recommandé », ni profil. Le versement simulé reste dans
 * la liste, marqué, pour qu'on sache d'où l'on part — sans lui, quatre montants
 * voisins ne se distingueraient pas.
 *
 * Un vrai `<table>` : ce sont des données à deux colonnes dont l'une nomme
 * l'autre, et c'est l'en-tête qui dit à un lecteur d'écran ce qu'annonce le
 * montant de droite.
 * ==========================================================================*/

import { formatMoney, formatRoundedMoney, tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import { useCurrency } from '@/ui/currency'
import type { EffortRung } from './model'

export function EffortTable({ rungs }: { rungs: readonly EffortRung[] }) {
  const currency = useCurrency()

  return (
    <table className="w-full border-collapse text-left" aria-label={projection.effort}>
      <thead>
        <tr className="t-axis">
          <th scope="col" className="py-2 pr-3 font-normal">
            {projection.monthly}
          </th>
          <th scope="col" className="py-2 text-right font-normal">
            {projection.breakdownTotal}
          </th>
        </tr>
      </thead>
      <tbody>
        {rungs.map((rung) => (
          <tr key={rung.monthly} className="border-t border-border">
            <th scope="row" className="t-num-body tnum py-2 pr-3 font-normal whitespace-nowrap">
              {/* Le versement s'écrit exactement : c'est une décision, pas une
                  sortie de modèle — les barreaux sont déjà arrondis à un pas
                  lisible, et celui qu'on simule doit se relire au chiffre près,
                  sans quoi il cesserait d'être reconnaissable. */}
              {tpl(projection.perMonth, formatMoney(rung.monthly, currency, false))}
              {/* Le barreau qu'on simule se dit par le mot, jamais par la seule
                  graisse ou la seule teinte (DS §2.3) : une distinction qui ne
                  survit pas au niveau de gris n'en est pas une. */}
              {rung.current && (
                <span className="t-label ml-2 font-normal">{projection.effortCurrent}</span>
              )}
            </th>
            <td className="t-num-body tnum py-2 text-right whitespace-nowrap">
              {/* Le « ≈ » sur chaque cellule : un montant recopié hors de son
                  tableau doit emporter avec lui le fait qu'il sort d'un modèle. */}
              {tpl(projection.approx, formatRoundedMoney(rung.arrival, currency))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
