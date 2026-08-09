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

import type { Money } from '@/domain/money'
import { formatMoney, formatRoundedMoney, tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import { cn } from '@/lib/cn'
import { useCurrency } from '@/ui/currency'
import type { EffortRung } from './model'

export function EffortTable({
  rungs,
  onApply,
}: {
  rungs: readonly EffortRung[]
  /**
   * Essayer un barreau — jamais l'adopter tout seul. Absent, le tableau reste
   * la lecture muette qu'il a toujours été (DS : un geste ne s'invente pas
   * sans destination).
   */
  onApply?: (monthly: Money) => void
}) {
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
        {rungs.map((rung) => {
          /* Le versement s'écrit exactement : c'est une décision, pas une
             sortie de modèle — les barreaux sont déjà arrondis à un pas
             lisible, et celui qu'on simule doit se relire au chiffre près,
             sans quoi il cesserait d'être reconnaissable. */
          const label = tpl(projection.perMonth, formatMoney(rung.monthly, currency, false))

          return (
            <tr key={rung.monthly} className="border-t border-border">
              <th scope="row" className="t-num-body tnum py-2 pr-3 font-normal whitespace-nowrap">
                {/* Le barreau en cours ne se clique pas — c'est déjà lui —, et
                    reste un texte simple. Les autres deviennent un vrai
                    bouton : la même cible tactile que partout ailleurs (DS
                    §8), pas un `<tr onClick>` qu'un lecteur d'écran ne verrait
                    jamais. */}
                {rung.current || onApply === undefined ? (
                  <>
                    {label}
                    {/* Le barreau qu'on simule se dit par le mot, jamais par
                        la seule graisse ou la seule teinte (DS §2.3) : une
                        distinction qui ne survit pas au niveau de gris n'en
                        est pas une. */}
                    {rung.current && (
                      <span className="t-label ml-2 font-normal">{projection.effortCurrent}</span>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    aria-label={tpl(projection.effortApply, label)}
                    className={cn(
                      '-mx-3 -my-2 flex min-h-11 items-center rounded-inner px-3 py-2 text-left',
                      'transition-colors duration-[var(--dur)] ease-ds hover:bg-surface-2 active:bg-surface-2',
                    )}
                    onClick={() => {
                      onApply(rung.monthly)
                    }}
                  >
                    {label}
                  </button>
                )}
              </th>
              <td className="t-num-body tnum py-2 text-right">
                {/* Le « ≈ » sur chaque cellule : un montant recopié hors de son
                    tableau doit emporter avec lui le fait qu'il sort d'un modèle. */}
                <span className="whitespace-nowrap">
                  {tpl(projection.approx, formatRoundedMoney(rung.arrival, currency))}
                </span>
                {/* Où l'effort tombe, quand il y a plusieurs comptes. Dans la
                    même cellule et non en colonnes : quatre comptes feraient six
                    colonnes, et « ≈ 202 k€ » ne tient pas six fois dans les 250px
                    utiles d'un téléphone. L'en-tête de ligne nomme déjà le
                    barreau pour un lecteur d'écran ; ceci en est la décomposition,
                    et sa somme *est* l'arrivée au-dessus.
                    Le versement s'écrit exact, l'arrivée s'arrondit : c'est la
                    règle de tout l'écran — ce qui entre dans le calcul est un
                    fait, ce qui en sort est un modèle. */}
                {rung.parts.length > 1 && (
                  <span className="t-label mt-0.5 block">
                    {tpl(
                      projection.effortParts,
                      rung.parts
                        .map(
                          (part) =>
                            `${part.label} ${tpl(
                              projection.approx,
                              formatRoundedMoney(part.arrival, currency),
                            )}`,
                        )
                        .join(' · '),
                    )}
                  </span>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
