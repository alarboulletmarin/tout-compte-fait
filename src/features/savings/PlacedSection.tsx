import { useNavigate } from 'react-router-dom'
import { supportPath } from '@/app/routes'
import { type Money, ZERO } from '@/domain/money'
import { UNLINKED_SUPPORT } from '@/domain/saving'
import { t } from '@/i18n/strings'
import { formatPercent } from '@/i18n/format'
import {
  useCategoryMap,
  useMemberMap,
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
  const members = useMemberMap()
  const unassigned = useUnassignedSavings()
  const unlinked = useUnlinkedSavings()

  /* Une part n'a de sens qu'entre des mouvements de même signe : sur un mois
     où l'on reprend plus qu'on ne place, « −24 % » ne veut rien dire, et le
     montant à côté dit déjà tout ce qu'il y a à savoir. */
  const shares = saved > ZERO && slices.every((slice) => slice.total > ZERO)

  return (
    <Tile className="gap-3">
      {/* L'étiquette seule : le total est déjà « Versé ce mois », juste
          au-dessus, et il se disait une troisième fois ici. Le même montant sous
          trois libellés apprend surtout qu'on ne sait pas lequel lire — et à
          320px il poussait l'étiquette à la ligne pour rien. */}
      <Eyebrow>{t.savings.placed}</Eyebrow>

      {slices.length === 0 ? (
        <p className="t-label">{t.savings.placedEmpty}</p>
      ) : (
        <ul className="flex flex-col">
          {slices.map((slice) => {
            const support = supports.get(slice.supportId)
            const color =
              support === undefined
                ? 'var(--cat-rest)'
                : (categories.get(support.categoryId)?.color ?? 'var(--cat-rest)')

            /* Le titulaire sur la ligne, et pas seulement la part — **ici**, à
               la différence de la liste des supports.
               Celle-ci ne montre que les comptes de la personne lue, et le
               titulaire y serait le même sur toutes les lignes. La ventilation,
               elle, compte des `Entry`, et une mensualité d'avance cochée « à
               partager » est de nature épargne : Camille en porte sa part, sur
               le livret d'Alix. Deux « Livret A » se retrouvent alors dans la
               même liste, et sans le nom rien ne les départage — c'est
               exactement la confusion que le support existe pour lever. */
            const owner = support === undefined ? undefined : members.get(support.memberId)?.name
            const meta = [owner, shares ? formatPercent(slice.share) : undefined]
              .filter((part) => part !== undefined && part !== '')
              .join(' · ')

            return (
              <li key={slice.supportId}>
                <ListRow
                  color={color}
                  label={support?.label ?? t.savings.unlinked}
                  {...(meta === '' ? {} : { meta })}
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
        <p className="t-label border-t border-border pt-3">{t.savings.unlinkedHint}</p>
      )}

      {/* Un versement resté « en commun » n'est à personne, et l'épargne ne se
          partage pas : il ne compte dans la capacité de personne. Sous une
          lecture individuelle, ces versements ne s'affichent nulle part, et rien
          ne dirait qu'ils existent. `useUnassignedSavings` regarde le mois
          entier, filtre ou non. C'est le pendant du salaire non attribué de
          l'écran Répartition. */}
      {unassigned.length > 0 && (
        <p className="t-label border-t border-border pt-3">{t.savings.placedUnassigned}</p>
      )}
    </Tile>
  )
}
