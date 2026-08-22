import { useNavigate } from 'react-router-dom'
import { totalRemaining } from '@/domain/debt'
import { CREDITS_PATH } from '@/app/routes'
import { t } from '@/i18n/strings'
import { tpl } from '@/i18n/format'
import { useDebtStatuses } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Eyebrow } from '@/ui/Eyebrow'
import { CreditsIcon } from '@/ui/Icons'
import { Tile, type TileSpan } from '@/ui/Tile'

/**
 * Ce qu'il reste à devoir, tous crédits confondus, et le chemin vers le détail.
 * La tuile disparaît sans crédit suivi : une ligne à zéro n'apprend rien, et
 * l'écran du mois n'a pas à porter une case vide.
 *
 * **`4x1`, et non plus `2x2`.** Le DS §5 plafonne une tuile à quatre éléments —
 * une étiquette, un chiffre, une lecture secondaire, une visualisation — et
 * celle-ci n'en a jamais eu que trois : elle ne dessine rien. Mesuré sur la
 * grille, son contenu occupait 103 des 146px d'une `2x2`, soit **quarante
 * pixels de vide**, quand ses deux voisines du même format les remplissent avec
 * un anneau. Ce n'est pas une tuile carrée à qui il manque du contenu, c'est le
 * contenu d'une tuile plate logé dans une boîte deux fois trop haute.
 *
 * Elle prend donc la pleine largeur sur une rangée, comme la capacité d'épargne
 * avant elle — et pour la même raison qu'elle a fini par en sortir : c'est le
 * format qui doit suivre le contenu. Le cahier des charges le disait déjà
 * autrement (§4.6) — un capital restant dû est une navigation vers un écran
 * dédié, pas une lecture quotidienne du mois.
 *
 * Ses deux lignes se joignent en une, avec les deux seuils du DS : ce que le
 * chiffre est passe par la requête de conteneur, le nombre de crédits attend
 * 1024px. « Capital restant dû · 3 crédits en cours » demande 215px à côté d'un
 * montant qui en prend 160, quand un téléphone n'offre que 326px de contenu.
 */
export function CreditsTile({ span = '4x1' }: { span?: TileSpan }) {
  const statuses = useDebtStatuses()
  const navigate = useNavigate()
  if (statuses.length === 0) return null

  const remaining = totalRemaining(statuses)
  const running = statuses.filter((status) => !status.settled).length

  return (
    <Tile
      span={span}
      className="justify-between"
      onClick={() => {
        void navigate(CREDITS_PATH)
      }}
      label={tpl(t.dashboard.showCredits, t.dashboard.credits)}
      affordance={{ kind: 'navigate' }}
    >
      <Eyebrow icon={CreditsIcon}>{t.dashboard.credits}</Eyebrow>
      <div className="flex flex-wrap items-baseline gap-x-2">
        {/* Sans les centimes, seul chiffre de la grille dans ce cas — et pour
            une raison mesurée : un capital restant dû est le montant le plus
            gros que l'app affiche, celui qu'un emprunt immobilier porte. Le DS
            §3 tranche la question : une lecture qui masque les centimes
            **arrondit** l'unité, elle ne la tronque pas — et deux centimes ne
            changent rien à un capital qu'on met vingt ans à rendre. Ils se
            lisent entiers sur l'écran au bout du chevron. */}
        <Amount value={remaining} size="tile-fit" withCents={false} />
        <span className="t-label tile-hint">{t.dashboard.creditsRemaining}</span>
        <span aria-hidden="true" className="t-label max-lg:hidden">
          ·
        </span>
        <span className="t-label max-lg:sr-only">
          {tpl(
            running > 1 ? t.dashboard.creditsRunningMany : t.dashboard.creditsRunningOne,
            running,
          )}
        </span>
      </div>
    </Tile>
  )
}
