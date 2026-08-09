import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SAVINGS_SUPPORTS_PATH } from '@/app/routes'
import { ZERO } from '@/domain/money'
import { t } from '@/i18n/strings'
import { formatDecimal, tpl } from '@/i18n/format'
import {
  useBufferTotal,
  useSavingCoverage,
  useSavingTotal,
  useSupportsWithoutRole,
} from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Button } from '@/ui/Button'
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
 * **Il ne divise que l'épargne de précaution, et c'est une correction.** Il
 * divisait tout — le PEA compris —, et annonçait donc une réserve dont
 * l'essentiel n'était mobilisable ni dans la semaine, ni à sa valeur du jour.
 * C'était le seul chiffre franchement trompeur de l'app, et il l'était toujours
 * dans le sens qui flatte. Voir `SavingRole` et `bufferSupports`.
 *
 * **Un rang sous le capital, pas à côté de lui.** C'est une lecture
 * secondaire — elle qualifie le chiffre du dessus, elle ne rivalise pas avec
 * lui : deux chiffres imprimés à la même taille dans le même écran se
 * disputent l'œil, et l'un des deux perd toujours. Le capital reste l'ancre,
 * avec le nom de la personne ; l'autonomie se lit juste après, dans le même
 * ordre que les deux questions se posent — « combien j'ai », puis « est-ce
 * que ça tient » —, mais sur une surface plus calme.
 *
 * **Il ne s'affiche pas faute de relevé** : sans capital, il n'y a pas de
 * numérateur, et la tuile Capital dit déjà l'absence. Deux fois la même absence
 * se lit comme deux absences.
 *
 * Le calcul se replie, comme celui de la capacité : c'est une vérification qu'on
 * ouvre une fois, et les quatre décisions qui font la justesse du chiffre — le
 * seul capital mobilisable au numérateur, le crédit compté et le versement exclu
 * au dénominateur, le mois en cours écarté — ne se devinent sur aucun autre
 * écran.
 */
export function CoverageTile() {
  const navigate = useNavigate()
  const total = useSavingTotal()
  const buffer = useBufferTotal()
  const coverage = useSavingCoverage()
  const unroled = useSupportsWithoutRole()
  const [open, setOpen] = useState(false)

  if (total.valued === 0) return null

  /* Le numérateur peut manquer, et cette absence-là se répare : personne n'a
     encore dit lequel de ces comptes est le matelas. On pose la question au
     lieu de deviner — un rôle deviné referait, dans l'autre sens, le chiffre
     faux que ce champ existe pour corriger. */
  const noBuffer = buffer.valued === 0

  return (
    <Tile className="gap-2">
      <Eyebrow icon={SavingsIcon}>{t.savings.coverage}</Eyebrow>

      {noBuffer ? (
        <>
          <p className="t-body">{t.savings.coverageNoBuffer}</p>
          <Button
            size="sm"
            variant="ghost"
            className="w-fit"
            onClick={() => {
              void navigate(SAVINGS_SUPPORTS_PATH)
            }}
          >
            {t.savings.coverageSetRoles}
          </Button>
        </>
      ) : coverage.covered === null ? (
        /* Un quotient sans dénominateur ne vaut pas zéro : il ne veut rien
           dire. On nomme donc ce qui manque, plutôt que d'écrire « 0 mois »
           sous une étiquette qui promet une durée. */
        <p className="t-body">
          {coverage.months === 0 ? t.savings.coverageNoMonth : t.savings.coverageNoCharge}
        </p>
      ) : (
        <>
          <p className="t-tile-num tnum">
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

            {/* Le numérateur d'abord : c'est ce qui a changé, et c'est le
                pendant exact de la phrase sur le dénominateur — l'une écarte du
                capital, l'autre écarte des sorties. */}
            <p className="t-label">{t.savings.coverageMethodBuffer}</p>
            <p className="t-label">{t.savings.coverageMethodDenominator}</p>
            <p className="t-label">{t.savings.coverageMethodMonths}</p>
            {/* Les réserves n'ont de sens que s'il manque quelque chose : dites
                toujours, elles deviendraient le bruit qu'on saute. */}
            {unroled.length > 0 && (
              <p className="t-label">
                {unroled.length === 1
                  ? t.savings.coverageMethodUnroledOne
                  : tpl(t.savings.coverageMethodUnroled, unroled.length)}
              </p>
            )}
            {total.unvalued > 0 && <p className="t-label">{t.savings.coverageMethodUnvalued}</p>}
            {buffer.movedSince !== ZERO && <p className="t-label">{t.savings.estimatedWarning}</p>}
          </div>
        </Disclosure>
      </div>
    </Tile>
  )
}
