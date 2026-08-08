import { useNavigate } from 'react-router-dom'
import { supportPath } from '@/app/routes'
import { type Money, ZERO } from '@/domain/money'
import { UNLINKED_SUPPORT } from '@/domain/saving'
import { fr } from '@/i18n/fr'
import { formatPercent } from '@/i18n/format'
import {
  useCategoryMap,
  useSavingSupportMap,
  useSavingsBySupport,
  useUnassignedSavings,
  useUnlinkedSavings,
} from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Eyebrow } from '@/ui/Eyebrow'
import { ListRow } from '@/ui/ListRow'
import { Tile } from '@/ui/Tile'

/**
 * Où l'épargne du mois se place, du plus gros support au plus petit.
 *
 * « Répartition des versements » et non « Où ça se place » : la section du stock
 * s'appelait « Où c'est placé », trois blocs plus haut. Deux étiquettes à un mot
 * près pour les deux notions que cet écran existe pour séparer — le capital
 * qu'on possède et l'argent qui a bougé ce mois-ci.
 *
 * Ces lignes sont **exactement** les `Entry` que compte le « versé ce mois » du
 * tableau de bord : c'est la même fonction, la même portée de lecture et le même
 * mois. Deux écrans qui recompteraient chacun de leur côté finiraient par
 * annoncer deux chiffres sous le même mot.
 *
 * Les montants sont signés, et c'est indispensable : une avance reprend 600 €
 * sur un livret le mois où elle est posée, et un support qui rend plus qu'il ne
 * reçoit afficherait sinon « 510 € » là où il faut lire « −510 € ».
 */
export function PlacedSection({ saved }: { saved: Money }) {
  const navigate = useNavigate()
  const slices = useSavingsBySupport()
  const supports = useSavingSupportMap()
  const categories = useCategoryMap()
  const unassigned = useUnassignedSavings()
  const unlinked = useUnlinkedSavings()

  /* Une part n'a de sens qu'entre des mouvements de même signe : sur un mois
     où l'on reprend plus qu'on ne place, « −24 % » ne veut rien dire, et le
     montant à côté dit déjà tout ce qu'il y a à savoir. */
  const shares = saved > ZERO && slices.every((slice) => slice.total > ZERO)

  return (
    <Tile className="gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <Eyebrow>{fr.savings.placed}</Eyebrow>
        <Amount value={saved} size="body" signed />
      </div>

      {slices.length === 0 ? (
        <p className="t-label">{fr.savings.placedEmpty}</p>
      ) : (
        <ul className="flex flex-col">
          {slices.map((slice) => {
            const support = supports.get(slice.supportId)
            const color =
              support === undefined
                ? 'var(--cat-rest)'
                : (categories.get(support.categoryId)?.color ?? 'var(--cat-rest)')

            /* Le titulaire ne se dit plus ici : l'écran ne montre jamais que
               les supports d'une seule personne, et le bandeau la nomme. Deux
               personnes qui ont chacune leur « Livret A » ne se croisent donc
               pas dans cette liste — c'est le filtre qui l'interdit, pas le
               libellé qui les départageait. */
            return (
              <li key={slice.supportId}>
                <ListRow
                  color={color}
                  label={support?.label ?? fr.savings.unlinked}
                  {...(shares ? { meta: formatPercent(slice.share) } : {})}
                  trailing={<Amount value={slice.total} signed />}
                  {...(support === undefined
                    ? {}
                    : {
                        onClick: () => {
                          void navigate(supportPath(support.id))
                        },
                      })}
                />
              </li>
            )
          })}
        </ul>
      )}

      {/* Des mouvements d'épargne qui ne disent pas où l'argent est allé. Ils
          comptent bien dans le mois — ce sont des `Entry` comme les autres —,
          mais la ventilation ne peut pas les placer. */}
      {unlinked.length > 0 && slices.some((slice) => slice.supportId === UNLINKED_SUPPORT) && (
        <p className="t-label border-t border-border pt-3">{fr.savings.unlinkedHint}</p>
      )}

      {/* Un versement resté « en commun » n'est à personne, et l'épargne ne se
          partage pas : il ne compte dans la capacité de personne. Sous une
          lecture individuelle, ces versements ne s'affichent nulle part, et rien
          ne dirait qu'ils existent. `useUnassignedSavings` regarde le mois
          entier, filtre ou non. C'est le pendant du salaire non attribué de
          l'écran Répartition. */}
      {unassigned.length > 0 && (
        <p className="t-label border-t border-border pt-3">{fr.savings.placedUnassigned}</p>
      )}
    </Tile>
  )
}
