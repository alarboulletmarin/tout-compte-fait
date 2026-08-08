import { useState } from 'react'
import { type Money, ZERO, abs } from '@/domain/money'
import { fr } from '@/i18n/fr'
import { formatPercent, tpl } from '@/i18n/format'
import { useKindTotals } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Disclosure } from '@/ui/Disclosure'
import { Eyebrow } from '@/ui/Eyebrow'
import { SavingsIcon } from '@/ui/Icons'
import { Tile } from '@/ui/Tile'

/** Une ligne de la cascade : son terme, et ce qu'il pèse. */
function Term({ label, value, direction }: { label: string; value: Money; direction?: 'in' | 'out' }) {
  return (
    <li className="flex items-baseline gap-3">
      <span className="t-label min-w-0 flex-1 truncate">{label}</span>
      <Amount
        value={value}
        size="body"
        className="shrink-0"
        {...(direction === undefined ? {} : { direction })}
      />
    </li>
  )
}

/** Les deux moitiés de la capacité, sous elle et sur la même colonne. */
function Half({
  label,
  value,
  signed = false,
  tone = 'default',
}: {
  label: string
  value: Money
  signed?: boolean
  tone?: 'default' | 'danger'
}) {
  return (
    <li className="flex items-baseline gap-3">
      <span className="t-body min-w-0 flex-1 truncate">{label}</span>
      <Amount value={value} size="body" signed={signed} tone={tone} className="shrink-0" />
    </li>
  )
}

/**
 * Ce que le mois dégage, ce qu'on y a mis, et ce qu'il en reste — **une tuile**.
 *
 * Les trois vivaient dans trois cadres voisins, chacun avec son étiquette, son
 * ombre et son gros chiffre : c'est-à-dire trois questions du même poids là où
 * il n'y en a qu'une, posée en trois temps. Et surtout trois chiffres qui
 * **s'additionnent** — capacité = versé + reste — séparés par deux écrans de
 * défilement : posés à distance, on ne peut pas vérifier qu'ils tombent, et
 * trois montants qui ne se recomposent pas se lisent comme une erreur de calcul.
 *
 * La cascade qui produit la capacité est descendue dans la légende. Elle reste
 * indispensable — un crédit qui mange la moitié de la capacité ne se voit
 * qu'ici, le tableau de bord le fond dans « Charges » — mais c'est une
 * vérification, pas une lecture qu'on vient chercher : affichée en permanence,
 * elle mettait trois montants entre le chiffre et le geste qu'il appelle.
 *
 * Les chiffres sont ceux du mois entier, échéances prévues comprises, comme les
 * tuiles Revenus et Charges dont ils sont la soustraction. La question se pose
 * le 3 comme le 28 — un virement d'épargne se décide en début de mois, pas une
 * fois tout tombé.
 */
export function MonthTile({
  capacity,
  saved,
  left,
  rate,
}: {
  capacity: Money
  saved: Money
  left: Money
  rate: number | null
}) {
  const totals = useKindTotals(true)
  const [open, setOpen] = useState(false)
  const over = left < ZERO

  return (
    <Tile className="gap-2">
      <Eyebrow icon={SavingsIcon}>{fr.savings.capacity}</Eyebrow>
      <Amount value={capacity} size="tile" tone={capacity < ZERO ? 'danger' : 'default'} />
      <span className="t-label">{fr.savings.capacityHint}</span>
      {capacity < ZERO && <p className="t-label">{fr.savings.capacityNegative}</p>}

      {/* Le versement puis ce qu'il en reste, dans cet ordre : c'est celui de la
          soustraction, et le second se lit comme le résultat du premier.
          « Dépassement » plutôt qu'un reste négatif : placer plus qu'on ne
          dégage est une lecture, et « reste −57 € » n'en est pas une. */}
      <ul className="mt-1 flex flex-col gap-2 border-t border-border pt-3">
        <Half label={fr.savings.placedTotal} value={saved} signed />
        <Half
          label={over ? fr.savings.over : fr.savings.left}
          value={abs(left)}
          tone={over ? 'danger' : 'default'}
        />
      </ul>

      {/* Une seule lecture secondaire sous les deux moitiés, et celle qui a
          quelque chose à dire : le mois d'une avance explique son signe, un mois
          soldé dit qu'il l'est, les autres donnent le taux. */}
      <span className="t-label">
        {saved < ZERO
          ? fr.savings.withdrawn
          : left === ZERO && capacity > ZERO
            ? fr.savings.leftNone
            : rate === null
              ? fr.savings.rateNone
              : tpl(fr.savings.rate, formatPercent(rate))}
      </span>

      {/* La légende, dans la tuile et non dans un cadre à elle : un `<details>`
          n'est pas une carte, et empiler un cadre sous celui-ci pour porter du
          texte replié en ferait une de plus à lire.
          `-mx-3` reprend le `px-3` du sommaire : le survol déborde le texte sans
          que le texte sorte de la colonne, exactement comme une rangée. */}
      <div className="mt-2 border-t border-border pt-1">
        <Disclosure
          className="-mx-3"
          open={open}
          onOpenChange={setOpen}
          title={<span className="t-body">{fr.savings.method}</span>}
        >
          <div className="flex flex-col gap-3 px-3 pt-3 pb-1">
            {/* La phrase avant le calcul, comme sur la feuille des quatre
                soldes : l'inverse ouvre sur du vocabulaire qu'on n'a pas encore
                de quoi comprendre. */}
            <p className="t-body">{fr.savings.methodFormula}</p>
            <ul className="flex flex-col gap-1.5">
              <Term label={fr.savings.flowIncome} value={totals.resource} direction="in" />
              <Term label={fr.savings.flowCharges} value={totals.charge} direction="out" />
              {/* Le crédit n'apparaît que s'il y en a : une ligne à zéro
                  laisserait croire à une nature qu'on aurait oublié de
                  renseigner. */}
              {totals.debt > ZERO && (
                <Term label={fr.savings.flowDebts} value={totals.debt} direction="out" />
              )}
              <li className="flex items-baseline gap-3 border-t border-border pt-2">
                <span className="t-body min-w-0 flex-1 truncate">{fr.savings.capacity}</span>
                <Amount value={capacity} size="body" className="shrink-0" />
              </li>
            </ul>

            <p className="t-label">{fr.savings.methodExcluded}</p>
            <p className="t-label">{fr.savings.methodShared}</p>
            <p className="t-label">{fr.savings.methodBalance}</p>
            {/* La règle qui fait exister cet écran : un relevé n'est pas un
                mouvement. Dite ici, où les deux lectures se touchent. */}
            <p className="t-label">{fr.savings.valueMethod}</p>
            <p className="t-label">{fr.savings.estimatedWarning}</p>
          </div>
        </Disclosure>
      </div>
    </Tile>
  )
}
