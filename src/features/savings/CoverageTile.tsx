import { useState } from 'react'
import { ZERO } from '@/domain/money'
import { t } from '@/i18n/strings'
import { formatDecimal, tpl } from '@/i18n/format'
import { useSavingCoverage, useSavingTotal } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Disclosure } from '@/ui/Disclosure'
import { Eyebrow } from '@/ui/Eyebrow'
import { SavingsIcon } from '@/ui/Icons'
import { Tile } from '@/ui/Tile'

/**
 * Combien de temps le capital tient si les revenus s'arrêtent.
 *
 * **C'est le seul chiffre de cet écran qu'une banque ne calculera jamais** —
 * pas par paresse, par structure : elle voit le solde, elle ne sait pas ce
 * qu'est une charge chez quelqu'un. L'app tient les deux bouts, et c'est ce qui
 * fait qu'un relevé produit ici une décision plutôt qu'une transcription.
 * « 10 450 € » est une anecdote : l'appli de la banque le dit mieux, plus vite,
 * et sans qu'on recopie un nombre lu trente secondes plus tôt.
 *
 * **Le même rang que le capital, sur une surface plus calme.** Le capital garde
 * l'accent — c'est lui l'ancre, et il porte le nom de la personne —, mais pas la
 * taille à lui seul : un chiffre de décision imprimé plus petit que le chiffre
 * d'inventaire posé juste au-dessus reproduirait exactement ce que cet écran
 * cherche à corriger. Les deux se lisent d'un coup d'œil, dans l'ordre où les
 * questions se posent — « combien j'ai », puis « est-ce que ça tient ».
 *
 * **Il ne s'affiche pas faute de relevé** : sans capital, il n'y a pas de
 * numérateur, et la tuile Capital dit déjà l'absence. Deux fois la même absence
 * se lit comme deux absences.
 *
 * Le calcul se replie, comme celui de la capacité : c'est une vérification qu'on
 * ouvre une fois, et les trois décisions qui font la justesse du chiffre — le
 * crédit compté, le versement exclu, le mois en cours écarté — ne se devinent
 * sur aucun autre écran.
 */
export function CoverageTile() {
  const total = useSavingTotal()
  const coverage = useSavingCoverage()
  const [open, setOpen] = useState(false)

  if (total.valued === 0) return null

  return (
    <Tile className="gap-2">
      <Eyebrow icon={SavingsIcon}>{t.savings.coverage}</Eyebrow>

      {coverage.covered === null ? (
        /* Un quotient sans dénominateur ne vaut pas zéro : il ne veut rien
           dire. On nomme donc ce qui manque, plutôt que d'écrire « 0 mois »
           sous une étiquette qui promet une durée. */
        <p className="t-body">
          {coverage.months === 0 ? t.savings.coverageNoMonth : t.savings.coverageNoCharge}
        </p>
      ) : (
        <>
          <p className="t-hero-fit tnum">
            {tpl(t.savings.coverageValue, formatDecimal(coverage.covered))}
          </p>
          <span className="t-label">{t.savings.coverageHint}</span>
        </>
      )}

      <div className="mt-2 border-t border-border pt-1">
        <Disclosure
          className="-mx-3"
          open={open}
          onOpenChange={setOpen}
          title={<span className="t-body">{t.savings.coverageMethod}</span>}
        >
          <div className="flex flex-col gap-3 px-3 pt-3 pb-1">
            <ul className="flex flex-col gap-1.5">
              <li className="flex items-baseline gap-3">
                <span className="t-label min-w-0 flex-1 truncate">
                  {t.savings.coverageCapital}
                </span>
                <Amount value={coverage.capital} size="body" className="shrink-0" />
              </li>
              <li className="flex items-baseline gap-3">
                <span className="t-label min-w-0 flex-1 truncate">
                  {t.savings.coverageMonthly}
                </span>
                <Amount value={coverage.monthly} size="body" className="shrink-0" />
              </li>
            </ul>
            {/* Sur combien de mois la moyenne porte : trois mois vécus et douze
                ne disent pas la même chose du même chiffre, et le taire
                laisserait croire à une année entière. */}
            {coverage.months > 0 && (
              <span className="t-label">
                {coverage.months === 1
                  ? t.savings.coverageOverOne
                  : tpl(t.savings.coverageOver, coverage.months)}
              </span>
            )}

            <p className="t-label">{t.savings.coverageMethodDenominator}</p>
            <p className="t-label">{t.savings.coverageMethodMonths}</p>
            {/* La réserve n'a de sens que s'il manque quelque chose : dite
                toujours, elle deviendrait le bruit qu'on saute. */}
            {total.unvalued > 0 && <p className="t-label">{t.savings.coverageMethodUnvalued}</p>}
            {total.movedSince !== ZERO && <p className="t-label">{t.savings.estimatedWarning}</p>}
          </div>
        </Disclosure>
      </div>
    </Tile>
  )
}
